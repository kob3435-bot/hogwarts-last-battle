/** Zone control & overall battle progress (pure). control ∈ [-1 (Death), +1 (Hogwarts)]. */
export function updateControl(control: number, hogw: number, death: number, dt: number): number {
  const total = hogw + death; if (total === 0) return control;
  const push = (hogw - death) / (total + 2); return Math.max(-1, Math.min(1, control + push * dt * 0.18));
}
export function scoreRate(controls: number[], weights: number[]): number { let s = 0; for (let i = 0; i < controls.length; i++) s += (Math.abs(controls[i]) > 0.5 ? controls[i] : 0) * weights[i]; return s * 0.22; }
export function clampScore(s: number) { return Math.max(-100, Math.min(100, s)); }
export function warWinner(score: number): 1 | -1 | 0 { return score >= 100 ? 1 : score <= -100 ? -1 : 0; }
