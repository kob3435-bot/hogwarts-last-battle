import * as THREE from 'three';
let grad: THREE.DataTexture | null = null;
/** 3-band cel-shading ramp */
export function gradientMap() {
  if (grad) return grad; const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  grad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true; return grad;
}
const cache = new Map<string, THREE.MeshToonMaterial>();
export function toon(color: number, opts: { emissive?: number; shared?: boolean; map?: THREE.Texture } = {}) {
  const key = `${color}-${opts.emissive ?? 0}`;
  if (opts.shared && cache.has(key)) return cache.get(key)!;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), emissive: opts.emissive ?? 0, map: opts.map ?? null });
  if (opts.shared) cache.set(key, m); return m;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0a0812, side: THREE.BackSide });
/** Inverted-hull outline: a slightly inflated back-face black copy of each mesh */
export function addOutline(mesh: THREE.Mesh, thickness = 0.04) {
  const g = mesh.geometry; g.computeBoundingSphere(); const r = g.boundingSphere!.radius || 1;
  const o = new THREE.Mesh(g, outlineMat); o.scale.setScalar(1 + thickness / r * 1.0); o.userData.outline = true; o.raycast = () => {}; mesh.add(o); return o;
}
