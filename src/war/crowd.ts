/** Phase 9 anime crowd models: multi-layer instanced meshes with baked vertex colours.
 *  Each layer is one InstancedMesh whose instanceColor multiplies its vertex colours, so per-unit tints
 *  (house trim, skin tone, hair colour, armour stone) stay at ~4-6 draw calls per unit type. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { UnitType } from './units';
export type Tint = 'c1' | 'c2' | 'skin' | 'hair' | 'fixed';
export interface Layer { geo: THREE.BufferGeometry; tint: Tint; transparent?: boolean; emissive?: number; rim?: number; noOutline?: boolean }
type T = [number, number, number];
/** primitive -> non-indexed geometry with vertex colour, transformed */
function P(g: THREE.BufferGeometry, color: number, pos: T = [0, 0, 0], rot: T = [0, 0, 0], scl: T = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
  const o = (g.index ? g.toNonIndexed() : g); for (const n of Object.keys(o.attributes)) if (n !== 'position' && n !== 'normal') o.deleteAttribute(n); o.applyMatrix4(m);
  const c = new THREE.Color(color); const a = new Float32Array(o.getAttribute('position').count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } o.setAttribute('color', new THREE.BufferAttribute(a, 3)); return o;
}
const M = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts)!;
const sph = (r: number, w = 16, h = 12, ...x: number[]) => new THREE.SphereGeometry(r, w, h, ...x);
const cyl = (a: number, b: number, h: number, s = 14, open = false) => new THREE.CylinderGeometry(a, b, h, s, 1, open);
const lathe = (pts: [number, number][], s = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), s);
const W = 0xffffff;
/** big anime eyes (white, coloured iris, pupil, two highlights) + mouth + blush, facing +z on a head of radius r centred at (0,y,0) */
function face(y: number, r: number, iris: number, opts: { angry?: boolean; glow?: boolean; scale?: number } = {}) {
  const k = opts.scale ?? 1; const out: THREE.BufferGeometry[] = []; const z = r * 0.93;
  for (const sx of [-1, 1]) { const x = sx * r * 0.38;
    out.push(P(new THREE.CircleGeometry(r * 0.24 * k, 18), opts.glow ? iris : 0xffffff, [x, y - r * 0.02, z], [0, sx * 0.38, 0], [0.8, 1.15, 1]));
    if (!opts.glow) { out.push(P(new THREE.CircleGeometry(r * 0.17 * k, 16), iris, [x * 0.98, y - r * 0.05, z + 0.004], [0, sx * 0.38, 0], [0.85, 1.2, 1]));
      out.push(P(new THREE.CircleGeometry(r * 0.08 * k, 12), 0x120c14, [x * 0.97, y - r * 0.06, z + 0.007], [0, sx * 0.38, 0]));
      out.push(P(new THREE.CircleGeometry(r * 0.06 * k, 10), 0xffffff, [x * 0.9 + r * 0.05, y + r * 0.04, z + 0.01], [0, sx * 0.38, 0]));
      out.push(P(new THREE.CircleGeometry(r * 0.03 * k, 8), 0xffffff, [x * 1.02 - r * 0.04, y - r * 0.12, z + 0.01], [0, sx * 0.38, 0]));
      out.push(P(new THREE.PlaneGeometry(r * 0.46 * k, r * 0.05), 0x1a1018, [x, y + r * 0.21, z + 0.004], [0, sx * 0.38, opts.angry ? -sx * 0.4 : sx * 0.12])); // lash line
      out.push(P(new THREE.CircleGeometry(r * 0.12, 10), 0xff8a9a, [sx * r * 0.55, y - r * 0.32, r * 0.8], [0, sx * 0.6, 0], [1.4, 0.6, 1])); } // blush
  }
  out.push(P(new THREE.PlaneGeometry(r * 0.16, r * 0.04), opts.angry ? 0x401018 : 0x8a3040, [0, y - r * 0.45, z - 0.01]));
  return M(out);
}
function student(): Layer[] {
  const robe = M([P(lathe([[0.001, 0.12], [0.4, 0.14], [0.34, 0.5], [0.22, 0.92], [0.21, 1.2], [0.15, 1.36], [0.001, 1.38]]), 0x23202e),
    P(new THREE.PlaneGeometry(0.16, 0.42), 0xf2f2f6, [0, 1.12, 0.205]), // shirt
    ...[-1, 1].flatMap(sx => [P(cyl(0.07, 0.13, 0.5), 0x23202e, [sx * 0.27, 1.05, 0.03], [0.25, 0, sx * 0.22])]),
    ...[-1, 1].flatMap(sx => [P(cyl(0.06, 0.055, 0.14), 0x2b2b38, [sx * 0.1, 0.07, 0]), P(sph(0.07, 10, 8), 0x24180f, [sx * 0.1, 0.03, 0.05], [0, 0, 0], [1, 0.6, 1.5])])]);
  const trim = M([P(new THREE.TorusGeometry(0.15, 0.05, 10, 22), W, [0, 1.36, 0], [Math.PI / 2, 0, 0], [1, 1, 0.7]), P(new THREE.BoxGeometry(0.09, 0.45, 0.03), W, [0.1, 1.1, 0.22], [0, 0, -0.08]),
    P(new THREE.BoxGeometry(0.05, 0.3, 0.02), W, [0, 1.16, 0.215]), P(new THREE.TorusGeometry(0.395, 0.022, 6, 28), W, [0, 0.15, 0], [Math.PI / 2, 0, 0]),
    ...[-1, 1].map(sx => P(new THREE.TorusGeometry(0.12, 0.02, 6, 16), W, [sx * 0.33, 0.82, 0.09], [Math.PI / 2 + 0.25, 0, sx * 0.22])), P(new THREE.CircleGeometry(0.05, 10), W, [-0.12, 1.2, 0.212])]);
  const skin = M([P(sph(0.23, 20, 16), W, [0, 1.6, 0], [0, 0, 0], [1, 1.02, 0.98]), P(cyl(0.05, 0.06, 0.12), W, [0, 1.42, 0]), ...[-1, 1].map(sx => P(sph(0.055, 10, 8), W, [sx * 0.37, 0.78, 0.12])), ...[-1, 1].map(sx => P(sph(0.04, 8, 6), W, [sx * 0.23, 1.6, 0]))]);
  const hair = M([P(sph(0.245, 20, 14, 0, Math.PI * 2, 0, 1.75), W, [0, 1.63, -0.02]),
    ...[-2, -1, 0, 1, 2].map(i => P(new THREE.ConeGeometry(0.06, 0.18, 8), W, [i * 0.08, 1.74 - Math.abs(i) * 0.02, 0.19], [Math.PI - 0.6, 0, i * 0.2])),
    ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.4 + i / 8 * 1.2); return P(new THREE.ConeGeometry(0.06, 0.24, 8), W, [Math.sin(a) * 0.21, 1.5, Math.cos(a) * 0.21], [Math.PI + Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]); }),
    P(new THREE.ConeGeometry(0.025, 0.16, 6), W, [0.03, 1.9, 0], [-0.5, 0, -0.5])]);
  return [{ geo: robe, tint: 'c1', rim: 0xbfd0ff }, { geo: trim, tint: 'c2', noOutline: true, rim: 0xffffff }, { geo: skin, tint: 'skin', rim: 0xffe8d8 }, { geo: face(1.59, 0.23, 0x5a3a2a), tint: 'fixed', noOutline: true }, { geo: hair, tint: 'hair', rim: 0xffffff }];
}
function order(): Layer[] {
  const [, trim0, skin, , hair] = student();
  const coat = M([P(lathe([[0.001, 0.12], [0.36, 0.3], [0.3, 0.62], [0.22, 0.95], [0.23, 1.22], [0.16, 1.37], [0.001, 1.38]]), W),
    ...[-1, 1].map(sx => P(cyl(0.075, 0.1, 0.5), W, [sx * 0.27, 1.05, 0.03], [0.25, 0, sx * 0.2])),
    ...[-1, 1].flatMap(sx => [P(cyl(0.07, 0.06, 0.36), 0x3a3448, [sx * 0.11, 0.18, 0]), P(sph(0.075, 10, 8), 0x3a2416, [sx * 0.11, 0.04, 0.05], [0, 0, 0], [1, 0.6, 1.5])])]);
  const trim = M([P(new THREE.TorusGeometry(0.235, 0.035, 8, 26), W, [0, 0.9, 0], [Math.PI / 2, 0, 0]), P(new THREE.BoxGeometry(0.1, 0.08, 0.04), 0xffd27a, [0, 0.9, 0.24]),
    P(new THREE.TorusGeometry(0.17, 0.05, 10, 22), W, [0, 1.36, 0], [Math.PI / 2, 0, 0], [1, 1, 0.7]), P(new THREE.ConeGeometry(0.06, 0.12, 4), 0xff9a40, [-0.15, 1.2, 0.22], [Math.PI, 0, 0]), // phoenix pin
    P(new THREE.BoxGeometry(0.06, 0.08, 0.05), W, [0, 1.42, -0.18])]);
  void trim0; return [{ geo: coat, tint: 'c1', rim: 0xffe0b0 }, { geo: trim, tint: 'c2', noOutline: true }, skin, { geo: face(1.59, 0.23, 0x2a5a7a), tint: 'fixed', noOutline: true }, hair];
}
function deathEater(): Layer[] {
  const robe = M([P(lathe([[0.001, 0.05], [0.46, 0.06], [0.38, 0.45], [0.24, 0.95], [0.24, 1.25], [0.17, 1.4], [0.001, 1.42]], 20), W),
    ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return P(new THREE.ConeGeometry(0.07, 0.16, 5), W, [Math.sin(a) * 0.43, 0.06, Math.cos(a) * 0.43], [Math.PI, 0, 0]); }), // tattered hem
    P(sph(0.29, 18, 14, 0, Math.PI * 2, 0, 2.2), W, [0, 1.62, -0.03], [-0.25, 0, 0], [1, 1.12, 1]), P(new THREE.ConeGeometry(0.12, 0.3, 10), W, [0, 1.84, -0.2], [-1.2, 0, 0]), // pointed hood
    ...[-1, 1].map(sx => P(cyl(0.07, 0.14, 0.55), W, [sx * 0.29, 1.03, 0.05], [0.35, 0, sx * 0.22])),
    P(new THREE.TorusGeometry(0.24, 0.025, 6, 26), 0x6a2a8a, [0, 0.95, 0], [Math.PI / 2, 0, 0]), P(new THREE.PlaneGeometry(0.06, 0.6), 0x4a1a5a, [0, 0.6, 0.33], [-0.15, 0, 0])]);
  const mask = M([P(sph(0.2, 18, 14, 0, Math.PI * 2, 0, 2.1), W, [0, 1.58, 0.05], [Math.PI / 2 - 0.2, 0, 0], [1, 1, 1.15]),
    ...[-1, 1].flatMap(sx => [P(new THREE.CircleGeometry(0.05, 12), 0x0a0610, [sx * 0.075, 1.62, 0.235], [0, sx * 0.3, 0], [1.3, 0.7, 1]), P(new THREE.CircleGeometry(0.02, 8), 0xff3050, [sx * 0.075, 1.62, 0.238], [0, sx * 0.3, 0]),
      P(new THREE.TorusGeometry(0.07, 0.008, 4, 16, Math.PI), 0x8a8aa0, [sx * 0.08, 1.56, 0.23], [0, 0, sx > 0 ? Math.PI : 0]), P(new THREE.TorusGeometry(0.05, 0.006, 4, 12, Math.PI * 1.4), 0x8a8aa0, [sx * 0.06, 1.48, 0.225], [0, 0, 0.6 * sx])]),
    P(new THREE.ConeGeometry(0.02, 0.1, 6), 0xb0b0c4, [0, 1.56, 0.24], [Math.PI / 2, 0, 0])]);
  const hands = M([...[-1, 1].map(sx => P(sph(0.05, 10, 8), 0xe8dcd0, [sx * 0.4, 0.78, 0.18])), P(cyl(0.012, 0.016, 0.34, 6), 0x2a1a14, [0.42, 0.85, 0.32], [1.1, 0, 0])]);
  return [{ geo: robe, tint: 'c1', rim: 0x9a6aff }, { geo: mask, tint: 'c2', rim: 0xffffff }, { geo: hands, tint: 'fixed', noOutline: true }];
}
function giant(): Layer[] {
  const body = M([P(sph(0.42, 18, 14), W, [0, 1.0, 0], [0, 0, 0], [1, 1.1, 0.85]), P(lathe([[0.001, 0.55], [0.44, 0.58], [0.47, 0.82], [0.4, 0.95], [0.001, 0.96]]), 0x5a3a24), // loincloth/belly band
    ...[-1, 1].flatMap(sx => [P(cyl(0.12, 0.1, 0.55), 0x9a7454, [sx * 0.2, 0.28, 0]), P(sph(0.13, 10, 8), 0x3a2a1a, [sx * 0.2, 0.04, 0.05], [0, 0, 0], [1, 0.6, 1.4])]),
    ...[-1, 1].flatMap(sx => [P(sph(0.16, 12, 10), 0x6a4a30, [sx * 0.45, 1.3, 0]), P(cyl(0.13, 0.1, 0.7), 0x9a7454, [sx * 0.52, 0.95, 0.05], [0.2, 0, sx * 0.25]), P(sph(0.12, 10, 8), 0x9a7454, [sx * 0.6, 0.62, 0.12])]),
    ...Array.from({ length: 7 }, (_, i) => P(sph(0.09, 8, 6), 0x7a5a3a, [Math.cos(i / 6 * Math.PI) * 0.4, 1.32, Math.sin(i / 6 * Math.PI) * -0.18]))]); // fur mantle
  const head = M([P(sph(0.27, 18, 14), W, [0, 1.6, 0.06]), P(sph(0.12, 10, 8), W, [0, 1.55, 0.3], [0, 0, 0], [1.2, 0.8, 0.7]), ...[-1, 1].map(sx => P(sph(0.07, 8, 6), W, [sx * 0.27, 1.6, 0.04]))]);
  const fx = M([face(1.66, 0.25, 0x7a2a10, { angry: true, scale: 0.6 }).translate(0, 0, 0.07), P(new THREE.BoxGeometry(0.36, 0.06, 0.08), 0x2a1a10, [0, 1.75, 0.3], [0.2, 0, 0])]);
  const hairClub = M([P(sph(0.29, 14, 10, 0, Math.PI * 2, 0, 1.4), 0x3a2414, [0, 1.65, 0.0]), ...Array.from({ length: 8 }, (_, i) => P(new THREE.ConeGeometry(0.07, 0.25, 6), 0x3a2414, [Math.sin(i) * 0.2, 1.85, Math.cos(i) * 0.15 - 0.05], [Math.cos(i) * 0.6, 0, Math.sin(i) * 0.6])),
    P(cyl(0.06, 0.14, 1.1, 10), 0x6a4426, [0.68, 0.75, 0.35], [1.2, 0, 0.2]), P(sph(0.16, 10, 8), 0x5a3a20, [0.7, 0.98, 0.85])]);
  return [{ geo: body, tint: 'c1', rim: 0xffd0a0 }, { geo: head, tint: 'skin' }, { geo: fx, tint: 'fixed', noOutline: true }, { geo: hairClub, tint: 'fixed' }];
}
function spider(): Layer[] {
  const body = M([P(sph(0.5, 20, 14), W, [0, 0.55, -0.45], [0, 0, 0], [1, 0.78, 1.25]), P(sph(0.3, 16, 12), W, [0, 0.5, 0.18], [0, 0, 0], [1, 0.8, 1.05]),
    ...[0, 1, 2].map(i => P(new THREE.TorusGeometry(0.4 - i * 0.08, 0.035, 6, 24), 0xc06030, [0, 0.62 + i * 0.12, -0.45 - i * 0.05], [Math.PI / 2 + 0.3, 0, 0], [1, 1.25, 1]))]); // warning stripes
  const legs: THREE.BufferGeometry[] = []; for (let k = 0; k < 8; k++) { const side = k < 4 ? 1 : -1; const zz = ((k % 4) - 1.5) * 0.18 + 0.1; const a = ((k % 4) - 1.5) * 0.4;
    const kx = side * 0.6, ky = 0.85, kz = zz + Math.sin(a) * 0.3; legs.push(P(cyl(0.035, 0.05, 0.62, 8), W, [side * 0.32, 0.7, zz + Math.sin(a) * 0.15], [a * 0.5, 0, side * -1.0]));
    legs.push(P(sph(0.055, 8, 6), 0xc06030, [kx, ky, kz])); legs.push(P(cyl(0.012, 0.035, 0.95, 8), W, [kx + side * 0.18, 0.42, kz + Math.sin(a) * 0.12], [a * 0.3, 0, side * 0.35])); }
  const eyes = M([...[[-0.08, 0.6], [0.08, 0.6], [-0.15, 0.55], [0.15, 0.55], [-0.05, 0.68], [0.05, 0.68]].map(([x, y]) => P(sph(0.04, 10, 8), 0xff2a3a, [x, y, 0.45])),
    ...[-1, 1].map(sx => P(new THREE.ConeGeometry(0.035, 0.18, 8), 0xe8e0c8, [sx * 0.07, 0.36, 0.45], [Math.PI - 0.4, 0, 0]))]);
  return [{ geo: body, tint: 'c1', rim: 0xff9a60 }, { geo: M(legs), tint: 'c1' }, { geo: eyes, tint: 'fixed', emissive: 0x801018, noOutline: true }];
}
function dementor(): Layer[] {
  const cloak = M([P(lathe([[0.001, -0.1], [0.38, 0.0], [0.5, 0.3], [0.36, 0.9], [0.28, 1.45], [0.24, 1.8], [0.001, 2.0]], 20), W),
    ...Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return P(new THREE.ConeGeometry(0.08, 0.5 + (i % 3) * 0.15, 5), W, [Math.sin(a) * 0.4, -0.15 - (i % 3) * 0.07, Math.cos(a) * 0.4], [Math.PI + Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]); }),
    ...[-1, 1].map(sx => P(cyl(0.06, 0.16, 0.8, 10), W, [sx * 0.4, 1.15, 0.2], [1.25, 0, sx * 0.15]))]);
  const hands = M([...[-1, 1].flatMap(sx => Array.from({ length: 4 }, (_, f) => P(cyl(0.008, 0.014, 0.22, 5), 0x8a8a94, [sx * (0.5 + f * 0.03), 1.0, 0.58 + f * 0.02], [1.2 + f * 0.1, 0, sx * 0.2]))),
    P(sph(0.2, 14, 10), 0x020104, [0, 1.72, 0.12], [0, 0, 0], [1, 1.1, 0.5])]);
  return [{ geo: cloak, tint: 'c1', transparent: true, rim: 0x8ab0ff }, { geo: hands, tint: 'fixed', noOutline: true }];
}
function statue(): Layer[] {
  const body = M([P(cyl(0.3, 0.26, 0.55, 12), W, [0, 1.12, 0]), P(sph(0.31, 14, 10, 0, Math.PI * 2, 0, 1.6), W, [0, 1.32, 0], [0, 0, 0], [1.15, 0.7, 0.9]), // cuirass
    ...[-1, 1].flatMap(sx => [P(sph(0.16, 12, 10), W, [sx * 0.36, 1.35, 0], [0, 0, 0], [1.1, 0.8, 1]), P(cyl(0.08, 0.07, 0.6), W, [sx * 0.38, 0.98, 0.04], [0.15, 0, sx * 0.1]), P(sph(0.075, 8, 6), W, [sx * 0.4, 0.66, 0.12])]),
    P(lathe([[0.27, 0.85], [0.34, 0.55], [0.001, 0.54]], 10), W), ...[-1, 1].flatMap(sx => [P(cyl(0.09, 0.08, 0.5), W, [sx * 0.13, 0.28, 0]), P(new THREE.BoxGeometry(0.15, 0.08, 0.25), W, [sx * 0.13, 0.04, 0.05])])]);
  const helm = M([P(sph(0.2, 16, 12), W, [0, 1.62, 0], [0, 0, 0], [1, 1.1, 1]), P(new THREE.BoxGeometry(0.26, 0.03, 0.05), 0x302c28, [0, 1.62, 0.19]), P(new THREE.TorusGeometry(0.15, 0.02, 6, 20, Math.PI), W, [0, 1.78, 0], [0, Math.PI / 2, 0], [1, 1.3, 2.6])]);
  const gear = M([P(cyl(0.3, 0.3, 0.06, 18), W, [-0.5, 1.0, 0.18], [Math.PI / 2, 0, 0.2], [1, 1, 1.4]), P(new THREE.CircleGeometry(0.1, 6), 0xd8c070, [-0.5, 1.0, 0.25], [0, 0, 0]),
    P(new THREE.BoxGeometry(0.07, 0.85, 0.02), 0xdcdce4, [0.42, 1.0, 0.45], [1.1, 0, 0]), P(new THREE.BoxGeometry(0.22, 0.04, 0.05), 0xd8c070, [0.42, 0.72, 0.28], [1.1, 0, 0])]);
  return [{ geo: body, tint: 'c1', rim: 0xfff0c8 }, { geo: helm, tint: 'c1', rim: 0xfff0c8 }, { geo: gear, tint: 'c2' }];
}
export function crowdLayers(t: UnitType): Layer[] {
  return t === 'student' ? student() : t === 'order' ? order() : t === 'deathEater' ? deathEater() : t === 'giant' ? giant() : t === 'acromantula' ? spider() : t === 'dementor' ? dementor() : statue();
}
/** per-unit palette: c1 / c2 / skin / hair */
const HOUSE = [0xc0202e, 0x2a5ad8, 0xe8b820, 0x24a052]; const SKIN = [0xffe0c8, 0xf6cfa8, 0xe0aa80, 0xb67a52, 0x8a5a3a]; const HAIR = [0x2a1a12, 0x5a3418, 0xa8642a, 0xe8c070, 0x1a1a24, 0xc04a20, 0x6a4a8a];
export function unitPalette(t: UnitType, base: number, r: () => number = Math.random) {
  const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
  switch (t) {
    case 'student': { const h = Math.max(0, [0xb3152a, 0x2453c7, 0xe0b020, 0x1f8a4a].indexOf(base)); return { c1: 0xffffff, c2: HOUSE[h], skin: pick(SKIN), hair: pick(HAIR), house: h }; }
    case 'order': return { c1: pick([0x6a4ab8, 0x2a7a8a, 0x8a4a2a, 0x3a5a3a, 0x7a2a3a]), c2: pick([0xffb040, 0xff7a3a, 0xf0d070]), skin: pick(SKIN), hair: pick(HAIR) };
    case 'deathEater': return { c1: pick([0x2a2634, 0x24202c, 0x30243a]), c2: pick([0xd8dce8, 0xc8ccd8, 0xe0d8c0]), skin: 0xffffff, hair: 0xffffff };
    case 'giant': return { c1: pick([0xb08a68, 0x9a7a5a, 0xa8806a]), c2: 0xffffff, skin: pick([0xc09070, 0xa88068, 0xb89878]), hair: 0xffffff };
    case 'acromantula': return { c1: pick([0x3a2c34, 0x2c2228, 0x40303a]), c2: 0xffffff, skin: 0xffffff, hair: 0xffffff };
    case 'dementor': return { c1: pick([0x2a2636, 0x1e1a2a]), c2: 0xffffff, skin: 0xffffff, hair: 0xffffff };
    default: return { c1: pick([0xd6d0c2, 0xc8c2b4, 0xbab4a8]), c2: pick([0xc8c2b4, 0xb0a890]), skin: 0xffffff, hair: 0xffffff };
  }
}
