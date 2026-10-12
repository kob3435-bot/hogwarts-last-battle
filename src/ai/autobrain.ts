/** Phase 10: dedicated tactical "AUTO" brain for the player's hero (optionally allies).
 *  Threat map (heroes, NPC crowd, projectiles, hazards/zones), kiting at optimal range, cluster avoidance,
 *  cover/LOS, ally cohesion, smart target priority, lead aiming, AoE on clusters, time-to-impact defence,
 *  retreat/heal/revive, resource + ultimate management. Pure logic over a small world interface. */
import * as THREE from 'three';
import type { Entity } from '../character/entity';
import { SPELLS, SpellId } from '../combat/spells';
import { ULT_MAX, Skill } from '../combat/skills';
import { pointInBoxes } from '../core/collision';
export type Aggro = 'defensive' | 'balanced' | 'aggressive';
export interface Pt { x: number; z: number; r?: number; melee?: boolean; dmg?: number; down?: boolean }
export interface SmartWorld {
  entities: Entity[]; projectiles: { alive: boolean; team: string; pos: THREE.Vector3; vel: THREE.Vector3; spell: { damage: number; aoe: number } }[];
  cast(e: Entity, spell: string, target: THREE.Vector3): boolean; startDodge(e: Entity, dir: THREE.Vector3): boolean; useSkill(e: Entity, idx: number, aim?: THREE.Vector3): boolean;
  boxes: any[]; hazards: Pt[]; npcFoes(e: Entity, r: number): Pt[]; npcAllies(e: Entity, r: number): Pt[]; bolts(e: Entity): { pos: THREE.Vector3; vel: THREE.Vector3; dmg: number }[];
  revive?(e: Entity, r: number): number; objective?: THREE.Vector3 | null; difficulty: number; time: number;
}
export const AGGRO: Record<Aggro, { lowHp: number; range: number; threatW: number; cluster: number; reserve: number; push: number }> = {
  defensive: { lowHp: 0.5, range: 1.2, threatW: 1.5, cluster: 2, reserve: 30, push: 0.5 },
  balanced: { lowHp: 0.35, range: 1.0, threatW: 1.0, cluster: 2, reserve: 20, push: 1 },
  aggressive: { lowHp: 0.22, range: 0.85, threatW: 0.7, cluster: 3, reserve: 10, push: 1.5 },
};
interface Mem { stuckT: number; lastP: THREE.Vector3 | null; detour: THREE.Vector3 | null; detourT: number; last: Map<number, THREE.Vector3>; vel: Map<number, THREE.Vector3>; goal: THREE.Vector3 | null; goalT: number; think: number; tgt: Entity | null; tgtP: Pt | null; reviveT: number; mode: string }
const MEM = new WeakMap<Entity, Mem>();
const mem = (e: Entity) => { let m = MEM.get(e); if (!m) MEM.set(e, m = { last: new Map(), vel: new Map(), goal: null, goalT: 0, think: 0, tgt: null, tgtP: null, reviveT: 0, mode: 'fight', stuckT: 0, lastP: null, detour: null, detourT: 0 }); return m; };
/** line of sight on the ground plane against world boxes */
export function los(boxes: any[], a: { x: number; z: number }, b: { x: number; z: number }) { const d = Math.hypot(b.x - a.x, b.z - a.z); const n = Math.ceil(d / 0.8);
  for (let i = 1; i < n; i++) { const t = i / n; if (pointInBoxes(a.x + (b.x - a.x) * t, 1.2, a.z + (b.z - a.z) * t, boxes)) return false; } return true; }
