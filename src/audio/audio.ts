let ctx: AudioContext | null = null; let master: GainNode | null = null; let vol = 0.6;
export function initAudio() { if (ctx) { ctx.resume(); return; } try { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination); startAmbience(); } catch { ctx = null; } }
export function setVolume(v: number) { vol = v; if (master) master.gain.value = v; }
function noiseBuf(len: number) { const b = ctx!.createBuffer(1, ctx!.sampleRate * len, ctx!.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function tone(f0: number, f1: number, dur: number, type: OscillatorType, g = 0.2) {
  if (!ctx || !master) return; const t = ctx.currentTime; const o = ctx.createOscillator(); const a = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(a).connect(master); o.start(t); o.stop(t + dur);
}
function noise(dur: number, freq: number, g = 0.3) {
  if (!ctx || !master) return; const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noiseBuf(dur);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
  const a = ctx.createGain(); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(a).connect(master); s.start(t);
}
export const sfx = {
  cast(color: number) { const f = 300 + (color % 997); tone(f * 2, f, 0.25, 'sawtooth', 0.08); tone(f * 3, f * 1.5, 0.2, 'sine', 0.1); },
  hit() { noise(0.25, 2000, 0.25); tone(180, 60, 0.2, 'square', 0.08); },
  explode() { noise(0.9, 1200, 0.5); tone(90, 30, 0.8, 'sine', 0.4); },
  block() { tone(900, 1400, 0.15, 'triangle', 0.15); },
  dodge() { noise(0.2, 4000, 0.12); },
  death() { tone(400, 50, 1.2, 'sawtooth', 0.12); },
  ult() { tone(200, 900, 0.6, 'sawtooth', 0.12); tone(300, 1200, 0.8, 'triangle', 0.12); noise(1.0, 3000, 0.25); },
  skill() { tone(500, 1100, 0.3, 'triangle', 0.12); tone(750, 1500, 0.25, 'sine', 0.08); },
  clash() { tone(120, 240, 1.2, 'sawtooth', 0.15); noise(1.2, 5000, 0.2); },
  deny() { tone(220, 180, 0.1, 'square', 0.05); },
  ui() { tone(700, 900, 0.08, 'sine', 0.1); },
};
function startAmbience() { // low wind drone
  if (!ctx || !master) return; const s = ctx.createBufferSource(); s.buffer = noiseBuf(4); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 0.7;
  const a = ctx.createGain(); a.gain.value = 0.05; s.connect(f).connect(a).connect(master); s.start();
}
export function audioCtx() { return ctx && master ? { ctx, master } : null; }
