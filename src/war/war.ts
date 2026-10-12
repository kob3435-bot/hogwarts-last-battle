import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Game } from '../game';
import type { Entity } from '../character/entity';
import { UNITS, UnitDef, UnitType, pickType, dmgVs } from './units';
import { ZONES, SPAWN, clampToMap, waypoint } from './map';
import { updateControl, scoreRate, clampScore, warWinner } from './zones';
import { Grid, FpsScaler, lodInterval, shouldUpdate } from './perf';
import { Mission, MissionKind, MISSION_TEXT, createMission, stepMission } from './missions';
import { resolveCircle } from '../core/collision';
import { segmentHitsSphere } from '../combat/spells';
import { toon, addRim, inflate } from '../rendering/toon';
import { crowdLayers, unitPalette, Tint } from './crowd';
type CrowdMesh = { layers: { im: THREE.InstancedMesh; tint: Tint | 'outline' }[] };

export type Order = 'attack' | 'defend' | 'retreat' | 'protect';
export interface Squad { id: number; team: 'hogwarts' | 'death'; name: string; nameTh: string; order: Order; zone: number; protect: Entity | null; manual: boolean }
export interface Unit { idx: number; def: UnitDef; active: boolean; x: number; z: number; yaw: number; hp: number; maxHp: number; state: 'fight' | 'downed' | 'dead';
  downT: number; deadT: number; cd: number; think: number; target: number; targetEnt: Entity | null; squad: number; reviveT: number; tag: number; acc: number; bob: number; color: number; ox: number; oz: number; debuff: number }
interface Bolt { active: boolean; x: number; y: number; z: number; dx: number; dy: number; dz: number; t: number; team: string; dmg: number; target: number; ent: Entity | null; color: number; src: UnitType }
const MAX = 300, MAXB = 420;
const tmp = new THREE.Object3D(), col = new THREE.Color();

