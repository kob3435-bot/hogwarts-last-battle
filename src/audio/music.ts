/** Procedural adaptive music (WebAudio): moods crossfade by game intensity. No samples - all synthesized. */
export type Mood = 'off' | 'exploration' | 'tension' | 'battle' | 'boss' | 'victory' | 'tragedy';
interface MoodDef { bpm: number; root: number; scale: number[]; pad: number; bass: boolean; drums: number; lead: number; wave: OscillatorType }
export const MOODS: Record<Exclude<Mood, 'off'>, MoodDef> = {
  exploration: { bpm: 72, root: 57, scale: [0, 2, 4, 7, 9], pad: 0.5, bass: false, drums: 0, lead: 0.35, wave: 'triangle' },
  tension: { bpm: 90, root: 50, scale: [0, 1, 3, 7, 8], pad: 0.5, bass: true, drums: 0.3, lead: 0.2, wave: 'sine' },
  battle: { bpm: 140, root: 52, scale: [0, 2, 3, 7, 8, 10], pad: 0.35, bass: true, drums: 1, lead: 0.5, wave: 'sawtooth' },
  boss: { bpm: 156, root: 45, scale: [0, 1, 3, 6, 7, 10], pad: 0.5, bass: true, drums: 1, lead: 0.6, wave: 'square' },
  victory: { bpm: 110, root: 60, scale: [0, 4, 7, 12, 9, 7], pad: 0.6, bass: true, drums: 0.4, lead: 0.7, wave: 'triangle' },
  tragedy: { bpm: 60, root: 53, scale: [0, 3, 7, 8, 5, 3], pad: 0.7, bass: false, drums: 0, lead: 0.4, wave: 'sine' },
};
/** Pick the mood from battle intensity (pure, testable). */
export function chooseMood(s: { state: string; boss: boolean; enemiesNear: number; hpFrac: number; playerTeamWon?: boolean; explore?: boolean }): Mood {
  if (s.state === 'won') return 'victory'; if (s.state === 'lost') return 'tragedy'; if (s.boss) return 'boss';
  if (s.enemiesNear >= 2 || (s.enemiesNear >= 1 && s.hpFrac < 0.5)) return 'battle'; if (s.enemiesNear >= 1) return 'tension'; return 'exploration';
}
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export class Music {
  ctx: AudioContext | null = null; out: GainNode | null = null; mood: Mood = 'off'; next = 0; step = 0; timer = 0; vol = 0.5; private noise: AudioBuffer | null = null;
  init(ctx: AudioContext, dest: AudioNode) { if (this.ctx) return; this.ctx = ctx; this.out = ctx.createGain(); this.out.gain.value = this.vol * 0.35; this.out.connect(dest);
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); this.noise = b;
    this.timer = window.setInterval(() => this.schedule(), 50); }
  setVolume(v: number) { this.vol = v; if (this.out && this.ctx) this.out.gain.setTargetAtTime(v * 0.35, this.ctx.currentTime, 0.2); }
  setMood(m: Mood) { if (m === this.mood) return; this.mood = m; this.step = 0; if (this.ctx) this.next = Math.max(this.next, this.ctx.currentTime + 0.05); }
  stop() { clearInterval(this.timer); this.timer = 0; this.ctx = null; }
  private note(freq: number, t: number, dur: number, type: OscillatorType, gain: number, cutoff = 2400) { const c = this.ctx!; const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.05, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(f).connect(g).connect(this.out!); o.start(t); o.stop(t + dur + 0.05); }
  private hit(t: number, kind: 'kick' | 'snare' | 'hat', gain: number) { const c = this.ctx!; if (kind === 'kick') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(this.out!); o.start(t); o.stop(t + 0.25); return; }
    const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800; const g = c.createGain(); g.gain.value = gain * (kind === 'hat' ? 0.35 : 0.8); s.connect(f).connect(g).connect(this.out!); s.start(t); s.stop(t + (kind === 'hat' ? 0.05 : 0.18)); }
  private schedule() { const c = this.ctx; if (!c || this.mood === 'off') return; const M = MOODS[this.mood]; const sixteenth = 60 / M.bpm / 4;
    while (this.next < c.currentTime + 0.2) { const t = this.next, s = this.step % 64, beat = s % 16; const chord = [0, 5, 3, 4][Math.floor(s / 16)] ?? 0; const deg = (i: number) => M.scale[(i + chord) % M.scale.length] + 12 * Math.floor((i + chord) / M.scale.length);
      if (s % 16 === 0) for (const i of [0, 2, 4]) this.note(mtof(M.root + deg(i)), t, sixteenth * 16, 'sine', 0.05 * M.pad, 900);
      if (M.bass && s % 4 === 0) this.note(mtof(M.root - 12 + deg(0) + (beat === 12 ? 7 : 0)), t, sixteenth * 3.5, 'triangle', 0.12, 600);
      if (M.drums > 0) { if (beat % 8 === 0 || (M.drums > 0.8 && beat === 10)) this.hit(t, 'kick', 0.5 * M.drums); if (beat === 4 || beat === 12) this.hit(t, 'snare', 0.35 * M.drums); if (M.drums > 0.5 && s % 2 === 0) this.hit(t, 'hat', 0.25 * M.drums); }
      if (M.lead > 0) { const rhythm = this.mood === 'battle' || this.mood === 'boss' ? s % 2 === 0 : s % 4 === 0; const seed = Math.sin(s * 12.9898 + chord * 78.233) * 43758.5453; const r = seed - Math.floor(seed);
        if (rhythm && r < 0.7) this.note(mtof(M.root + 12 + deg(Math.floor(r * 7))), t, sixteenth * (this.mood === 'tragedy' || this.mood === 'exploration' ? 3.5 : 1.6), M.wave, 0.045 * M.lead, this.mood === 'boss' ? 1600 : 2600); }
      this.next += sixteenth; this.step++; } }
}
export const music = new Music();
