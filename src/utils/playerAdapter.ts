/**
 * Standard PlayerAdapter interface and implementations for Mondoflix Watch Parties.
 * Provides unified play, pause, seek, and currentTime methods across native HTML5 video
 * and embedded iframe players (via postMessage).
 */

export abstract class PlayerAdapter {
  abstract play(): Promise<void> | void;
  abstract pause(): void;
  abstract seek(timeSeconds: number): void;
  abstract getCurrentTime(): number;
  abstract isReady(): boolean;
  abstract destroy(): void;
}

export class Html5PlayerAdapter extends PlayerAdapter {
  private video: HTMLVideoElement | null = null;
  private onTimeUpdateCallback?: (time: number) => void;

  constructor(videoEl: HTMLVideoElement | null, onTimeUpdate?: (time: number) => void) {
    super();
    this.video = videoEl;
    this.onTimeUpdateCallback = onTimeUpdate;

    if (this.video && this.onTimeUpdateCallback) {
      this.video.addEventListener('timeupdate', this._handleTimeUpdate);
    }
  }

  private _handleTimeUpdate = () => {
    if (this.video && this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.video.currentTime);
    }
  };

  play(): Promise<void> | void {
    if (this.video) {
      return this.video.play().catch(() => {});
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause();
    }
  }

  seek(t: number): void {
    if (this.video && isFinite(t)) {
      this.video.currentTime = Math.max(0, t);
    }
  }

  getCurrentTime(): number {
    return this.video ? this.video.currentTime || 0 : 0;
  }

  isReady(): boolean {
    return !!(this.video && this.video.readyState >= 2);
  }

  destroy(): void {
    if (this.video && this.onTimeUpdateCallback) {
      this.video.removeEventListener('timeupdate', this._handleTimeUpdate);
    }
    this.video = null;
  }
}

export interface PostMessageProviderConfig {
  type: 'youtube' | 'vimeo' | 'custom';
}

export class PostMessagePlayerAdapter extends PlayerAdapter {
  private iframe: HTMLIFrameElement | null = null;
  private provider: PostMessageProviderConfig;
  private ready = false;
  private pendingSeeks: number[] = [];
  private currentTime = 0;
  private isPlaying = false;

  constructor(iframeEl: HTMLIFrameElement | null, providerConfig: PostMessageProviderConfig = { type: 'custom' }) {
    super();
    this.iframe = iframeEl;
    this.provider = providerConfig;
    this._boundOnMessage = this._onMessage.bind(this);
    window.addEventListener('message', this._boundOnMessage);

    // If iframe is already loaded, mark ready after a brief tick
    if (this.iframe) {
      setTimeout(() => {
        this.ready = true;
        this._flushPendingSeeks();
      }, 1000);
    }
  }

  private _boundOnMessage: (event: MessageEvent) => void;

  private _onMessage(event: MessageEvent) {
    if (!this.iframe || !this.iframe.contentWindow) return;
    if (event.source !== this.iframe.contentWindow) return;

    try {
      let data = event.data;
      if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
        data = JSON.parse(data);
      }

      if (this.provider.type === 'youtube') {
        if (data === 'onReady' || data?.event === 'onReady') {
          this.ready = true;
          this._flushPendingSeeks();
        } else if (data?.info?.currentTime !== undefined) {
          this.currentTime = data.info.currentTime;
        }
      } else {
        // Generic custom embed postMessage support
        if (data?.type === 'player_ready' || data?.event === 'ready') {
          this.ready = true;
          this._flushPendingSeeks();
        } else if (typeof data?.currentTime === 'number') {
          this.currentTime = data.currentTime;
        }
      }
    } catch {
      // Ignore unparseable postMessage
    }
  }

  private _flushPendingSeeks() {
    if (this.pendingSeeks.length > 0) {
      const lastSeek = this.pendingSeeks.pop();
      if (lastSeek !== undefined) {
        this.seek(lastSeek);
      }
      this.pendingSeeks = [];
    }
  }

  play(): void {
    this.isPlaying = true;
    if (!this.iframe?.contentWindow) return;
    try {
      if (this.provider.type === 'youtube') {
        this.iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
      } else {
        const payloads: any[] = [
          { type: 'play', command: 'playVideo', action: 'play', event: 'play' },
          { type: 'PLAY' },
          { type: 'player:play' },
          { type: 'MEDIA_PLAY' },
          { event: 'command', func: 'playVideo' },
          { command: 'play' },
          { method: 'play' }
        ];
        for (const p of payloads) {
          try {
            this.iframe.contentWindow.postMessage(p, '*');
            this.iframe.contentWindow.postMessage(JSON.stringify(p), '*');
          } catch {}
        }
      }
    } catch {}
  }

  pause(): void {
    this.isPlaying = false;
    if (!this.iframe?.contentWindow) return;
    try {
      if (this.provider.type === 'youtube') {
        this.iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
      } else {
        const payloads: any[] = [
          { type: 'pause', command: 'pauseVideo', action: 'pause', event: 'pause' },
          { type: 'PAUSE' },
          { type: 'player:pause' },
          { type: 'MEDIA_PAUSE' },
          { event: 'command', func: 'pauseVideo' },
          { command: 'pause' },
          { method: 'pause' }
        ];
        for (const p of payloads) {
          try {
            this.iframe.contentWindow.postMessage(p, '*');
            this.iframe.contentWindow.postMessage(JSON.stringify(p), '*');
          } catch {}
        }
      }
    } catch {}
  }

  seek(t: number): void {
    this.currentTime = Math.max(0, t);
    if (!this.iframe?.contentWindow) {
      this.pendingSeeks.push(t);
      return;
    }

    try {
      if (this.provider.type === 'youtube') {
        this.iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*');
      } else {
        const payloads: any[] = [
          { type: 'seek', time: t, currentTime: t, command: 'seekTo', args: [t, true], action: 'seek', event: 'seek' },
          { type: 'SEEK', data: t, time: t },
          { type: 'player:seek', time: t },
          { type: 'MEDIA_SEEK', time: t, data: { time: t } },
          { event: 'command', func: 'seekTo', args: [t, true] },
          { command: 'seek', time: t },
          { method: 'setCurrentTime', value: t }
        ];
        for (const p of payloads) {
          try {
            this.iframe.contentWindow.postMessage(p, '*');
            this.iframe.contentWindow.postMessage(JSON.stringify(p), '*');
          } catch {}
        }
      }
    } catch {}
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  isReady(): boolean {
    return this.ready;
  }

  destroy(): void {
    window.removeEventListener('message', this._boundOnMessage);
    this.iframe = null;
    this.pendingSeeks = [];
  }
}
