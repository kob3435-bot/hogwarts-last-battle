import * as THREE from 'three';
import type { Game } from '../game';
import type { Entity } from '../character/entity';
import { chapterFor, Chapter, Cutscene, NAMES_TH, CHAPTERS_DATA } from './chapters';
import { evaluate, Objective, ObjState, Line } from './objectives';
import { CampaignState, Flags, setCheckpoint, completeChapter, saveCampaign } from './save';
import { getLang } from '../ui/i18n';
import { sfx } from '../audio/audio';
import { fantasize, fantasyState } from '../ui/fantasy';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const tr = (l: { en: string; th: string }) => l[getLang() === 'th' ? 'th' : 'en'];
const who = (n: string) => getLang() === 'th' ? NAMES_TH[n] ?? fantasize(n) : fantasyState.on ? fantasize(n) : n;
export type MakeGame = (c: Chapter) => Game;

/** In-engine cutscene: camera paths, letterbox, subtitles; click/Space advances, Skip ends. */
export class Cine {
  i = -1; t = 0; dur = 0; prevLock = false; lineI = -1; done = false; private cam = new THREE.Vector3(); private look = new THREE.Vector3();
  constructor(private g: Game, private cs: Cutscene, private onEvent: (e: string) => void, private onDone: () => void) {
    g.cinematic = true; this.prevLock = g.input.noLock; g.input.noLock = true; document.exitPointerLock?.(); document.body.classList.add('cine'); $('#skip').onclick = () => this.finish(); this.next(); }
  advance() { if (this.done) return; const s = this.cs.shots[this.i]; const n = s.lines?.length ?? 0; const per = this.dur / Math.max(1, n); this.t = Math.min(this.dur, (Math.floor(this.t / per) + 1) * per); }
  next() { this.i++; if (this.i >= this.cs.shots.length) return this.finish(); const s = this.cs.shots[this.i]; this.t = 0; this.lineI = -1; this.dur = Math.max(s.dur, (s.lines?.length ?? 0) * 3.4); if (s.event) this.onEvent(s.event); }
  resolve(l: [number, number, number] | string, out: THREE.Vector3) { if (typeof l === 'string') { const e = this.g.entities.find(e => e.def.id === l); if (e) return out.copy(e.pos).setY(e.pos.y + 1.4 * (e.def.look.scale ?? 1)); return out.set(0, 1.5, 0); } return out.set(l[0], l[1], l[2]); }
  update(dt: number) {
    if (this.done) return; this.t += dt; const s = this.cs.shots[this.i]; if (this.t >= this.dur) { this.next(); if (this.done) return; return; }
    const k = this.t / this.dur, e = k * k * (3 - 2 * k); const a = s.cam, b = s.to ?? s.cam;
    let base = this.cam.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e);
    if (typeof s.look === 'string') { const tgt = this.g.entities.find(x => x.def.id === s.look); if (tgt) base = base.add(new THREE.Vector3(tgt.pos.x, 0, tgt.pos.z)); } // entity shots: cam offset relative to the actor
    this.g.camera.position.lerp(base, this.i === 0 && this.t < dt * 2 ? 1 : Math.min(1, dt * 6)); this.g.camera.lookAt(this.resolve(s.look, this.look));
    const n = s.lines?.length ?? 0; const li = n ? Math.min(n - 1, Math.floor(this.t / (this.dur / n))) : -1;
    if (li !== this.lineI) { this.lineI = li; const l = li >= 0 ? s.lines![li] : null; $('#sub').innerHTML = l ? `<b>${who(l.who)}</b>${tr(l)}` : ''; if (l) sfx.ui(); }
  }
  finish() { if (this.done) return; this.done = true; this.g.cinematic = false; this.g.input.noLock = this.prevLock; document.body.classList.remove('cine'); $('#sub').innerHTML = ''; this.onDone(); }
}

