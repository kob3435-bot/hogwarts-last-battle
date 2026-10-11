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
