import * as THREE from 'three';
import { Entity } from '../character/entity';
import { AIContext, bestAction, pickSpell } from './utility';
import type { Projectile } from '../combat/projectiles';
import { ULT_MAX, Skill } from '../combat/skills';
export interface AIWorld { entities: Entity[]; projectiles: Projectile[]; cast(e: Entity, spell: string, target: THREE.Vector3): boolean; startDodge(e: Entity, dir: THREE.Vector3): boolean; heal(e: Entity, ally: Entity): boolean; useSkill(e: Entity, idx: number): boolean; difficulty: number; npcFoe?(e: Entity): { x: number; z: number; dist: number; y: number } | null; }
/** Estimate most dangerous incoming projectile: returns [threat 0..1, timeToImpact, projectile] */
export function incomingThreat(e: Entity, projs: Projectile[]): [number, number, Projectile | null] {
  let best = 0, tt = 99, bp: Projectile | null = null; const c = e.chest();
  for (const p of projs) { if (!p.alive || p.team === e.def.team) continue;
    const rel = c.clone().sub(p.pos); const sp = p.vel.length(); const t = rel.dot(p.vel) / (sp * sp); if (t < 0 || t > 1.2) continue;
    const miss = p.pos.clone().addScaledVector(p.vel, t).distanceTo(c); const r = 1.0 + p.spell.aoe * 0.5; if (miss > r) continue;
    const th = Math.min(1, p.spell.damage / 25 + 0.35); if (th > best || t < tt) { best = Math.max(best, th); tt = Math.min(tt, t); bp = p; } }
  return [best, tt, bp];
}
export function updateAI(e: Entity, w: AIWorld, dt: number): { move: THREE.Vector3; sprint: boolean } {
  const move = new THREE.Vector3(); const A = e.ai; const d = e.def.ai;
  if (e.scripted) return { move, sprint: false };
  const foes = w.entities.filter(o => o.alive && o.def.team !== e.def.team && !o.cloaked);
  if (!foes.length) { e.shielding = false; return { move, sprint: false }; }
  // target selection: nearest, Death Eaters slightly prefer the player, Ron prefers the boss
  let best = Infinity; A.target = null;
  for (const f of foes) { let s = f.pos.distanceTo(e.pos); if (f.playerControlled && e.def.team === 'death') s *= 0.75; if (f.def.boss && e.def.id === 'ron') s *= 0.6; if (f.hp < f.maxHp * 0.3) s *= 0.8; if (s < best) { best = s; A.target = f; } }
  const tgt = A.target!; const toT = tgt.pos.clone().sub(e.pos); toT.y = 0; let dist = toT.length(); toT.normalize();
  const nf = w.npcFoe ? w.npcFoe(e) : null; const npcAim = nf && nf.dist < dist * 0.6 ? nf : null;
  if (npcAim) { toT.set(npcAim.x - e.pos.x, 0, npcAim.z - e.pos.z).normalize(); dist = npcAim.dist; }
  e.yaw = Math.atan2(toT.x, toT.z);
  A.think -= dt; A.strafeT -= dt; A.shieldT -= dt;
  if (A.strafeT <= 0) { A.strafeDir *= -1; A.strafeT = 1 + Math.random() * 2; }
  const [threat, tti] = incomingThreat(e, w.projectiles);
  const allies = w.entities.filter(o => o.alive && o !== e && o.def.team === e.def.team);
  const hurt = allies.find(o => o.hp < o.maxHp * 0.4 && o.pos.distanceTo(e.pos) < 18);
  if (A.think <= 0) {
    const bossWaiting = e.def.boss && allies.length > 2; // Voldemort watches from afar until his followers fall
    A.think = d.reaction / w.difficulty * (0.7 + Math.random() * 0.6) * (bossWaiting ? 3 : 1);
    const ctx: AIContext = { hp: e.hp, maxHp: e.maxHp, energy: e.energy, maxEnergy: e.maxEnergy, stamina: e.stamina, distToTarget: dist, incomingThreat: threat, threatTime: tti,
      preferredRange: e.def.boss && allies.length > 2 ? 24 : d.range, aggression: d.aggression, caution: d.caution, spells: bossWaiting ? e.def.spells.filter(x => x !== 'avada') : e.def.spells, cooldowns: e.cds,
      enemiesNearTarget: foes.filter(f => f !== tgt && f.pos.distanceTo(tgt.pos) < 4).length, canHeal: d.canHeal && (e.cds['heal' as never] ?? 0) <= 0, allyLowHp: !!hurt };
    A.action = bestAction(ctx);
    if (A.action === 'dodge') { const side = new THREE.Vector3(toT.z, 0, -toT.x).multiplyScalar(Math.random() < .5 ? 1 : -1); if (!w.startDodge(e, side)) A.action = 'shield'; }
    if (A.action === 'shield') A.shieldT = 0.5 + d.caution * 0.6;
    if (A.action === 'heal' && hurt) w.heal(e, hurt);
    // signature skills / ultimate (AI)
    const kit = e.kit; const nearFoes = foes.filter(f => f.pos.distanceTo(e.pos) < 8).length;
    const fits = (sk: Skill) => { const k = sk.effects.map(f => f.kind);
      if (k.includes('heal')) return !!hurt || e.hp < e.maxHp * 0.5; if (k.includes('barrier')) return threat > 0.3 || allies.filter(a => a.hp < a.maxHp * 0.6).length >= 2;
      if (k.includes('nova')) { const r = (sk.effects.find(f => f.kind === 'nova') as any).radius; return foes.filter(f => f.pos.distanceTo(e.pos) < r * 0.85).length >= 1; }
      if (k[0] === 'cleanse' || k[0] === 'haste') return dist < 20 || !!hurt; if (k.includes('buff') && k.length === 1) return dist < 18; if (k.includes('teleport')) return dist > 14; return dist < sk.range; };
    if (kit && !(e.def.boss && allies.length > 2)) {
      if (e.ult >= ULT_MAX && (fits(kit.ult) || nearFoes >= 2)) w.useSkill(e, 3);
      else for (let i = 0; i < kit.sigs.length; i++) if (e.skillCd[i] <= 0 && e.energy >= kit.sigs[i].cost && Math.random() < 0.45 && fits(kit.sigs[i])) { if (w.useSkill(e, i)) break; }
    }
    if (!(bossWaiting && Math.random() < 0.75) && (A.action === 'attack' || (A.action === 'strafe' && Math.random() < d.aggression * 0.6) || (A.action === 'retreat' && Math.random() < 0.4))) {
      const sp = pickSpell(ctx); if (sp) { const spread = 1.6 / w.difficulty; const aim = npcAim ? new THREE.Vector3(npcAim.x, npcAim.y, npcAim.z) : tgt.chest(); aim.x += (Math.random() - .5) * spread; aim.z += (Math.random() - .5) * spread; w.cast(e, sp, aim); }
    }
  }
  e.shielding = A.shieldT > 0 && e.energy > 5;
  const side = new THREE.Vector3(toT.z, 0, -toT.x).multiplyScalar(A.strafeDir);
  switch (A.action) {
    case 'approach': move.copy(toT).addScaledVector(side, 0.4); break;
    case 'retreat': move.copy(toT).multiplyScalar(-1).addScaledVector(side, 0.5); break;
    default: move.copy(side); if (dist > d.range * 1.3) move.addScaledVector(toT, 0.8); else if (dist < d.range * 0.6) move.addScaledVector(toT, -0.7);
  }
  if (move.lengthSq() > 1) move.normalize();
  return { move, sprint: A.action === 'approach' && dist > d.range * 1.6 };
}
