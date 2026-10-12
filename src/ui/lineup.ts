/** Character lineup / close-up viewer (gallery + screenshots): renders many rigged characters side by side, animated. */
import * as THREE from 'three';
import { buildModel } from '../character/model';
import { animateRig, PoseIn } from '../character/rig';
import { charById } from '../character/roster';
import { getLang } from './i18n';
export type LineupPose = 'idle' | 'cast' | 'victory' | 'hurt' | 'ult' | 'walk';
let cur: { stop: () => void } | null = null;
export function closeLineup() { cur?.stop(); cur = null; }
export function lineup(ids: string[], opts: { closeup?: boolean; pose?: LineupPose; poses?: LineupPose[]; onClose?: () => void } = {}) {
  closeLineup(); const wrap = document.createElement('div'); wrap.id = 'lineup'; const cv = document.createElement('canvas'); wrap.appendChild(cv); const labels = document.createElement('div'); labels.className = 'lnames'; wrap.appendChild(labels);
  const close = document.createElement('button'); close.textContent = '✖'; close.id = 'lineupClose'; wrap.appendChild(close); document.body.appendChild(wrap);
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(innerWidth, innerHeight); r.setClearColor(0x2a1f45);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xfff4e8, 0x40305a, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 8, 6); scene.add(dl);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshToonMaterial({ color: 0x4a3a6a })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const gap = opts.closeup ? 1.3 : 1.25; const n = ids.length; const items = ids.map((id, i) => { const d = charById(id); const m = buildModel(d.look); const sc = d.look.scale ?? 1; if (sc > 1.4) m.root.scale.multiplyScalar(1.4 / sc);
    m.root.position.x = (i - (n - 1) / 2) * gap * (opts.closeup ? 1 : 1); m.ring.visible = false; scene.add(m.root); return { d, m, pose: (opts.poses?.[i] ?? opts.pose ?? 'idle') as LineupPose }; });
  const width = n * gap; const cam = new THREE.PerspectiveCamera(opts.closeup ? 24 : 30, innerWidth / innerHeight, 0.1, 200);
  const fitDist = Math.max(4, (width / 2 + 1.4) / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect));
  if (opts.closeup) { cam.position.set(0, 2.0, Math.max(3, fitDist * 0.9)); cam.lookAt(0, 1.85, 0); } else { cam.position.set(0, 1.6, fitDist * 0.92); cam.lookAt(0, 1.15, 0); }
  const th = getLang() === 'th'; let raf = 0, last = performance.now(), t = 0;
  const loop = (now: number) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    labels.innerHTML = ''; for (const it of items) { const ph = (t * 0.7) % 3; const p: PoseIn = { dt, speed: it.pose === 'walk' ? 3 : 0, maxSpeed: 9, castT: it.pose === 'cast' ? (ph < 0.45 ? 0.1 : 0.1) : 9, ultT: it.pose === 'ult' ? 0.6 : 9, hitT: it.pose === 'hurt' ? 0.1 : 9, dodge: 0, stunned: false, down: false, dead: false, victory: it.pose === 'victory', clashing: false, shielding: false, camDist: 5 };
      animateRig(it.m, p); const v = it.m.root.position.clone().setY(-0.05).project(cam); const el = document.createElement('span'); el.style.left = (v.x * 0.5 + 0.5) * 100 + '%'; el.style.top = (-v.y * 0.5 + 0.5) * 100 + '%'; el.textContent = th ? it.d.nameTh : it.d.name; el.style.borderColor = '#' + (it.d.look.spellColor ?? 0xffffff).toString(16).padStart(6, '0'); labels.appendChild(el); }
    r.render(scene, cam); };
  raf = requestAnimationFrame(loop);
  cur = { stop: () => { cancelAnimationFrame(raf); r.dispose(); wrap.remove(); } }; close.onclick = () => { closeLineup(); opts.onClose?.(); };
}
/** Minion/crowd showcase: every unit type with several palettes (students in all four houses). */
export async function crowdLineup(onClose?: () => void) {
  closeLineup(); const { crowdLayers, unitPalette } = await import('../war/crowd'); const { toon, addRim, inflate } = await import('../rendering/toon'); const { UNITS } = await import('../war/units');
  const wrap = document.createElement('div'); wrap.id = 'lineup'; const cv = document.createElement('canvas'); wrap.appendChild(cv); const close = document.createElement('button'); close.textContent = '✖'; close.id = 'lineupClose'; wrap.appendChild(close); document.body.appendChild(wrap);
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(innerWidth, innerHeight); r.setClearColor(0x2a1f45);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xfff4e8, 0x40305a, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 8, 6); scene.add(dl);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshToonMaterial({ color: 0x4a3a6a })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ol = new THREE.MeshBasicMaterial({ color: 0x0a0812, side: THREE.BackSide });
  const row: [string, number][] = [['student', 0xb3152a], ['student', 0x2453c7], ['student', 0xe0b020], ['student', 0x1f8a4a], ['order', 0], ['order', 0], ['statue', 0], ['deathEater', 0], ['deathEater', 0], ['dementor', 0], ['acromantula', 0], ['giant', 0]];
  let x = 0; const objs: THREE.Group[] = []; let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (const [t, base] of row) { const ty = t as any; const sc = Math.min(UNITS[ty as keyof typeof UNITS].scale, 1.9); const pal = unitPalette(ty, base, rnd) as any; const grp = new THREE.Group();
    for (const L of crowdLayers(ty)) { const m = toon(0xffffff, { emissive: L.emissive }); m.vertexColors = true; if (L.transparent) { m.transparent = true; m.opacity = 0.84; } if (L.rim) addRim(m, L.rim, 0.4);
      m.color.setHex(L.tint === 'fixed' ? 0xffffff : pal[L.tint]); grp.add(new THREE.Mesh(L.geo, m)); if (!L.noOutline) { const g = L.geo.clone(); g.deleteAttribute('color'); grp.add(new THREE.Mesh(inflate(g, 0.02), ol)); } }
    const w = ty === 'giant' ? 2.4 : ty === 'acromantula' ? 2.2 : 1.1 * sc; x += w / 2; grp.position.set(x, ty === 'dementor' ? 0.5 : 0, 0); grp.scale.setScalar(sc); grp.rotation.y = 0.25; x += w / 2 + 0.25; scene.add(grp); objs.push(grp); }
  for (const o of objs) o.position.x -= x / 2;
  const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 300); const d = Math.max(6, (x / 2 + 1) / (Math.tan(THREE.MathUtils.degToRad(15)) * cam.aspect)); cam.position.set(0, 2.6, d * 0.95); cam.lookAt(0, 1.6, 0);
  let raf = 0, t = 0; const loop = () => { raf = requestAnimationFrame(loop); t += 0.016; objs.forEach((o, i) => { o.rotation.y = 0.25 + Math.sin(t * 0.6 + i) * 0.15; }); r.render(scene, cam); }; raf = requestAnimationFrame(loop);
  cur = { stop: () => { cancelAnimationFrame(raf); r.dispose(); wrap.remove(); } }; close.onclick = () => { closeLineup(); onClose?.(); };
}