export class War {
  units: Unit[] = []; bolts: Bolt[] = []; grid = new Grid(6); scaler = new FpsScaler(100, 300, 180); cap = 180; frame = 0;
  squads: Squad[]; controls: number[] = ZONES.map(z => z.home === 'hogwarts' ? 1 : z.home === 'death' ? -1 : 0); score = 0; winner: 0 | 1 | -1 = 0;
  cfg = { hogwarts: true, death: true, missions: true, deathPower: 1, army: 0 }; missions: Mission[] = []; missionT = 15; spawnT = 0; zoneT = 0; aiCmdT = 0; morale = { hogwarts: 0, death: 0 };
  stats = { kills: { hogwarts: 0, death: 0 }, revived: 0, downed: 0, spawned: { hogwarts: 0, death: 0 }, missionsWon: 0, missionsLost: 0, structures: 0 };
  meshes = new Map<UnitType, CrowdMesh>();
  boltMesh: THREE.InstancedMesh; prevAlive = new Map<Entity, boolean>(); q: number[] = []; manualHogwarts = false;
  constructor(public g: Game) {
    const sq = (id: number, team: 'hogwarts' | 'death', name: string, nameTh: string, order: Order, zone: number): Squad => ({ id, team, name, nameTh, order, zone, protect: null, manual: false });
    this.squads = [sq(0, 'hogwarts', 'Gryffindor & Hufflepuff', 'กริฟฟินดอร์และฮัฟเฟิลพัฟ', 'defend', 2), sq(1, 'hogwarts', 'Ravenclaw & Slytherin', 'เรเวนคลอและสลิธีริน', 'defend', 1),
      sq(2, 'hogwarts', 'Order of the Phoenix', 'ภาคีนกฟีนิกซ์', 'attack', 2), sq(3, 'hogwarts', 'Stone Guardians', 'อัศวินหิน', 'defend', 3),
      sq(4, 'death', 'Death Eater Vanguard', 'กองหน้าผู้เสพความตาย', 'attack', 2), sq(5, 'death', 'Death Eater Flank', 'กองปีกผู้เสพความตาย', 'attack', 3), sq(6, 'death', 'Dark Creatures', 'สัตว์มืด', 'attack', 1)];
    for (let i = 0; i < MAX; i++) this.units.push({ idx: i, def: UNITS.student, active: false, x: 0, z: 0, yaw: 0, hp: 0, maxHp: 1, state: 'dead', downT: 0, deadT: 0, cd: 0, think: 0, target: -1, targetEnt: null, squad: 0, reviveT: 0, tag: 0, acc: 0, bob: Math.random() * 6, color: 0, ox: 0, oz: 0, debuff: 0 });
    for (let i = 0; i < MAXB; i++) this.bolts.push({ active: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, t: 0, team: '', dmg: 0, target: -1, ent: null, color: 0, src: 'student' });
    this.buildMeshes();
    this.boltMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAXB); this.boltMesh.count = 0; this.boltMesh.frustumCulled = false; g.world.scene.add(this.boltMesh);
    for (const e of g.entities) this.prevAlive.set(e, e.alive);
    const sc = (g as any).warCfg; if (sc) Object.assign(this.cfg, sc); const A = this.cfg.army; if (A > 0) { this.scaler = new FpsScaler(Math.min(100, A), A, A); this.cap = A; } const init = A > 0 ? Math.round(A * 0.4) : 70; if (this.cfg.hogwarts) for (let i = 0; i < init; i++) this.spawn('hogwarts', true); if (this.cfg.death) for (let i = 0; i < init; i++) this.spawn('death', true);
  }
  buildMeshes() {
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0a0812, side: THREE.BackSide });
    const types: UnitType[] = ['student', 'order', 'deathEater', 'statue', 'giant', 'acromantula', 'dementor'];
    tmp.position.set(0, -50, 0); tmp.scale.setScalar(0.0001); tmp.rotation.set(0, 0, 0); tmp.updateMatrix();
    for (const type of types) { const layers = crowdLayers(type); const list: CrowdMesh['layers'] = [];
      for (const L of layers) { const mat = toon(0xffffff, { emissive: L.emissive }); mat.vertexColors = true; if (L.transparent) { mat.transparent = true; mat.opacity = 0.84; mat.depthWrite = false; } if (L.rim) addRim(mat, L.rim, type === 'dementor' ? 0.6 : 0.4);
        const im = new THREE.InstancedMesh(L.geo, mat, MAX); list.push({ im, tint: L.tint }); }
      const silhouette = mergeGeometries(layers.filter(l => !l.noOutline).map(l => { const g = l.geo.clone(); g.deleteAttribute('color'); return g; }))!;
      const outline = new THREE.InstancedMesh(inflate(silhouette, type === 'giant' ? 0.03 : 0.02), outlineMat, MAX); list.push({ im: outline, tint: 'outline' as any });
      for (const { im, tint } of list) { im.count = 0; im.frustumCulled = false; im.castShadow = tint !== ('outline' as any) && tint !== 'fixed'; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.g.world.scene.add(im);
        for (let i = 0; i < MAX; i++) { im.setMatrixAt(i, tmp.matrix); if (tint !== ('outline' as any)) im.setColorAt(i, col.setHex(0xffffff)); } }
      this.meshes.set(type, { layers: list }); }
  }
  // ---------- spawning ----------
  spawn(team: 'hogwarts' | 'death', initial = false, forceType?: UnitType, at?: { x: number; z: number }, tag = 0, downed = false): Unit | null {
    const u = this.units.find(x => !x.active); if (!u) return null;
    let type = forceType ?? pickType(team, Math.random()); if (type === 'giant' && !forceType && this.units.filter(x => x.active && x.state === 'fight' && x.def.type === 'giant').length >= 1) type = 'deathEater';
    const def = UNITS[type]; let p = at ?? SPAWN[team];
    if (initial && !at) { // start already deployed across own half
      const zs = team === 'hogwarts' ? [0, 1, 2, 3] : [4, 2, 1, 3]; const zn = ZONES[zs[Math.floor(Math.random() * zs.length)]]; p = { x: zn.x, z: zn.z + (team === 'hogwarts' ? -4 : 4) }; }
    Object.assign(u, { def, active: true, hp: def.hp, maxHp: def.hp, state: downed ? 'downed' : 'fight', downT: downed ? 40 : 0, deadT: 0, cd: Math.random(), think: Math.random() * 0.5, target: -1, targetEnt: null, reviveT: 0, tag, acc: 0, debuff: 0,
      color: def.color[Math.floor(Math.random() * def.color.length)], ox: (Math.random() - .5) * 8, oz: (Math.random() - .5) * 8 });
    if (downed) u.hp = 0;
    [u.x, u.z] = clampToMap(p.x + (Math.random() - .5) * 6, p.z + (Math.random() - .5) * 6);
    if (team === 'hogwarts') u.squad = type === 'statue' ? 3 : type === 'order' ? 2 : (u.idx % 2); else u.squad = type === 'deathEater' ? 4 + (u.idx % 2) : 6;
    for (const [t2, m2] of this.meshes) if (t2 !== type) { tmp.position.set(0, -50, 0); tmp.scale.setScalar(0.0001); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); for (const { im } of m2.layers) { im.setMatrixAt(u.idx, tmp.matrix); im.instanceMatrix.needsUpdate = true; } }
    const pal = unitPalette(type, u.color); const m = this.meshes.get(type)!;
    for (const { im, tint } of m.layers) { if (!im.instanceColor) continue; const hx = tint === 'c1' ? pal.c1 : tint === 'c2' ? pal.c2 : tint === 'skin' ? pal.skin : tint === 'hair' ? pal.hair : 0xffffff; im.setColorAt(u.idx, col.setHex(hx)); im.instanceColor.needsUpdate = true; }
    if (false as boolean) { const m: any = null; m.body.setColorAt(u.idx, col.setHex(u.color)); m.head.setColorAt(u.idx, col.setHex(type === 'deathEater' ? 0xd8dde6 : type === 'statue' ? 0xc8c4b8 : type === 'giant' ? 0xa07a5a : type === 'acromantula' ? 0x2a2026 : type === 'dementor' ? 0x0d0a14 : 0xffdcc0));
    }
    this.stats.spawned[team]++; return u;
  }
  teamCount(team: string) { let n = 0; for (const u of this.units) if (u.active && u.state === 'fight' && u.def.team === team) n++; return n; }
  // ---------- damage ----------
  curBy: Entity | null = null;
  damageUnit(u: Unit, dmg: number, spellId: string, byTeam: string) { const credit = this.curBy && this.curBy.def.team === byTeam && !['bolt', 'melee', 'drain'].includes(spellId) && u.hp > 0 ? this.curBy : null;
    if (!u.active || u.state !== 'fight') return; u.hp -= dmgVs(u.def.type, dmg, spellId);
    if (u.hp <= 0) { if (u.def.canDown) { u.state = 'downed'; u.downT = 25; u.hp = 0; this.stats.downed++; } else this.kill(u); if (byTeam) this.stats.kills[byTeam as 'hogwarts']++; if (credit) (credit as any).npcKills = ((credit as any).npcKills ?? 0) + 1; }
  }
  kill(u: Unit) { u.state = 'dead'; u.deadT = 3; u.hp = 0; if (u.def.type === 'giant') { this.score = clampScore(this.score + (u.def.team === 'death' ? 3 : -3)); this.g.particles.emit(new THREE.Vector3(u.x, 2, u.z), 0xc8b8a0, 30, 6, 2, 1, -0.5, false); } }
  hitTest(prev: THREE.Vector3, pos: THREE.Vector3, rad: number, team: string): Unit | null {
    const near = this.grid.query(pos.x, pos.z, 4, this.q); let best: Unit | null = null;
    for (const i of near) { const u = this.units[i]; if (!u.active || u.state !== 'fight' || u.def.team === team) continue; const s = u.def.scale; if (segmentHitsSphere(prev.toArray(), pos.toArray(), [u.x, s * (u.def.type === 'dementor' ? 1.8 : 0.9), u.z], u.def.radius * s * 0.9 + rad)) { best = u; break; } }
    return best;
  }
  splash(p: THREE.Vector3, r: number, dmg: number, team: string, spellId = '') { for (const i of this.grid.query(p.x, p.z, r, this.q).slice()) { const u = this.units[i]; if (!u.active || u.def.team === team) continue; const d = Math.hypot(u.x - p.x, u.z - p.z); if (d < r) { this.damageUnit(u, dmg * (1 - 0.5 * d / r), spellId, team); const k = (1 - d / r) * 2 / u.def.scale; u.x += (u.x - p.x) / (d + 0.1) * k; u.z += (u.z - p.z) / (d + 0.1) * k; } } }
  reviveInRadius(p: THREE.Vector3, r: number) { let n = 0; for (const u of this.units) if (u.active && u.state === 'downed' && Math.hypot(u.x - p.x, u.z - p.z) < r) { this.revive(u); n++; } return n; }
  revive(u: Unit) { u.state = 'fight'; u.hp = u.maxHp * 0.45; u.reviveT = 0; this.stats.revived++; if (u.tag) this.rescued.set(u.tag, (this.rescued.get(u.tag) ?? 0) + 1); this.g.particles.emit(new THREE.Vector3(u.x, 1.2, u.z), 0x6dffa8, 14, 3, 0.6, 0.8); }
  rescued = new Map<number, number>();
  nearestFoeUnit(e: Entity, r = 22) { let best: Unit | null = null, bd = r; for (const i of this.grid.query(e.pos.x, e.pos.z, r, this.q)) { const u = this.units[i]; if (!u.active || u.state !== 'fight' || u.def.team === e.def.team) continue; const d = Math.hypot(u.x - e.pos.x, u.z - e.pos.z); if (d < bd) { bd = d; best = u; } } return best ? { x: best.x, z: best.z, dist: bd, y: best.def.scale * 0.9 } : null; }
  // ---------- squads / AI commanders ----------
  setOrder(squad: number, order: Order, zone?: number, protect?: Entity | null) { const s = this.squads[squad]; s.order = order; if (zone !== undefined) s.zone = zone; if (protect !== undefined) s.protect = protect; s.manual = true; for (const u of this.units) if (u.active && u.squad === squad) u.target = -1; }
  aiCommand() {
    const c = this.controls; const deathPath = [4, 2, 3, 1, 0]; const firstNotHeld = deathPath.find(z => c[z] > -0.6) ?? 0; const second = deathPath.find(z => z !== firstNotHeld && c[z] > -0.6) ?? firstNotHeld;
    this.squads[4].zone = firstNotHeld; this.squads[6].zone = Math.random() < 0.5 ? firstNotHeld : second; this.squads[5].zone = second; for (const k of [4, 5, 6]) this.squads[k].order = 'attack';
    if (this.manualHogwarts) return;
    // Hogwarts AI commander: mass where the Death Eater main thrust is going, screen the flank
    const main = this.squads[4].zone === 4 ? 2 : this.squads[4].zone, flank = this.squads[5].zone === 4 ? 2 : this.squads[5].zone;
    const ord = (z: number): Order => c[z] < -0.3 ? 'attack' : 'defend';
    this.squads[0].zone = main; this.squads[0].order = ord(main); this.squads[2].zone = main; this.squads[2].order = ord(main);
    this.squads[1].zone = flank; this.squads[1].order = ord(flank); this.squads[3].zone = main; this.squads[3].order = 'defend';
    if (c.slice(1, 4).every(x => x > 0.6)) { this.squads[2].zone = 4; this.squads[2].order = 'attack'; } // push to the bridge once the courtyard is secure
    const hero = this.g.entities.find(e => e.def.team === 'hogwarts' && e.alive && e.def.id === 'harry'); if (hero && Math.random() < 0.3) { this.squads[1].order = 'protect'; this.squads[1].protect = hero; }
  }
  // ---------- missions ----------
  newMission() {
    const kinds: MissionKind[] = ['rescue', 'giant', 'hold', 'dementors', 'protect']; const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const zone = [1, 2, 3][Math.floor(Math.random() * 3)]; const zn = ZONES[zone]; let m: Mission;
    if (kind === 'rescue') { m = createMission('rescue', zone, 3, 45); for (let i = 0; i < 4; i++) this.spawn('hogwarts', false, 'student', { x: zn.x, z: zn.z }, m.id, true); }
    else if (kind === 'giant') { m = createMission('giant', 4, 1, 75); this.spawn('death', false, 'giant', SPAWN.death, m.id); }
    else if (kind === 'hold') { m = createMission('hold', zone, 20, 60); }
    else if (kind === 'dementors') { m = createMission('dementors', zone, 5, 60); for (let i = 0; i < 5; i++) this.spawn('death', false, 'dementor', { x: zn.x, z: zn.z }, m.id); }
    else { const heroes = this.g.entities.filter(e => e.def.team === 'hogwarts' && e.alive); if (!heroes.length) return; const h = heroes[Math.floor(Math.random() * heroes.length)]; m = createMission('protect', zone, 40, 40, h.def.id); }
    this.missions.push(m); const T = MISSION_TEXT[m.kind]; this.g.onBanner(`⚑ ${T.en}`, `${ZONES[m.zone].name}${m.targetName ? ' · ' + m.targetName : ''}`, '#7dd3ff');
  }
  updateMissions(dt: number) {
    for (const m of this.missions) { if (m.status !== 'active') continue;
      const tagged = this.units.filter(u => u.active && u.tag === m.id);
      stepMission(m, dt, { rescued: this.rescued.get(m.id) ?? 0, giantDead: m.kind === 'giant' && !tagged.some(u => u.state === 'fight'), control: this.controls[m.zone],
        remaining: tagged.filter(u => u.state === 'fight').length, alive: m.kind === 'protect' ? !!this.g.entities.find(e => e.def.id === m.targetName && e.alive) : undefined });
      if (m.status === 'active') continue; const T = MISSION_TEXT[m.kind]; const ok = m.status === 'success';
      this.score = clampScore(this.score + (ok ? T.reward : -T.penalty)); if (ok) this.stats.missionsWon++; else this.stats.missionsLost++;
      // real effects
      if (ok && m.kind === 'rescue') for (let i = 0; i < 6; i++) this.spawn('hogwarts', false, 'student');
      if (ok && m.kind === 'hold') for (let i = 0; i < 3; i++) this.spawn('hogwarts', false, 'statue', { x: ZONES[m.zone].x, z: ZONES[m.zone].z });
      if (!ok && m.kind === 'dementors') this.morale.hogwarts = 20;
      if (!ok && m.kind === 'giant') for (let i = 0; i < 4; i++) this.spawn('death', false, 'acromantula');
      if (ok && m.kind === 'protect') { const h = this.g.entities.find(e => e.def.id === m.targetName); if (h) h.ult = 100; }
      this.g.onBanner(ok ? `✔ ${T.en}` : `✖ ${T.en}`, ok ? `+${T.reward}` : `-${T.penalty}`, ok ? '#7dff9a' : '#ff5070');
    }
    this.missions = this.missions.filter(m => m.status === 'active' || m.time < m.limit + 0.01 && false);
  }
  // ---------- main update ----------
  update(dt: number) {
    this.frame++; const g = this.g;
    if (this.morale.hogwarts > 0) this.morale.hogwarts -= dt;
    // population (auto-scaled cap)
    this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 1.5; for (const team of ['hogwarts', 'death'] as const) { if (!this.cfg[team]) continue; const want = Math.floor(this.cap * (team === 'death' ? 0.56 * this.cfg.deathPower : 0.44)); const have = this.teamCount(team); for (let k = 0; k < Math.min(5, want - have); k++) this.spawn(team);
        if (have > want + 10) { // FPS scaler lowered the cap: quietly retire the farthest untagged units
          const cam = this.g.camera.position; const far = this.units.filter(u => u.active && u.state === 'fight' && u.def.team === team && !u.tag && u.def.type !== 'giant').sort((a, b) => Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z));
          for (const u of far.slice(0, Math.min(4, have - want))) { u.active = false; u.state = 'dead'; } } } }
    // grid
    this.grid.clear(); for (const u of this.units) if (u.active && u.state !== 'dead') this.grid.insert(u.idx, u.x, u.z);
    // AI commanders
    this.aiCmdT -= dt; if (this.aiCmdT <= 0) { this.aiCmdT = 12; this.aiCommand(); }
    const cam = g.camera.position;
    for (const u of this.units) { if (!u.active) continue;
      if (u.state === 'dead') { u.deadT -= dt; if (u.deadT <= 0) u.active = false; continue; }
      if (u.state === 'downed') { u.downT -= dt; if (u.downT <= 0) this.kill(u); continue; }
      u.acc += dt; const iv = lodInterval(Math.hypot(u.x - cam.x, u.z - cam.z)); if (!shouldUpdate(u.idx, this.frame, iv)) continue;
      this.stepUnit(u, u.acc); u.acc = 0;
    }
    this.updateBolts(dt);
    // player rescue (hold F near downed ally)
    const pc = g.ctrl; if (pc.playerControlled && pc.alive && g.input.keys.has('KeyF')) { for (const i of this.grid.query(pc.pos.x, pc.pos.z, 2.5, this.q)) { const u = this.units[i]; if (u.state === 'downed' && u.def.team === pc.def.team) { u.reviveT += dt; if (u.reviveT > 1.2) { this.revive(u); g.onEvent('Rennervate! ✚', '#6dffa8'); } break; } } }
    // zones
    this.zoneT -= dt; if (this.zoneT <= 0) { const step = 0.5 - this.zoneT; this.zoneT = 0.5;
      ZONES.forEach((zn, k) => { let h = 0, d = 0; for (const i of this.grid.query(zn.x, zn.z, zn.r, this.q)) { const u = this.units[i]; if (u.state !== 'fight' || (u.x - zn.x) ** 2 + (u.z - zn.z) ** 2 > zn.r * zn.r) continue; const w = u.def.type === 'giant' ? 4 : 1; if (u.def.team === 'hogwarts') h += w; else d += w; }
        for (const e of g.entities) if (e.alive && (e.pos.x - zn.x) ** 2 + (e.pos.z - zn.z) ** 2 < zn.r * zn.r) { if (e.def.team === 'hogwarts') h += 3; else d += 3; }
        this.controls[k] = updateControl(this.controls[k], h, d, step); });
      this.score = clampScore(this.score + scoreRate(this.controls, ZONES.map(z => z.weight)) * step); }
    // named character deaths affect the war
    for (const e of g.entities) { const was = this.prevAlive.get(e) ?? true; if (was && !e.alive) { const v = e.def.boss ? 25 : e.def.playable ? 8 : 2; this.score = clampScore(this.score + (e.def.team === 'death' ? v : -v)); } this.prevAlive.set(e, e.alive); }
    this.missionT -= dt; if (this.cfg.missions && this.missionT <= 0) { this.missionT = 28 + Math.random() * 14; if (this.missions.filter(m => m.status === 'active').length < 2) this.newMission(); }
    this.updateMissions(dt);
    this.winner = warWinner(this.score);
    this.render(dt);
  }
  stepUnit(u: Unit, dt: number) {
    const g = this.g; const d = u.def; const sq = this.squads[u.squad]; u.cd -= dt; u.think -= dt; u.bob += dt * 3;
    if (u.think <= 0) { u.think = 0.5 + Math.random() * 0.3; this.chooseTarget(u, sq);
      if (d.medic && u.target === -1) { const near = this.grid.query(u.x, u.z, 12, this.q); for (const i of near) { const o = this.units[i]; if (o.state === 'downed' && o.def.team === d.team) { u.target = -2 - i; break; } } } }
    let tx: number, tz: number, engage = false, tp: { x: number; z: number; y: number } | null = null;
    if (u.target <= -2) { const o = this.units[-2 - u.target]; if (!o || o.state !== 'downed') u.target = -1; else { tx = o.x; tz = o.z; if (Math.hypot(o.x - u.x, o.z - u.z) < 1.6) { o.reviveT += dt; if (o.reviveT > 2) { this.revive(o); u.target = -1; } this.place(u, u.x, u.z, 0, dt); return; } } }
    if (u.target >= 0) { const o = this.units[u.target]; if (!o.active || o.state !== 'fight') u.target = -1; else tp = { x: o.x, z: o.z, y: o.def.scale * 0.9 }; }
    if (u.targetEnt) { if (!u.targetEnt.alive) u.targetEnt = null; else tp = { x: u.targetEnt.pos.x, z: u.targetEnt.pos.z, y: 1.3 }; }
    const z0 = ZONES[sq.zone];
    if (tp) { const dist = Math.hypot(tp.x - u.x, tp.z - u.z); engage = dist <= d.range;
      if (engage) { tx = u.x + (tp.z - u.z) * 0.02 * (u.idx % 2 ? 1 : -1); tz = u.z - (tp.x - u.x) * 0.02 * (u.idx % 2 ? 1 : -1); u.yaw = Math.atan2(tp.x - u.x, tp.z - u.z); if (u.cd <= 0) this.attack(u, tp); }
      else { tx = tp.x; tz = tp.z; } }
    else if (u.target > -2 || tx! === undefined) {
      if (sq.order === 'retreat') { const h = SPAWN[d.team]; tx = h.x + u.ox * 0.5; tz = h.z + u.oz * 0.3; }
      else if (sq.order === 'protect' && sq.protect && sq.protect.alive) { tx = sq.protect.pos.x + u.ox * 0.6; tz = sq.protect.pos.z + u.oz * 0.6; }
      else { tx = z0.x + u.ox * z0.r / 8; tz = z0.z + u.oz * z0.r / 8; } }
    if (!engage) { const [wx, wz] = waypoint(u.x, u.z, tx!, tz!); const dx = wx - u.x, dz = wz - u.z, l = Math.hypot(dx, dz); if (l > 0.6) { const sp = d.speed * (this.morale.hogwarts > 0 && d.team === 'hogwarts' ? 0.8 : 1); u.yaw = Math.atan2(dx, dz); const ox = u.x, oz = u.z; const side = (u.idx % 2 ? 1 : -1) * (u.reviveT > 0.5 ? 1.2 : 0); this.place(u, u.x + (dx / l + dz / l * side) * sp * dt, u.z + (dz / l - dx / l * side) * sp * dt, sp, dt);
        // stuck detection: if blocked, slide sideways for a while
        if (Math.hypot(u.x - ox, u.z - oz) < sp * dt * 0.25) u.reviveT = 1.5; else u.reviveT = Math.max(0, u.reviveT - dt); return; } }
    else this.place(u, tx!, tz!, 0, dt);
  }
  place(u: Unit, x: number, z: number, _sp: number, _dt: number) {
    // separation (cheap, grid based)
    for (const i of this.grid.query(x, z, 1.5, this.q)) { if (i === u.idx) continue; const o = this.units[i]; if (o.state === 'dead') continue; const dx = x - o.x, dz = z - o.z, dd = Math.hypot(dx, dz), min = (u.def.radius + o.def.radius) * Math.max(1, u.def.scale * 0.6); if (dd > 0.001 && dd < min) { x += dx / dd * (min - dd) * 0.5; z += dz / dd * (min - dd) * 0.5; } }
    [x, z] = resolveCircle(x, z, u.def.radius * Math.min(1.6, u.def.scale), this.g.world.boxes); [u.x, u.z] = clampToMap(x, z);
  }
  chooseTarget(u: Unit, sq: Squad) {
    const d = u.def; const aggro = sq.order === 'retreat' ? 6 : d.type === 'giant' ? 22 : 16; let best = -1, bd = aggro;
    for (const i of this.grid.query(u.x, u.z, aggro, this.q)) { const o = this.units[i]; if (o.state !== 'fight' || o.def.team === d.team) continue; const dd = Math.hypot(o.x - u.x, o.z - u.z); if (dd < bd) { bd = dd; best = i; } }
    u.target = best; u.targetEnt = null;
    for (const e of this.g.entities) { if (!e.alive || e.def.team === d.team || e.cloaked) continue; const dd = Math.hypot(e.pos.x - u.x, e.pos.z - u.z) * (e.playerControlled ? 0.8 : 1.1); if (dd < bd) { bd = dd; u.targetEnt = e; u.target = -1; } }
    if (sq.order === 'defend' && (u.target >= 0 || u.targetEnt)) { const zn = ZONES[sq.zone]; if (Math.hypot(u.x - zn.x, u.z - zn.z) > zn.r + 6) { /* still marching: only fight what is close */ if (bd > 9) { u.target = -1; u.targetEnt = null; } return; } const tx = u.targetEnt ? u.targetEnt.pos.x : this.units[u.target].x, tz = u.targetEnt ? u.targetEnt.pos.z : this.units[u.target].z; if (Math.hypot(tx - zn.x, tz - zn.z) > zn.r + 14) { u.target = -1; u.targetEnt = null; } }
  }
  attack(u: Unit, tp: { x: number; z: number; y: number }) {
    const d = u.def; u.cd = d.rate * (0.8 + Math.random() * 0.4); const mor = d.team === 'hogwarts' && this.morale.hogwarts > 0 ? 0.75 : 1; const dmg = d.dmg * mor;
    const near = Math.hypot(u.x - this.g.ctrl.pos.x, u.z - this.g.ctrl.pos.z) < 30;
    if (!d.melee) { const b = this.bolts.find(x => !x.active); if (!b) return; const sy = d.scale * 1.3; const miss = 1.2; const ex = tp.x + (Math.random() - .5) * miss, ez = tp.z + (Math.random() - .5) * miss; const dx = ex - u.x, dy = tp.y - sy, dz = ez - u.z, l = Math.hypot(dx, dy, dz) || 1;
      Object.assign(b, { active: true, x: u.x, y: sy, z: u.z, dx: dx / l, dy: dy / l, dz: dz / l, t: l / 26, team: d.team, dmg, target: u.target, ent: u.targetEnt, color: d.team === 'hogwarts' ? [0xff5040, 0xff4fd0, 0x55c8ff][u.idx % 3] : [0x30ff60, 0xb040ff][u.idx % 2], src: d.type }); return; }
    // melee
    const hitAt = new THREE.Vector3(tp.x, 0.8, tp.z);
    if (d.smash) { this.splash(hitAt, 3.5, dmg, d.team); for (const e of this.g.entities) if (e.alive && e.def.team !== d.team && e.pos.distanceTo(hitAt) < 3.5) this.hurtEntity(e, dmg, u); this.g.destruction.damageAt(hitAt, 60, 4); this.g.particles.emit(hitAt, 0xc8b8a0, 16, 5, 1.2, 0.6, 6, false); if (near) { this.g.shake = Math.max(this.g.shake, 0.4); } return; }
    if (d.drain) { for (const i of this.grid.query(u.x, u.z, d.range, this.q).slice()) { const o = this.units[i]; if (o.def.team !== d.team && o.state === 'fight') this.damageUnit(o, dmg, 'drain', d.team); } for (const e of this.g.entities) if (e.alive && e.def.team !== d.team && Math.hypot(e.pos.x - u.x, e.pos.z - u.z) < d.range) { this.hurtEntity(e, dmg, u); e.energy = Math.max(0, e.energy - 5); }
      this.g.particles.emit(new THREE.Vector3(u.x, 1.5, u.z), 0x9fb8ff, 6, 3, 0.8, 0.6, -0.5, false); return; }
    if (u.targetEnt) this.hurtEntity(u.targetEnt, dmg, u); else if (u.target >= 0) this.damageUnit(this.units[u.target], dmg, 'melee', d.team);
    this.g.particles.emit(hitAt, 0xffffff, 4, 3, 0.5, 0.2);
  }
  hurtEntity(e: Entity, dmg: number, u: Unit) { this.g.dealHit(null, e, this.g.npcSpell(u.def.name, dmg * 0.3), 1, 1, new THREE.Vector3(u.x, 0, u.z)); }
  updateBolts(dt: number) {
    for (const b of this.bolts) { if (!b.active) continue; const s = 26 * dt; b.x += b.dx * s; b.y += b.dy * s; b.z += b.dz * s; b.t -= dt;
      if (b.t <= 0) { b.active = false; const p = new THREE.Vector3(b.x, b.y, b.z);
        if (b.ent && b.ent.alive && b.ent.pos.distanceTo(p.clone().setY(0)) < 1.3) { const fake = { def: UNITS[b.src], x: b.x - b.dx, z: b.z - b.dz } as any; this.hurtEntity(b.ent, b.dmg, fake); }
        else if (b.target >= 0) { const o = this.units[b.target]; if (o.active && o.state === 'fight' && Math.hypot(o.x - b.x, o.z - b.z) < 1.3 * Math.max(1, o.def.scale * 0.6)) this.damageUnit(o, b.dmg, 'bolt', b.team); }
        if (Math.random() < 0.3) this.g.particles.emit(p, b.color, 2, 2, 0.4, 0.2); } }
  }
  // ---------- rendering (instancing) ----------
  render(dt: number) {
    const counts = new Map<UnitType, number>(); for (const k of this.meshes.keys()) counts.set(k, 0);
    let maxIdx = new Map<UnitType, number>();
    for (const u of this.units) { const m = this.meshes.get(u.def.type)!; const s = u.def.scale;
      if (!u.active) { tmp.position.set(0, -50, 0); tmp.scale.setScalar(0.0001); tmp.rotation.set(0, 0, 0); }
      else { const lying = u.state !== 'fight'; const fly = u.def.type === 'dementor' ? 0.6 + Math.sin(u.bob) * 0.25 : 0; tmp.position.set(u.x, fly + (lying ? 0.3 : Math.abs(Math.sin(u.bob * 2)) * 0.05 * s), u.z);
        tmp.rotation.set(lying ? -Math.PI / 2 : 0, u.yaw, 0, 'YXZ'); tmp.scale.setScalar(s); }
      tmp.updateMatrix(); for (const { im } of m.layers) im.setMatrixAt(u.idx, tmp.matrix);
      if (u.active) maxIdx.set(u.def.type, Math.max(maxIdx.get(u.def.type) ?? 0, u.idx + 1)); }
    // all instanced meshes share the same index space; draw up to the highest active index
    const top = this.units.reduce((a, u) => u.active ? Math.max(a, u.idx + 1) : a, 0);
    for (const [, m] of this.meshes) { for (const { im } of m.layers) { im.count = top; im.instanceMatrix.needsUpdate = true; } }
    void counts; void maxIdx; void dt;
    let n = 0; for (const b of this.bolts) if (b.active) { tmp.position.set(b.x, b.y, b.z); tmp.scale.setScalar(1); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); this.boltMesh.setMatrixAt(n, tmp.matrix); this.boltMesh.setColorAt(n, col.setHex(b.color).multiplyScalar(2)); n++; }
    this.boltMesh.count = n; this.boltMesh.instanceMatrix.needsUpdate = true; if (this.boltMesh.instanceColor) this.boltMesh.instanceColor.needsUpdate = true;
  }
  aliveUnits() { return this.units.filter(u => u.active && u.state !== 'dead'); }
}
