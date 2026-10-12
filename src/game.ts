import * as THREE from 'three';
import { buildArea, AreaWorld, Area } from './rendering/areas';
import { makeComposer } from './rendering/post';
import { Entity } from './character/entity';
import { HEROES, VOLDEMORT, BELLATRIX, DEATH_EATERS, makeDeathEater, CharDef, charById } from './character/roster';
import { Input } from './character/input';
import { SPELLS, SpellId, SpellDef, applyHit, canCast, splashFalloff, segmentHitsSphere } from './combat/spells';
import { Projectile, Particles, makeBoltMesh } from './combat/projectiles';
import { registerHit, tickCombo } from './combat/combo';
import { Skill, Effect, ULT_MAX, ultGain } from './combat/skills';
import { ClashState, newClash, stepClash, aiPress, marker, timingQuality } from './combat/clash';
import { bossPhase, PHASES, Phase } from './ai/boss';
import { resolveCircle, pointInBoxes } from './core/collision';
import { updateAI, AIWorld } from './ai/brain';
import { updateSmartAI, SmartWorld, Aggro, Pt } from './ai/autobrain';
import { sfx } from './audio/audio';
import type { Settings } from './save/settings';
import { War } from './war/war';
import { Destruction } from './war/destruction';
import { clampToMap } from './war/map';
import { synergyBonus, moraleReaction } from './combat/synergy';
import { getLang } from './ui/i18n';
import { Recorder } from './replay/recorder';
import { animateRig } from './character/rig';
import { CamMode, CAM_CFG, nextMode, buildViewModel } from './rendering/camera';

export type GameState = 'playing' | 'paused' | 'won' | 'lost';
export type Mode = 'duel' | 'war' | 'commander' | 'spectator';
export interface GameOpts { playerChar?: string; auto?: boolean; mode?: Mode; area?: Area; story?: { allies: string[]; start: [number, number]; yaw?: number }; custom?: CustomBattle }
export type Victory = 'elimination' | 'leader' | 'score' | 'survival';
export interface CustomBattle { hogwarts: string[]; death: string[]; army: number; victory: Victory; timeLimit?: number; mods?: Record<string, { power?: number; hp?: number }>; record?: boolean }
interface Ring { mesh: THREE.Mesh; life: number; max: number; r: number }
interface Hazard { kind: 'fire' | 'bolt'; pos: THREE.Vector3; r: number; t: number; mesh: THREE.Mesh; dps?: number }
export interface Clash { st: ClashState; a: Entity; b: Entity; beam: THREE.Mesh; core: THREE.Mesh; playerSide: 'a' | 'b' | null }
import { DIFF } from './war/difficulty';
export { DIFF };

