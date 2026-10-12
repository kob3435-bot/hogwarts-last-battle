/** Procedural anime character rig: ~5-head human proportions, hierarchical joints, anime face, sculpted hair, layered robes, accessories. */
import * as THREE from 'three';
import { addRim, toon, addOutline } from '../rendering/toon';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export type HairStyle = 'spiky' | 'bushy' | 'messy' | 'short' | 'long' | 'wild' | 'witchhat' | 'bald' | 'hood' | 'ponytail' | 'bun' | 'curls' | 'bangs' | 'slick' | 'twintail' | 'bob' | 'sidepart' | 'mohawk';
export type Outfit = 'student' | 'order' | 'deatheater' | 'professor' | 'casual' | 'dark' | 'giant' | 'wraith' | 'auror' | 'noble';
export type Acc = 'glasses' | 'halfmoon' | 'scar' | 'radish' | 'spectrespecs' | 'bag' | 'sword' | 'beard' | 'bigbeard' | 'mask' | 'snakeface' | 'cloak' | 'scarf' | 'tie' | 'magiceye' | 'umbrella' | 'flower' | 'earring' | 'hat' | 'tophat' | 'cane' | 'apron' | 'goggles' | 'collar' | 'scars' | 'stubble' | 'mustache' | 'headband' | 'necklace' | 'gloves' | 'fur' | 'diary' | 'hairclip' | 'locket' | 'vest' | 'sweater';
export type IdleStyle = 'calm' | 'bouncy' | 'proud' | 'hunch' | 'twirl' | 'fidget' | 'feral' | 'sway' | 'stern' | 'float';
export type CastStyle = 'snap' | 'flourish' | 'thrust' | 'whip' | 'twohand' | 'lazy' | 'staff' | 'punch';
export type Expr = 'neutral' | 'hurt' | 'cast' | 'ult' | 'ko' | 'happy';
export interface Look { robe: number; skin: number; hair: number; accent: number; accent2?: number; scale?: number; hairStyle?: HairStyle; mask?: boolean; glasses?: boolean; eye?: number; snake?: boolean; creature?: 'snake';
  outfit?: Outfit; acc?: Acc[]; wand?: 'plain' | 'elder' | 'knobby' | 'bone' | 'white' | 'thin' | 'dark' | 'vine' | 'crooked'; wandColor?: number; spellColor?: number; idle?: IdleStyle; cast?: CastStyle;
  fem?: boolean; build?: 'slim' | 'normal' | 'stocky' | 'big' | 'small'; hair2?: number; hat?: number; lines?: { cast: [string, string]; ult: [string, string] } }
export interface Rig { hips: THREE.Group; torso: THREE.Group; neck: THREE.Group; shL: THREE.Group; shR: THREE.Group; elL: THREE.Group; elR: THREE.Group; thL: THREE.Group; thR: THREE.Group; knL: THREE.Group; knR: THREE.Group;
  skirt: THREE.Group[]; cape: THREE.Group | null; eyes: THREE.Group[]; irises: THREE.Mesh[]; brows: THREE.Mesh[]; mouth: THREE.Mesh; blush: THREE.Mesh[]; detail: THREE.Object3D[]; hairTail: THREE.Group | null;
  st: { blink: number; expr: Expr; exprT: number; t: number; roll: number }; look: Look }
