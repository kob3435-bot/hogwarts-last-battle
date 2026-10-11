/** Explorable castle locations (Phase 5): compact procedural builds sharing one helper. */
import * as THREE from 'three';
import { toon, addOutline } from './toon';
import type { Box } from '../core/collision';
import type { Destructible } from './scene';
export type ExploreArea = 'clocktower' | 'library' | 'hospital' | 'hagrid' | 'boathouse' | 'astronomy' | 'office';
export const EXPLORE_AREAS: ExploreArea[] = ['clocktower', 'library', 'hospital', 'hagrid', 'boathouse', 'astronomy', 'office'];
export const AREA_NAMES: Record<string, { en: string; th: string }> = {
  courtyard: { en: 'Courtyard & Bridge', th: 'ลานปราสาทและสะพาน' }, room: { en: 'Room of Requirement', th: 'ห้องต้องประสงค์' }, forest: { en: 'Forbidden Forest', th: 'ป่าต้องห้าม' }, hall: { en: 'Great Hall', th: 'ห้องโถงใหญ่' },
  clocktower: { en: 'Clock Tower', th: 'หอนาฬิกา' }, library: { en: 'Library', th: 'ห้องสมุด' }, hospital: { en: 'Hospital Wing', th: 'ห้องพยาบาล' }, hagrid: { en: 'Hagrid\'s Hut', th: 'กระท่อมแฮกริด' },
  boathouse: { en: 'Boathouse', th: 'โรงเรือ' }, astronomy: { en: 'Astronomy Tower', th: 'หอดูดาว' }, office: { en: 'Headmaster\'s Office', th: 'ห้องอาจารย์ใหญ่' },
};
export function buildExplore(a: ExploreArea) {
  const P: Record<ExploreArea, { bg: number; floor: number; wall: number; half: number; outdoor?: boolean; light: number }> = {
    clocktower: { bg: 0x2a2440, floor: 0x8a7a6a, wall: 0xa89a80, half: 18, light: 0xffd8a0 }, library: { bg: 0x2a1c18, floor: 0x6a4a30, wall: 0x7a5a40, half: 22, light: 0xffc890 },
    hospital: { bg: 0x384050, floor: 0xd8d8e0, wall: 0xe8e4dc, half: 18, light: 0xf0f4ff }, hagrid: { bg: 0x1a2a40, floor: 0x3a5a2a, wall: 0x6a4a2a, half: 30, outdoor: true, light: 0xb0c8ff },
    boathouse: { bg: 0x101828, floor: 0x5a4a3a, wall: 0x6a5a4a, half: 22, light: 0x9ab8ff }, astronomy: { bg: 0x0a0a28, floor: 0x7a7a8a, wall: 0x8a8a9a, half: 14, outdoor: true, light: 0xc0c8ff },
    office: { bg: 0x2a1a3a, floor: 0x5a3a2a, wall: 0x7a5a8a, half: 12, light: 0xffd0a0 } };
  const p = P[a]; const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg); scene.fog = new THREE.FogExp2(p.bg, p.outdoor ? 0.012 : 0.018);
  const hemi = new THREE.HemisphereLight(p.light, 0x302030, 1.5); scene.add(hemi);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 16, 8), new THREE.MeshBasicMaterial({ color: p.bg, side: THREE.BackSide, fog: false })); sky.userData.sky = true; scene.add(sky);
  const omen = new THREE.Mesh(new THREE.SphereGeometry(1, 4, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })); scene.add(omen);
  const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(10, 30, 12); dl.castShadow = true; Object.assign(dl.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35 }); scene.add(dl);
  const boxes: Box[] = [], torches: THREE.PointLight[] = [], destructibles: Destructible[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, solid?: [number, number, number], outline = true, hp = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); if (outline) addOutline(m, 0.05);
    if (solid) { const box = { minX: x - solid[0] / 2, maxX: x + solid[0] / 2, minZ: z - solid[2] / 2, maxZ: z + solid[2] / 2, h: solid[1] }; boxes.push(box); if (hp) { m.material = (m.material as any).clone(); destructibles.push({ mesh: m, box, hp, maxHp: hp, state: 0, baseColor: (m.material as THREE.MeshToonMaterial).color.getHex(), h: solid[1] }); } } return m; };
  const light = (x: number, y: number, z: number, c = p.light, i = 30) => { const l = new THREE.PointLight(c, i, 28, 1.5); l.position.set(x, y, z); scene.add(l); torches.push(l); };
  const H = p.half; add(new THREE.PlaneGeometry(H * 2 + 20, H * 2 + 20), toon(p.floor), 0, 0, 0, undefined, false).rotation.x = -Math.PI / 2;
  if (!p.outdoor) { const wm = toon(p.wall); for (const [x, z, sx, sz] of [[0, -H, H * 2, 1.5], [0, H, H * 2, 1.5], [-H, 0, 1.5, H * 2], [H, 0, 1.5, H * 2]] as const) add(new THREE.BoxGeometry(sx, 14, sz), wm, x, 7, z, [sx, 14, sz]); }
  const wood = toon(0x7a4a2a), metal = toon(0xb8a060);
  switch (a) {
    case 'clocktower': { const face = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); face.position.set(0, 9, -H + 0.8); scene.add(face);
      for (let i = 0; i < 12; i++) { const t = add(new THREE.BoxGeometry(0.3, 1, 0.1), toon(0x222222), Math.sin(i / 12 * Math.PI * 2) * 5, 9 + Math.cos(i / 12 * Math.PI * 2) * 5, -H + 0.9, undefined, false); t.rotation.z = -i / 12 * Math.PI * 2; }
      const hand = add(new THREE.BoxGeometry(0.25, 4.5, 0.1), toon(0x111111), 0, 10.6, -H + 1, undefined, false); hand.userData.spin = 0.4;
      for (const [x, z, r] of [[-8, -6, 2.4], [7, -4, 3], [-5, 6, 1.8], [8, 8, 2.2]] as const) { const g = add(new THREE.CylinderGeometry(r, r, 0.6, 12), metal, x, 1.5, z, [r * 1.6, 3, r * 1.6]); g.rotation.x = Math.PI / 2; g.userData.spin = 1 / r; }
      const pend = add(new THREE.CylinderGeometry(0.1, 0.1, 8, 6), metal, 0, 6, -4, undefined, false); pend.userData.swing = true; light(0, 8, 0); light(-10, 6, 10); break; }
    case 'library': for (let row = -2; row <= 2; row++) for (const sx of [-1, 1]) { const x = sx * (6 + Math.abs(row) % 2), z = row * 7; add(new THREE.BoxGeometry(8, 7, 1.4), wood, x + sx * 6, 3.5, z, [8, 7, 1.4]);
        for (let k = 0; k < 14; k++) add(new THREE.BoxGeometry(0.4, 1.1, 0.9), toon([0xb3152a, 0x2453c7, 0x1f8a4a, 0xe0b020, 0x6a3a8a][k % 5]), x + sx * 6 - 3.2 + k * 0.5, 1.2 + (k % 3) * 2, z + 0.1, undefined, false); }
      add(new THREE.BoxGeometry(4, 1.2, 2), wood, 0, 0.6, 0, [4, 1.2, 2], true, 150); for (const [x, z] of [[0, -16], [0, 16], [-14, 0], [14, 0]]) light(x, 6, z, 0xffc890, 28); break;
    case 'hospital': for (let i = -3; i <= 3; i++) for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(2.2, 0.8, 4), toon(0xffffff), sx * 12, 0.6, i * 4.6, [2.2, 1, 4]); add(new THREE.BoxGeometry(2.2, 1.6, 0.2), metal, sx * 12, 1.2, i * 4.6 - 2, undefined, false); add(new THREE.BoxGeometry(1.8, 0.3, 1), toon(0xe8f0ff), sx * 12, 1.1, i * 4.6 - 1.2, undefined, false); }
      add(new THREE.BoxGeometry(5, 3, 0.4), toon(0xd8e0ff), 0, 1.5, -6, [5, 3, 0.4], true, 80); add(new THREE.BoxGeometry(3, 1.2, 1.5), wood, 0, 0.6, -14, [3, 1.2, 1.5]); light(0, 8, -8, 0xf0f4ff, 35); light(0, 8, 8, 0xf0f4ff, 35); break;
    case 'hagrid': { add(new THREE.CylinderGeometry(5, 5.5, 5, 12), toon(0x8a6a4a), 0, 2.5, -8, [10, 5, 10]); add(new THREE.ConeGeometry(6.5, 4, 12), toon(0x6a5a3a), 0, 7, -8);
      add(new THREE.BoxGeometry(1.6, 3, 0.3), wood, 0, 1.5, -2.6, undefined, false); for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.7 + Math.random() * 0.8, 10, 8), toon(0xff8a1a), 8 + (i % 3) * 2.4, 0.7, -4 + Math.floor(i / 3) * 2.4, undefined, true);
      const tr = toon(0x3a2a20), lf = toon(0x1f5a3a); for (let i = 0; i < 40; i++) { const ang = Math.random() * Math.PI * 2, r = 22 + Math.random() * 10; const x = Math.cos(ang) * r, z = Math.sin(ang) * r; add(new THREE.CylinderGeometry(0.4, 0.6, 8, 6), tr, x, 4, z, [1.2, 8, 1.2], false); add(new THREE.ConeGeometry(2.8, 7, 7), lf, x, 9, z); }
      light(0, 3, -2, 0xffb060, 40); break; }
    case 'boathouse': { const water = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H), new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.85 })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, -H / 2); water.userData.water = true; scene.add(water);
      boxes.push({ minX: -H, maxX: H, minZ: -H, maxZ: -3, h: 0.1 } as Box); for (const x of [-8, 0, 8]) { add(new THREE.BoxGeometry(2.4, 0.4, 14), wood, x, 0.3, -9, undefined, true); const boat = add(new THREE.BoxGeometry(1.6, 0.7, 4), toon(0x5a3a1a), x + 2.2, 0.35, -10, undefined, true); boat.userData.bob = Math.random() * 6; }
      for (const [x, z] of [[-14, 6], [14, 6], [0, 14]]) add(new THREE.BoxGeometry(2, 2, 2), wood, x, 1, z, [2, 2, 2], true, 90); light(-10, 5, 4, 0xffb060, 30); light(10, 5, 4, 0xffb060, 30); break; }
    case 'astronomy': { add(new THREE.CylinderGeometry(H, H, 1, 32), toon(0x7a7a8a), 0, -0.5, 0, undefined, false); for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; add(new THREE.BoxGeometry(1, 1.4, 1), toon(0x8a8a9a), Math.cos(ang) * H, 0.7, Math.sin(ang) * H, [1.2, 1.4, 1.2]); }
      const tel = add(new THREE.CylinderGeometry(0.4, 0.6, 5, 10), metal, 0, 2.6, 0, [1.4, 3, 1.4]); tel.rotation.z = 0.8; const sg = new THREE.BufferGeometry(); const pts: number[] = []; for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(300); if (v.y > 0) pts.push(v.x, v.y, v.z); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, fog: false }))); light(0, 6, 0, 0xc0c8ff, 25); break; }
    case 'office': { add(new THREE.BoxGeometry(5, 1.4, 2.4), wood, 0, 0.7, -6, [5, 1.4, 2.4]); const perch = add(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), metal, 5, 1.5, -6, undefined, false); void perch;
      const fawkes = add(new THREE.SphereGeometry(0.5, 10, 8), toon(0xff4a14), 5, 3.2, -6); fawkes.userData.bob = 0;
      for (let i = 0; i < 10; i++) { const ang = Math.PI + i / 9 * Math.PI; const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), toon([0x8a6a3a, 0x5a7a9a, 0x9a5a5a, 0x6a8a5a][i % 4])); fr.position.set(Math.cos(ang) * (H - 0.9), 6, Math.sin(ang) * (H - 0.9)); fr.lookAt(0, 6, 0); scene.add(fr); }
      add(new THREE.CylinderGeometry(0.8, 1, 1.4, 10), toon(0xc0c8d8), -5, 0.7, -5, [1.6, 1.4, 1.6], true, 60); /* Pensieve */ light(0, 7, 0, 0xffd0a0, 35); break; }
  }
  return { scene, hemi, omen, boxes, torches, destructibles, clamp: (x: number, z: number): [number, number] => { const lim = H - 1.2; if (a === 'astronomy') { const r = Math.hypot(x, z); if (r > lim) return [x / r * lim, z / r * lim]; return [x, z]; } return [Math.max(-lim, Math.min(lim, x)), Math.max(-lim, Math.min(lim, z))]; },
    spawnPoints: { start: [0, H - 4] as [number, number], center: [0, 0] as [number, number] } };
}
/** per-frame ambient animation of explore props (gears, pendulum, water, boats) */
export function animateExplore(scene: THREE.Scene, t: number) { scene.traverse(o => { if (o.userData.spin) o.rotation.y += o.userData.spin * 0.016; if (o.userData.swing) o.rotation.z = Math.sin(t * 1.5) * 0.4; if (o.userData.bob !== undefined) o.position.y = 0.35 + Math.sin(t * 1.3 + o.userData.bob) * 0.12 + ((o as any).geometry?.type === 'SphereGeometry' ? 2.85 : 0); }); }
