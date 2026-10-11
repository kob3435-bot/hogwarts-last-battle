/** Spell Clash (beam lock) minigame. Outcome depends on wand mastery, stamina and press timing — not OVR. */
export interface ClashSide { mastery: number; stamina: number; }
export interface ClashState { pos: number; t: number; a: ClashSide; b: ClashSide; done: 0 | 1 | -1; lastQuality: number; }
export const CLASH_TIME = 7;
export function newClash(a: ClashSide, b: ClashSide): ClashState { return { pos: 0, t: 0, a: { ...a }, b: { ...b }, done: 0, lastQuality: 0 }; }
/** Timing marker sweeping 0..1..0 (triangle wave) */
export function marker(t: number, speed = 0.9) { const x = (t * speed) % 1; return x < 0.5 ? x * 2 : 2 - x * 2; }
/** 1 at centre sweet spot, 0 at the edges */
export function timingQuality(m: number) { const d = Math.abs(m - 0.5); return d < 0.1 ? 1 : Math.max(0, 1 - (d - 0.1) / 0.4); }
export function pushStrength(s: ClashSide, quality: number) { return (s.mastery / 100) * (0.45 + 0.55 * Math.max(0, s.stamina) / 100) * (0.35 + quality); }
/** Advance clash. pressA/pressB: whether that side pressed this frame. +pos pushes toward B (A winning). */
export function stepClash(s: ClashState, dt: number, pressA: boolean, pressB: boolean, qA?: number, qB?: number): ClashState {
  if (s.done) return s; s.t += dt; const m = marker(s.t);
  if (pressA) { const q = qA ?? timingQuality(m); s.lastQuality = q; s.pos += pushStrength(s.a, q) * 0.075; s.a.stamina = Math.max(0, s.a.stamina - 2.5); }
  if (pressB) { const q = qB ?? timingQuality(m); s.pos -= pushStrength(s.b, q) * 0.075; s.b.stamina = Math.max(0, s.b.stamina - 2.5); }
  s.a.stamina = Math.min(100, s.a.stamina + dt * 4); s.b.stamina = Math.min(100, s.b.stamina + dt * 4);
  if (s.pos >= 1) s.done = 1; else if (s.pos <= -1) s.done = -1; else if (s.t >= CLASH_TIME) s.done = s.pos >= 0 ? 1 : -1;
  return s;
}
/** AI press model: presses ~ rate/sec; timing quality distributed by mastery */
export function aiPress(mastery: number, dt: number, rnd = Math.random): [boolean, number] {
  const rate = 4 + mastery / 25; if (rnd() > rate * dt) return [false, 0];
  const q = Math.min(1, Math.max(0, mastery / 100 - 0.25 + rnd() * 0.5)); return [true, q];
}
