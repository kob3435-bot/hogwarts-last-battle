export type SpellId = 'expelliarmus' | 'stupefy' | 'confringo' | 'bombarda' | 'depulso' | 'avada' | 'patronus' | 'crucio' | 'fiendfyre' | 'stone' | 'avis' | 'firework' | 'dagger' | 'sectum' | 'lumos';
export interface SpellDef {
  id: SpellId; name: string; color: number; damage: number; speed: number; cost: number;
  cooldown: number; radius: number; aoe: number; knockback: number; stun: number; disarm: number;
  unblockable?: boolean; homing?: number; pierce?: boolean;
}
export const SPELLS: Record<SpellId, SpellDef> = {
  expelliarmus: { id: 'expelliarmus', name: 'Expelliarmus', color: 0xff3030, damage: 8, speed: 34, cost: 8, cooldown: 0.45, radius: 0.35, aoe: 0, knockback: 2, stun: 0, disarm: 1.1 },
  stupefy: { id: 'stupefy', name: 'Stupefy', color: 0xff4fd0, damage: 12, speed: 30, cost: 12, cooldown: 0.7, radius: 0.35, aoe: 0, knockback: 1, stun: 1.2, disarm: 0 },
  confringo: { id: 'confringo', name: 'Confringo', color: 0xff8a1a, damage: 18, speed: 24, cost: 18, cooldown: 1.0, radius: 0.45, aoe: 3, knockback: 4, stun: 0, disarm: 0 },
  bombarda: { id: 'bombarda', name: 'Bombarda', color: 0xffe14a, damage: 26, speed: 18, cost: 26, cooldown: 1.6, radius: 0.55, aoe: 4.5, knockback: 7, stun: 0.3, disarm: 0 },
  depulso: { id: 'depulso', name: 'Depulso', color: 0x55c8ff, damage: 6, speed: 36, cost: 10, cooldown: 0.6, radius: 0.5, aoe: 0, knockback: 14, stun: 0.2, disarm: 0 },
  patronus: { id: 'patronus', name: 'Expecto Patronum', color: 0xd8f0ff, damage: 16, speed: 20, cost: 0, cooldown: 0, radius: 0.9, aoe: 0, knockback: 7, stun: 1.0, disarm: 0, homing: 3, pierce: true },
  crucio: { id: 'crucio', name: 'Crucio', color: 0xd0106a, damage: 18, speed: 32, cost: 18, cooldown: 1.2, radius: 0.4, aoe: 0, knockback: 1, stun: 0.9, disarm: 0 },
  fiendfyre: { id: 'fiendfyre', name: 'Fiendfyre', color: 0xff3d00, damage: 22, speed: 15, cost: 0, cooldown: 0, radius: 0.8, aoe: 4, knockback: 6, stun: 0, disarm: 0, homing: 1 },
  stone: { id: 'stone', name: 'Piertotum', color: 0xd8c08a, damage: 20, speed: 22, cost: 0, cooldown: 0, radius: 0.7, aoe: 1.5, knockback: 9, stun: 0.3, disarm: 0 },
  avis: { id: 'avis', name: 'Oppugno Avis', color: 0xfff27a, damage: 7, speed: 24, cost: 0, cooldown: 0, radius: 0.3, aoe: 0, knockback: 2, stun: 0, disarm: 0, homing: 4 },
  firework: { id: 'firework', name: 'Wildfire Whizzbang', color: 0xff5cf0, damage: 10, speed: 22, cost: 0, cooldown: 0, radius: 0.4, aoe: 2.5, knockback: 3, stun: 0.2, disarm: 0, homing: 1.2 },
  dagger: { id: 'dagger', name: 'Cursed Dagger', color: 0x9a8cff, damage: 9, speed: 42, cost: 0, cooldown: 0, radius: 0.25, aoe: 0, knockback: 1, stun: 0, disarm: 0 },
  sectum: { id: 'sectum', name: 'Sectumsempra', color: 0xff1a3c, damage: 15, speed: 38, cost: 14, cooldown: 0.9, radius: 0.35, aoe: 0, knockback: 2, stun: 0, disarm: 0 },
  lumos: { id: 'lumos', name: 'Lumos Maxima', color: 0xfffbe0, damage: 5, speed: 30, cost: 8, cooldown: 0.6, radius: 0.5, aoe: 1.5, knockback: 2, stun: 0.6, disarm: 0 },
  avada: { id: 'avada', name: 'Avada Kedavra', color: 0x22ff44, damage: 40, speed: 26, cost: 30, cooldown: 5, radius: 0.4, aoe: 0, knockback: 3, stun: 0, disarm: 0, unblockable: true },
};
export const PLAYER_SPELLS: SpellId[] = ['expelliarmus', 'stupefy', 'confringo', 'bombarda', 'depulso'];