export class Game implements AIWorld {
  renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; world: AreaWorld; entities: Entity[] = []; projectiles: Projectile[] = [];
  particles: Particles; input: Input; ctrl!: Entity; camYaw = Math.PI; camPitch = 0.25; shake = 0; state: GameState = 'playing'; time = 0;
  difficulty: number; playerTeam: 'hogwarts' | 'death'; post: ReturnType<typeof makeComposer> | null = null;
  timeScale = 1; slowT = 0; rings: Ring[] = []; hazards: Hazard[] = []; queue: { t: number; fn: () => void }[] = [];
  clash: Clash | null = null; assistT = 0; gfx: 'low' | 'med' | 'high' | 'ultra' = 'high'; adaptive = true; assist = false; pr = 1; prMax = 1; fpsAcc = 0; fpsN = 0; fps = 60; cinematic = false; storyMode = false; custom: CustomBattle | null = null; bossFight = true; warCfg: any = null; war: War | null = null; destruction: Destruction; mode: Mode; tac = { x: 0, z: 0, zoom: 55 }; follow = 0; specSlow = false; frameDt = 0; clashCd = 4; phase: Phase = 1; boltT = 0; speedFx = 0;
  onEvent: (msg: string, color?: string) => void = () => {}; onEnd: (won: boolean) => void = () => {};
  onDamage: (p: THREE.Vector3, amt: number, color: string, big: boolean) => void = () => {}; onBanner: (title: string, sub?: string, color?: string) => void = () => {}; onFlash: (color: string) => void = () => {};
  private raf = 0; private last = 0; stats = { cast: 0, hits: 0, kills: 0, clashesWon: 0, bestCombo: 0 }; private ray = new THREE.Raycaster();
  constructor(public canvas: HTMLCanvasElement, public settings: Settings, input: Input, public opts: GameOpts = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' }); this.gfx = (settings as any).gfx ?? 'high'; this.adaptive = (settings as any).adaptive ?? true; this.autoBrain = (settings as any).autoBrain ?? 'smart'; this.autoAggro = (settings as any).autoAggro ?? 'balanced'; this.smartAllies = !!(settings as any).smartAllies; this.camMode = ((settings as any).camMode ?? 'tps') as CamMode; (this as any)._baseNoLock = input.noLock; if (this.camMode === 'top') input.noLock = true; this.assist = !!(settings as any).assist;
    this.prMax = { low: 0.75, med: 1, high: Math.min(devicePixelRatio, 1.5), ultra: Math.min(devicePixelRatio, 2) }[this.gfx]; this.pr = this.prMax; this.renderer.setPixelRatio(this.pr);
    this.renderer.shadowMap.enabled = this.gfx !== 'low'; this.renderer.shadowMap.type = this.gfx === 'ultra' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900); this.world = buildArea(opts.area ?? 'courtyard'); this.particles = new Particles(this.world.scene, 900); this.destruction = new Destruction(this.world, this.particles);
    this.mode = opts.mode ?? 'duel'; if (this.mode === 'commander' || this.mode === 'spectator') opts.auto = true;
    this.input = input; this.difficulty = DIFF[settings.difficulty] ?? 1;
    this.storyMode = !!opts.story;
    if (opts.story) { this.warCfg = (opts as any).warCfg ?? null; this.bossFight = !!(opts as any).bossFight; // story: only the listed party is spawned; the campaign script spawns the rest
      const [sx, sz] = opts.story.start; const ids = [opts.playerChar ?? 'harry', ...opts.story.allies];
      ids.forEach((id, i) => { const e = new Entity(charById(id), this.world.scene, sx + (i - (ids.length - 1) / 2) * 2.5, sz + (i ? 1.5 : 0), 1); e.yaw = opts.story!.yaw ?? Math.PI; this.entities.push(e); });
      this.playerTeam = this.entities[0].def.team; this.setControlled(this.entities[0]); if (opts.auto) this.ctrl.playerControlled = false;
      try { this.post = this.gfx === 'low' ? null : makeComposer(this.renderer, this.world.scene, this.camera, innerWidth < 900 || this.gfx === 'med'); } catch { this.post = null; }
      if (this.mode !== 'duel') this.war = new War(this);
      this.resize(); addEventListener('resize', this.resize); return;
    }
    if (opts.custom) { const C = opts.custom; this.custom = C; const far = (opts.area ?? 'courtyard') === 'courtyard' ? 24 : 14;
      for (const [team, ids, z] of [['hogwarts', C.hogwarts, far], ['death', C.death, -far]] as const) ids.forEach((id, i) => { const def = { ...charById(id), team };
        const e = new Entity(def, this.world.scene, (i - (ids.length - 1) / 2) * 3, z, 1); e.yaw = team === 'hogwarts' ? Math.PI : 0; const m = C.mods?.[id]; if (m?.power) e.progPow *= m.power; if (m?.hp) { e.maxHp = Math.round(e.maxHp * m.hp); e.hp = e.maxHp; } this.entities.push(e); });
      const me = this.entities.find(e => e.def.id === opts.playerChar) ?? this.entities[0]; this.playerTeam = me.def.team; this.setControlled(me); if (opts.auto) this.ctrl.playerControlled = false;
      for (const e of this.entities) if (e.def.team !== this.playerTeam) { e.maxHp = Math.round(e.maxHp * this.difficulty); e.hp = e.maxHp; }
      if (C.record) this.recorder = new Recorder(opts.area ?? 'courtyard', C.army > 0 ? 'war' : 'duel');
      try { this.post = this.gfx === 'low' ? null : makeComposer(this.renderer, this.world.scene, this.camera, innerWidth < 900 || this.gfx === 'med'); } catch { this.post = null; }
      if (this.mode !== 'duel') this.war = new War(this);
      this.resize(); addEventListener('resize', this.resize); return; }
    const pc = PLAYABLE_IDS.includes(opts.playerChar ?? '') ? opts.playerChar! : 'harry';
    this.playerTeam = pc === 'voldemort' || pc === 'bellatrix' ? 'death' : 'hogwarts';
    const d = (def: CharDef) => def.team === this.playerTeam ? 1 : this.difficulty; // difficulty scales the side the player fights against
    HEROES.forEach((h, i) => { const e = new Entity(h, this.world.scene, -10 + i * 4, 26 + (i % 2) * 2, d(h)); e.yaw = Math.PI; this.entities.push(e); });
    const v = new Entity(VOLDEMORT, this.world.scene, 0, -27, d(VOLDEMORT)); this.entities.push(v);
    const b = new Entity(BELLATRIX, this.world.scene, 6, -20, d(BELLATRIX)); this.entities.push(b);
    DEATH_EATERS.forEach((de, i) => this.entities.push(new Entity(de, this.world.scene, -18 + i * 9, -16 + (i % 2) * 4, d(de))));
    if (this.mode !== 'duel') { // large-scale war: Hogwarts holds the north (Great Hall), Death Eaters come over the bridge (south)
      this.entities.forEach((e, i) => { if (e.def.team === 'hogwarts') { e.pos.set(-10 + (i % 6) * 4, 0, -30); e.yaw = 0; } else { e.pos.set(-6 + (i % 7) * 2, 0, e.def.boss ? 70 : 30 + (i % 3) * 2); e.yaw = Math.PI; } }); }
    this.setControlled(this.entities.find(e => e.def.id === pc)!);
    if (this.mode !== 'duel') this.war = new War(this);
    if (opts.auto) this.ctrl.playerControlled = false;
    try { this.post = this.gfx === 'low' ? null : makeComposer(this.renderer, this.world.scene, this.camera, innerWidth < 900 || this.gfx === 'med'); } catch { this.post = null; }
    this.resize(); addEventListener('resize', this.resize);
  }
  resize = () => { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h); this.post?.resize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
  /** Spawn a named character mid-battle (story scripts, reinforcements). */
  spawnEntity(id: string, x: number, z: number, team?: 'hogwarts' | 'death'): Entity {
    const def = charById(id); const d = { ...def, team: team ?? def.team }; const e = new Entity(d, this.world.scene, x, z, d.team === this.playerTeam ? 1 : this.difficulty);
    e.yaw = Math.atan2(this.ctrl.pos.x - x, this.ctrl.pos.z - z); this.entities.push(e); this.war?.prevAlive.set(e, true); this.particles.emit(e.chest(), d.team === 'death' ? 0x222222 : 0xffd34d, 20, 4, 1, 0.6); return e; }
  end(won: boolean) { this.state = won ? 'won' : 'lost'; document.exitPointerLock?.(); this.logEvent('end', won ? 'Victory' : 'Defeat', won ? '#8f8' : '#f66'); if (this.recorder) this.recorder.data.result = won ? 'win' : 'lose'; this.onEnd(won); }
  timeline: { t: number; text: string; color: string; kind: string }[] = []; recorder: Recorder | null = null; synT = 0;
  logEvent(kind: string, text: string, color = '#fff') { this.timeline.push({ t: this.time, text, color, kind }); this.recorder?.event(this.time, kind, text, color); }
  onKO(t: Entity, owner: Entity | null) {
    if (owner) owner.kos++; this.logEvent('ko', `${owner ? owner.def.name + ' → ' : ''}${t.def.name} ✖`, t.def.team === 'hogwarts' ? '#ff8fb0' : '#9fe0ff');
    if (t.def.id.startsWith('de')) return;
    for (const e of this.entities) { if (!e.alive || e.def.team !== t.def.team || e === t) continue; const r = moraleReaction(t.def.id, e.def.id, e.def.team); if (!r) continue;
      e.moraleMul = r.power; e.moraleSpd = r.speed; e.moraleT = r.dur; this.onEvent(`${e.def.name}: "${r.en}"`, r.kind === 'grief' ? '#9ab' : '#ffb84d'); this.logEvent('morale', `${e.def.name}: ${r.kind}`, '#ffb84d');
      this.particles.emit(e.chest(), r.kind === 'grief' ? 0x6a7a9a : 0xff6a2a, 20, 4, 0.8, 0.6); }
    if (this.war && t.def.id === 'voldemort') this.war.morale.death -= 0.5;
  }
  updateSynergy() { for (const e of this.entities) { if (!e.alive) continue; const near = this.entities.filter(o => o !== e && o.alive && o.def.team === e.def.team && o.pos.distanceTo(e.pos) < 18).map(o => o.def.id);
    const b = synergyBonus(e.def.id, near); if (b.names.length > e.synNames.length && e.pos.distanceTo(this.ctrl.pos) < 30) this.particles.emit(e.chest(), 0xffd34d, 10, 3, 0.6, 0.5); e.synPow = b.power; e.synDef = b.defense; e.synNames = b.names; } }
  npcSpell(name: string, dmg: number) { return synth(name, 0xffffff, dmg, 0, 1); }
  npcFoe(e: Entity) { return this.war ? this.war.nearestFoeUnit(e) : null; }
  foesOf(e: Entity) { return this.entities.filter(o => o.alive && o.def.team !== e.def.team); }
  alliesOf(e: Entity) { return this.entities.filter(o => o.alive && o.def.team === e.def.team); }
  /** AUTO: AI fully plays the controlled character; control returns instantly when switched off. */
  camMode: CamMode = 'tps'; shoulder = 1; aimZoom = 0; vm: ReturnType<typeof buildViewModel> | null = null; vmFor: Entity | null = null; smX = 0; smY = 0;
  setCamMode(m: CamMode) { this.camMode = m; this.onCam(m); this.input.noLock = m === 'top' ? true : (this as any)._baseNoLock ?? false; if (m === 'top') document.exitPointerLock?.(); }
  onCam: (m: CamMode) => void = () => {};
  /** smart AUTO brain adapter + per-entity combat stats */
  private _sw: SmartWorld | null = null;
  get sw(): SmartWorld { if (this._sw) return this._sw; const g = this; const W = this.war as any;
    this._sw = { get entities() { return g.entities; }, get projectiles() { return g.projectiles as any; }, cast: (e, s, t) => g.cast(e, s as any, t), startDodge: (e, d) => g.startDodge(e, d), useSkill: (e, i, a) => g.useSkill(e, i, a),
      get boxes() { return g.world.boxes; }, get difficulty() { return g.difficulty; }, get time() { return g.time; },
      get hazards() { const h: Pt[] = g.hazards.map(z => ({ x: z.pos.x, z: z.pos.z, r: z.r })); for (const z of g.zones) if (z.f.dps > 0) h.push({ x: z.pos.x, z: z.pos.z, r: z.f.radius, team: z.owner.def.team } as any); return h; },
      npcFoes: (e, r) => { const w = g.war as any; if (!w) return []; const out: Pt[] = []; for (const i of w.grid.query(e.pos.x, e.pos.z, r, [])) { const u = w.units[i]; if (u.active && u.state === 'fight' && u.def.team !== e.def.team) out.push({ x: u.x, z: u.z, melee: u.def.melee, dmg: u.def.dmg }); } return out; },
      npcAllies: (e, r) => { const w = g.war as any; if (!w) return []; const out: Pt[] = []; for (const i of w.grid.query(e.pos.x, e.pos.z, r, [])) { const u = w.units[i]; if (u.active && u.def.team === e.def.team && u.state !== 'dead') out.push({ x: u.x, z: u.z, down: u.state === 'downed' }); } return out; },
      bolts: e => { const w = g.war as any; if (!w) return []; const out: any[] = []; for (const b of w.bolts) if (b.active && b.team !== e.def.team && Math.abs(b.x - e.pos.x) + Math.abs(b.z - e.pos.z) < 20) out.push({ pos: new THREE.Vector3(b.x, b.y, b.z), vel: new THREE.Vector3(b.dx * 26, b.dy * 26, b.dz * 26), dmg: b.dmg }); return out; },
      revive: (e, r) => g.war ? g.war.reviveInRadius(e.pos, r) : 0, objective: null } as SmartWorld; void W; return this._sw; }
  autoBrain: 'smart' | 'classic' = 'smart'; autoAggro: Aggro = 'balanced'; smartAllies = false;
  auto = false; autoCancel = false; onAuto: (on: boolean) => void = () => {};
  canAuto() { return this.mode !== 'spectator' && this.mode !== 'commander' && !this.opts.auto && !!this.ctrl; }
  setAuto(on: boolean) { if (on && !this.canAuto()) return; this.auto = on; if (this.ctrl && !this.opts.auto) { this.ctrl.playerControlled = !on; if (!on) { this.ctrl.shielding = false; this.ctrl.ai.target = null as any; } } this.input.fire = false; this.input.shield = false; this.onAuto(on); }
  setControlled(e: Entity) { if (this.ctrl) { this.ctrl.playerControlled = false; this.ctrl.shielding = false; } this.ctrl = e; e.playerControlled = !this.opts.auto && !this.auto; this.camYaw = e.yaw + Math.PI; }
  switchCharacter() { const team = this.entities.filter(e => e.def.team === this.playerTeam && e.alive && e.def.playable && !e.clashing); if (team.length < 2) return;
    const i = team.indexOf(this.ctrl); this.setControlled(team[(i + 1) % team.length]); sfx.ui(); this.onEvent('▶ ' + this.ctrl.def.name, '#ffd34d'); }
  start() { this.last = performance.now(); const loop = (t: number) => { this.raf = requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (t - this.last) / 1000)); this.last = t; this.frameDt = (t - (this as any)._lt || 16) / 1000; (this as any)._lt = t; if (this.war) this.war.cap = this.war.scaler.tick(Math.min(0.5, this.frameDt)); this.step(dt); this.adapt(dt); this.render(); }; this.raf = requestAnimationFrame(loop); }
  /** adaptive resolution: every 2s nudge pixel ratio toward 55-60fps */
  adapt(dt: number) { this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc < 2) return; this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; if (!this.adaptive) return;
    const old = this.pr; if (this.fps < 45) this.pr = Math.max(0.5, this.pr - 0.15); else if (this.fps > 58) this.pr = Math.min(this.prMax, this.pr + 0.1); if (old !== this.pr) { this.renderer.setPixelRatio(this.pr); this.resize(); } }
  render() { if (this.post) this.post.composer.render(); else this.renderer.render(this.world.scene, this.camera); }
  dispose() { cancelAnimationFrame(this.raf); removeEventListener('resize', this.resize); this.renderer.dispose(); }
  later(t: number, fn: () => void) { this.queue.push({ t, fn }); }

  // ---------------- actions shared by player & AI ----------------
  spawnProjectile(e: Entity, s: SpellDef, from: THREE.Vector3, dir: THREE.Vector3, mul = 1, homingTarget: Entity | null = null) {
    const mesh = makeBoltMesh(s); mesh.position.copy(from); this.world.scene.add(mesh);
    const p: Projectile = { spell: s, ownerId: e.uid, team: e.def.team, pos: from.clone(), prev: from.clone(), vel: dir.clone().normalize().multiplyScalar(s.speed), life: s.homing ? 3.5 : 2.5, mesh, power: this.effPower(e) * mul, alive: true, target: homingTarget, hitSet: new Set() };
    this.projectiles.push(p); return p;
  }
  effPower(e: Entity) { return e.power * (e.buffT > 0 ? e.buff.power : 1) * e.synPow * e.moraleMul * e.progPow; }
  cast(e: Entity, id: string, target: THREE.Vector3): boolean {
    const s = SPELLS[id as SpellId]; if (!canCast(e, s, e.cds[s.id] ?? 0) || e.shielding || e.dodgeT > 0 || e.clashing || e.dashT > 0) return false;
    e.energy -= s.cost; e.cds[s.id] = s.cooldown; e.castT = 0; const from = e.wandTip(); const dir = target.clone().sub(from).normalize();
    this.spawnProjectile(e, s, from, dir, 1, s.homing ? this.nearestFoe(e, target) : null);
    this.particles.emit(from, s.color, 6, 3, 0.5, 0.3); if (e.playerControlled || from.distanceTo(this.ctrl.pos) < 25) sfx.cast(s.color);
    if (e.playerControlled) this.stats.cast++; return true;
  }
  nearestFoe(e: Entity, p: THREE.Vector3) { let best: Entity | null = null, bd = Infinity; for (const f of this.foesOf(e)) { const d = f.pos.distanceTo(p); if (d < bd) { bd = d; best = f; } } return best; }
  startDodge(e: Entity, dir: THREE.Vector3): boolean { if (e.stamina < 25 || e.dodgeT > 0 || e.stunned > 0 || e.clashing) return false;
    e.stamina -= 25; e.dodgeT = 0.32; e.invuln = 0.28; e.dodgeDir.copy(dir).setY(0).normalize(); if (e.playerControlled) { sfx.dodge(); this.speedFx = 1; } return true; }
  heal(e: Entity, ally: Entity): boolean { // legacy AI heal → uses signature heal if present
    const kit = e.kit; if (!kit) return false; const i = kit.sigs.findIndex(s => s.effects.some(f => f.kind === 'heal')); return i >= 0 ? this.useSkill(e, i) : false; }
  /** idx 0..2 signature, 3 ultimate */
  useSkill(e: Entity, idx: number, aimAt?: THREE.Vector3): boolean {
    const kit = e.kit; if (!kit || !e.alive || e.stunned > 0 || e.clashing || e.dashT > 0) return false;
    const sk: Skill = idx === 3 ? kit.ult : kit.sigs[idx]; if (!sk) return false;
    if (idx === 3) { if (e.ult < ULT_MAX) return false; e.ult = 0; e.ultT = 0; }
    else { if (e.skillCd[idx] > 0 || e.energy < sk.cost) return false; e.skillCd[idx] = sk.cooldown * e.progCd; e.energy -= sk.cost; e.castT = 0; }
    const tgtE = aimAt ? this.nearestFoe(e, aimAt) : (e.ai.target && e.ai.target.alive ? e.ai.target : this.nearestFoe(e, e.pos));
    const aim = aimAt ?? (tgtE ? tgtE.chest() : e.pos.clone().add(new THREE.Vector3(Math.sin(e.yaw), 1.3, Math.cos(e.yaw)).multiplyScalar(10)));
    if (tgtE) e.yaw = Math.atan2(tgtE.pos.x - e.pos.x, tgtE.pos.z - e.pos.z);
    for (const f of sk.effects) this.applyEffect(e, f, aim, tgtE, sk);
    const near = e.playerControlled || e.pos.distanceTo(this.ctrl.pos) < 30;
    if (idx === 3) { if (near || e.def.boss) { this.onBanner(sk.name, e.def.name, e.def.team === 'hogwarts' ? '#ffd34d' : '#ff3d6e'); this.onFlash(e.def.team === 'hogwarts' ? '#fff6d0' : '#c0ffd0'); this.slowT = 0.8; this.shake = 0.6; this.speedFx = 1.5; sfx.ult(); } }
    else if (near) { this.onEvent(`${e.def.name}: ${sk.name}`, e.def.team === 'hogwarts' ? '#9fe0ff' : '#ff8fb0'); sfx.skill(); }
    const ln = e.def.look.lines; if (ln && near && (idx === 3 || Math.random() < 0.5)) this.callout(e, ln[idx === 3 ? 'ult' : 'cast']);
    return true;
  }
  applyEffect(e: Entity, f: Effect, aim: THREE.Vector3, tgt: Entity | null, sk: Skill) { if (this.war) this.war.curBy = e;
    switch (f.kind) {
      case 'volley': { const s = SPELLS[f.spell]; for (let i = 0; i < f.count; i++) { const fire = () => { if (!e.alive) return; const from = e.wandTip(); const dir = aim.clone().sub(from).normalize();
          const off = f.count > 1 ? (i / (f.count - 1) - 0.5) * f.spread : 0; dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), off);
          this.spawnProjectile(e, f.color ? { ...s, color: f.color } : s, from, dir, f.dmgMul ?? 1, s.homing ? (tgt ?? this.nearestFoe(e, aim)) : null); this.particles.emit(from, s.color, 4, 3, 0.6, 0.3); };
          if (f.delay) this.later(i * f.delay, fire); else fire(); } break; }
      case 'nova': { const sp = synth(sk.name, f.color, f.damage, f.stun, f.knock); this.ring(e.pos, f.radius, f.color);
        for (const o of this.foesOf(e)) { const dd = o.pos.distanceTo(e.pos); if (dd < f.radius) this.dealHit(e, o, sp, this.effPower(e), 1 - 0.4 * dd / f.radius, e.pos); }
        this.war?.splash(e.pos, f.radius, f.damage * this.effPower(e), e.def.team, sk.name.includes('Patronus') || sk.name.includes('Lumos') || sk.name.includes('Moon') ? 'patronus' : ''); break; }
      case 'heal': for (const o of this.alliesOf(e)) if (o.pos.distanceTo(e.pos) < f.radius) { const amt = Math.min(o.maxHp - o.hp, f.amount); o.hp += amt; e.healed += amt; if (amt > 0) this.onDamage(o.chest().add(new THREE.Vector3(0, 0.8, 0)), Math.round(amt), '#6dffa8', false); this.particles.emit(o.chest(), 0x6dffa8, 14, 3, 0.6, 0.8); }
        if (this.war && e.def.team === 'hogwarts') { const n = this.war.reviveInRadius(e.pos, f.radius); if (n && near(e, this)) this.onEvent(`✚ ${n} revived`, '#6dffa8'); }
        this.ring(e.pos, f.radius, 0x6dffa8); break;
      case 'buff': e.buffT = f.dur; e.buff = { power: f.power, defense: f.defense, speed: f.speed }; (e.model.aura.material as THREE.MeshBasicMaterial).color.setHex(f.color); this.particles.emit(e.chest(), f.color, 20, 4, 0.7, 0.6); break;
      case 'barrier': for (const o of this.alliesOf(e)) if (o.pos.distanceTo(e.pos) < f.radius) o.barrier = f.dur; this.ring(e.pos, f.radius, 0x9fe0ff); break;
      case 'teleport': if (tgt) { this.particles.emit(e.chest(), 0x3a1460, 30, 5, 1, 0.6); const back = new THREE.Vector3(-Math.sin(tgt.yaw), 0, -Math.cos(tgt.yaw)).multiplyScalar(f.behind ? 4 : -4);
        const np = tgt.pos.clone().add(back); [np.x, np.z] = resolveCircle(np.x, np.z, 0.6, this.world.boxes); np.x = THREE.MathUtils.clamp(np.x, -32, 32); np.z = THREE.MathUtils.clamp(np.z, -32, 32); e.pos.copy(np); e.yaw = Math.atan2(tgt.pos.x - np.x, tgt.pos.z - np.z); this.particles.emit(e.chest(), 0x8a3aff, 30, 5, 1, 0.6); } break;
      case 'zone': { const at = f.at === 'self' || !tgt ? e.pos.clone() : tgt.pos.clone(); this.addZone(e, at, f); break; }
      case 'pull': { const c = tgt ? tgt.pos : aim; this.ring(c, f.radius, f.color); for (const o of this.foesOf(e)) { const d = c.clone().sub(o.pos).setY(0); const L = d.length(); if (L < f.radius && L > 0.3) o.knock.addScaledVector(d.normalize(), f.force); }
        this.particles.emit(c.clone().setY(1), f.color, 30, 6, 1, 0.6); break; }
      case 'chain': { let cur: Entity | null = tgt; const hit = new Set<Entity>(); let from = e.chest(); const sp = synth(sk.name, f.color, f.damage, 0.3, 2);
        for (let j = 0; j < f.jumps && cur; j++) { hit.add(cur); const to = cur.chest(); for (let q = 0; q <= 8; q++) this.particles.emit(from.clone().lerp(to, q / 8), f.color, 2, 1, 0.4, 0.25); this.dealHit(e, cur, sp, this.effPower(e) * Math.pow(0.85, j), 1, from); from = to;
          cur = this.foesOf(e).filter(o => !hit.has(o) && o.pos.distanceTo(to) < f.range).sort((a, b) => a.pos.distanceTo(to) - b.pos.distanceTo(to))[0] ?? null; }
        this.war?.splash(from, 3, f.damage * this.effPower(e) * 0.6, e.def.team, ''); break; }
      case 'meteor': for (let i = 0; i < f.count; i++) { const p0 = (tgt ? tgt.pos : aim).clone().setY(0); p0.x += (Math.random() - 0.5) * f.spread; p0.z += (Math.random() - 0.5) * f.spread; this.ring(p0, f.radius, f.color);
          this.later(f.delay + i * 0.18, () => { const sp = synth(sk.name, f.color, f.damage, 0.4, 8); this.particles.emit(p0.clone().setY(0.5), f.color, 40, 9, 1.2, 0.8); this.ring(p0, f.radius * 1.2, f.color); this.shake = Math.max(this.shake, 0.2);
            for (const o of this.foesOf(e)) { const dd = o.pos.distanceTo(p0); if (dd < f.radius) this.dealHit(e, o, sp, this.effPower(e), 1 - 0.5 * dd / f.radius, p0); } this.war?.splash(p0, f.radius, f.damage * this.effPower(e), e.def.team, ''); this.destruction.damageAt(p0, f.damage * 2, f.radius); }); } break;
      case 'mark': { const list = f.radius ? this.foesOf(e).filter(o => o.pos.distanceTo(e.pos) < f.radius!) : tgt ? [tgt] : []; for (const o of list) { o.markT = f.dur; o.markAmp = f.amp; this.particles.emit(o.chest().add(new THREE.Vector3(0, 1, 0)), 0xff3050, 12, 2, 0.6, 0.4); } break; }
      case 'drain': if (tgt) { const sp = synth(sk.name, f.color, f.damage, 0.2, 1); const before = tgt.hp; this.dealHit(e, tgt, sp, this.effPower(e), 1, e.pos); const got = Math.max(0, before - tgt.hp) * f.ratio; e.hp = Math.min(e.maxHp, e.hp + got); e.healed += got;
        const a = tgt.chest(), b2 = e.chest(); for (let q = 0; q <= 8; q++) this.particles.emit(a.clone().lerp(b2, q / 8), f.color, 2, 1, 0.5, 0.3); } break;
      case 'cleanse': for (const o of this.alliesOf(e)) if (o.pos.distanceTo(e.pos) < f.radius) { o.stunned = 0; o.disarmed = 0; o.slowT = 0; o.markT = 0; const amt = Math.min(o.maxHp - o.hp, f.heal); o.hp += amt; e.healed += amt; this.particles.emit(o.chest(), 0xffffff, 10, 3, 0.6, 0.4); } this.ring(e.pos, f.radius, 0xffffff); break;
      case 'haste': for (const o of this.alliesOf(e)) if (o.pos.distanceTo(e.pos) < f.radius) { o.buffT = Math.max(o.buffT, f.dur); o.buff = { power: f.power, defense: f.defense, speed: f.speed }; (o.model.aura.material as THREE.MeshBasicMaterial).color.setHex(f.color); this.particles.emit(o.chest(), f.color, 12, 3, 0.6, 0.5); } this.ring(e.pos, f.radius, f.color); break;
      case 'silence': { const c = tgt && f.radius < 5 ? tgt.pos : e.pos; for (const o of this.foesOf(e)) if (o.pos.distanceTo(c) < f.radius) { o.disarmed = Math.max(o.disarmed, f.dur); this.particles.emit(o.chest(), f.color, 10, 2, 0.5, 0.4); } this.ring(c, f.radius, f.color); break; }
      case 'blink': { const dir = tgt ? tgt.pos.clone().sub(e.pos).setY(0).normalize() : new THREE.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); this.particles.emit(e.chest(), f.color, 25, 4, 0.8, 0.5);
        const np = e.pos.clone().addScaledVector(dir, Math.min(f.dist, tgt ? Math.max(0, tgt.pos.distanceTo(e.pos) - 3) : f.dist)); [np.x, np.z] = resolveCircle(np.x, np.z, 0.6, this.world.boxes); [np.x, np.z] = this.world.clamp(np.x, np.z); e.pos.copy(np); e.invuln = Math.max(e.invuln, 0.3); this.particles.emit(e.chest(), f.color, 25, 4, 0.8, 0.5); break; }
      case 'execute': if (tgt) { const low = tgt.hp / tgt.maxHp < f.threshold; const sp = synth(sk.name, f.color, f.damage * (low ? 2.2 : 1), 0.5, 10); this.dealHit(e, tgt, sp, this.effPower(e), 1, e.pos); this.particles.emit(tgt.chest(), f.color, low ? 50 : 20, 7, 1, 0.6); if (low) this.shake = Math.max(this.shake, 0.4); } break;
      case 'dash': { const dir = tgt ? tgt.pos.clone().sub(e.pos).setY(0).normalize() : new THREE.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
        e.dashT = f.dist / 24; e.dodgeDir.copy(dir); e.dashHit.clear(); e.dashDmg = f.damage; e.dashKnock = f.knock; e.invuln = e.dashT; (e as any).dashColor = f.color; (e as any).dashName = sk.name; if (e.playerControlled) this.speedFx = 1.4; break; }
    }
  }
  /** voice-style callout: speech bubble text floated above the caster + feed line */
  onCallout: (e: Entity, text: string) => void = () => {};
  callout(e: Entity, line: [string, string]) { const txt = line[getLang() === 'th' ? 1 : 0]; if (!txt || txt === '...') return; this.onCallout(e, txt); this.logEvent('callout', `${e.def.name}: "${txt}"`, '#ffe8a0'); }
  zones: { pos: THREE.Vector3; f: any; t: number; owner: Entity; mesh: THREE.Mesh; tick: number }[] = [];
  addZone(owner: Entity, pos: THREE.Vector3, f: any) { const m = new THREE.Mesh(new THREE.CircleGeometry(f.radius, 40), new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.08, pos.z); this.world.scene.add(m); this.zones.push({ pos: pos.clone().setY(0), f, t: f.dur, owner, mesh: m, tick: 0 }); }
  updateZones(dt: number) { for (const z of this.zones) { z.t -= dt; z.tick -= dt; (z.mesh.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(this.time * 8) * 0.08; z.mesh.rotation.z += dt;
      if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = Math.random() * z.f.radius; this.particles.emit(new THREE.Vector3(z.pos.x + Math.cos(a) * r, 0.3, z.pos.z + Math.sin(a) * r), z.f.color, 1, 1.5, 0.8, 0.3); }
      if (z.tick <= 0) { z.tick = 0.5; const sp = synth('zone', z.f.color, z.f.dps * 0.5, 0, 0.5);
        for (const o of this.entities) { if (!o.alive || o.pos.distanceTo(z.pos) > z.f.radius) continue; if (o.def.team !== z.owner.def.team) { if (z.f.dps > 0) this.dealHit(z.owner, o, sp, this.effPower(z.owner), 1, z.pos); if (z.f.slow > 0) o.slowT = 0.6; } else if (z.f.heal) { const amt = Math.min(o.maxHp - o.hp, z.f.heal * 0.5); o.hp += amt; z.owner.healed += amt; } }
        if (z.f.dps > 0) this.war?.splash(z.pos, z.f.radius, z.f.dps * 0.5, z.owner.def.team, ''); } }
    for (const z of this.zones) if (z.t <= 0) { this.world.scene.remove(z.mesh); z.mesh.geometry.dispose(); } this.zones = this.zones.filter(z => z.t > 0); }
  ring(p: THREE.Vector3, r: number, color: number) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.15, p.z); this.world.scene.add(m); this.rings.push({ mesh: m, life: 0.5, max: 0.5, r });
    this.particles.emit(new THREE.Vector3(p.x, 1, p.z), color, 24, r * 1.5, 0.9, 0.5);
  }
  /** Central damage routine: combos, ult gauge, numbers, kills. */
  dealHit(owner: Entity | null, t: Entity, s: SpellDef, power: number, falloff: number, from: THREE.Vector3) {
    if (!t.alive) return null; const near = t.pos.distanceTo(this.ctrl.pos) < 30;
    let mult = 1, bonus: any = null;
    if (owner && !(t.shielding || t.barrier > 0) && t.invuln <= 0) { const r = registerHit(owner.combo, s.id); mult = r.mult; bonus = r.bonus; if (owner.playerControlled) this.stats.bestCombo = Math.max(this.stats.bestCombo, r.count); }
    const effDef = t.defense; t.defense = t.baseDefense * (t.buffT > 0 ? t.buff.defense : 1);
    let special = 1; if (t.def.id === 'nagini' && owner?.def.id !== 'neville') special = 0.3; // only Neville's blade truly harms Nagini
    if (t.def.id === 'dementorE') special = s.id === 'patronus' || s.id === 'lumos' || s.name.includes('Patron') ? 3 : 0.35;
    special /= t.synDef * t.progDef; if (t.markT > 0) special *= t.markAmp;
    const res = applyHit(t, s, power * mult * (bonus?.dmg ?? 1) * special, falloff); void effDef;
    if (res.damage <= 0 && !res.blocked) return res;
    if (!res.blocked) { t.dmgTaken += res.damage; if (res.damage > 2) t.hitT = 0; if (owner) owner.dmgDealt += res.damage; }
    if (bonus?.stun && (t.ccImmune ?? 0) < 2.5) t.stunned = Math.max(t.stunned, bonus.stun);
    const dir = t.pos.clone().sub(from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(Math.random() - .5, 0, Math.random() - .5); dir.normalize(); t.knock.addScaledVector(dir, res.knock * (bonus?.knock ?? 1));
    t.flash = 0.15; t.ult = Math.min(ULT_MAX, t.ult + ultGain(0, res.damage)); if (owner) owner.ult = Math.min(ULT_MAX, owner.ult + ultGain(res.damage, 0) * (owner.def.boss ? 0.5 : 1));
    if (res.blocked) { this.particles.emit(t.chest(), 0x9fe0ff, 12, 5, 0.6, 0.3); if (near) { sfx.block(); this.onDamage(t.chest().add(new THREE.Vector3(0, 0.9, 0)), Math.round(res.damage), '#9fe0ff', false); } }
    else { if (near) { sfx.hit(); this.onDamage(t.chest().add(new THREE.Vector3(0, 0.9, 0)), Math.round(res.damage), mult > 1.15 ? '#ffd34d' : '#ffffff', res.damage >= 25); } this.particles.emit(t.chest(), 0xffffff, 6, 4, 0.5, 0.2); }
    if (owner?.playerControlled) { this.stats.hits++; if (bonus) this.onEvent(`COMBO! ${bonus.name}`, '#ffd34d'); if (res.damage >= 25) { this.onFlash('rgba(255,255,255,.35)'); this.shake = Math.max(this.shake, 0.25); } }
    if (res.disarm && t.playerControlled) this.onEvent('Expelliarmus!', '#f55');
    if (!t.alive) { sfx.death(); this.onEvent(`${t.def.name} ✖`, t.def.team === this.playerTeam ? '#f66' : '#8f8'); if (owner?.playerControlled) this.stats.kills++; if (owner) (owner as any).kills = ((owner as any).kills ?? 0) + 1; this.onKO(t, owner); }
    return res;
  }

  // ---------------- Spell clash ----------------
  startClash(a: Entity, b: Entity) {
    if (this.clash || !a.alive || !b.alive) return;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.world.scene.add(beam, core);
    const side = a.playerControlled ? 'a' : b.playerControlled ? 'b' : null;
    this.clash = { st: newClash({ mastery: a.def.mastery, stamina: a.stamina }, { mastery: b.def.mastery, stamina: b.stamina }), a, b, beam, core, playerSide: side };
    a.clashing = b.clashing = true; a.shielding = b.shielding = false;
    if (side || a.pos.distanceTo(this.ctrl.pos) < 30) { this.onBanner('SPELL CLASH!', `${a.def.name} ⚡ ${b.def.name}`, '#ffd34d'); sfx.clash(); this.shake = 0.4; }
  }
  updateClash(dt: number, press: boolean) {
    const c = this.clash!; const { a, b } = c;
    if (!a.alive || !b.alive) return this.endClash(a.alive ? 1 : -1);
    let pa = false, pb = false, qa: number | undefined, qb: number | undefined;
    if (c.playerSide === 'a') { pa = press; } else { [pa, qa] = aiPress(a.def.mastery, dt); }
    if (c.playerSide === 'b') { pb = press; } else { [pb, qb] = aiPress(b.def.mastery, dt); }
    if (c.playerSide === 'a' && pa) qa = timingQuality(marker(c.st.t)); if (c.playerSide === 'b' && pb) qb = timingQuality(marker(c.st.t));
    stepClash(c.st, dt, pa, pb, qa, qb);
    const ta = a.wandTip(), tb = b.wandTip(); const mid = ta.clone().lerp(tb, 0.5 - c.st.pos * 0.45);
    for (const [from, mesh, col] of [[ta, c.beam, a.def.team === 'hogwarts' ? 0xff5040 : 0x30ff60]] as const) void from, mesh, col;
    const len = ta.distanceTo(tb); c.beam.position.copy(ta).lerp(tb, 0.5); c.beam.scale.set(1, len, 1); c.beam.lookAt(tb); c.beam.rotateX(Math.PI / 2);
    c.core.position.copy(mid); c.core.scale.setScalar(1 + Math.sin(this.time * 30) * 0.15);
    (c.beam.material as THREE.MeshBasicMaterial).color.setHex(c.st.pos > 0 ? 0xffb050 : 0x60ff90);
    if (Math.random() < 0.6) this.particles.emit(mid, Math.random() < 0.5 ? 0xffb050 : 0x60ff90, 3, 6, 0.8, 0.3);
    if (c.st.done) this.endClash(c.st.done);
  }
  endClash(winner: 1 | -1) {
    const c = this.clash!; const W = winner === 1 ? c.a : c.b, L = winner === 1 ? c.b : c.a; this.world.scene.remove(c.beam, c.core); c.a.clashing = c.b.clashing = false; this.clash = null; this.clashCd = 8;
    const sp = synth('Spell Clash', 0xffffff, 30, 1.5, 12); L.ccImmune = 0; L.invuln = 0; const sh = L.shielding; L.shielding = false; this.dealHit(W, L, sp, W.power, 1, W.pos); L.shielding = sh;
    W.ult = Math.min(ULT_MAX, W.ult + 25); this.ring(L.pos, 4, 0xffffff); this.shake = 0.6; sfx.explode();
    if (c.playerSide) { const won = (c.playerSide === 'a') === (winner === 1); if (won) this.stats.clashesWon++; this.onBanner(won ? 'CLASH WON!' : 'CLASH LOST', W.def.name, won ? '#ffd34d' : '#ff5070'); }
  }

  // ---------------- main step ----------------
  step(rawDt: number) {
    this.input.pollGamepad();
    if (this.cinematic) { this.updateViewModel(false, 0); this.input.consume(); this.particles.update(rawDt); for (const e of this.entities) e.alive ? this.animate(e, rawDt, 0) : this.animateDeath(e, rawDt); return; }
    const inp = this.input.consume();
    if (inp.pause && (this.state === 'playing' || this.state === 'paused')) { this.state = this.state === 'playing' ? 'paused' : 'playing'; if (this.state === 'paused') document.exitPointerLock?.(); }
    if (this.state === 'paused') return;
    if (this.slowT > 0) { this.slowT -= rawDt; this.timeScale = 0.3; } else this.timeScale = Math.max(0.05, Math.min(1, this.timeScale + Math.max(0, rawDt) * 3)); rawDt = Math.max(0, rawDt);
    const dt = rawDt * this.timeScale * (this.specSlow ? 0.3 : 1); this.time += dt;
    if (this.mode === 'spectator') { if (inp.cycle) this.follow += inp.cycle; if (inp.sw) this.follow++; if (inp.dodge) this.specSlow = !this.specSlow; }
    if (inp.cam) this.setCamMode(nextMode(this.camMode)); if (inp.shoulder) this.shoulder = -this.shoulder;
    { const st: any = this.settings; const sm = THREE.MathUtils.clamp(st.camSmooth ?? 0.3, 0, 0.9); const k = 1 - Math.pow(sm, 1.5) * 0.9;
      this.smX += (inp.dx - this.smX) * k; this.smY += (inp.dy - this.smY) * k; const aiming = this.input.aim && (this.camMode === 'fps' || this.camMode === 'tps' || this.camMode === 'follow');
      this.aimZoom += ((aiming ? 1 : 0) - this.aimZoom) * Math.min(1, rawDt * 12); const sens = 0.0025 * this.settings.sensitivity * (1 - 0.5 * this.aimZoom);
      const C = (this.mode === 'commander' || this.mode === 'spectator') ? CAM_CFG.follow : CAM_CFG[this.camMode];
      if (C.mouseLook) { this.camYaw -= this.smX * sens; this.camPitch = THREE.MathUtils.clamp(this.camPitch + this.smY * sens * (st.invertY ? -1 : 1), C.pitchMin, C.pitchMax); } else this.camPitch = C.pitchMin; }
    if (inp.auto) this.setAuto(!this.auto);
    if (this.auto && this.autoCancel && this.state === 'playing') { const [ax, ay] = this.input.axis(); if (Math.abs(ax) + Math.abs(ay) > 0.2 || this.input.fire || inp.skill >= 0 || inp.dodge) this.setAuto(false); }
    if (this.auto && inp.sw && this.state === 'playing') this.switchCharacter();
    const P = this.ctrl.playerControlled && this.state === 'playing';
    if (P) {
      if (inp.sw) this.switchCharacter();
      if (inp.cycle) { const n = this.ctrl.def.spells.length; this.ctrl.spellIdx = (this.ctrl.spellIdx + inp.cycle + n) % n; sfx.ui(); }
      if (inp.skill >= 0 && !this.ctrl.clashing) { if (!this.useSkill(this.ctrl, inp.skill, this.aimPoint())) sfx.deny(); }
    }
    // delayed volleys
    for (const q of this.queue) q.t -= dt; const due = this.queue.filter(q => q.t <= 0); this.queue = this.queue.filter(q => q.t > 0); due.forEach(q => q.fn());
    if (this.clash) this.updateClash(dt, inp.clashPress); else this.clashCd -= dt;
    this.updateZones(dt);
    this.synT -= dt; if (this.synT <= 0) { this.synT = 1; this.updateSynergy(); }
    this.recorder?.tick(this, dt);
    this.updateBoss(dt);
    const camFwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)); const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
    for (const e of this.entities) {
      if (!e.alive) { this.animateDeath(e, dt); continue; }
      for (const k in e.cds) (e.cds as any)[k] -= dt; for (let i = 0; i < 3; i++) e.skillCd[i] = Math.max(0, e.skillCd[i] - dt);
      if (e.moraleT > 0) { e.moraleT -= dt; if (e.moraleT <= 0) { e.moraleMul = 1; e.moraleSpd = 1; } } e.stunned = Math.max(0, e.stunned - dt); e.markT = Math.max(0, e.markT - dt); e.slowT = Math.max(0, e.slowT - dt); e.disarmed = Math.max(0, e.disarmed - dt); e.invuln = Math.max(0, e.invuln - dt); e.flash = Math.max(0, e.flash - dt);
      e.ccImmune = Math.max(0, e.ccImmune - dt); e.barrier = Math.max(0, e.barrier - dt); e.buffT = Math.max(0, e.buffT - dt); tickCombo(e.combo, dt);
      e.ult = Math.min(ULT_MAX, e.ult + dt * (e.def.boss ? this.phase * 0.6 : 0.5));
      let move = new THREE.Vector3(), sprint = false;
      if (e.clashing) { e.shielding = false; this.animate(e, dt, 0); continue; }
      if (e.playerControlled && this.state === 'playing') {
        const [ax, ay] = this.input.axis(); move.addScaledVector(camFwd, ay).addScaledVector(camRight, ax); sprint = this.input.sprint() && e.stamina > 1;
        // semi-auto assist: auto-target, auto-cast, auto-shield vs incoming bolts, periodic signature skills
        let aFire = this.input.fire || this.input.fireTap, aShield = this.input.shield, aim = this.aimPoint();
        if (this.assist) { const foe = this.foesOf(e).filter(o => o.pos.distanceTo(e.pos) < 26).sort((a, b) => a.pos.distanceTo(e.pos) - b.pos.distanceTo(e.pos))[0];
          if (foe) { aim = foe.chest(); if (!aShield && e.energy > e.maxEnergy * 0.25) aFire = true; }
          const threat = this.projectiles.some(p => p.alive && p.team !== e.def.team && p.pos.distanceTo(e.pos) < 4 && p.vel.dot(e.pos.clone().sub(p.pos)) > 0);
          if (threat && e.energy > 10) { aShield = true; aFire = false; }
          this.assistT = (this.assistT ?? 0) - dt; if (foe && this.assistT <= 0 && e.kit) { this.assistT = 3; for (let i = e.kit.sigs.length - 1; i >= 0; i--) if (e.skillCd[i] <= 0 && e.energy >= e.kit.sigs[i].cost) { this.useSkill(e, i, aim); break; } if (e.ult >= ULT_MAX) this.useSkill(e, 3, aim); } }
        e.shielding = aShield && e.energy > 2 && e.stunned <= 0;
        const ty = Math.atan2(aim.x - e.pos.x, aim.z - e.pos.z);
        if (aFire || e.shielding || this.camMode === 'fps' || this.camMode === 'tps' || (this.input.aim && this.camMode === 'follow')) e.yaw = ty; else if (move.lengthSq() > 0.01) e.yaw = Math.atan2(move.x, move.z);
        if (aFire && !e.shielding) { e.yaw = ty; if (this.cast(e, e.spell, aim)) this.input.fireTap = false; }
        if (inp.dodge) this.startDodge(e, move.lengthSq() > 0.01 ? move : camRight.clone().multiplyScalar(-1));
        if (sprint && move.lengthSq() > 0.01) this.speedFx = Math.max(this.speedFx, 0.45);
      } else if (this.state === 'playing' && e.stunned <= 0 && e.dashT <= 0) { const smart = this.autoBrain === 'smart' && ((e === this.ctrl && (this.auto || this.opts.auto)) || (this.smartAllies && e.def.team === this.playerTeam)) && !e.scripted; const r = smart ? updateSmartAI(e, this.sw, dt, this.autoAggro) : updateAI(e, this, dt); move = r.move; sprint = r.sprint && e.stamina > 20; }
      if (e.stunned > 0) { move.set(0, 0, 0); e.shielding = false; }
      if (e.shielding) { e.energy -= dt * 6; sprint = false; move.multiplyScalar(0.4); }
      e.energy = Math.min(e.maxEnergy, e.energy + dt * (e.shielding ? 0 : 9)); if (e.energy <= 0) { e.energy = 0; e.shielding = false; }
      const moving = move.lengthSq() > 0.01; e.stamina = Math.min(e.maxStamina, e.stamina + dt * (sprint && moving ? -22 : 16));
      const speed = e.def.speed * (sprint && moving ? 1.6 : 1) * (e.buffT > 0 ? e.buff.speed : 1) * e.speedMul * e.moraleSpd * (e.slowT > 0 ? 0.45 : 1);
      const vel = move.multiplyScalar(speed);
      if (e.dodgeT > 0) { e.dodgeT -= dt; vel.copy(e.dodgeDir).multiplyScalar(17); }
      if (e.dashT > 0) { e.dashT -= dt; vel.copy(e.dodgeDir).multiplyScalar(24); this.particles.emit(e.chest(), (e as any).dashColor ?? 0xffffff, 2, 1, 0.8, 0.3);
        for (const o of this.foesOf(e)) if (!e.dashHit.has(o.uid) && o.pos.distanceTo(e.pos) < 1.6) { e.dashHit.add(o.uid); this.dealHit(e, o, synth((e as any).dashName ?? 'Dash', (e as any).dashColor ?? 0xffffff, e.dashDmg, 0.5, e.dashKnock), this.effPower(e), 1, e.pos); } }
      vel.add(e.knock); e.knock.multiplyScalar(Math.pow(0.02, dt));
      e.pos.addScaledVector(vel, dt); const r = 0.55 * (e.def.look.scale ?? 1); [e.pos.x, e.pos.z] = resolveCircle(e.pos.x, e.pos.z, r, this.world.boxes); [e.pos.x, e.pos.z] = this.world.clamp(e.pos.x, e.pos.z);
      for (const o of this.entities) if (o !== e && o.alive) { const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d = Math.hypot(dx, dz); if (d < 1.1 && d > 0.001) { e.pos.x += dx / d * (1.1 - d) * 0.5; e.pos.z += dz / d * (1.1 - d) * 0.5; } }
      this.animate(e, dt, moving ? speed : 0);
    }
    this.war?.update(dt); this.destruction.update(dt);
    this.updateProjectiles(dt); this.updateHazards(dt); this.particles.update(dt); this.updateCamera(rawDt);
    for (const rg of this.rings) { rg.life -= dt; const f = 1 - rg.life / rg.max; rg.mesh.scale.setScalar(0.3 + f * rg.r); (rg.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - f; if (rg.life <= 0) this.world.scene.remove(rg.mesh); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const [i, t] of this.world.torches.entries()) t.intensity = 28 + Math.sin(this.time * 13 + i * 7) * 4;
    this.speedFx = Math.max(0, this.speedFx - rawDt * 2.2);
    if (!this.ctrl.alive && this.state === 'playing') { const h = this.entities.find(e => e.def.team === this.playerTeam && e.alive && (e.def.playable || this.storyMode) && !e.def.id.startsWith('de')); if (h) { this.setControlled(h); this.onEvent('▶ ' + h.def.name, '#fc6'); } }
    if (this.storyMode) { /* campaign script decides victory/defeat */ }
    else if (this.custom && this.state === 'playing') { const r = customResult(this); if (r) this.end(r === 'win'); }
    else if (this.state === 'playing' && this.war) {
      const w = this.war.winner; const lostAll = !this.entities.some(e => e.def.team === this.playerTeam && e.alive && e.def.playable) && !opts_auto(this);
      if (w !== 0 || lostAll) { const won = !lostAll && (w === 1) === (this.playerTeam === 'hogwarts'); this.state = won ? 'won' : 'lost'; document.exitPointerLock?.(); this.onEnd(won); }
    } else if (this.state === 'playing') {
      const enemyTeam = this.playerTeam === 'hogwarts' ? 'death' : 'hogwarts';
      if (!this.entities.some(e => e.def.team === enemyTeam && e.alive)) { this.state = 'won'; document.exitPointerLock?.(); this.onEnd(true); }
      else if (!this.entities.some(e => e.def.team === this.playerTeam && e.alive)) { this.state = 'lost'; document.exitPointerLock?.(); this.onEnd(false); }
    }
  }
  // ---------------- Voldemort multi-phase boss ----------------
  updateBoss(dt: number) { if (this.storyMode && !this.bossFight) return;
    const v = this.entities.find(e => e.def.boss); if (!v || !v.alive) { if (this.hazards.length) { this.hazards.forEach(h => this.world.scene.remove(h.mesh)); this.hazards = []; this.setEnv('night'); } return; }
    const ph = bossPhase(v.hp / v.maxHp);
    if (ph !== this.phase) { this.phase = ph; const d = PHASES[ph]; v.speedMul = d.speed; v.def = { ...v.def, ai: { ...v.def.ai, reaction: VOLDEMORT.ai.reaction * d.reaction } };
      this.onBanner(`PHASE ${ph}: ${d.name}`, 'Lord Voldemort', '#7dff9a'); this.setEnv(d.env); this.ring(v.pos, 10, 0x22ff44); this.shake = 0.7; sfx.explode(); v.ccImmune = 3; v.stunned = 0;
      for (let i = 0; i < d.summon; i++) { const de = new Entity(makeDeathEater(10 + i + ph * 2), this.world.scene, THREE.MathUtils.clamp(v.pos.x + (i ? 3 : -3), -28, 28), THREE.MathUtils.clamp(v.pos.z - 2, -28, 28), v.def.team === this.playerTeam ? 1 : this.difficulty); this.entities.push(de); this.particles.emit(de.chest(), 0x111111, 30, 4, 1.2, 0.8); }
      if (d.hazard >= 1 && !this.hazards.some(h => h.kind === 'fire')) for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4a10, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        this.world.scene.add(m); this.hazards.push({ kind: 'fire', pos: new THREE.Vector3(), r: 2.5, t: i / 4 * Math.PI * 2, mesh: m, dps: 9 }); }
      if (ph === 4) this.later(0.3, () => { v.ult = ULT_MAX; this.useSkill(v, 3); });
    }
    // teleport pattern
    const d = PHASES[this.phase]; if (!v.playerControlled && !v.clashing && Math.random() < d.teleport * dt * 0.4) { const t = this.nearestFoe(v, v.pos); if (t) this.applyEffect(v, { kind: 'teleport', behind: true }, t.chest(), t, v.kit.sigs[1]); }
    // lightning storm in phase 3+
    if (d.hazard >= 2) { this.boltT -= dt; if (this.boltT <= 0) { this.boltT = d.hazard >= 3 ? 1.6 : 2.6; const foes = this.foesOf(v); const t = foes[Math.floor(Math.random() * foes.length)];
      if (t) { const m = new THREE.Mesh(new THREE.RingGeometry(2.6, 3, 32), new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(t.pos.x, 0.12, t.pos.z); this.world.scene.add(m);
        this.hazards.push({ kind: 'bolt', pos: t.pos.clone(), r: 3, t: 1.2, mesh: m }); } } }
  }
  updateHazards(dt: number) { if (this.storyMode && !this.bossFight) { this.hazards.length = 0; }
    const v = this.entities.find(e => e.def.boss);
    for (const h of this.hazards) {
      if (h.kind === 'fire') { h.t += dt * 0.25; h.pos.set(Math.cos(h.t) * 13, 0, Math.sin(h.t) * 13); h.mesh.position.set(h.pos.x, 1.5, h.pos.z); h.mesh.rotation.y += dt * 2;
        if (Math.random() < 0.5) this.particles.emit(h.pos.clone().setY(0.5 + Math.random() * 2), 0xff6a10, 1, 2, 1, 0.5);
        for (const e of this.entities) if (e.alive && v && e.def.team !== v.def.team && e.pos.distanceTo(h.pos) < h.r && e.invuln <= 0) { e.hp = Math.max(0, e.hp - h.dps! * dt); e.flash = 0.05; if (!e.alive) this.onEvent(`${e.def.name} ✖ (Fiendfyre)`, '#f66'); } }
      else { h.t -= dt; (h.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(this.time * 30) * 0.4;
        if (h.t <= 0) { this.world.scene.remove(h.mesh); h.r = -1; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 60, 6), new THREE.MeshBasicMaterial({ color: 0xc8ffd8 })); col.position.set(h.pos.x, 30, h.pos.z); this.world.scene.add(col); setTimeout(() => this.world.scene.remove(col), 120);
          this.ring(h.pos, 3, 0x7dff9a); if (h.pos.distanceTo(this.ctrl.pos) < 30) { sfx.explode(); this.onFlash('rgba(190,255,210,.45)'); }
          const sp = synth('Dark Lightning', 0x7dff9a, 22, 0.6, 6); for (const e of this.entities) if (e.alive && v && e.def.team !== v.def.team && e.pos.distanceTo(h.pos) < 3) this.dealHit(v, e, sp, 1, 1, h.pos); } }
    }
    this.hazards = this.hazards.filter(h => h.r > 0);
  }
  setEnv(env: string) {
    const sc = this.world.scene; const fog = sc.fog as THREE.FogExp2; const sky = sc.children.find(o => o.userData.sky) as THREE.Mesh;
    const E: Record<string, [number, number, number, number, number]> = { night: [0x3d3279, 0.013, 0xffffff, 0xb8b0ff, 1.5], fire: [0x7a2a2a, 0.015, 0xffb0a0, 0xffb090, 1.5], storm: [0x1f5a4a, 0.018, 0x9affc8, 0x9affc8, 1.3], eclipse: [0x3a0a1a, 0.022, 0xff6a8a, 0xff7090, 1.2] };
    const [fc, fd, skyc, hc, hi] = E[env]; fog.color.setHex(fc); fog.density = fd; (sky.material as THREE.MeshBasicMaterial).color.setHex(skyc); this.world.hemi.color.setHex(hc); this.world.hemi.intensity = hi;
    (this.world.omen.material as THREE.MeshBasicMaterial).opacity = env === 'night' ? 0.12 : 0.35;
  }
  specLabel = '';
  followList(): { x: number; z: number; name: string; scale: number }[] {
    const l: { x: number; z: number; name: string; scale: number }[] = this.entities.filter(e => e.alive).map(e => ({ x: e.pos.x, z: e.pos.z, name: e.def.name, scale: 1 }));
    if (this.war) for (const u of this.war.units) if (u.active && u.state === 'fight' && u.def.type === 'giant') l.push({ x: u.x, z: u.z, name: 'Giant #' + u.idx, scale: 2 });
    return l; }
  aimPoint(): THREE.Vector3 {
    if (this.camMode === 'top' && this.mode !== 'commander' && this.mode !== 'spectator') { const mp = this.input.touch ? null : new THREE.Vector2(this.input.mx, this.input.my);
      if (mp) { this.ray.setFromCamera(mp, this.camera); const r = this.ray.ray; const tt = r.direction.y < -0.01 ? (1.2 - r.origin.y) / r.direction.y : 30; const gp = r.origin.clone().addScaledVector(r.direction, tt);
        let best: Entity | null = null, bd = 2.5; for (const f of this.foesOf(this.ctrl)) { const d = Math.hypot(f.pos.x - gp.x, f.pos.z - gp.z); if (d < bd) { bd = d; best = f; } } return best ? best.chest() : gp; }
      const f = this.nearestFoe(this.ctrl, this.ctrl.pos); return f ? f.chest() : this.ctrl.pos.clone().add(new THREE.Vector3(Math.sin(this.ctrl.yaw) * 10, 1.3, Math.cos(this.ctrl.yaw) * 10)); }
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera); const o = this.ray.ray.origin, d = this.ray.ray.direction;
    let bestT = 80; let ang = 0.12, pick: Entity | null = null;
    for (const f of this.foesOf(this.ctrl)) { const v = f.chest().sub(o); const dist = v.length(); const a = v.normalize().angleTo(d); if (a < ang && dist < 60) { ang = a; pick = f; } }
    if (pick) return pick.chest();
    for (let t = 2; t < bestT; t += 0.5) { const p = o.clone().addScaledVector(d, t); if (p.y <= 0 || pointInBoxes(p.x, p.y, p.z, this.world.boxes)) { bestT = t; break; } }
    return o.clone().addScaledVector(d, bestT);
  }
  updateProjectiles(dt: number) {
    for (const p of this.projectiles) { if (!p.alive) continue;
      if (p.spell.homing && p.target && p.target.alive) { const want = p.target.chest().sub(p.pos).normalize().multiplyScalar(p.spell.speed); p.vel.lerp(want, Math.min(1, p.spell.homing * dt)).setLength(p.spell.speed); }
      p.prev.copy(p.pos); p.pos.addScaledVector(p.vel, dt); p.life -= dt; p.mesh.position.copy(p.pos);
      if (Math.random() < 0.7) this.particles.emit(p.pos, p.spell.color, 1, 0.5, p.spell.radius * 2.2, 0.35);
      let hit: Entity | null = null;
      for (const e of this.entities) { if (!e.alive || e.def.team === p.team || p.hitSet!.has(e.uid)) continue; const sh = e.shielding || e.barrier > 0; const rr = (sh ? 1.3 : 0.7) * (e.def.look.scale ?? 1) + p.spell.radius;
        const c = sh ? e.pos.clone().setY(1.1) : e.chest(); if (segmentHitsSphere(p.prev.toArray(), p.pos.toArray(), c.toArray(), rr)) { hit = e; break; } }
      const wall = p.pos.y <= 0.05 || pointInBoxes(p.pos.x, p.pos.y, p.pos.z, this.world.boxes);
      if (!hit && this.war) { const u = this.war.hitTest(p.prev, p.pos, p.spell.radius, p.team); if (u) { this.war.curBy = this.entities.find(x => x.uid === p.ownerId) ?? null; this.war.damageUnit(u, p.spell.damage * p.power, p.spell.id, p.team); this.particles.emit(p.pos, p.spell.color, 8, 3, 0.6, 0.3); if (!p.spell.pierce) { p.alive = false; this.world.scene.remove(p.mesh); this.impact(p, null); continue; } } }
      if (wall && p.pos.y > 0.05) this.destruction.damageAt(p.pos, p.spell.damage * p.power);
      if (hit && p.spell.pierce && !wall && p.life > 0) { p.hitSet!.add(hit.uid); this.impact(p, hit); continue; }
      if (hit || wall || p.life <= 0) { p.alive = false; this.world.scene.remove(p.mesh); this.impact(p, hit); }
    }
    // spell clash detection: opposing bolts from named duellists meeting head-on
    if (!this.clash && this.clashCd <= 0) outer: for (const p of this.projectiles) { if (!p.alive) continue; for (const q of this.projectiles) {
      if (!q.alive || q.team === p.team || q === p) continue; if (!segmentHitsSphere(p.prev.toArray(), p.pos.toArray(), q.pos.toArray(), 1.0)) continue;
      const a = this.entities.find(e => e.uid === p.ownerId), b = this.entities.find(e => e.uid === q.ownerId);
      if (!a || !b || !a.alive || !b.alive || !a.def.playable || !b.def.playable || a.pos.distanceTo(b.pos) > 35) continue;
      if (!a.playerControlled && !b.playerControlled && Math.random() < 0.5) continue;
      p.alive = q.alive = false; this.world.scene.remove(p.mesh, q.mesh); this.startClash(a, b); break outer; } }
    this.projectiles = this.projectiles.filter(p => p.alive);
  }
  impact(p: Projectile, direct: Entity | null) {
    const s = p.spell; const near = p.pos.distanceTo(this.ctrl.pos) < 30; const owner = this.entities.find(x => x.uid === p.ownerId) ?? null;
    this.particles.emit(p.pos, s.color, s.aoe > 0 ? 40 : 14, s.aoe > 0 ? 9 : 4, s.aoe > 0 ? 1.4 : 0.7, s.aoe > 0 ? 0.9 : 0.4);
    if (s.aoe > 0) { this.particles.emit(p.pos, 0xffffff, 10, 6, 1.8, 0.3); if (near) { sfx.explode(); this.shake = Math.max(this.shake, s.aoe / 12); } }
    if (direct) this.dealHit(owner, direct, s, p.power, 1, p.pos);
    if (s.aoe > 0) { if (this.war) this.war.curBy = this.entities.find(x => x.uid === p.ownerId) ?? null; this.war?.splash(p.pos, s.aoe, s.damage * p.power * 0.8, p.team, s.id); this.destruction.damageAt(p.pos, s.damage * p.power * 1.5, s.aoe); }
    if (s.aoe > 0) for (const e of this.entities) if (e.alive && e !== direct && e.def.team !== p.team) { const f = splashFalloff(e.pos.distanceTo(p.pos), s.aoe); if (f > 0) this.dealHit(owner, e, s, p.power, f * 0.8, p.pos); }
  }
  animate(e: Entity, dt: number, speed: number) {
    const m = e.model; m.root.position.set(e.pos.x, 0, e.pos.z);
    m.root.rotation.y = m.root.rotation.y + angDiff(m.root.rotation.y, e.yaw) * Math.min(1, dt * 14);
    e.walkT += dt * speed * 1.6; e.castT += dt; e.ultT += dt; e.hitT += dt;
    if (!(e.dodgeT > 0 || e.dashT > 0)) m.root.rotation.x = 0; else if (e.dashT > 0) m.root.rotation.x = 0.3;
    m.root.position.y = e.dodgeT > 0 ? Math.sin(Math.min(1, (0.32 - e.dodgeT) / 0.32) * Math.PI) * 0.35 : 0;
    const won = this.state === 'won' || this.state === 'lost' ? (this.state === 'won') === (e.def.team === this.playerTeam) : false;
    if (m.rig) animateRig(m, { dt, speed, maxSpeed: e.def.speed * 1.6, castT: e.castT, ultT: e.ultT, hitT: e.hitT, dodge: e.dodgeT, stunned: e.stunned > 0, down: e.stunned > 1.0, dead: !e.alive, victory: won, clashing: e.clashing, shielding: e.shielding, camDist: this.camera.position.distanceTo(e.pos) });
    else { m.body.rotation.z = Math.sin(e.walkT) * 0.06 * Math.min(1, speed); m.root.position.y = Math.abs(Math.sin(e.walkT)) * 0.07 * Math.min(1, speed); m.arm.rotation.x = e.stunned > 0 ? 0.9 : 0; }
    const sh = e.shielding || e.barrier > 0; m.shield.visible = sh; if (sh) (m.shield.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(this.time * 20) * 0.06;
    m.aura.visible = e.buffT > 0 || e.ult >= ULT_MAX; if (m.aura.visible) { m.aura.rotation.y += dt * 3; (m.aura.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(this.time * 8) * 0.08; }
    if (!m.rig) m.root.rotation.z = e.stunned > 0 ? Math.sin(this.time * 9) * 0.15 : 0;
    (m.ring.material as THREE.MeshBasicMaterial).opacity = e.playerControlled ? 1 : 0.4;
    const fl = e.flash > 0; if (fl !== (m as any)._fl) { (m as any)._fl = fl; for (const mm of m.meshes) { const mat = mm.material as THREE.MeshToonMaterial; if (mat.emissive) mat.emissive.setHex(fl ? 0xff4040 : 0); } }
  }
  animateDeath(e: Entity, dt: number) { e.shielding = false; e.model.shield.visible = false; e.model.ring.visible = false; e.model.aura.visible = false; if (e.deadT < 1) { e.deadT += dt; e.model.root.rotation.x = -Math.min(1, e.deadT * 2) * Math.PI / 2; e.model.root.position.y = 0.3; }
    if (e.model.rig) animateRig(e.model, { dt, speed: 0, maxSpeed: 6, castT: 9, ultT: 9, hitT: 9, dodge: 0, stunned: false, down: true, dead: true, victory: false, clashing: false, shielding: false, camDist: this.camera.position.distanceTo(e.pos) }); }
  updateCamera(dt: number) {
    if (this.mode === 'commander') { const [ax, ay] = this.input.axis(); const sp = this.tac.zoom * 0.9 * dt; this.tac.x += ax * sp; this.tac.z -= ay * sp; this.tac.x = THREE.MathUtils.clamp(this.tac.x, -40, 40); this.tac.z = THREE.MathUtils.clamp(this.tac.z, -65, 95);
      this.camera.position.lerp(new THREE.Vector3(this.tac.x, this.tac.zoom, this.tac.z + this.tac.zoom * 0.55), Math.min(1, dt * 8)); this.camera.lookAt(this.tac.x, 0, this.tac.z); return; }
    if (this.mode === 'spectator') { const list = this.followList(); if (!list.length) return; const f = list[((this.follow % list.length) + list.length) % list.length]; this.camYaw += dt * 0.25;
      const big = f.scale; const piv = new THREE.Vector3(f.x, 1.6 * big, f.z); const d = 7 * big + 3; const want = piv.clone().add(new THREE.Vector3(Math.sin(this.camYaw) * d, 3 + big * 2, Math.cos(this.camYaw) * d));
      this.camera.position.lerp(want, Math.min(1, dt * 4)); this.camera.lookAt(piv); this.specLabel = f.name; return; }
    const M = this.camMode, C = CAM_CFG[M]; const sc = this.ctrl.def.look.scale ?? 1; const t = this.ctrl.pos; const pivot = new THREE.Vector3(t.x, C.height * Math.min(1.6, sc), t.z);
    const ult = this.slowT > 0; const clashing = !!(this.clash && this.ctrl.clashing);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    this.updateViewModel(M === 'fps' && !clashing && this.ctrl.alive, dt);
    if (M === 'fps' && !clashing) { const fwd = dir.clone().negate(); const eye = pivot.clone().addScaledVector(new THREE.Vector3(fwd.x, 0, fwd.z).normalize(), 0.18 * sc);
      if (this.ctrl.dodgeT > 0) eye.y -= 0.5; this.camera.position.lerp(eye, Math.min(1, dt * C.lerp)); this.shakeCam(dt); this.setFov(C.fov * (1 - 0.35 * this.aimZoom) + this.speedFx * 6); this.camera.lookAt(this.camera.position.clone().add(fwd)); return; }
    const camDist = (ult ? Math.min(4.2, C.dist) : clashing ? 7.5 : C.dist * (1 - 0.3 * this.aimZoom)) * (M === 'top' ? Math.max(1, sc * 0.8) : Math.max(1, sc * 0.7));
    pivot.addScaledVector(right, (M === 'tps' ? C.side * this.shoulder : C.side) * (clashing ? 0 : 1) * Math.max(1, sc * 0.6));
    let dist = camDist; if (M !== 'top') for (let d = 0.5; d <= camDist; d += 0.25) { const p = pivot.clone().addScaledVector(dir, d); if (p.y < 0.3 || pointInBoxes(p.x, p.y, p.z, this.world.boxes)) { dist = Math.max(0.6, d - 0.4); break; } }
    const want = pivot.clone().addScaledVector(dir, dist); this.camera.position.lerp(want, Math.min(1, dt * (ult ? 14 : C.lerp)));
    this.shakeCam(dt); this.setFov(C.fov * (1 - 0.3 * this.aimZoom) + this.speedFx * 8);
    if (M === 'top') this.camera.lookAt(pivot.x, 0, pivot.z); else this.camera.lookAt(pivot.clone().addScaledVector(dir, -10));
  }
  shakeCam(dt: number) { this.shake = Math.max(0, this.shake - dt * 1.5); if (this.shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), 0).multiplyScalar(this.shake * 0.6)); }
  setFov(f: number) { if (Math.abs(this.camera.fov - f) > 0.1) { this.camera.fov = f; this.camera.updateProjectionMatrix(); } }
  /** FPS: hide own model, show hands + wand view-model with bob/recoil */
  updateViewModel(on: boolean, dt: number) {
    const e = this.ctrl; if (this.vmFor && (this.vmFor !== e || !on)) { this.vmFor.model.root.visible = true; this.vmFor = null; }
    if (!on) { if (this.vm) this.vm.g.visible = false; return; }
    if (!this.vm || (this.vm as any).id !== e.def.id) { if (this.vm) this.camera.remove(this.vm.g); const l = e.def.look; this.vm = buildViewModel(l.robe, l.skin, l.wandColor ?? 0x5a3620, l.spellColor ?? 0xffffff); (this.vm as any).id = e.def.id; this.camera.add(this.vm.g); if (!this.camera.parent) this.world.scene.add(this.camera); }
    this.vm.g.visible = true; e.model.root.visible = false; this.vmFor = e;
    const sp = Math.hypot(e.pos.x - ((this as any)._vx ?? e.pos.x), e.pos.z - ((this as any)._vz ?? e.pos.z)) / Math.max(dt, 1e-3); (this as any)._vx = e.pos.x; (this as any)._vz = e.pos.z; const bt = this.time * 9;
    const rec = Math.max(0, 1 - e.castT / 0.18); const sh = e.shielding ? 1 : 0; const a = this.vm.arm;
    a.position.set(0.27 - 0.14 * this.aimZoom + Math.sin(bt) * 0.008 * Math.min(1, sp / 5), -0.25 + Math.abs(Math.cos(bt)) * 0.01 * Math.min(1, sp / 5) + sh * 0.06, -0.34 + rec * 0.08);
    a.rotation.set(0.05 + rec * 0.35 - sh * 0.3, 0.08 - 0.06 * this.aimZoom, sh * 0.6);
  }
}
function opts_auto(g: Game) { return !!g.opts.auto; }
function near(e: Entity, g: Game) { return e.playerControlled || e.pos.distanceTo(g.ctrl.pos) < 30; }
export const PLAYABLE_IDS = ['harry', 'hermione', 'ron', 'mcgonagall', 'neville', 'luna', 'voldemort', 'bellatrix'];
function synth(name: string, color: number, damage: number, stun: number, knock: number): SpellDef {
  return { id: name as SpellId, name, color, damage, speed: 0, cost: 0, cooldown: 0, radius: 0, aoe: 0, knockback: knock, stun, disarm: 0 };
}
function angDiff(a: number, b: number) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

/** Victory evaluation for free battles / What If (from the player's team point of view). */
export function customResult(g: Game): 'win' | 'lose' | null {
  const C = g.custom!; const mine = g.entities.filter(e => e.def.team === g.playerTeam), theirs = g.entities.filter(e => e.def.team !== g.playerTeam);
  const alive = (l: Entity[]) => l.some(e => e.alive);
  if (!alive(mine)) return 'lose';
  switch (C.victory) {
    case 'elimination': return alive(theirs) ? null : 'win';
    case 'leader': { const lead = theirs[0]; if (lead && !lead.alive) return 'win'; const myLead = mine[0]; if (myLead && !myLead.alive) return 'lose'; return alive(theirs) ? null : 'win'; }
    case 'score': { if (!g.war) return alive(theirs) ? null : 'win'; const s = g.war.score * (g.playerTeam === 'hogwarts' ? 1 : -1); if (s >= 60) return 'win'; if (s <= -60) return 'lose'; return null; }
    case 'survival': return g.time >= (C.timeLimit ?? 120) ? 'win' : null;
  }
  return null;
}
