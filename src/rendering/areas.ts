import * as THREE from 'three';
import { toon, addOutline } from './toon';
import type { Box } from '../core/collision';
import { buildCourtyard, World, Destructible } from './scene';
import { clampToMap } from '../war/map';
import { buildExplore, ExploreArea, EXPLORE_AREAS } from './areas2';
export type Area = 'courtyard' | 'room' | 'forest' | 'hall' | ExploreArea;
export interface AreaWorld extends World { clamp: (x: number, z: number) => [number, number]; spawnPoints: Record<string, [number, number]> }
function base(bg: number, fog: number, density: number, hemiSky: number, hemiGround: number, hemiI: number) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); scene.fog = new THREE.FogExp2(fog, density);
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiI); scene.add(hemi);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 16, 8), new THREE.MeshBasicMaterial({ color: bg, side: THREE.BackSide, fog: false })); sky.userData.sky = true; scene.add(sky);
  const omen = new THREE.Mesh(new THREE.SphereGeometry(1, 4, 4), new THREE.MeshBasicMaterial({ color: 0x1fff6a, transparent: true, opacity: 0 })); scene.add(omen);
  return { scene, hemi, omen, boxes: [] as Box[], torches: [] as THREE.PointLight[], destructibles: [] as Destructible[] };
}
function adder(w: ReturnType<typeof base>) {
  return (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, solid?: [number, number, number], outline = true, destructible = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; w.scene.add(m); if (outline) addOutline(m, 0.05);
    if (solid) { const box = { minX: x - solid[0] / 2, maxX: x + solid[0] / 2, minZ: z - solid[2] / 2, maxZ: z + solid[2] / 2, h: solid[1] }; w.boxes.push(box);
      if (destructible) { m.material = (m.material as any).clone(); w.destructibles.push({ mesh: m, box, hp: destructible, maxHp: destructible, state: 0, baseColor: (m.material as THREE.MeshToonMaterial).color.getHex(), h: solid[1] }); } }
    return m; };
}
const rect = (hx: number, z0: number, z1: number) => (x: number, z: number): [number, number] => [Math.max(-hx, Math.min(hx, x)), Math.max(z0, Math.min(z1, z))];
/** Room of Requirement: towering piles of hidden junk lit by warm lamps */
export function buildRoom(): AreaWorld {
  const w = base(0x2a1a3a, 0x3a2448, 0.02, 0xffd0a0, 0x402030, 1.6); const add = adder(w);
  const dl = new THREE.DirectionalLight(0xffe0c0, 1.2); dl.position.set(10, 30, 10); dl.castShadow = true; Object.assign(dl.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); w.scene.add(dl);
  add(new THREE.PlaneGeometry(64, 64), toon(0x8a5a3a), 0, 0, 0, undefined, false).rotation.x = -Math.PI / 2;
  const wallM = toon(0x6a4a6a); for (const [x, z, sx, sz] of [[0, -30, 62, 2], [0, 30, 62, 2], [-30, 0, 2, 62], [30, 0, 2, 62]] as const) add(new THREE.BoxGeometry(sx, 22, sz), wallM, x, 11, z, [sx, 22, sz]);
  const cols = [0xc89a5a, 0x9a6a4a, 0x6a8ab0, 0xb05a5a, 0x7ab07a, 0xd8c08a];
  const piles: [number, number][] = [[-16, -14], [-6, -18], [8, -12], [18, -18], [-18, 4], [16, 2], [-8, 14], [6, 18], [20, 18], [-20, 20]];
  for (const [px, pz] of piles) { const h = 4 + Math.random() * 6; add(new THREE.BoxGeometry(5, 1, 5), toon(cols[0]), px, 0.5, pz, [5, h, 5], true, 0);
    for (let k = 0; k < 9; k++) { const s = 0.8 + Math.random() * 1.6; const m = add(new THREE.BoxGeometry(s, s, s), toon(cols[k % cols.length]), px + (Math.random() - .5) * 3.5, 1 + k * h / 9, pz + (Math.random() - .5) * 3.5, undefined, k % 2 === 0); m.rotation.set(Math.random(), Math.random() * 3, Math.random() * .4); } }
  for (const [x, z] of [[-12, -4], [12, -4], [0, 8], [-4, -24]]) add(new THREE.BoxGeometry(2.5, 2.2, 1.4), toon(0x9a6a4a), x, 1.1, z, [2.5, 2.2, 1.4], true, 120); // breakable crates
  for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24], [0, 0]]) { const l = new THREE.PointLight(0xffb060, 40, 26, 1.5); l.position.set(x, 8, z); w.scene.add(l); w.torches.push(l);
    add(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }), x, 8, z, undefined, false); }
  return { ...w, clamp: rect(28.5, -28.5, 28.5), spawnPoints: { start: [0, 24], diadem: [22, -24], exit: [0, 27], dummy: [0, -6] } };
}
/** Forbidden Forest clearing */
export function buildForest(): AreaWorld {
  const w = base(0x0c1a20, 0x16302a, 0.03, 0x88c0b0, 0x10201a, 1.1); const add = adder(w);
  const moon = new THREE.DirectionalLight(0xb0d8ff, 1.0); moon.position.set(-20, 40, 10); moon.castShadow = true; Object.assign(moon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45 }); w.scene.add(moon);
  add(new THREE.PlaneGeometry(140, 140), toon(0x2a4a2a), 0, 0, 0, undefined, false).rotation.x = -Math.PI / 2;
  const trunk = toon(0x3a2a20), leaf = [toon(0x1f5a3a), toon(0x2a6a4a), toon(0x184a32)];
  for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 40; const x = Math.cos(a) * r, z = Math.sin(a) * r + 10;
    if (Math.abs(x) < 4 && z > 10) continue; // path
    const h = 8 + Math.random() * 8; add(new THREE.CylinderGeometry(0.4, 0.7, h, 6), trunk, x, h / 2, z, [1.2, h, 1.2], false);
    add(new THREE.ConeGeometry(2.8 + Math.random(), h * 0.8, 7), leaf[i % 3], x, h * 0.85, z, undefined, i % 3 === 0); }
  for (const sx of [-1, 1]) w.boxes.push({ minX: sx > 0 ? 50 : -60, maxX: sx > 0 ? 60 : -50, minZ: -60, maxZ: 80, h: 30 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(11, 12, 40), new THREE.MeshBasicMaterial({ color: 0x3aff8a, transparent: true, opacity: 0.25, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; w.scene.add(ring);
  const fire = new THREE.PointLight(0x7aff9a, 30, 30, 1.5); fire.position.set(0, 3, -2); w.scene.add(fire); w.torches.push(fire);
  for (let i = 0; i < 30; i++) add(new THREE.SphereGeometry(0.08, 4, 3), new THREE.MeshBasicMaterial({ color: 0xc0ffd0 }), (Math.random() - .5) * 50, 1 + Math.random() * 5, (Math.random() - .5) * 50 + 10, undefined, false); // fireflies
  return { ...w, clamp: rect(48, -20, 60), spawnPoints: { start: [0, 55], clearing: [0, 0], voldemort: [0, -10] } };
}
/** The Great Hall: long tables, floating candles, enchanted night ceiling */
export function buildHall(): AreaWorld {
  const w = base(0x1a1640, 0x2a2058, 0.008, 0xffe0b0, 0x403050, 1.5); const add = adder(w);
  const dl = new THREE.DirectionalLight(0xfff0d0, 1.0); dl.position.set(0, 40, 20); dl.castShadow = true; Object.assign(dl.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); w.scene.add(dl);
  const tex = document.createElement('canvas'); tex.width = tex.height = 128; const g = tex.getContext('2d')!; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#c8a878' : '#a88858'; g.fillRect(x * 16, y * 16, 16, 16); }
  const t = new THREE.CanvasTexture(tex); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 16); t.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(40, 80), toon(0xffffff, { map: t }), 0, 0, 0, undefined, false).rotation.x = -Math.PI / 2;
  const stone = toon(0xc8b090); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(2, 26, 80), stone, sx * 20, 13, 0, [2, 26, 80]);
  add(new THREE.BoxGeometry(42, 26, 2), stone, 0, 13, -40, [42, 26, 2]); add(new THREE.BoxGeometry(42, 26, 2), stone, 0, 13, 40, [42, 26, 2]);
  for (const sx of [-1, 1]) for (let z = -34; z <= 34; z += 7) { const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), new THREE.MeshBasicMaterial({ color: 0x9ab8ff })); win.position.set(sx * 18.95, 13, z); win.rotation.y = -sx * Math.PI / 2; w.scene.add(win); }
  const tableM = toon(0x7a4a2a); for (const x of [-12, -4, 4, 12]) add(new THREE.BoxGeometry(2.2, 1.1, 50), tableM, x, 0.55, 2, [2.2, 1.1, 50], true, 220);
  add(new THREE.BoxGeometry(20, 1.4, 3), tableM, 0, 0.7, -34, [20, 1.4, 3]);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), new THREE.MeshBasicMaterial({ color: 0x2a2470 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 26; w.scene.add(ceil);
  const sg = new THREE.BufferGeometry(); const p: number[] = []; for (let i = 0; i < 300; i++) p.push((Math.random() - .5) * 38, 25.5, (Math.random() - .5) * 78); sg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); w.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })));
  const candleM = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }); const candles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), candleM, 160); const o = new THREE.Object3D();
  for (let i = 0; i < 160; i++) { o.position.set((Math.random() - .5) * 34, 9 + Math.random() * 6, (Math.random() - .5) * 72); o.updateMatrix(); candles.setMatrixAt(i, o.matrix); } w.scene.add(candles);
  for (const [x, z] of [[-10, -20], [10, -20], [-10, 20], [10, 20], [0, 0]]) { const l = new THREE.PointLight(0xffc070, 35, 30, 1.4); l.position.set(x, 10, z); w.scene.add(l); w.torches.push(l); }
  for (const [i, c] of [0xb3152a, 0x1f8a4a, 0x2453c7, 0xe0b020].entries()) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 8), toon(c)); b.position.set(-12 + i * 8, 19, -38.9); w.scene.add(b); }
  return { ...w, clamp: rect(18.5, -38, 38.5), spawnPoints: { harry: [0, 22], voldemort: [0, -22] } };
}
export function buildArea(a: Area = 'courtyard'): AreaWorld {
  if ((EXPLORE_AREAS as string[]).includes(a)) return buildExplore(a as ExploreArea);
  if (a === 'room') return buildRoom(); if (a === 'forest') return buildForest(); if (a === 'hall') return buildHall();
  return { ...buildCourtyard(), clamp: clampToMap, spawnPoints: { north: [0, -26], south: [0, 26], hall: [0, -50], bridge: [0, 60] } };
}
