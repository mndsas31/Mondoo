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
  private onEventCallback?: (event: { type: string; currentTime: number; duration?: number }) => void;
  private playPromise: Promise<void> | null = null;
  private pendingPause = false;

  constructor(
    videoEl: HTMLVideoElement | null, 
    onTimeUpdate?: (time: number) => void,
    onEvent?: (event: { type: string; currentTime: number; duration?: number }) => void
  ) {
    super();
    this.video = videoEl;
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEventCallback = onEvent;

    if (this.video) {
      this.video.addEventListener('timeupdate', this._handleTimeUpdate);
      this.video.addEventListener('play', this._handlePlay);
      this.video.addEventListener('pause', this._handlePause);
      this.video.addEventListener('seeking', this._handleSeeking);
      this.video.addEventListener('seeked', this._handleSeeked);
      this.video.addEventListener('loadedmetadata', this._handleLoadedMetadata);
    }
  }

  private _handleTimeUpdate = () => {
    if (this.video) {
      this.onTimeUpdateCallback?.(this.video.currentTime);
      this.onEventCallback?.({ type: 'timeupdate', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  private _handlePlay = () => {
    if (this.video) {
      this.onEventCallback?.({ type: 'play', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  private _handlePause = () => {
    if (this.video) {
      this.onEventCallback?.({ type: 'pause', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  private _handleSeeking = () => {
    if (this.video) {
      this.onEventCallback?.({ type: 'seeking', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  private _handleSeeked = () => {
    if (this.video) {
      this.onEventCallback?.({ type: 'seeked', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  private _handleLoadedMetadata = () => {
    if (this.video) {
      this.onEventCallback?.({ type: 'loadedmetadata', currentTime: this.video.currentTime, duration: this.video.duration });
    }
  };

  play(): Promise<void> | void {
    if (!this.video) return;
    this.pendingPause = false;

    // Handle asynchronous video.play() correctly
    try {
      const promise = this.video.play();
      if (promise !== undefined) {
        this.playPromise = promise;
        return promise.then(() => {
          this.playPromise = null;
          if (this.pendingPause && this.video) {
            this.pendingPause = false;
            this.video.pause();
          }
        }).catch((err: any) => {
          this.playPromise = null;
          // AbortError is normal when play() was superseded or paused
          if (err?.name !== 'AbortError') {
            console.warn('[Html5PlayerAdapter] Play prevented or failed:', err);
          }
        });
      }
    } catch (err) {
      console.warn('[Html5PlayerAdapter] Synchronous play error:', err);
    }
  }

  pause(): void {
    if (!this.video) return;

    if (this.playPromise) {
      // If play() is still resolving, queue pause to execute when playPromise finishes
      this.pendingPause = true;
    } else {
      this.pendingPause = false;
      try {
        this.video.pause();
      } catch (err) {
        console.warn('[Html5PlayerAdapter] Pause error:', err);
      }
    }
  }

  seek(t: number): void {
    if (this.video && isFinite(t)) {
      const target = Math.max(0, t);
      if (Math.abs(this.video.currentTime - target) > 0.3) {
        this.video.currentTime = target;
      }
    }
  }

  getCurrentTime(): number {
    return this.video ? this.video.currentTime || 0 : 0;
  }

  isReady(): boolean {
    return !!(this.video && this.video.readyState >= 2);
  }

  destroy(): void {
    if (this.video) {
      this.video.removeEventListener('timeupdate', this._handleTimeUpdate);
      this.video.removeEventListener('play', this._handlePlay);
      this.video.removeEventListener('pause', this._handlePause);
      this.video.removeEventListener('seeking', this._handleSeeking);
      this.video.removeEventListener('seeked', this._handleSeeked);
      this.video.removeEventListener('loadedmetadata', this._handleLoadedMetadata);
    }
    this.video = null;
    this.playPromise = null;
    this.pendingPause = false;
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