export interface Model { root: THREE.Group; arm: THREE.Group; tip: THREE.Object3D; shield: THREE.Mesh; ring: THREE.Mesh; body: THREE.Object3D; aura: THREE.Mesh; meshes: THREE.Mesh[]; head: THREE.Group; rig?: Rig }
const basic = (c: number, o: Partial<THREE.MeshBasicMaterialParameters> = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
/** smoother rounded forms: boost segment counts of all rig primitives (merged per joint, so draw calls are unchanged) */
const sph = (r: number, w = 8, h = 6, ...rest: number[]) => new THREE.SphereGeometry(r, Math.min(28, Math.round(w * 1.6)), Math.min(20, Math.round(h * 1.6)), ...rest);
const cyl = (a: number, b: number, h: number, seg = 8, ...rest: any[]) => new THREE.CylinderGeometry(a, b, h, Math.min(24, Math.round(seg * 1.6)), ...rest);
const lighten = (c: number, k = 0.55) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
export function buildRig(l: Look): Model {
  const root = new THREE.Group(); const S = l.scale ?? 1; const meshes: THREE.Mesh[] = []; const detail: THREE.Object3D[] = [];
  const add = (p: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ol = 0.025) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); if (ol) addOutline(m, ol); m.castShadow = false; meshes.push(m); return m; };
  const g = (p: THREE.Object3D, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  const acc = new Set(l.acc ?? []); const fem = !!l.fem; const b = l.build ?? 'normal';
  const W = { slim: 0.9, normal: 1, stocky: 1.15, big: 1.3, small: 0.85 }[b];
  const skinM = toon(l.skin), robeM = toon(l.robe), accM = toon(l.accent), acc2M = toon(l.accent2 ?? 0xffffff), hairM = toon(l.hair), hair2M = toon(l.hair2 ?? l.hair), darkM = toon(0x1a1622), shoeM = toon(0x2a1c18);
  const outfit = l.outfit ?? 'student'; const sig = l.spellColor ?? l.accent; const sigM = toon(lighten(sig, 0.25), { emissive: new THREE.Color(sig).multiplyScalar(0.35).getHex() });
  // --- skeleton ---
  const hips = g(root, 0, 1.0, 0); const torso = g(hips, 0, 0.05, 0); const neck = g(torso, 0, 0.52, 0); const head = g(neck, 0, 0.27, 0);
  const shL = g(torso, -0.21 * W, 0.45, 0), shR = g(torso, 0.21 * W, 0.45, 0); const elL = g(shL, 0, -0.29, 0), elR = g(shR, 0, -0.29, 0);
  const thL = g(hips, -0.1 * W, -0.02, 0), thR = g(hips, 0.1 * W, -0.02, 0); const knL = g(thL, 0, -0.46, 0), knR = g(thR, 0, -0.46, 0);
  // --- body ---
  const wraith = outfit === 'wraith';
  add(torso, cyl(0.17 * W * (fem ? 0.92 : 1), 0.15 * W, 0.5, 10), outfit === 'casual' ? accM : robeM, 0, 0.25, 0); // chest
  add(hips, cyl(0.15 * W, (fem ? 0.18 : 0.16) * W, 0.16, 10), robeM, 0, 0, 0);
  add(neck, cyl(0.055, 0.065, 0.14, 8), skinM, 0, 0.04, 0, 0);
  // shirt / collar / tie by outfit
  const front = g(torso, 0, 0, 0); detail.push(front);
  if (outfit === 'student') { add(front, new THREE.BoxGeometry(0.16 * W, 0.34, 0.02), toon(0xf4f4f4), 0, 0.33, 0.155 * W, 0); add(front, new THREE.BoxGeometry(0.05, 0.28, 0.025), accM, 0, 0.32, 0.165 * W, 0); add(front, new THREE.BoxGeometry(0.06, 0.04, 0.03), acc2M, 0, 0.3, 0.17 * W, 0); }
  if (outfit === 'auror' || outfit === 'order') { add(front, new THREE.BoxGeometry(0.36 * W, 0.05, 0.34 * W), toon(0x3a2a1a), 0, 0.02, 0, 0); add(front, new THREE.BoxGeometry(0.06, 0.05, 0.02), toon(0xd8c060), 0, 0.02, 0.17 * W, 0); }
  if (outfit === 'noble') { add(front, cyl(0.1, 0.12, 0.12, 8), acc2M, 0, 0.5, 0, 0); add(front, sph(0.03, 6, 4), toon(0x2a8a4a, { emissive: 0x0a2a10 }), 0, 0.42, 0.16 * W, 0); }
  if (outfit === 'deatheater' || outfit === 'dark') add(front, new THREE.TorusGeometry(0.13, 0.025, 6, 12, Math.PI), darkM, 0, 0.47, 0.06, 0).rotation.x = 0.4;
  // collar
  const col = add(torso, new THREE.TorusGeometry(0.13 * W, 0.04, 6, 14), outfit === 'student' ? accM : robeM, 0, 0.5, 0, 0); col.rotation.x = Math.PI / 2;
  if (acc.has('scarf')) { const sc = add(torso, new THREE.TorusGeometry(0.13 * W, 0.06, 8, 14), accM, 0, 0.5, 0); sc.rotation.x = Math.PI / 2; add(torso, new THREE.BoxGeometry(0.09, 0.3, 0.03), acc2M, 0.07, 0.33, 0.16 * W, 0).rotation.z = 0.1; }
  if (acc.has('sweater')) add(front, new THREE.TorusGeometry(0.05, 0.015, 4, 10), acc2M, 0, 0.28, 0.16 * W, 0); // the Weasley initial knit
  if (acc.has('vest')) add(torso, cyl(0.175 * W, 0.155 * W, 0.4, 10, 1, true), accM, 0, 0.22, 0, 0);
  if (acc.has('necklace') || acc.has('locket')) add(front, sph(0.03, 6, 4), basic(acc.has('locket') ? 0xffd34d : 0x9fe0ff), 0, 0.36, 0.17 * W, 0);
  if (acc.has('fur')) for (let i = 0; i < 7; i++) add(torso, sph(0.1, 6, 4), toon(0x8a6a4a), Math.cos(i / 7 * Math.PI * 2) * 0.17 * W, 0.47, Math.sin(i / 7 * Math.PI * 2) * 0.15, 0);
  if (acc.has('apron')) add(front, new THREE.BoxGeometry(0.26 * W, 0.5, 0.02), toon(0x8a6a3a), 0, -0.1, 0.17 * W, 0);
  // --- arms (upper, elbow, forearm, hand) ---
  const sleeveM = outfit === 'casual' ? accM : robeM;
  for (const [sh, el, sx] of [[shL, elL, -1], [shR, elR, 1]] as const) {
    add(sh, sph(0.075 * W, 8, 6), sleeveM, 0, 0, 0, 0.02);
    add(sh, cyl(0.06 * W, 0.055 * W, 0.28, 8), sleeveM, 0, -0.14, 0, 0.02);
    add(el, cyl(0.052 * W, 0.075 * W, 0.24, 8), sleeveM, 0, -0.12, 0, 0.02); // flared sleeve
    add(el, new THREE.TorusGeometry(0.073 * W, 0.014, 8, 20), sigM, 0, -0.235, 0, 0).rotation.x = Math.PI / 2;
    const hand = add(el, sph(0.048, 8, 6), acc.has('gloves') ? darkM : skinM, 0, -0.27, 0.01, 0.015); hand.scale.set(0.9, 1.1, 0.8); void sx;
  }
  if (outfit !== 'wraith' && outfit !== 'giant') { const sash = add(hips, new THREE.TorusGeometry(0.158 * W, 0.022, 8, 28), sigM, 0, 0.07, 0, 0); sash.rotation.x = Math.PI / 2; sash.scale.set(1, 0.95, 1); }
  // --- legs (thigh, knee, shin, foot) ---
  const legM = wraith ? robeM : outfit === 'giant' ? toon(0x4a3a2a) : darkM;
  for (const [th, kn] of [[thL, knL], [thR, knR]] as const) {
    add(th, cyl(0.075 * W, 0.06 * W, 0.46, 8), legM, 0, -0.23, 0, 0.02); add(kn, cyl(0.058 * W, 0.048 * W, 0.44, 8), legM, 0, -0.22, 0, 0.02);
    const ft = add(kn, new THREE.BoxGeometry(0.1 * W, 0.07, 0.2), shoeM, 0, -0.46, 0.04, 0.015); if (wraith) { th.visible = false; } void ft;
  }
  // --- layered robe: flowing skirt panels pivoting at the hips + optional cloak ---
  const skirt: THREE.Group[] = []; const longRobe = ['professor', 'deatheater', 'dark', 'wraith', 'noble', 'giant'].includes(outfit); const len = wraith ? 1.05 : longRobe ? 0.82 : outfit === 'casual' ? 0.25 : outfit === 'order' || outfit === 'auror' ? 0.62 : 0.68;
  const nP = 8; for (let i = 0; i < nP; i++) { const a = i / nP * Math.PI * 2; if (outfit === 'student' && Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) > 0) continue; // open front of school robe
    const p = g(hips, Math.sin(a) * 0.16 * W, 0.05, Math.cos(a) * 0.15 * W); p.rotation.y = a; const pm = add(p, new THREE.BoxGeometry(0.15 * W, len, 0.025), i % 2 ? robeM : (wraith ? toon(0x15111d) : robeM), 0, -len / 2, 0.02, 0); pm.rotation.x = -0.12; if (!wraith) { const hem = add(p, new THREE.BoxGeometry(0.152 * W, 0.045, 0.03), sigM, 0, -len + 0.02, 0.02 + Math.sin(0.12) * len, 0); hem.rotation.x = -0.12; } skirt.push(p); }
  let cape: THREE.Group | null = null; if (acc.has('cloak') || ['professor', 'deatheater', 'noble', 'dark'].includes(outfit)) { cape = g(torso, 0, 0.48, -0.14 * W); add(cape, new THREE.BoxGeometry(0.42 * W, 1.25, 0.03), acc.has('cloak') ? darkM : robeM, 0, -0.62, -0.02, 0.012); cape.rotation.x = 0.08; }
  // --- head ---
  const fs = 0.21; const skull = add(head, sph(fs, 18, 14), acc.has('snakeface') ? toon(0xdde8e0) : skinM, 0, 0, 0, 0.022); skull.scale.set(1, 1.05, 1);
  const jaw = add(head, sph(fs * 0.78, 12, 8), skull.material as THREE.Material, 0, -0.07, 0.035, 0); jaw.scale.set(0.95, 0.85, 0.95); // soft chin
  for (const sx of [-1, 1]) add(head, sph(0.035, 6, 4), skull.material as THREE.Material, sx * fs * 0.98, -0.01, 0, 0); // ears
  const face = g(head, 0, 0, 0); detail.push(face);
  const eyes: THREE.Group[] = [], irises: THREE.Mesh[] = [], brows: THREE.Mesh[] = [];
  const masked = acc.has('mask'); const eyeC = l.eye ?? 0x3a2a1a;
  if (!masked && !wraith) for (const sx of [-1, 1]) {
    const eg = g(face, sx * 0.078, -0.02, fs * 0.88); eg.rotation.y = sx * 0.25; eyes.push(eg);
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.055, 18), basic(0xffffff)); white.scale.set(0.85, 1.18, 1); eg.add(white);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.043, 18), basic(eyeC)); iris.position.set(-sx * 0.004, -0.008, 0.002); iris.scale.set(0.85, 1.15, 1); eg.add(iris); irises.push(iris);
    const grad = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12, 0, Math.PI), basic(new THREE.Color(eyeC).multiplyScalar(0.45).getHex())); grad.position.set(-sx * 0.004, 0.002, 0.003); iris.add(grad);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(acc.has('snakeface') ? 0.008 : 0.014, 10), basic(0x0a0610)); pupil.position.z = 0.004; if (acc.has('snakeface')) pupil.scale.set(0.5, 2.6, 1); iris.add(pupil);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), basic(0xffffff)); hl.position.set(0.012, 0.018, 0.006); iris.add(hl); const hl2 = new THREE.Mesh(new THREE.CircleGeometry(0.006, 6), basic(0xffffff)); hl2.position.set(-0.012, -0.016, 0.006); iris.add(hl2);
    const lash = new THREE.Mesh(new THREE.BoxGeometry(fem ? 0.1 : 0.088, fem ? 0.014 : 0.01, 0.01), basic(0x1a1018)); lash.position.set(0, 0.062, 0.004); lash.rotation.z = sx * -0.12; eg.add(lash);
    if (fem) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.01), basic(0x1a1018)); w.position.set(sx * 0.05, 0.045, 0.004); w.rotation.z = sx * -0.6; eg.add(w); }
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.013, 0.01), basic(new THREE.Color(l.hair).multiplyScalar(0.7).getHex())); brow.position.set(sx * 0.075, 0.07, fs * 0.92); face.add(brow); brows.push(brow);
  }
  if (acc.has('magiceye') && eyes[1]) { const me = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), basic(0x8ad8ff)); me.position.z = 0.008; eyes[1].add(me); const mp = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), basic(0x102040)); mp.position.z = 0.002; me.add(mp); }
  if (!acc.has('snakeface') && !masked && !wraith) { const nose = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 4), toon(new THREE.Color(l.skin).multiplyScalar(0.85).getHex())); nose.position.set(0, -0.05, fs * 0.98); nose.rotation.x = Math.PI / 2 + 0.3; face.add(nose); }
  if (acc.has('snakeface')) for (const sx of [-1, 1]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.01), basic(0x3a4a3a)); sl.position.set(sx * 0.012, -0.05, fs * 0.98); sl.rotation.z = sx * 0.3; face.add(sl); }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), basic(0x6a2030)); mouth.position.set(0, -0.105, fs * 0.9); mouth.scale.set(1.1, 0.25, 1); if (!masked && !wraith) face.add(mouth);
  const blush: THREE.Mesh[] = []; if (!masked && !wraith && !acc.has('snakeface')) for (const sx of [-1, 1]) { const bl = new THREE.Mesh(new THREE.CircleGeometry(0.028, 10), basic(0xff7a8a, { transparent: true, opacity: fem ? 0.45 : 0.25 })); bl.position.set(sx * 0.12, -0.06, fs * 0.82); bl.rotation.y = sx * 0.6; bl.scale.y = 0.55; face.add(bl); blush.push(bl); }
  if (masked) { const mk = add(head, sph(fs * 1.02, 14, 10, -Math.PI / 2.4, Math.PI / 1.2, 0.5, 1.6), toon(0xc8ccd6, { emissive: 0x1a1a22 }), 0, 0, 0, 0); mk.material.side = THREE.DoubleSide;
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), basic(0x05050a)); h.position.set(sx * 0.07, 0, fs * 1.03); h.scale.y = 0.6; head.add(h); const sw = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 12, Math.PI), basic(0x6a6a7a)); sw.position.set(sx * 0.07, 0.04, fs * 1.035); head.add(sw); } }
  if (wraith) { const v = add(head, sph(fs * 0.9, 10, 8), basic(0x000000), 0, -0.02, 0.06, 0); void v; }
  // accessories on the face
  if (acc.has('glasses') || l.glasses) { const gm = basic(0x151515); for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.007, 6, 18), gm); r.position.set(sx * 0.075, -0.015, fs * 0.97); face.add(r); } const br = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.007, 0.007), gm); br.position.set(0, -0.005, fs * 1.0); face.add(br); }
  if (acc.has('halfmoon')) { const gm = basic(0xd8c060); for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 14, Math.PI), gm); r.position.set(sx * 0.075, -0.035, fs * 1.0); r.rotation.z = Math.PI; face.add(r); } }
  if (acc.has('spectrespecs')) for (const [sx, c] of [[-1, 0xff5ab0], [1, 0x5ab0ff]] as const) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), basic(c, { transparent: true, opacity: 0.75 })); r.position.set(sx * 0.08, -0.01, fs * 1.02); face.add(r); const fr = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 4, 4), basic(0xffd34d)); fr.rotation.z = Math.PI / 4; fr.scale.set(1, 0.75, 1); fr.position.copy(r.position); face.add(fr); }
  if (acc.has('goggles')) { const gm = basic(0x8a6a3a); for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 14), gm); r.position.set(sx * 0.08, 0.13, fs * 0.8); r.rotation.x = -0.6; head.add(r); } }
  if (acc.has('scar')) { const sm = basic(0xc03030); for (const [x, y, r] of [[0.03, 0.12, 0.6], [0.045, 0.1, -0.6], [0.06, 0.08, 0.6]] as const) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.007, 0.005), sm); s.position.set(x, y, fs * 0.93); s.rotation.z = r; face.add(s); } }
  if (acc.has('scars')) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.12, 0.005), basic(0xb07070)); s.position.set(-0.1, 0.0, fs * 0.9); s.rotation.z = 0.4; face.add(s); }
  if (acc.has('stubble')) { const s = add(head, sph(fs * 0.8, 10, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.35), toon(new THREE.Color(l.hair).multiplyScalar(0.8).getHex()), 0, -0.04, 0.03, 0); s.scale.set(1, 1, 1.05); }
  if (acc.has('mustache')) { const m = add(face, new THREE.TorusGeometry(0.04, 0.015, 6, 10, Math.PI), hairM, 0, -0.085, fs * 0.95, 0); m.rotation.z = Math.PI; }
  if (acc.has('beard') || acc.has('bigbeard')) { const big = acc.has('bigbeard'); const bd = add(head, new THREE.ConeGeometry(big ? 0.22 : 0.13, big ? 0.55 : 0.6, 10), hair2M, 0, big ? -0.3 : -0.36, 0.1, 0.015); bd.rotation.x = Math.PI + 0.25; if (big) { for (let i = 0; i < 6; i++) add(head, sph(0.1, 6, 5), hair2M, Math.cos(i) * 0.14, -0.12 - i * 0.05, 0.08 + Math.sin(i) * 0.05, 0); } add(face, new THREE.TorusGeometry(0.04, 0.014, 6, 10, Math.PI), hair2M, 0, -0.08, fs * 0.95, 0).rotation.z = Math.PI; }
  if (acc.has('radish')) for (const sx of [-1, 1]) { add(head, sph(0.03, 6, 5), toon(0xff7a2a), sx * fs * 1.02, -0.09, 0, 0); add(head, new THREE.ConeGeometry(0.015, 0.04, 4), toon(0x3a9a3a), sx * fs * 1.02, -0.05, 0, 0); }
  if (acc.has('earring')) for (const sx of [1]) add(head, new THREE.TorusGeometry(0.015, 0.004, 4, 8), basic(0xffd34d), sx * fs * 1.02, -0.06, 0, 0);
  // --- hair (composited shapes) ---
  const hs = l.hairStyle ?? 'short'; const H = g(head, 0, 0, 0); let hairTail: THREE.Group | null = null;
  const cap = (phi = 1.35, sc = 1.06) => { const c = add(H, sph(fs * sc, 16, 12, 0, Math.PI * 2, 0, phi), hairM, 0, 0.01, -0.012, 0.02); c.rotation.x = -0.25; return c; };
  const lock = (x: number, y: number, z: number, rx: number, rz: number, r = 0.05, h = 0.2, m: THREE.Material = hairM) => { const c = add(H, new THREE.ConeGeometry(r, h, 5), m, x, y, z, 0.012); c.rotation.set(rx, 0, rz); return c; };
  const bangs = (n = 5, len = 0.16, spread = 0.2) => { for (let i = 0; i < n; i++) { const f = (i / (n - 1) - 0.5); lock(f * spread * 1.4, 0.1 - Math.abs(f) * 0.03, fs * 0.82, 0.25, f * 0.5 + Math.PI, 0.045, len); } };
  const side = (len = 0.3) => { for (const sx of [-1, 1]) lock(sx * fs * 0.95, -0.06, 0.04, 0, Math.PI + sx * 0.08, 0.06, len); };
  switch (hs) {
    case 'spiky': cap(1.45); for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; lock(Math.cos(a) * 0.15, 0.17, Math.sin(a) * 0.15 - 0.03, Math.sin(a) * 1.1, -Math.cos(a) * 1.1, 0.06, 0.2); } bangs(5, 0.14); break;
    case 'messy': cap(1.4); for (let i = 0; i < 8; i++) lock((i - 3.5) * 0.045, 0.19, 0.06 - (i % 2) * 0.08, 0.6 + (i % 3) * 0.3, (i - 3.5) * 0.15, 0.05, 0.17); bangs(6, 0.15, 0.24); break;
    case 'short': cap(1.35); bangs(4, 0.1, 0.18); break;
    case 'sidepart': cap(1.4); for (let i = 0; i < 5; i++) lock(-0.12 + i * 0.05, 0.12, fs * 0.8, 0.4, Math.PI - 0.9, 0.05, 0.2); break;
    case 'slick': { const c = cap(1.5, 1.04); (c.material as THREE.MeshToonMaterial).emissive.setHex(0x111111); lock(0, 0.05, -fs, -0.3, Math.PI, 0.1, 0.18); break; }
    case 'bangs': cap(1.55); bangs(7, 0.2, 0.26); side(0.34); break;
    case 'bob': cap(1.7, 1.1); bangs(7, 0.18, 0.26); for (let i = 0; i < 9; i++) { const a = Math.PI * 0.6 + i / 8 * Math.PI * 0.8; add(H, sph(0.07, 6, 5), hairM, Math.cos(a) * fs, -0.1, Math.sin(-a) * fs * 0.9 - 0.03, 0.012); } break;
    case 'long': cap(1.6, 1.08); bangs(6, 0.18, 0.24); side(0.5); { const back = add(H, new THREE.BoxGeometry(0.36, 0.62, 0.07), hairM, 0, -0.3, -0.16, 0.015); back.rotation.x = 0.12; hairTail = g(H, 0, -0.55, -0.18); add(hairTail, new THREE.ConeGeometry(0.17, 0.28, 6), hairM, 0, -0.12, 0, 0.012).rotation.x = Math.PI; } break;
    case 'ponytail': cap(1.5); bangs(5, 0.15); hairTail = g(H, 0, 0.08, -fs * 0.95); add(hairTail, sph(0.035, 6, 4), accM, 0, 0, 0, 0); for (let i = 0; i < 4; i++) add(hairTail, sph(0.07 - i * 0.012, 7, 5), hairM, 0, -0.07 - i * 0.09, -0.04 - i * 0.015, 0.012); break;
    case 'twintail': cap(1.5); bangs(6, 0.16); for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) add(H, sph(0.065 - i * 0.01, 7, 5), hairM, sx * (fs + 0.03 + i * 0.01), 0.05 - i * 0.1, -0.05, 0.012); break;
    case 'bun': cap(1.5); bangs(3, 0.08, 0.14); add(H, sph(0.09, 10, 8), hairM, 0, 0.1, -fs * 0.95, 0.015); add(H, new THREE.TorusGeometry(0.07, 0.012, 4, 10), accM, 0, 0.1, -fs * 0.88, 0); break;
    case 'curls': cap(1.6, 1.08); for (let i = 0; i < 22; i++) { const a = i * 2.4, y = 0.15 - (i % 6) * 0.08; if (Math.sin(a) > 0.3 && y > -0.2) continue; add(H, sph(0.06, 6, 5), i % 3 ? hairM : hair2M, Math.cos(a) * (fs + 0.02), y, Math.sin(a) * (fs * 0.9) - 0.04, 0.01); } bangs(4, 0.12, 0.2); break;
    case 'bushy': cap(1.7, 1.12); for (let i = 0; i < 26; i++) { const a = i * 2.39996, y = 0.12 - (i % 7) * 0.075; const r = fs + 0.05 + (i % 3) * 0.02; if (Math.sin(a) > 0.05 && y > -0.3) continue; add(H, sph(0.075 + (i % 2) * 0.02, 6, 5), hairM, Math.cos(a) * r, y, Math.sin(a) * r * 0.9 - 0.05, 0.01); } bangs(5, 0.14); break;
    case 'wild': cap(1.7, 1.12); for (let i = 0; i < 24; i++) { const a = i * 2.39996; const y = 0.15 - (i % 6) * 0.1; if (Math.sin(a) > 0.1 && y > -0.35) continue; lock(Math.cos(a) * (fs + 0.04), y, Math.sin(a) * fs - 0.04, Math.sin(a) * 1.4, -Math.cos(a) * 1.6 + (i % 2) * 0.4, 0.06, 0.28 + (i % 3) * 0.1); } bangs(6, 0.2, 0.26); break;
    case 'mohawk': cap(1.2, 1.02); for (let i = 0; i < 6; i++) lock(0, 0.2 - Math.abs(i - 2) * 0.01, 0.12 - i * 0.06, -0.4 + i * 0.2, 0, 0.045, 0.16); break;
    case 'witchhat': cap(1.45); bangs(3, 0.1, 0.15); break;
    case 'hood': break; case 'bald': break;
  }
  if (acc.has('hairclip') || acc.has('flower')) add(H, sph(0.03, 6, 4), basic(acc.has('flower') ? 0xffffff : 0xffd34d), 0.15, 0.1, 0.1, 0);
  if (acc.has('headband')) { const hb = add(H, new THREE.TorusGeometry(fs * 1.03, 0.012, 4, 20, Math.PI), accM, 0, 0.06, 0, 0); hb.rotation.y = Math.PI / 2; }
  // hats & hoods
  const hatC = l.hat ?? l.robe;
  if (hs === 'witchhat' || acc.has('hat')) { add(H, cyl(0.4, 0.4, 0.02, 20), toon(hatC), 0, 0.14, 0, 0.012); const cone = add(H, new THREE.ConeGeometry(0.2, 0.52, 14), toon(hatC), 0, 0.42, -0.03, 0.015); cone.rotation.x = -0.25; add(H, cyl(0.205, 0.205, 0.05, 14), accM, 0, 0.18, 0, 0); }
  if (acc.has('tophat')) { add(H, cyl(0.3, 0.3, 0.02, 18), toon(hatC), 0, 0.17, 0, 0.012); add(H, cyl(0.17, 0.18, 0.3, 14), toon(hatC), 0, 0.32, 0, 0.012); }
  // layered strands: back/side locks + highlight band for every haired style (anime "kami" detail)
  if (!['bald', 'hood', 'witchhat'].includes(hs) && !wraith && !acc.has('snakeface')) { const h2 = hair2M;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.35 + i / 8 * 1.3); const lk = add(H, new THREE.ConeGeometry(0.045, 0.2, 7), i % 2 ? hairM : h2, Math.sin(a) * fs * 0.92, -0.02, Math.cos(a) * fs * 0.92, 0.008); lk.rotation.set(Math.cos(a) * 0.35 + Math.PI, 0, -Math.sin(a) * 0.35); }
    for (let i = -2; i <= 2; i++) { const st = add(H, new THREE.ConeGeometry(0.03, 0.13, 6), hairM, i * 0.055, 0.1 - Math.abs(i) * 0.012, fs * 0.9, 0.006); st.rotation.set(Math.PI - 0.5, 0, i * 0.18); }
    if (['spiky', 'messy', 'short', 'sidepart', 'bangs'].includes(hs)) { const ah = add(H, new THREE.ConeGeometry(0.02, 0.14, 5), hairM, 0.02, fs * 1.1, 0.02, 0.006); ah.rotation.set(-0.5, 0, -0.5); } }
  if (hs === 'hood' || outfit === 'wraith') { const hd = add(H, sph(fs * 1.28, 14, 10, 0, Math.PI * 2, 0, 2.0), wraith ? toon(0x0e0b16) : robeM, 0, 0.02, -0.045, 0.02); hd.rotation.x = -0.5; hd.material.side = THREE.DoubleSide; }
  // accessories on body
  if (acc.has('bag')) { const strap = add(torso, new THREE.BoxGeometry(0.03, 0.6, 0.02), toon(0x6a3a2a), 0, 0.24, 0.16 * W, 0); strap.rotation.z = 0.7; add(hips, new THREE.BoxGeometry(0.18, 0.15, 0.07), toon(0x9a3a6a), -0.2 * W, 0.05, 0.05, 0.012); }
  if (acc.has('sword')) { const sw = g(torso, 0.05, 0.25, -0.17 * W); sw.rotation.z = 0.6; add(sw, new THREE.BoxGeometry(0.04, 0.7, 0.012), basic(0xdde4f0), 0, 0.1, 0, 0.01); add(sw, new THREE.BoxGeometry(0.16, 0.025, 0.03), toon(0xd8b040), 0, -0.26, 0, 0); add(sw, sph(0.025, 6, 4), basic(0xd02020), 0, -0.26, 0.02, 0); add(sw, cyl(0.015, 0.015, 0.12, 6), toon(0x6a4a2a), 0, -0.33, 0, 0); }
  if (acc.has('collar')) { const c2 = add(torso, new THREE.ConeGeometry(0.22 * W, 0.18, 10, 1, true), robeM, 0, 0.56, -0.02, 0); c2.rotation.x = Math.PI; c2.material.side = THREE.DoubleSide; }
  if (acc.has('diary')) add(elL, new THREE.BoxGeometry(0.1, 0.13, 0.03), toon(0x2a1a14), 0, -0.3, 0.06, 0.01);
  if (acc.has('umbrella')) { const u = g(elL, 0, -0.27, 0.03); add(u, cyl(0.012, 0.012, 0.7, 5), toon(0xff7ab0), 0, 0.2, 0, 0); add(u, new THREE.ConeGeometry(0.07, 0.3, 8), toon(0xff7ab0), 0, 0.5, 0, 0.01); }
  if (acc.has('cane')) { const u = g(elL, 0, -0.27, 0.03); add(u, cyl(0.014, 0.014, 0.85, 5), darkM, 0, -0.3, 0.05, 0); add(u, sph(0.04, 8, 6), basic(0xd8d8e0), 0, 0.12, 0.05, 0); }
  // --- wand in right hand ---
  const wandG = g(elR, 0, -0.27, 0.03); wandG.rotation.x = Math.PI - 0.35; // extends the forearm; arm pose aims it
  const wc = l.wandColor ?? 0x5a3620; const wl = l.wand === 'elder' ? 0.42 : l.wand === 'thin' ? 0.36 : 0.34;
  const wand = add(wandG, cyl(l.wand === 'thin' ? 0.009 : 0.013, 0.02, wl, 6), toon(wc), 0, wl / 2, 0, 0.008);
  if (l.wand === 'elder') for (let i = 0; i < 4; i++) add(wandG, sph(0.022, 5, 4), toon(wc), 0, 0.06 + i * 0.09, 0, 0);
  if (l.wand === 'knobby' || l.wand === 'crooked') add(wandG, sph(0.03, 6, 4), toon(wc), 0, 0.03, 0, 0);
  if (l.wand === 'bone' || l.wand === 'white') add(wandG, sph(0.028, 6, 4), toon(0xf2efe0), 0, 0.02, 0, 0);
  if (l.wand === 'vine') for (let i = 0; i < 3; i++) add(wandG, new THREE.TorusGeometry(0.02, 0.006, 4, 8), toon(0x3a8a3a), 0, 0.08 + i * 0.08, 0, 0);
  if (l.wand === 'crooked') wand.rotation.z = 0.12;
  const glow = new THREE.Mesh(sph(0.035, 6, 4), basic(l.spellColor ?? 0xffffff, { transparent: true, opacity: 0.85 })); glow.position.y = wl; wandG.add(glow);
  // the "arm" handle used by gameplay = right shoulder; tip = world position of wand end
  const tip = new THREE.Object3D(); tip.position.y = wl + 0.02; wandG.add(tip);
  // --- FX shells (unchanged gameplay contract) ---
  const shield = new THREE.Mesh(sph(1.25, 24, 16), basic(0x9fe0ff, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); shield.position.y = 1.05; shield.visible = false; root.add(shield);
  const aura = new THREE.Mesh(cyl(0.8, 0.8, 2.4, 16, 1, true), basic(l.spellColor ?? 0xffd34d, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); aura.position.y = 1.15; aura.visible = false; root.add(aura);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 28), basic(0xffffff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; root.add(ring);
  if (outfit === 'wraith') hips.position.y = 1.25;
  root.scale.setScalar(S * 1.08);
  // draw-call reduction: merge the static meshes attached to each joint into one mesh per material (outlines included)
  const keep = new Set<THREE.Object3D>([face, front, glow, shield, aura, ring]); const merged: THREE.Mesh[] = [];
  const joints: THREE.Object3D[] = []; root.traverse(o => { if ((o as any).isGroup && !keep.has(o)) joints.push(o); });
  for (const j of joints) { const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>(); const kill: THREE.Mesh[] = [];
    for (const c of j.children) { const mm = c as THREE.Mesh; if (!mm.isMesh || keep.has(mm) || c.children.some(k => !(k as any).userData?.outline)) continue; c.updateMatrix();
      const push = (mat: THREE.Material, geo: THREE.BufferGeometry, mx: THREE.Matrix4) => { const gg = geo.index ? geo.toNonIndexed() : geo.clone(); for (const n of Object.keys(gg.attributes)) if (!['position', 'normal'].includes(n)) gg.deleteAttribute(n); gg.applyMatrix4(mx); (buckets.get(mat) ?? buckets.set(mat, []).get(mat)!).push(gg); };
      push(mm.material as THREE.Material, mm.geometry, mm.matrix); for (const o of mm.children) { o.updateMatrix(); push((o as THREE.Mesh).material as THREE.Material, (o as THREE.Mesh).geometry, mm.matrix.clone().multiply(o.matrix)); } kill.push(mm); }
    if (kill.length < 2) continue; for (const k of kill) { j.remove(k); const ix = meshes.indexOf(k); if (ix >= 0) meshes.splice(ix, 1); }
    for (const [mat, geos] of buckets) { const mg = mergeGeometries(geos); if (!mg) continue; const nm = new THREE.Mesh(mg, mat); nm.castShadow = (j === torso || j === hips || j === head || j === knL || j === knR) && !(mat as any).userData?.ol && mat !== merged[0]?.material; j.add(nm); if ((mat as any).isMeshToonMaterial) { meshes.push(nm); merged.push(nm); } } }
  const rimC = lighten(sig, 0.45); const seen = new Set<THREE.Material>(); root.traverse(o => { const mm = o as THREE.Mesh; const mt = mm.material as any; if (mm.isMesh && mt?.isMeshToonMaterial && !seen.has(mt)) { seen.add(mt); addRim(mt, rimC, 0.42); } });
  if (typeof document !== 'undefined') { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d')!; const gr = cx.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), basic(sig, { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, map: new THREE.CanvasTexture(cv) } as any)); sg.rotation.x = -Math.PI / 2; sg.position.y = 0.035; sg.name = 'sigGlow'; root.add(sg); }
  const rig: Rig = { hips, torso, neck, shL, shR, elL, elR, thL, thR, knL, knR, skirt, cape, eyes, irises, brows, mouth, blush, detail: [face, front, ...detail], hairTail, st: { blink: 2 + Math.random() * 3, expr: 'neutral', exprT: 0, t: Math.random() * 10, roll: 0 }, look: l };
  return { root, arm: shR, tip, shield, ring, body: torso, aura, meshes, head, rig };
}
export interface PoseIn { dt: number; speed: number; maxSpeed: number; castT: number; ultT: number; hitT: number; dodge: number; stunned: boolean; down: boolean; dead: boolean; victory: boolean; clashing: boolean; shielding: boolean; camDist: number }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Drive all joints procedurally. castT/ultT/hitT = seconds since the event (large = none). */
export function animateRig(m: Model, p: PoseIn) {
  const r = m.rig; if (!r) return; const st = r.st; st.t += p.dt; const t = st.t; const l = r.look; const idle = l.idle ?? 'calm'; const cs = l.cast ?? 'snap';
  const k = Math.min(1, p.dt * 12); const run = Math.min(1, p.speed / Math.max(1, p.maxSpeed)); const moving = p.speed > 0.3;
  const ph = (r as any).ph = ((r as any).ph ?? 0) + p.dt * (4 + p.speed * 1.25); const sw = Math.sin(ph);
  // targets
  let hipsY = 1.0, hipsRx = 0, torsoRx = 0, torsoRy = 0, torsoRz = 0, headRx = 0, headRy = 0, headRz = 0;
  let thL = 0, thR = 0, knL = 0, knR = 0, shLx = 0.05, shLz = -0.15, shRx = 0.05, shRz = 0.15, elLx = -0.15, elRx = -0.15;
  const breath = Math.sin(t * 2.2) * 0.012;
  if (moving) { thL = sw * 0.75 * (0.5 + run * 0.6); thR = -thL; knL = Math.max(0, -Math.cos(ph)) * (0.6 + run * 0.6); knR = Math.max(0, Math.cos(ph)) * (0.6 + run * 0.6); shLx = -sw * 0.6 * (0.4 + run); shRx = sw * 0.6 * (0.4 + run); elLx = elRx = -0.4 - run * 0.6;
    hipsY = 1.0 - 0.03 * run + Math.abs(Math.cos(ph)) * 0.05 * (0.5 + run); torsoRx = 0.08 + run * 0.18; torsoRy = sw * 0.12; }
  else { hipsY += breath * 0.5; torsoRx = breath;
    switch (idle) { case 'bouncy': hipsY += Math.abs(Math.sin(t * 3)) * 0.03; headRz = Math.sin(t * 1.5) * 0.12; break; case 'sway': torsoRz = Math.sin(t * 0.9) * 0.08; headRz = Math.sin(t * 0.9 + 1) * 0.15; shLz = -0.35 + Math.sin(t) * 0.1; break;
      case 'proud': torsoRx = -0.1; headRx = -0.15; shLx = 0.3; elLx = -1.2; shLz = -0.4; break; case 'hunch': torsoRx = 0.22; headRx = 0.1; shLz = -0.05; break; case 'twirl': elRx = -1.2 + Math.sin(t * 4) * 0.2; shRx = -0.5; break;
      case 'fidget': headRy = Math.sin(t * 2.3) * 0.25; thL = Math.sin(t * 5) * 0.06; break; case 'feral': torsoRx = 0.35; hipsY -= 0.08; knL = knR = 0.5; thL = thR = -0.3; shLx = shRx = -0.6; elLx = elRx = -0.8; headRx = -0.3; break;
      case 'stern': shLz = -0.12; elLx = -0.3; headRx = -0.05; break; case 'float': hipsY += 0.08 + Math.sin(t * 1.6) * 0.06; break; }
  }
  // combat poses
  if (p.shielding) { shRx = -1.4; elRx = -0.2; shLx = -1.0; shLz = -0.5; elLx = -0.9; torsoRx = 0.12; }
  if (p.castT < 0.45) { const c = 1 - p.castT / 0.45; const ease = Math.sin(Math.min(1, p.castT / 0.12) * Math.PI / 2);
    switch (cs) { case 'flourish': shRx = lerp(shRx, -1.5, c); shRz = 0.15 + Math.sin(p.castT * 30) * 0.4 * c; elRx = -0.3; torsoRy = -0.25 * c; break;
      case 'thrust': shRx = lerp(shRx, -1.55, c); elRx = lerp(-1.2, 0, ease); torsoRx = 0.15 * c; thL = 0.3 * c; break;
      case 'whip': shRx = -1.0 - Math.sin(Math.min(1, p.castT / 0.3) * Math.PI) * 0.8; shRz = lerp(0.15, 1.0, c); torsoRy = 0.4 * c; break;
      case 'twohand': shRx = shLx = lerp(0, -1.4, c); shLz = 0.3 * c - 0.15; shRz = -0.3 * c + 0.15; elRx = elLx = -0.2; break;
      case 'lazy': shRx = lerp(shRx, -1.2, c); elRx = -0.5; torsoRx = -0.05; headRx = -0.1; break;
      case 'staff': shRx = lerp(shRx, -2.4, c); elRx = -0.1; shLx = -0.4; break;
      case 'punch': shRx = lerp(shRx, -1.5, c); elRx = 0; torsoRy = -0.4 * c; thR = 0.4 * c; break;
      default: shRx = lerp(shRx, -1.5, c); elRx = -0.15; }
  }
  if (p.clashing) { shRx = -1.45; shLx = -1.2; shLz = 0.35; elLx = -0.4; torsoRx = 0.2; thL = 0.4; thR = -0.3; knR = 0.3; hipsY -= 0.05; }
  if (p.ultT < 1.2) { const u = Math.sin(Math.min(1, p.ultT / 1.2) * Math.PI); shRx = -2.6 * u + shRx * (1 - u); shLx = -1.6 * u; shLz = -0.9 * u; torsoRx = -0.25 * u; headRx = -0.35 * u; }
  if (p.hitT < 0.3) { const h = 1 - p.hitT / 0.3; torsoRx = -0.35 * h; headRx = -0.4 * h; shLx = shRx = 0.5 * h; hipsY -= 0.04 * h; }
  if (p.stunned && !p.down) { torsoRz = Math.sin(t * 6) * 0.12; headRz = Math.sin(t * 6 + 1) * 0.25; shLz = -0.5; shRz = 0.5; }
  if (p.victory) { const v = Math.abs(Math.sin(t * 3)); shRx = -2.8; elRx = -0.2; shLz = -0.3 - v * 0.2; hipsY += v * 0.08; headRx = -0.25; }
  if (p.down || p.dead) { thL = thR = -0.2; knL = 0.4; knR = 0.1; shLz = -1.2; shRz = 1.2; headRx = -0.2; }
  // apply with smoothing
  r.hips.position.y = lerp(r.hips.position.y, hipsY, k); r.hips.rotation.x = lerp(r.hips.rotation.x, hipsRx, k);
  r.torso.rotation.set(lerp(r.torso.rotation.x, torsoRx, k), lerp(r.torso.rotation.y, torsoRy, k), lerp(r.torso.rotation.z, torsoRz, k));
  m.head.rotation.set(lerp(m.head.rotation.x, headRx, k), lerp(m.head.rotation.y, headRy, k), lerp(m.head.rotation.z, headRz, k));
  r.thL.rotation.x = lerp(r.thL.rotation.x, -thL, k); r.thR.rotation.x = lerp(r.thR.rotation.x, -thR, k); r.knL.rotation.x = lerp(r.knL.rotation.x, knL, k); r.knR.rotation.x = lerp(r.knR.rotation.x, knR, k);
  r.shL.rotation.x = lerp(r.shL.rotation.x, shLx, k); r.shL.rotation.z = lerp(r.shL.rotation.z, shLz, k); r.shR.rotation.x = lerp(r.shR.rotation.x, shRx, k); r.shR.rotation.z = lerp(r.shR.rotation.z, shRz, k);
  r.elL.rotation.x = lerp(r.elL.rotation.x, elLx, k); r.elR.rotation.x = lerp(r.elR.rotation.x, elRx, k);
  // cloth: skirt panels flare with speed and legs, cape trails
  for (let i = 0; i < r.skirt.length; i++) { const pn = r.skirt[i]; const front = Math.cos(pn.rotation.y); const flare = 0.08 + run * 0.25 + (moving ? Math.sin(ph + i) * 0.08 : Math.sin(t * 1.5 + i) * 0.02);
    pn.rotation.x = lerp(pn.rotation.x, -(flare + (front > 0 ? Math.max(Math.abs(thL), Math.abs(thR)) * 0.5 * front : 0)), k); }
  if (r.cape) r.cape.rotation.x = lerp(r.cape.rotation.x, 0.08 + run * 0.6 + Math.sin(t * 3) * 0.04, k * 0.6);
  if (r.hairTail) r.hairTail.rotation.x = lerp(r.hairTail.rotation.x, run * 0.5 + Math.sin(ph) * 0.1 * run, k);
  // dodge roll: full forward somersault around the hips
  if (p.dodge > 0) { st.roll = Math.min(1, st.roll + p.dt / 0.32); m.root.rotation.x = st.roll * Math.PI * 2; } else { st.roll = 0; }
  // face: blinking + expressions
  st.blink -= p.dt; let eyeY = 1; if (st.blink < 0) { eyeY = 0.1; if (st.blink < -0.12) st.blink = 2 + Math.random() * 4; }
  const ex: Expr = p.dead || p.down ? 'ko' : p.hitT < 0.35 ? 'hurt' : p.ultT < 1.3 ? 'ult' : p.castT < 0.4 || p.clashing ? 'cast' : p.victory ? 'happy' : 'neutral';
  if (ex !== st.expr) { st.expr = ex; }
  const browA = ex === 'hurt' ? 0.35 : ex === 'cast' || ex === 'ult' ? -0.3 : ex === 'happy' ? 0.15 : 0;
  if (ex === 'hurt') eyeY = 0.35; if (ex === 'ko') eyeY = 0.08; if (ex === 'happy') eyeY = 0.45; if (ex === 'ult') eyeY = 1.1;
  for (let i = 0; i < r.eyes.length; i++) { const e = r.eyes[i]; e.scale.y = lerp(e.scale.y, eyeY, Math.min(1, p.dt * 30)); }
  for (let i = 0; i < r.brows.length; i++) { const sx = i === 0 ? -1 : 1; r.brows[i].rotation.z = lerp(r.brows[i].rotation.z, sx * browA, k); r.brows[i].position.y = lerp(r.brows[i].position.y, 0.07 + (ex === 'hurt' ? 0.012 : ex === 'cast' ? -0.008 : 0), k); }
  const mo = ex === 'ult' ? [1.4, 1.2] : ex === 'cast' ? [1.0, 0.8] : ex === 'hurt' ? [1.2, 0.6] : ex === 'happy' ? [1.6, 0.5] : ex === 'ko' ? [0.8, 0.2] : [1.1, 0.25];
  r.mouth.scale.x = lerp(r.mouth.scale.x, mo[0], k); r.mouth.scale.y = lerp(r.mouth.scale.y, mo[1], k);
  for (const bl of r.blush) (bl.material as THREE.MeshBasicMaterial).opacity = lerp((bl.material as THREE.MeshBasicMaterial).opacity, ex === 'hurt' || ex === 'happy' ? 0.7 : (l.fem ? 0.45 : 0.25), k);
  const glowOn = ex === 'ult'; for (const ir of r.irises) { const mm = ir.material as THREE.MeshBasicMaterial; if ((ir as any)._g !== glowOn) { (ir as any)._g = glowOn; mm.color.setHex(glowOn ? 0xffffff : (l.eye ?? 0x3a2a1a)); if (glowOn) mm.color.lerp(new THREE.Color(l.spellColor ?? 0xffd34d), 0.6); } }
  // LOD: hide face/detail when far away
  const near = p.camDist < 38; for (const d of r.detail) d.visible = near;
}