/** threat value at a point (higher = more dangerous) */
export function threatAt(p: { x: number; z: number }, heroes: Entity[], npcs: Pt[], hazards: Pt[], boxes: any[]) {
  let t = 0;
  for (const f of heroes) { const d = Math.hypot(f.pos.x - p.x, f.pos.z - p.z); const rng = f.def.ai.range * 1.3 + 4; if (d > rng + 6) continue; const pow = (f.def.boss ? 2.2 : 1) * (0.5 + f.hp / f.maxHp * 0.5);
    let v = pow * (d < 4 ? 2 : d < rng ? 1 : 0.4); if (d > 5 && !los(boxes, f.pos, p)) v *= 0.35; t += v; }
  for (const u of npcs) { const d = Math.hypot(u.x - p.x, u.z - p.z); const w = (u.dmg ?? 6) / 6; if (u.melee) t += d < 3 ? 1.6 * w : d < 7 ? 0.6 * w : 0; else t += d < 14 ? 0.35 * w * (d < 5 ? 1.6 : 1) : 0; }
  for (const h of hazards) { const d = Math.hypot(h.x - p.x, h.z - p.z); if (d < (h.r ?? 2) + 1.2) t += 6; }
  return t;
}
export function countNear(p: { x: number; z: number }, heroes: Entity[], npcs: Pt[], r: number) { let n = 0; for (const f of heroes) if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < r) n++; for (const u of npcs) if (Math.hypot(u.x - p.x, u.z - p.z) < r) n += u.melee || (u.dmg ?? 0) > 10 ? 1.5 : 1; return n; }
/** first-order intercept for a projectile of speed s */
export function lead(from: THREE.Vector3, at: THREE.Vector3, vel: THREE.Vector3, s: number) { let t = at.distanceTo(from) / s; for (let i = 0; i < 2; i++) t = at.clone().addScaledVector(vel, t).distanceTo(from) / s; return at.clone().addScaledVector(vel, Math.min(t, 1.5)); }
const gdPrev = (M: Mem) => (M as any).gd ?? 0;
export function updateSmartAI(e: Entity, w: SmartWorld, dt: number, aggro: Aggro = 'balanced'): { move: THREE.Vector3; sprint: boolean } {
  const move = new THREE.Vector3(); const M = mem(e); const C = AGGRO[aggro];
  const heroes = w.entities.filter(o => o.alive && o.def.team !== e.def.team && !o.cloaked);
  const allies = w.entities.filter(o => o.alive && o !== e && o.def.team === e.def.team);
  const npcs = w.npcFoes(e, 24); const myP = { x: e.pos.x, z: e.pos.z };
  // velocity memory for lead aiming
  for (const f of heroes) { const l = M.last.get(f.uid); if (l && dt > 0) M.vel.set(f.uid, f.pos.clone().sub(l).divideScalar(dt).setY(0).clampLength(0, 14)); M.last.set(f.uid, f.pos.clone()); }
  const objW = (w as any).objW ?? 1;
  const idle = !heroes.length && !npcs.length; if (idle) e.shielding = false;
  const hpr = e.hp / e.maxHp; const range = e.def.ai.range * C.range;
  // ---------------- defence: projectiles (time-to-impact) + melee ----------------
  const c = e.chest(); let tti = 99, pDir: THREE.Vector3 | null = null, pDmg = 0;
  const consider = (pos: THREE.Vector3, vel: THREE.Vector3, dmg: number, rad: number) => { const sp2 = vel.lengthSq(); if (sp2 < 1) return; const rel = c.clone().sub(pos); const t = rel.dot(vel) / sp2; if (t < 0 || t > 1.2) return; const miss = pos.clone().addScaledVector(vel, t).distanceTo(c); if (miss > rad) return; if (t < tti) { tti = t; pDir = vel.clone().setY(0).normalize(); } pDmg += dmg; };
  for (const p of w.projectiles) if (p.alive && p.team !== e.def.team) consider(p.pos, p.vel, p.spell.damage, 1.1 + p.spell.aoe * 0.5);
  for (const b of w.bolts(e)) consider(b.pos, b.vel, b.dmg, 0.9);
  const meleeNear = npcs.filter(u => u.melee && Math.hypot(u.x - e.pos.x, u.z - e.pos.z) < 2.6).length + heroes.filter(f => f.pos.distanceTo(e.pos) < 2.2).length;
  e.ai.shieldT -= dt; M.think -= dt; M.goalT -= dt;
  if (pDir && tti < 0.9) {
    const big = pDmg >= 18 || hpr < 0.5;
    if (tti < 0.42 && e.stamina > 22 && e.dodgeT <= 0 && (big || e.energy < 12 || Math.random() < 0.5)) {
      const perp = new THREE.Vector3(-(pDir as THREE.Vector3).z, 0, (pDir as THREE.Vector3).x); const a = e.pos.clone().addScaledVector(perp, 3), b2 = e.pos.clone().addScaledVector(perp, -3);
      const ta = threatAt(a, heroes, npcs, w.hazards, w.boxes) + (pointInBoxes(a.x, 1, a.z, w.boxes) ? 99 : 0), tb = threatAt(b2, heroes, npcs, w.hazards, w.boxes) + (pointInBoxes(b2.x, 1, b2.z, w.boxes) ? 99 : 0);
      if (!w.startDodge(e, ta <= tb ? perp : perp.negate()) && e.energy > 6) e.ai.shieldT = tti + 0.25;
    } else if (tti < 0.75 && e.energy > 6 && e.ai.shieldT <= 0) e.ai.shieldT = tti + 0.2;
  }
  if (meleeNear >= 2 && e.stamina > 30 && e.dodgeT <= 0) { const away = new THREE.Vector3(); for (const u of npcs) if (Math.hypot(u.x - e.pos.x, u.z - e.pos.z) < 4) away.add(new THREE.Vector3(e.pos.x - u.x, 0, e.pos.z - u.z)); for (const f of heroes) if (f.pos.distanceTo(e.pos) < 4) away.add(e.pos.clone().sub(f.pos).setY(0)); if (away.lengthSq() > 0.01) w.startDodge(e, away.normalize()); }
  e.shielding = e.ai.shieldT > 0 && e.energy > 4;
  // ---------------- target selection ----------------
  if (M.think <= 0) { M.think = 0.18 + 0.12 / w.difficulty;
    let best = -1e9; M.tgt = null; M.tgtP = null; const myDmg = 22;
    for (const f of heroes) { const d = f.pos.distanceTo(e.pos); let s = 10 - d * 0.35;
      if (f.hp < myDmg * 1.6) s += 9; else s += (1 - f.hp / f.maxHp) * 4;
      if (f.ai.target === e && f.castT < 0.6) s += 4; if (f.ai.target === e) s += 2;
      if (f.def.boss) s += (heroes.length <= 2 ? 6 : -3); if ((f.def.ovr ?? 70) > 85) s += 1.5;
      if (w.objective && f.pos.distanceTo(w.objective) < 8) s += 3;
      if (!los(w.boxes, e.pos, f.pos)) s -= 6; if (countNear(f.pos, [], npcs, 5) > C.cluster + 1 && d > range) s -= 2;
      if (s > best) { best = s; M.tgt = f; } }
    for (const u of npcs) { const d = Math.hypot(u.x - e.pos.x, u.z - e.pos.z); if (d > range * 1.4) continue; let s = 9 - d * 0.5 + (u.melee && d < 6 ? 4 : 0) + ((u.dmg ?? 6) > 10 ? 2 : 0); if (!los(w.boxes, e.pos, u)) s -= 6; if (s > best) { best = s; M.tgt = null; M.tgtP = u; } }
  }
  const tg = M.tgt && M.tgt.alive ? M.tgt : null; const tp = tg ? { x: tg.pos.x, z: tg.pos.z } : M.tgtP;
  // ---------------- movement goal: sample positions, score them ----------------
  const low = hpr < C.lowHp; const downed = w.npcAllies(e, 14).filter(u => u.down); const here = threatAt(myP, heroes, npcs, w.hazards, w.boxes);
  M.mode = low ? 'retreat' : downed.length && here < 1.2 ? 'revive' : 'fight';
  if (M.goalT <= 0 || !M.goal) { M.goalT = 0.35; let bs = -1e9, bg: THREE.Vector3 | null = null;
    const ally = allies.length ? allies.reduce((a, o) => a.add(o.pos), new THREE.Vector3()).divideScalar(allies.length) : null;
    for (let k = 0; k <= 24; k++) { const ang = k / 12 * Math.PI, rr = k === 0 ? 0 : k % 2 ? 3 : 6.5; const p = { x: e.pos.x + Math.cos(ang) * rr, z: e.pos.z + Math.sin(ang) * rr };
      if (Math.abs(p.x) > 60 || Math.abs(p.z) > 100 || pointInBoxes(p.x, 1, p.z, w.boxes)) continue; if (rr > 0 && !los(w.boxes, e.pos, p)) continue;
      let s = -threatAt(p, heroes, npcs, w.hazards, w.boxes) * 2.2 * C.threatW * (low ? 2 : 1);
      const cl = countNear(p, heroes, npcs, 5); if (cl > C.cluster) s -= (cl - C.cluster) * 6;
      const mid = { x: (p.x + e.pos.x) / 2, z: (p.z + e.pos.z) / 2 }; if (countNear(mid, heroes, npcs, 3.5) > C.cluster) s -= 5; // don't path through a crowd
      if (tp && !low) { const d = Math.hypot(tp.x - p.x, tp.z - p.z); s -= Math.abs(d - range) * 0.45 * C.push; if (!los(w.boxes, p, tp)) s -= 2.5; else s += 0.6; }
      if (low) { // retreat: away from foes, behind cover, towards allies
        let cover = 0; for (const f of heroes) if (f.pos.distanceTo(e.pos) < 25 && !los(w.boxes, f.pos, p)) cover++; s += cover * 2.5; }
      if (ally) { const d = Math.hypot(ally.x - p.x, ally.z - p.z); s -= Math.max(0, d - (low ? 3 : 9)) * (low ? 0.6 : 0.25); }
      if (M.mode === 'revive' && downed[0]) s -= Math.hypot(downed[0].x - p.x, downed[0].z - p.z) * 0.8;
      if (w.objective && !low) s -= Math.max(0, Math.hypot(w.objective.x - p.x, w.objective.z - p.z) - (objW >= 3 ? 1 : 8)) * 0.12 * objW * (here < 2 ? 2 : 1);
      if (rr === 0) s += 0.4; if (M.goal) s -= Math.hypot(M.goal.x - p.x, M.goal.z - p.z) * 0.05; // hysteresis
      if (s > bs) { bs = s; bg = new THREE.Vector3(p.x, 0, p.z); } }
    M.goal = bg ?? e.pos.clone(); }
  // stuck detection -> short random detour
  if (M.lastP && gdPrev(M) > 1.2 && M.lastP.distanceTo(e.pos) < 0.04 * Math.max(dt * 30, 1)) M.stuckT += dt; else M.stuckT = Math.max(0, M.stuckT - dt);
  M.lastP = e.pos.clone(); if (M.stuckT > 1.2) { const a = Math.random() * Math.PI * 2; M.detour = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); M.detourT = 1.4; M.stuckT = 0; }
  if (M.detourT > 0) { M.detourT -= dt; move.copy(M.detour!); (M as any).gd = 9; if (tp) e.yaw = Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z); return { move, sprint: false }; }
  const toG = M.goal!.clone().sub(e.pos).setY(0); const gd = toG.length(); (M as any).gd = gd;
  if (gd > 0.6) move.copy(toG.normalize()); else if (tp) { const side = new THREE.Vector3(tp.z - e.pos.z, 0, -(tp.x - e.pos.x)).normalize(); move.copy(side).multiplyScalar(Math.sin(w.time * 1.3 + e.uid) > 0 ? 0.6 : -0.6); } // strafe in place
  if (M.mode === 'revive' && w.revive && downed[0] && Math.hypot(downed[0].x - e.pos.x, downed[0].z - e.pos.z) < 2.6) { M.reviveT += dt; if (M.reviveT > 0.8) { w.revive(e, 2.6); M.reviveT = 0; } } else M.reviveT = 0;
  // ---------------- face + attack ----------------
  if (tp) e.yaw = Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z);
  const kit = e.kit; const nearN = countNear(myP, heroes, npcs, 8);
  const isHeal = (sk: Skill) => sk.effects.some(f => f.kind === 'heal');
  if (kit && e.castT > 0.25) {
    // heal skills when low (self/allies)
    for (let i = 0; i < kit.sigs.length; i++) { const sk = kit.sigs[i]; if (e.skillCd[i] > 0 || e.energy < sk.cost) continue; const allyLow = allies.some(a => a.hp < a.maxHp * 0.45 && a.pos.distanceTo(e.pos) < 10);
      if (isHeal(sk) && (hpr < 0.6 || allyLow)) { if (w.useSkill(e, i)) break; } }
    // ultimate timing
    if (e.ult >= ULT_MAX && tp) { const ut = kit.ult; const tdist = Math.hypot(tp.x - e.pos.x, tp.z - e.pos.z); const k = ut.effects.map(f => f.kind);
      const good = isHeal(ut) ? hpr < 0.5 : (nearN >= 2 && tdist < ut.range + 2) || (tg?.def.boss && tdist < ut.range) || (tg && tg.hp < tg.maxHp * 0.5 && tdist < ut.range) || hpr < 0.3 || k.includes('barrier') && pDmg > 20;
      if (good) w.useSkill(e, 3, tg ? tg.chest() : new THREE.Vector3(tp.x, 1.2, tp.z)); }
    // offensive signatures
    if (tp) for (let i = 0; i < kit.sigs.length; i++) { const sk = kit.sigs[i]; if (isHeal(sk) || e.skillCd[i] > 0 || e.energy < sk.cost + C.reserve * 0.5) continue; const tdist = Math.hypot(tp.x - e.pos.x, tp.z - e.pos.z);
      const k = sk.effects.map(f => f.kind); const nova = sk.effects.find(f => f.kind === 'nova') as any;
      const ok = nova ? countNear(myP, heroes, npcs, nova.radius * 0.85) >= 2 : k.includes('teleport') || k.includes('blink') ? low || meleeNear >= 2 : k.includes('barrier') ? pDmg > 15 || here > 3 : tdist < sk.range;
      if (ok && Math.random() < 0.6) { if (w.useSkill(e, i, tg ? tg.chest() : new THREE.Vector3(tp.x, 1.2, tp.z))) break; } }
  }
  if (tp && !e.shielding && e.castT > 0.12) { const tdist = Math.hypot(tp.x - e.pos.x, tp.z - e.pos.z);
    const clusterT = countNear(tp, heroes, npcs, 3.5); let best: SpellId | null = null, bv = -1e9;
    for (const id of e.def.spells) { const s = SPELLS[id]; if ((e.cds[id] ?? 0) > 0 || e.energy < s.cost) continue; if (id === 'protego' as any) continue;
      if (e.energy - s.cost < C.reserve && s.cost > 10 && !(tg && tg.hp < s.damage)) continue; // keep energy for Protego
      let v = s.damage / 10; if (s.aoe > 0) { v += clusterT >= 3 ? clusterT * 1.6 : -1; if (tdist < s.aoe + 1.5) v -= 8; }
      if (s.stun > 0.5) v += tg && tg.castT < 0.5 ? 2 : 1; if (tg && tg.hp < s.damage * 1.1) v += 4; if (s.knockback > 10 && tdist < 5) v += 3; if (s.speed < 20 && tdist > 16) v -= 2;
      v -= s.cost / 30; if (v > bv) { bv = v; best = id; } }
    if (best && tdist < range * 1.9 && (tg ? los(w.boxes, e.pos, tg.pos) : true)) { const s = SPELLS[best];
      const at = tg ? lead(e.chest(), tg.chest(), M.vel.get(tg.uid) ?? new THREE.Vector3(), s.speed || 40) : new THREE.Vector3(tp.x, 1.2, tp.z);
      w.cast(e, best, at); } }
  if (move.lengthSq() > 1) move.normalize();
  return { move, sprint: (low || gd > 5) && e.stamina > 45 };
}