export interface Combatant {
  hp: number; maxHp: number; energy: number; maxEnergy: number; stamina: number; maxStamina: number;
  shielding: boolean; barrier?: number; ccImmune?: number; stunned: number; disarmed: number; invuln: number; power: number; defense: number;
}
export interface HitResult { damage: number; blocked: boolean; stun: number; disarm: number; knock: number; }

/** Resolve a spell hit on a target. falloff 0..1 for AoE splash (1 = direct). */
export function applyHit(t: Combatant, s: SpellDef, power = 1, falloff = 1): HitResult {
  if (t.invuln > 0 || t.hp <= 0) return { damage: 0, blocked: false, stun: 0, disarm: 0, knock: 0 };
  let dmg = s.damage * power * falloff / Math.max(0.3, t.defense);
  let blocked = false;
  if ((t.barrier ?? 0) > 0 && !s.unblockable) { blocked = true; dmg *= 0.1; }
  else if (t.shielding && !s.unblockable && t.energy > 0) {
    blocked = true;
    t.energy = Math.max(0, t.energy - dmg * 0.6);
    dmg *= 0.1;
  }
  dmg = Math.round(dmg * 10) / 10;
  t.hp = Math.max(0, t.hp - dmg);
  // crowd-control with immunity window (prevents stun/disarm lock)
  const ccOk = !blocked && (t.ccImmune ?? 0) <= 0;
  const stun = ccOk ? s.stun * falloff : 0;
  const disarm = ccOk ? s.disarm : 0;
  if (stun > 0.25 || disarm > 0) t.ccImmune = Math.max(stun, disarm) + 2;
  t.stunned = Math.max(t.stunned, stun);
  t.disarmed = Math.max(t.disarmed, disarm);
  return { damage: dmg, blocked, stun, disarm, knock: blocked ? s.knockback * 0.2 : s.knockback * falloff };
}
export function canCast(c: Combatant, s: SpellDef, cd: number): boolean {
  return c.hp > 0 && c.stunned <= 0 && c.disarmed <= 0 && cd <= 0 && c.energy >= s.cost;
}
export function splashFalloff(dist: number, aoe: number): number {
  if (aoe <= 0 || dist > aoe) return 0;
  return 1 - 0.6 * (dist / aoe);
}
/** Ray-sphere-ish swept test: segment p0->p1 vs sphere center c radius r (2D xz + y). */
export function segmentHitsSphere(p0: number[], p1: number[], c: number[], r: number): boolean {
  const d = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
  const f = [p0[0]-c[0], p0[1]-c[1], p0[2]-c[2]];
  const dd = d[0]*d[0]+d[1]*d[1]+d[2]*d[2];
  let t = dd > 0 ? -(f[0]*d[0]+f[1]*d[1]+f[2]*d[2]) / dd : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [p0[0]+d[0]*t-c[0], p0[1]+d[1]*t-c[1], p0[2]+d[2]*t-c[2]];
  return q[0]*q[0]+q[1]*q[1]+q[2]*q[2] <= r*r;
}
