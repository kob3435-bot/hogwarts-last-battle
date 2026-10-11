import { SPELLS, SpellId, SpellDef } from '../combat/spells';
export type Action = 'attack' | 'shield' | 'dodge' | 'strafe' | 'approach' | 'retreat' | 'heal';
export interface AIContext {
  hp: number; maxHp: number; energy: number; maxEnergy: number; stamina: number;
  distToTarget: number; incomingThreat: number; // 0..1 how dangerous incoming projectile is
  threatTime: number; // seconds until impact
  preferredRange: number; aggression: number; caution: number; // personality 0..1
  spells: SpellId[]; cooldowns: Partial<Record<SpellId, number>>; enemiesNearTarget: number;
  canHeal?: boolean; allyLowHp?: boolean;
}
export function scoreActions(c: AIContext): Record<Action, number> {
  const hpr = c.hp / c.maxHp, er = c.energy / c.maxEnergy;
  const rangeErr = (c.distToTarget - c.preferredRange) / c.preferredRange;
  const s: Record<Action, number> = {
    attack: (c.distToTarget < c.preferredRange * 1.8 ? 0.55 : 0.1) + c.aggression * 0.35 + er * 0.1,
    shield: c.incomingThreat * (c.threatTime < 0.6 ? 1 : 0.3) * (0.5 + c.caution) * (c.energy > 8 ? 1 : 0),
    dodge: c.incomingThreat * (c.threatTime < 0.45 ? 1.1 : 0.2) * (c.stamina > 25 ? 1 : 0) * (0.6 + (1 - c.caution) * 0.5),
    strafe: 0.3 + (1 - c.aggression) * 0.2,
    approach: Math.max(0, rangeErr) * 0.9,
    retreat: Math.max(0, -rangeErr) * 0.8 + (1 - hpr) * c.caution * 0.6,
    heal: c.canHeal && c.allyLowHp ? 0.95 : 0,
  };
  if (er < 0.15) s.attack *= 0.2;
  return s;
}
export function bestAction(c: AIContext): Action {
  const s = scoreActions(c); let best: Action = 'strafe', v = -1;
  for (const k of Object.keys(s) as Action[]) if (s[k] > v) { v = s[k]; best = k; }
  return best;
}
export function scoreSpell(sp: SpellDef, c: AIContext): number {
  if ((c.cooldowns[sp.id] ?? 0) > 0 || c.energy < sp.cost) return -Infinity;
  let v = sp.damage / 10;
  if (sp.aoe > 0) v += c.enemiesNearTarget * 1.2;
  if (sp.aoe > 0 && c.distToTarget < sp.aoe + 1) v -= 4; // avoid self-splash
  if (sp.stun > 0.5) v += 1;
  if (sp.disarm > 0) v += 0.6;
  if (sp.knockback > 10 && c.distToTarget < 5) v += 3;
  if (sp.speed < 20 && c.distToTarget > 18) v -= 1.5;
  v -= sp.cost / 40 * (1 - c.energy / c.maxEnergy) * 3;
  return v;
}
export function pickSpell(c: AIContext): SpellId | null {
  let best: SpellId | null = null, v = -Infinity;
  for (const id of c.spells) { const sc = scoreSpell(SPELLS[id], c); if (sc > v) { v = sc; best = id; } }
  return v === -Infinity ? null : best;
}
