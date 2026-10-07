export interface PartyAvatar {
  emoji: string;
  name: string;
}

export const PARTY_AVATARS: PartyAvatar[] = [
  { emoji: '🍿', name: 'Popcorn' },
  { emoji: '🍕', name: 'Pizza' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐱', name: 'Cat' },
  { emoji: '🤖', name: 'Robot' },
  { emoji: '👽', name: 'Alien' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🦄', name: 'Unicorn' },
  { emoji: '🚀', name: 'Rocket' },
  { emoji: '🔥', name: 'Fire' },
  { emoji: '👑', name: 'Crown' },
  { emoji: '👻', name: 'Ghost' },
  { emoji: '🐻', name: 'Bear' },
  { emoji: '🌮', name: 'Taco' },
  { emoji: '🦁', name: 'Lion' },
  { emoji: '🌟', name: 'Star' },
];

export const PARTY_COLORS = [
  { name: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500' },
  { name: 'Violet', hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500' },
  { name: 'Rose', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500' },
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' },
  { name: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500' },
  { name: 'Fuchsia', hex: '#d946ef', bg: 'bg-fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-500' },
  { name: 'Teal', hex: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-500' },
];

// Aliases for backwards compatibility
export type TelepartyAvatar = PartyAvatar;
export const TELEPARTY_AVATARS = PARTY_AVATARS;
export const TELEPARTY_COLORS = PARTY_COLORS;

export function getRandomAvatar(): string {
  const item = PARTY_AVATARS[Math.floor(Math.random() * PARTY_AVATARS.length)];
  return item.emoji;
}

export function getRandomColor(): string {
  const item = PARTY_COLORS[Math.floor(Math.random() * PARTY_COLORS.length)];
  return item.hex;
}

export function getStoredUserAvatar(): string {
  const saved = localStorage.getItem('mondoflix_party_avatar');
  if (saved) return saved;
  const initial = getRandomAvatar();
  localStorage.setItem('mondoflix_party_avatar', initial);
  return initial;
}

export function getStoredUserColor(): string {
  const saved = localStorage.getItem('mondoflix_party_color');
  if (saved) return saved;
  const initial = getRandomColor();
  localStorage.setItem('mondoflix_party_color', initial);
  return initial;
}

// Synthesized Watch Party Sound Effects via Web Audio API (Zero external assets, zero lag)
class PartySoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('mondoflix_party_sound');
    this.enabled = saved !== 'false';
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('mondoflix_party_sound', String(this.enabled));
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playMessage() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  public playReaction() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1); // G5
      
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playJoin() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {}
  }
}

export const partySounds = new PartySoundManager();
