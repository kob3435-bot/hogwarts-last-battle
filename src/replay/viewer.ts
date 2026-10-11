/** Replay playback: rebuilds the arena, poses recorded characters/units; free camera, follow cam, slow motion, scrubbing, event jumps. */
import * as THREE from 'three';
import { buildArea, Area } from '../rendering/areas';
import { buildModel } from '../character/model';
import { charById } from '../character/roster';
import { Replay, sample } from './recorder';
import { getLang } from '../ui/i18n';
const UCOL = [0xffd34d, 0xff9a3a, 0xd8c08a, 0x3a3a4a, 0x8a6a4a, 0x2a2a2a, 0x101018];
export class ReplayViewer {
  r: THREE.WebGLRenderer; cam = new THREE.PerspectiveCamera(60, 1, 0.1, 900); t = 0; speed = 1; playing = true; raf = 0; last = 0; follow = ''; ui: HTMLElement;
  models = new Map<string, ReturnType<typeof buildModel>>(); units: THREE.InstancedMesh; yaw = 0.6; pitch = 0.7; dist = 40; target = new THREE.Vector3(); keys = new Set<string>(); drag = false;
  private off: (() => void)[] = [];
  constructor(canvas: HTMLCanvasElement, public rep: Replay, private onExit: () => void) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true }); this.r.setPixelRatio(Math.min(devicePixelRatio, 1.5)); const w = buildArea(rep.area as Area); const scene = w.scene; this.scene = scene;
    for (const e of rep.roster) { const key = e.id + ':' + e.team; if (this.models.has(key)) continue; try { const m = buildModel(charById(e.id).look); scene.add(m.root); this.models.set(key, m); } catch { /* unknown id */ } }
    this.units = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 0.8, 3, 6), new THREE.MeshToonMaterial({ color: 0xffffff }), 400); this.units.count = 0; scene.add(this.units);
    const th = getLang() === 'th'; const ui = document.createElement('div'); ui.id = 'replayUI'; this.ui = ui;
    ui.innerHTML = `<div class="rtop">🎬 ${th ? 'รีเพลย์' : 'Replay'} · <span id="rpT"></span> · <select id="rpFollow"><option value="">${th ? 'กล้องอิสระ (WASD + ลาก)' : 'Free camera (WASD + drag)'}</option>${[...this.models.keys()].map(k => `<option value="${k}">${charById(k.split(':')[0]).name}</option>`).join('')}</select>
      <button data-sp="0.25">¼×</button><button data-sp="0.5">½×</button><button data-sp="1">1×</button><button data-sp="2">2×</button><button data-sp="4">4×</button><button id="rpPlay">⏯</button><button id="rpExit">✖</button></div>
      <input id="rpScrub" type="range" min="0" max="${rep.duration.toFixed(1)}" step="0.1" value="0"><div id="rpEvents">${rep.events.map((e, i) => `<button data-ev="${i}" style="color:${e.color}">${e.t.toFixed(0)}s ${e.text}</button>`).join('')}</div>`;
    document.body.appendChild(ui);
    const q = (s: string) => ui.querySelector(s) as HTMLElement;
    ui.querySelectorAll<HTMLElement>('[data-sp]').forEach(b => b.onclick = () => { this.speed = +b.dataset.sp!; ui.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('sel', x === b)); });
    q('#rpPlay').onclick = () => this.playing = !this.playing; q('#rpExit').onclick = () => this.exit(); (q('#rpFollow') as HTMLSelectElement).onchange = e => this.follow = (e.target as HTMLSelectElement).value;
    (q('#rpScrub') as HTMLInputElement).oninput = e => this.t = +(e.target as HTMLInputElement).value;
    ui.querySelectorAll<HTMLElement>('[data-ev]').forEach(b => b.onclick = () => { const ev = rep.events[+b.dataset.ev!]; this.t = Math.max(0, ev.t - 2); this.speed = 0.25; });
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, el: any = window) => { el.addEventListener(t, f); this.off.push(() => el.removeEventListener(t, f)); };
    on('keydown', e => this.keys.add(e.code)); on('keyup', e => this.keys.delete(e.code)); on('mousedown', () => this.drag = true, canvas); on('mouseup', () => this.drag = false);
    on('mousemove', e => { if (this.drag) { this.yaw -= e.movementX * 0.005; this.pitch = Math.max(0.1, Math.min(1.45, this.pitch + e.movementY * 0.004)); } });
    on('wheel', e => { this.dist = Math.max(6, Math.min(120, this.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, canvas);
    let tx = 0, ty = 0; on('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, canvas); on('touchmove', e => { const t0 = e.touches[0]; this.yaw -= (t0.clientX - tx) * 0.006; this.pitch = Math.max(0.1, Math.min(1.45, this.pitch + (t0.clientY - ty) * 0.005)); tx = t0.clientX; ty = t0.clientY; }, canvas);
    on('resize', () => this.resize()); this.resize(); this.last = performance.now(); const loop = (now: number) => { this.raf = requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now; this.update(dt); }; this.raf = requestAnimationFrame(loop);
  }
  scene: THREE.Scene;
  resize() { this.r.setSize(innerWidth, innerHeight); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); }
  update(dt: number) {
    if (this.playing) this.t = Math.min(this.rep.duration, this.t + dt * this.speed); const s = sample(this.rep, this.t);
    (this.ui.querySelector('#rpT') as HTMLElement).textContent = `${this.t.toFixed(1)} / ${this.rep.duration.toFixed(0)}s · ${this.speed}×${this.rep.result ? ' · ' + this.rep.result.toUpperCase() : ''}`; (this.ui.querySelector('#rpScrub') as HTMLInputElement).value = String(this.t);
    if (s) { const { a, b, k } = s; for (const [key, m] of this.models) { const [id, team] = key.split(':'); const ea = a.ents.find(e => e.id === id && String(e.team) === team), eb = b.ents.find(e => e.id === id && String(e.team) === team) ?? ea;
        if (!ea || !eb) { m.root.visible = false; continue; } m.root.visible = true; m.root.position.set(ea.x + (eb.x - ea.x) * k, 0, ea.z + (eb.z - ea.z) * k); m.root.rotation.y = eb.yaw; const dead = eb.hp <= 0; m.root.rotation.x = dead ? -Math.PI / 2 : 0; m.root.position.y = dead ? 0.3 : 0; }
      const o = new THREE.Object3D(), c = new THREE.Color(); let n = 0; const U = a.units; for (let i = 0; i + 4 < U.length && n < 400; i += 5) { o.position.set(U[i], U[i + 4] ? 0.3 : 0.7, U[i + 1]); o.rotation.set(U[i + 4] ? Math.PI / 2 : 0, 0, 0); const sc = U[i + 3] === 4 ? 2.6 : 1; o.scale.setScalar(sc); o.updateMatrix(); this.units.setMatrixAt(n, o.matrix);
        c.setHex(U[i + 2] === 0 ? (U[i + 3] === 2 ? 0xd8c08a : 0xffd34d) : UCOL[U[i + 3]] ?? 0x333333); this.units.setColorAt(n, c); n++; } this.units.count = n; this.units.instanceMatrix.needsUpdate = true; if (this.units.instanceColor) this.units.instanceColor.needsUpdate = true; }
    if (this.follow) { const m = this.models.get(this.follow); if (m) this.target.lerp(m.root.position, Math.min(1, dt * 5)); }
    else { const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), rgt = new THREE.Vector3(-f.z, 0, f.x); const sp = this.dist * 0.8 * dt;
      if (this.keys.has('KeyW')) this.target.addScaledVector(f, sp); if (this.keys.has('KeyS')) this.target.addScaledVector(f, -sp); if (this.keys.has('KeyD')) this.target.addScaledVector(rgt, sp); if (this.keys.has('KeyA')) this.target.addScaledVector(rgt, -sp); }
    this.cam.position.set(this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist); this.cam.lookAt(this.target);
    this.r.render(this.scene, this.cam);
  }
  exit() { cancelAnimationFrame(this.raf); this.off.forEach(f => f()); this.ui.remove(); this.r.dispose(); this.onExit(); }
}
