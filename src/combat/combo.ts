/** Combo system: chaining *different* spells within the window raises a damage multiplier; certain pairs trigger bonuses. */
export interface ComboState { count: number; timer: number; last: string | null; }
export const COMBO_WINDOW = 2.2;
export const COMBO_BONUS: Record<string, { name: string; nameTh: string; stun?: number; dmg?: number; knock?: number }> = {
  'expelliarmus>stupefy': { name: 'Disarm Lock', nameTh: 'ล็อกไม้กายสิทธิ์', stun: 1.0 },
  'depulso>bombarda': { name: 'Launch & Blast', nameTh: 'กระเด็นแล้วระเบิด', dmg: 1.4 },
  'stupefy>confringo': { name: 'Sitting Duck', nameTh: 'เป้านิ่ง', dmg: 1.3 },
  'confringo>depulso': { name: 'Blast Wave', nameTh: 'คลื่นระเบิด', knock: 2 },
  'crucio>sectum': { name: 'Torment', nameTh: 'ทรมาน', dmg: 1.4 },
};
export function newCombo(): ComboState { return { count: 0, timer: 0, last: null }; }
export function tickCombo(c: ComboState, dt: number) { if (c.timer > 0) { c.timer -= dt; if (c.timer <= 0) { c.count = 0; c.last = null; } } }
export function comboMult(count: number) { return 1 + Math.min(0.5, Math.max(0, count - 1) * 0.1); }
/** Register a landed hit. Returns multiplier and bonus triggered. */
export function registerHit(c: ComboState, spell: string) {
  const prev = c.last; const active = c.timer > 0;
  if (!active) c.count = 1; else if (prev !== spell) c.count++;
  c.timer = COMBO_WINDOW; c.last = spell;
  const bonus = active && prev && prev !== spell ? COMBO_BONUS[`${prev}>${spell}`] ?? null : null;
  return { mult: comboMult(c.count), bonus, count: c.count };
}
