import * as THREE from 'three';
import { toon, addOutline } from './toon';
import type { Box } from '../core/collision';
export interface Destructible { mesh: THREE.Mesh; box: Box; hp: number; maxHp: number; state: number; baseColor: number; h: number }
export interface World { scene: THREE.Scene; boxes: Box[]; torches: THREE.PointLight[]; hemi: THREE.HemisphereLight; omen: THREE.Mesh; destructibles: Destructible[]; }
export function buildCourtyard(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2466); scene.fog = new THREE.FogExp2(0x3d3279, 0.013);
  // anime gradient sky dome
  const skyG = new THREE.SphereGeometry(400, 32, 16); const cols: number[] = []; const pa = skyG.attributes.position;
  const top = new THREE.Color(0x120c3a), mid = new THREE.Color(0x4b2f8f), hor = new THREE.Color(0xff7a8a);
  for (let i = 0; i < pa.count; i++) { const h = pa.getY(i) / 400; const c = h > 0.25 ? mid.clone().lerp(top, (h - 0.25) / 0.75) : hor.clone().lerp(mid, Math.max(0, h) / 0.25); cols.push(c.r, c.g, c.b); }
  skyG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sky.userData.sky = true; scene.add(sky);
  const moonM = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })); moonM.position.set(-120, 150, -260); moonM.lookAt(0, 0, 0); scene.add(moonM);
  const boxes: Box[] = []; const destructibles: Destructible[] = []; const torches: THREE.PointLight[] = [];
  const hemi = new THREE.HemisphereLight(0xb8b0ff, 0x4a3050, 1.5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xfff0e0, 1.8); moon.position.set(-30, 50, 20); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 140 }); scene.add(moon);
  // ground: flagstones
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d')!;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v - 18},${v - 30})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(16, 16); tex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 110), toon(0xffffff, { map: tex }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -21; ground.receiveShadow = true; scene.add(ground);
  const stone = toon(0xd9c3a0);
  const dark = toon(0x8a6f8f);
  const glass = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat = stone, solid = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); addOutline(m, 0.06);
    if (solid) boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h: y + h / 2 }); return m;
  };
  const S = 34; // half-size of courtyard
  // four gothic walls with arcade arches & windows (instanced-ish loops)
  const G = 5; // half-width of gates in north (Great Hall) & south (bridge) walls
  for (let side = 0; side < 4; side++) {
    const rot = side * Math.PI / 2; const grp = new THREE.Group(); grp.rotation.y = rot; scene.add(grp); const gate = side % 2 === 0;
    const segs: [number, number][] = gate ? [[-S - 2, -G], [G, S + 2]] : [[-S - 2, S + 2]];
    for (const [a, b] of segs) { const wall = new THREE.Mesh(new THREE.BoxGeometry(b - a, 16, 2), stone); wall.position.set((a + b) / 2, 8, -S - 1); wall.castShadow = wall.receiveShadow = true; grp.add(wall); }
    if (gate) { const lintel = new THREE.Mesh(new THREE.BoxGeometry(G * 2 + 1, 4, 2.4), dark); lintel.position.set(0, 14, -S - 1); grp.add(lintel);
      const garch = new THREE.Mesh(new THREE.TorusGeometry(G, 0.6, 8, 20, Math.PI), dark); garch.position.set(0, 8, -S); grp.add(garch); }
    for (let i = -S + 4; i <= S - 4; i += 6) { if (gate && Math.abs(i) < G + 2) continue;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 6, 12, Math.PI), dark); arch.position.set(i, 4.5, -S + 0.1); grp.add(arch);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.5), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); hole.position.set(i, 2.25, -S + 0.02); grp.add(hole);
      const top = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); top.position.set(i, 4.5, -S + 0.02); grp.add(top);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.4), glass); win.position.set(i, 10, -S + 0.05); grp.add(win);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1, 16.5, 1.4), dark); pil.position.set(i + 3, 8.2, -S + 0.3); grp.add(pil);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3, 4), dark); spire.position.set(i + 3, 17.8, -S + 0.3); grp.add(spire);
    }
  }
  boxes.push({ minX: -S - 3, maxX: -G, minZ: -S - 3, maxZ: -S, h: 16 }, { minX: G, maxX: S + 3, minZ: -S - 3, maxZ: -S, h: 16 },
    { minX: -S - 3, maxX: -G, minZ: S, maxZ: S + 3, h: 16 }, { minX: G, maxX: S + 3, minZ: S, maxZ: S + 3, h: 16 },
    { minX: -S - 3, maxX: -S, minZ: -S - 3, maxZ: S + 3, h: 16 }, { minX: S, maxX: S + 3, minZ: -S - 3, maxZ: S + 3, h: 16 });
  // ---- GREAT HALL ENTRANCE (north, z -34 .. -64) ----
  const HW = 12, HZ = -64;
  for (const sx of [-1, 1]) { addBox(2, 18, 30, sx * (HW + 1), 9, -49); for (let z = -60; z <= -38; z += 5.5) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 20, 1.4), dark); b.position.set(sx * (HW - 0.2), 10, z); scene.add(b); } }
  addBox(HW * 2 + 4, 26, 3, 0, 13, HZ - 1.5);
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(8, 11), new THREE.MeshBasicMaterial({ color: 0xffc860 })); doors.position.set(0, 5.5, HZ + 0.05); scene.add(doors);
  const doorArch = new THREE.Mesh(new THREE.TorusGeometry(4, 0.5, 8, 20, Math.PI), dark); doorArch.position.set(0, 11, HZ + 0.1); scene.add(doorArch);
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(14 - i * 2, 0.3, 2), stone); st.position.set(0, 0.15 + i * 0.3, HZ + 1 + (2 - i) * 1.5); scene.add(st); }
  const hallPl = new THREE.PointLight(0xffb050, 60, 30, 1.5); hallPl.position.set(0, 6, HZ + 4); scene.add(hallPl);
  for (const sx of [-1, 1]) { const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7), toon(sx < 0 ? 0xb3152a : 0x2453c7)); ban.position.set(sx * 7, 14, HZ + 0.1); scene.add(ban); }
  const roofH = new THREE.Mesh(new THREE.ConeGeometry(18, 14, 4), toon(0x3557c9)); roofH.position.set(0, 33, HZ - 6); roofH.rotation.y = Math.PI / 4; scene.add(roofH);
  // ---- BRIDGE (south, z 34 .. 92) over a chasm ----
  const BW = 4.5, BZ0 = S + 2, BZ1 = 94;
  const chasm = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), new THREE.MeshBasicMaterial({ color: 0x1d1650 })); chasm.rotation.x = -Math.PI / 2; chasm.position.set(0, -30, 120); scene.add(chasm);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(BW * 2, 1, BZ1 - BZ0), toon(0xb79a7a)); deck.position.set(0, -0.5, (BZ0 + BZ1) / 2); deck.receiveShadow = true; scene.add(deck); addOutline(deck, 0.08);
  const deckTop = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, BZ1 - BZ0), toon(0xffffff, { map: tex })); deckTop.rotation.x = -Math.PI / 2; deckTop.position.set(0, 0.01, (BZ0 + BZ1) / 2); scene.add(deckTop);
  for (const sx of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, BZ1 - BZ0), stone); rail.position.set(sx * (BW + 0.25), 0.6, (BZ0 + BZ1) / 2); scene.add(rail);
    boxes.push({ minX: sx > 0 ? BW : -BW - 0.5, maxX: sx > 0 ? BW + 0.5 : -BW, minZ: BZ0, maxZ: BZ1, h: 1.2 });
    for (let z = BZ0 + 4; z < BZ1; z += 8) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.8), dark); post.position.set(sx * (BW + 0.25), 1.5, z); scene.add(post); } }
  for (let z = BZ0 + 10; z < BZ1; z += 16) { const pier = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 30, 8), stone); pier.position.set(0, -16, z); scene.add(pier);
    const ar = new THREE.Mesh(new THREE.TorusGeometry(7, 1, 6, 16, Math.PI), stone); ar.position.set(0, -8, z + 8); ar.rotation.y = Math.PI / 2; scene.add(ar); }
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 4), stone); gatehouse.position.set(0, 7, BZ1 + 2); scene.add(gatehouse);
  boxes.push({ minX: -7, maxX: 7, minZ: BZ1, maxZ: BZ1 + 4, h: 14 }, { minX: -60, maxX: -BW - 0.5, minZ: S + 3, maxZ: BZ1, h: 0.5 }, { minX: BW + 0.5, maxX: 60, minZ: S + 3, maxZ: BZ1, h: 0.5 });
  const forestGlow = new THREE.Mesh(new THREE.SphereGeometry(30, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1f6a3a, transparent: true, opacity: 0.2, fog: false })); forestGlow.position.set(0, 0, 160); scene.add(forestGlow);
  // towers at corners
  for (const [x, z] of [[-S, -S], [S, -S], [-S, S], [S, S]]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 30, 10), stone); tw.position.set(x, 15, z); tw.castShadow = true; scene.add(tw);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 10), toon(0x3557c9)); roof.position.set(x, 35, z); scene.add(roof);
  }
  // great tower far behind
  const gt = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 60, 12), stone); gt.position.set(-26, 30, -78); scene.add(gt);
  const gr = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 12), toon(0x3557c9)); gr.position.set(-26, 69, -78); scene.add(gr);
  // central fountain
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 1, 20), stone); basin.position.y = 0.5; basin.castShadow = true; scene.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), new THREE.MeshBasicMaterial({ color: 0x5fd0ff })); water.rotation.x = -Math.PI / 2; water.position.y = 1.02; scene.add(water);
  addBox(1, 3.5, 1, 0, 1.75, 0); boxes.push({ minX: -3.6, maxX: 3.6, minZ: -3.6, maxZ: 3.6, h: 1 });
  // pillars, rubble & broken statues as cover
  const cover: [number, number, number, number, number][] = [[-14, -12, 1.6, 7, 1.6], [14, -12, 1.6, 7, 1.6], [-14, 12, 1.6, 7, 1.6], [14, 12, 1.6, 7, 1.6], [-22, 0, 5, 1.6, 1.4], [22, 0, 5, 1.6, 1.4], [0, -22, 1.4, 1.4, 5], [0, 22, 1.4, 1.2, 5], [-8, -26, 3, 2.2, 2], [9, 25, 2.6, 2, 2.4]];
  cover.push([-6, -40, 3, 1.8, 1.2], [6, -40, 3, 1.8, 1.2], [-2.5, 42, 2.4, 1.6, 1.2], [2.5, 50, 2.4, 1.6, 1.2], [-6, 30, 3, 1.8, 1.2], [6, 30, 3, 1.8, 1.2]); // barricades
  for (const [x, z, w, h, d] of cover) { const m = addBox(w, h, d, x, h / 2, z); m.material = (m.material as any).clone(); const hp = h > 3 ? 260 : 140; destructibles.push({ mesh: m, box: boxes[boxes.length - 1], hp, maxHp: hp, state: 0, baseColor: (m.material as THREE.MeshToonMaterial).color.getHex(), h }); }
  for (let i = 0; i < 40; i++) { const r = 0.3 + Math.random() * 0.7; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), dark); m.position.set((Math.random() - .5) * 60, r * .5, (Math.random() - .5) * 60); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); m.castShadow = true; scene.add(m); }
  // torches on pillars
  for (const [x, z] of [[-14, -12], [14, -12], [-14, 12], [14, 12], [-S + 1.5, 0], [S - 1.5, 0], [0, -S + 1.5], [0, S - 1.5]]) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffaa33 })); fl.position.set(x, 5.2, z); scene.add(fl);
    const pl = new THREE.PointLight(0xff9a3a, 30, 20, 1.6); pl.position.set(x, 5.4, z); scene.add(pl); torches.push(pl);
  }
  // stars + dark-mark-ish green cloud glow (original)
  const sg = new THREE.BufferGeometry(); const sp: number[] = []; for (let i = 0; i < 800; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + .1; sp.push(Math.cos(a) * Math.cos(e) * 300, Math.sin(e) * 300, Math.sin(a) * Math.cos(e) * 300); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false })); scene.add(stars);
  const omen = new THREE.Mesh(new THREE.SphereGeometry(25, 16, 12), new THREE.MeshBasicMaterial({ color: 0x1fff6a, transparent: true, opacity: 0.12, fog: false })); omen.position.set(40, 110, -160); scene.add(omen);
  return { scene, boxes, torches, hemi, omen, destructibles };
}