export class StoryRunner {
  g!: Game; ch!: Chapter; n = 1; idx = 0; objT = 0; elapsed = 0; tagged: Entity[] = []; flags: Flags = {}; cine: Cine | null = null; raf = 0; last = 0; over = false;
  interacted = new Set<number>(); holdT = 0; collected = false; markers: THREE.Object3D[] = []; item: THREE.Object3D | null = null; reviveBase = 0; castBase = 0;
  fireFront = -99; fireOn = false; barkT = 0; pending: Line[] = []; aidUsed = 0; dtNow = 0.016; phaseClash = false;
  constructor(public camp: CampaignState, private make: MakeGame, private ui: { onEnd: (won: boolean, r: StoryRunner) => void }) {}
  start(n: number, from = 0) {
    this.stop(); $('#white').classList.remove('on'); this.pending = []; this.n = n; this.flags = { ...this.camp.flags }; this.ch = chapterFor(n, this.flags); this.g = this.make(this.ch); this.over = false;
    this.idx = from; this.elapsed = 0; $('#storyObj').classList.remove('hidden');
    this.camp.checkpoint = { chapter: n, objective: from, flags: { ...this.flags }, at: Date.now() }; void saveCampaign(this.camp);
    this.beginObjective(from);
    if (from === 0) this.cine = new Cine(this.g, this.ch.intro, e => this.event(e), () => { this.cine = null; this.titleCard(); const p = this.pending; this.pending = []; if (p.length) setTimeout(() => this.bark(p), 1500); });
    else this.titleCard();
    this.last = performance.now(); const loop = (t: number) => { this.raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.update(dt); }; this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); this.cine = null; this.markers.length = 0; this.item = null; this.tagged = []; this.fireOn = false; document.body.classList.remove('cine'); }
  titleCard() { const b = $('#chapterCard'); b.innerHTML = `<small>${getLang() === 'th' ? 'บทที่' : 'Chapter'} ${this.n}</small>${tr(this.ch.title)}`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  get obj(): Objective | undefined { return this.ch.objectives[this.idx]; }
  bark(lines: Line[]) { if (this.cine) { this.pending.push(...lines); return; } lines.forEach((l, i) => setTimeout(() => { if (this.over) return; $('#bark').innerHTML = `<b>${who(l.who)}</b>${tr(l)}`; $('#bark').classList.add('show'); clearTimeout(this.barkT); this.barkT = window.setTimeout(() => $('#bark').classList.remove('show'), 3800); }, i * 3600)); }
  marker(x: number, z: number, color = 0x7dd3ff, r = 2) { const grp = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.y = 15; grp.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.2, r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; grp.add(ring);
    grp.position.set(x, 0, z); this.g.world.scene.add(grp); this.markers.push(grp); return grp; }
  clearMarkers() { for (const m of this.markers) this.g.world.scene.remove(m); this.markers = []; }
  beginObjective(i: number) {
    const o = this.ch.objectives[i]; this.objT = 0; this.tagged = []; this.interacted.clear(); this.holdT = 0; this.collected = false; this.clearMarkers(); if (this.item) { this.g.world.scene.remove(this.item); this.item = null; }
    if (!o) return; this.reviveBase = this.g.war?.stats.revived ?? 0;
    for (const s of o.spawn ?? []) for (let k = 0; k < (s.count ?? 1); k++) {
      const x = s.x + (k ? (Math.random() - .5) * 4 : 0), z = s.z + (k ? (Math.random() - .5) * 4 : 0);
      if (s.npc) { this.g.war?.spawn(s.team ?? (s.npc === 'student' ? 'hogwarts' : 'death'), false, s.npc as any, { x, z }, 0, !!s.downed); continue; }
      const existing = this.g.entities.find(e => e.def.id === s.id && e.alive && s.id !== 'dementorE' && !s.id.startsWith('de')); if (existing) { if (s.scripted !== undefined) existing.scripted = s.scripted; continue; }
      const e = this.g.spawnEntity(s.id, x, z, s.team); e.scripted = !!s.scripted; if (s.hpFrac) e.hp = e.maxHp * s.hpFrac;
      if (e.def.team !== this.g.playerTeam) this.tagged.push(e);
    }
    if (o.target) { const t = this.g.entities.find(e => e.def.id === o.target && e.alive); if (t && !this.tagged.includes(t) && t.def.team !== this.g.playerTeam) this.tagged.push(t); }
    if (o.kind === 'reach') this.marker(o.x!, o.z!, 0x7dd3ff, o.r ?? 3);
    if (o.kind === 'interact') o.points!.forEach(([x, z]) => this.marker(x, z, 0xffd34d, 2.2));
    if (o.kind === 'collect') { const it = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 8, 20), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })); it.position.set(o.x!, 1.4, o.z!); this.g.world.scene.add(it); this.item = it; this.marker(o.x!, o.z!, 0x9ad8ff, 1.5); }
    if (o.barks) this.bark(o.barks);
    if (o.event) this.event(o.event);
  }
  event(e: string) {
    const g = this.g; const find = (id: string) => g.entities.find(x => x.def.id === id && x.alive);
    switch (e) {
      case 'fiendfyre': this.fireOn = true; this.fireFront = -30; g.onFlash?.('#ff6a1a'); sfx.ult?.(); break;
      case 'statues': { const n = this.flags.wardsComplete ? 14 : 8; for (let i = 0; i < n; i++) g.war?.spawn('hogwarts', false, 'statue', { x: (Math.random() - .5) * 16, z: -6 + (Math.random() - .5) * 8 }); g.onBanner?.(getLang() === 'th' ? 'ปิแอร์ทอตัม โลโคโมเตอร์!' : 'Piertotum Locomotor!', ''); break; }
      case 'giants': for (let i = 0; i < 2; i++) g.war?.spawn('death', false, 'giant', { x: (i - .5) * 4, z: 80 }); break;
      case 'cloak': if (g.ctrl) { g.ctrl.cloaked = true; this.castBase = g.stats.cast; } break;
      case 'uncloak': case 'reveal': g.entities.forEach(x => { x.cloaked = false; if (x.def.team === 'hogwarts') x.scripted = false; }); g.onFlash?.('#ffffff'); break;
      case 'voldyReveal': if (!find('voldemort')) { const v = g.spawnEntity('voldemort', 0, -4); v.scripted = true; for (const [id, x] of [['bellatrix', -4], ['de0', 4], ['de1', -7]] as const) { const d = g.spawnEntity(id, x, -6); d.scripted = true; } } break;
      case 'avada': { g.onFlash?.('#1fff6a'); const h = find('harry'); if (h) { h.hp = 0; } break; }
      case 'white': $('#white').classList.add('on'); break;
      case 'unwhite': $('#white').classList.remove('on'); break;
      case 'flash': g.onFlash?.('#ffffff'); break;
      case 'hallCrowd': [['mcgonagall', -15, -4], ['ron', -15, 6], ['hermione', 15, 6], ['neville', 15, -4], ['luna', -15, 14]].forEach(([id, x, z]) => { if (find(id as string)) return; const s = g.spawnEntity(id as string, x as number, z as number, 'hogwarts'); s.scripted = true; s.invuln = 1e9; s.yaw = (x as number) < 0 ? Math.PI / 2 : -Math.PI / 2; });
        for (const f of g.entities) if (f.def.id === 'fred') { f.scripted = true; f.invuln = 1e9; f.pos.set(15, 0, 14); } break;
      case 'bellaFinal': { const b = find('bellatrix'); if (b && this.flags.bellatrixWounded) { b.hp = b.maxHp * 0.7; this.bark([{ who: 'Bellatrix', en: 'You... you are the one who cut me!', th: 'เจ้า... เจ้าคือคนที่ทำให้ข้าบาดเจ็บ!' }]); } break; }
      case 'explodeFred': { const f = find('fred'); if (f) { f.hp = 0; g.particles.emit(f.chest(), 0xff8a2a, 60, 10, 1.2, 1.1); g.onFlash?.('#ff8a2a'); sfx.explode?.(); g.destruction?.damageAt?.(f.pos, 6, 999); } break; }
    }
  }
  state(): ObjState {
    const g = this.g, p = g.ctrl.pos, o = this.obj!;
    if (o.kind === 'interact') { o.points!.forEach(([x, z], i) => { if (this.interacted.has(i)) return; if (Math.hypot(p.x - x, p.z - z) < 2.4 && g.ctrl.alive) { this.holdT += (g.input.keys.has('KeyF') ? 2 : 1) * this.dtNow; if (this.holdT >= (o.hold ?? 1.5)) { this.interacted.add(i); this.holdT = 0; g.particles.emit(new THREE.Vector3(x, 1, z), 0xffd34d, 40, 6, 1, 0.8); sfx.skill(); const m = this.markers[i]; if (m) m.visible = false; } } }); }
    if (o.kind === 'collect' && Math.hypot(p.x - o.x!, p.z - o.z!) < 2) this.collected = true;
    return { t: this.objT, px: p.x, pz: p.z, tagAlive: this.tagged.filter(e => e.alive).length, tagTotal: this.tagged.length, interacted: this.interacted.size, collected: this.collected,
      warScore: g.war?.score ?? 0, alive: id => g.entities.some(e => e.def.id === id && e.alive), hpFrac: id => { const e = g.entities.find(e => e.def.id === id); return e ? e.hp / e.maxHp : 0; },
      posOf: id => { const e = g.entities.find(e => e.def.id === id && e.alive); return e ? [e.pos.x, e.pos.z] : null; }, revived: (g.war?.stats.revived ?? 0) - this.reviveBase,
      partyAlive: g.entities.some(e => e.def.team === g.playerTeam && e.alive && !e.scripted && !e.def.id.startsWith('de')) };
  }
  update(dt: number) {
    if (this.over || !this.g) return; this.dtNow = dt;
    for (const m of this.markers) m.rotation.y += dt; if (this.item) { this.item.rotation.y += dt * 2; this.item.position.y = 1.4 + Math.sin(performance.now() / 300) * 0.2; }
    if (this.cine) { this.cine.update(dt); return; }
    if (this.g.state !== 'playing') return;
    const o = this.obj; if (!o) return; this.objT += dt; this.elapsed += dt;
    // cloak breaks when Harry casts
    if (this.g.ctrl.cloaked && this.g.stats.cast > this.castBase) { this.g.ctrl.cloaked = false; this.bark([{ who: 'Carrow', en: 'There! Someone is there!', th: 'นั่น! มีใครอยู่ตรงนั้น!' }]); }
    if (this.fireOn) { this.fireFront += dt * 1.25; const ff = this.fireFront;
      for (let k = 0; k < 3; k++) this.g.particles.emit(new THREE.Vector3((Math.random() - .5) * 56, 0.5 + Math.random() * 3, ff - Math.random() * 3), Math.random() < .5 ? 0xff5a1a : 0xffc02a, 2, 2, 0.8, 0.9);
      for (const e of this.g.entities) if (e.alive && e.pos.z < ff && e.invuln <= 0) { e.hp = Math.max(0, e.hp - 40 * dt); e.flash = 0.1; } }
    // Voldemort final phase: one scripted beam lock (Expelliarmus vs Avada Kedavra)
    if (this.n === 12 && !this.phaseClash && this.g.phase >= 3 && !this.g.clash) { const v = this.g.entities.find(e => e.def.id === 'voldemort' && e.alive), h = this.g.ctrl; if (v && h.alive) { this.phaseClash = true; this.bark([{ who: 'Harry', en: 'Expelliarmus!', th: 'เอ็กซ์เปลลิอาร์มัส!' }, { who: 'Voldemort', en: 'Avada Kedavra!', th: 'อวาดา เคดาฟรา!' }]); this.g.startClash(h, v); } }
    // final duel: the watching defenders shield Harry when he falters (Fred adds one more if he was saved)
    if (this.n === 12) { const h = this.g.ctrl; const maxAid = this.flags.fredSaved ? 3 : 2; if (h.alive && h.hp < h.maxHp * 0.3 && this.aidUsed < maxAid) { this.aidUsed++; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.45); h.barrier = 2.5; this.g.particles.emit(h.chest(), 0xffe08a, 50, 6, 1, 1);
      const helpers = [{ who: 'Hermione', en: 'Protego! We\'re with you, Harry!', th: 'โพรเทโก! พวกเราอยู่กับเธอ แฮร์รี่!' }, { who: 'McGonagall', en: 'Stand, Potter! Hogwarts stands with you!', th: 'ลุกขึ้น พอตเตอร์! ฮอกวอตส์อยู่เคียงข้างเธอ!' }, { who: 'Fred', en: 'Oi, Tom! Over here!', th: 'เฮ้ ทอม! ทางนี้!' }];
      this.bark([helpers[this.aidUsed - 1]]); } }
    const r = evaluate(o, this.state());
    if (r === 'done') { if (o.flag) this.flags[o.flag] = true; if (o.kind === 'bossHp') this.flee(o.target!); sfx.ui(); this.next(); }
    else if (r === 'fail') { if (o.optional && this.state().partyAlive) { if (o.flag) this.flags[o.flag] = false; if (o.onFail) this.event(o.onFail); this.next(); } else this.fail(); }
    this.renderTracker();
  }
  flee(id: string) { const e = this.g.entities.find(x => x.def.id === id && x.alive); if (!e) return; if (id === 'bellatrix') this.flags.bellatrixWounded = this.objT < 120; this.g.particles.emit(e.chest(), 0x111111, 50, 6, 1, 1); e.hp = 0; e.model.root.visible = false;
    this.bark([{ who: 'Bellatrix', en: 'This isn\'t over, girl!', th: 'ยังไม่จบหรอก นังหนู!' }]); }
  next() {
    this.idx++; this.fireOn = this.fireOn && this.obj?.event === 'fiendfyre';
    if (this.idx >= this.ch.objectives.length) return this.finish();
    setCheckpoint(this.camp, this.n, this.idx, this.flags); void saveCampaign(this.camp); this.toast(getLang() === 'th' ? '💾 บันทึกอัตโนมัติ' : '💾 Checkpoint saved');
    this.beginObjective(this.idx);
  }
  toast(s: string) { const t = $('#saveToast'); t.textContent = s; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); }
  finish() {
    this.clearMarkers(); this.fireOn = false; this.renderTracker();
    this.cine = new Cine(this.g, this.ch.outro(this.flags), e => this.event(e), () => { this.cine = null; this.over = true;
      completeChapter(this.camp, this.n, this.flags, this.elapsed); void saveCampaign(this.camp); this.g.state = 'won'; this.ui.onEnd(true, this); });
  }
  fail() { this.over = true; this.g.state = 'lost'; this.ui.onEnd(false, this); }
  renderTracker() {
    const th = getLang() === 'th'; const cur = this.obj;
    const rows = this.ch.objectives.map((o, i) => { const st = i < this.idx ? '✔' : i === this.idx ? '▶' : '·'; let extra = '';
      if (i === this.idx && cur) { if (o.timeLimit) extra += ` ⏱${Math.max(0, o.timeLimit - this.objT).toFixed(0)}s`; if (o.kind === 'survive') extra += ` ${Math.min(this.objT, o.secs!).toFixed(0)}/${o.secs}s`;
        if (o.kind === 'interact') extra += ` ${this.interacted.size}/${o.points!.length}`; if (o.kind === 'defeat' && this.tagged.length) extra += ` ${this.tagged.filter(e => !e.alive).length}/${this.tagged.length}`;
        if (o.kind === 'revive') extra += ` ${Math.max(0, (this.g.war?.stats.revived ?? 0) - this.reviveBase)}/${o.count}`; if (o.kind === 'warScore') extra += ` (${Math.round(this.g.war?.score ?? 0)})`; }
      return `<div class="${i < this.idx ? 'done' : i === this.idx ? 'cur' : ''}">${st} ${tr(o.label)}${o.optional ? (th ? ' <em>(รอง)</em>' : ' <em>(optional)</em>') : ''}<small>${extra}</small></div>`; }).join('');
    $('#storyObj').innerHTML = `<h4>${th ? 'บทที่' : 'Ch.'} ${this.n}: ${tr(this.ch.title)}</h4>${rows}${this.g.ctrl.cloaked ? `<div class="cloak">👻 ${th ? 'ล่องหน' : 'CLOAKED'}</div>` : ''}`;
  }
}
export { CHAPTERS_DATA };
