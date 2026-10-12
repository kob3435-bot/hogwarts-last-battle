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
/** Anime rim light: fresnel-based bright edge tinted per character / unit type. Mutates the material. */
export function addRim(m: THREE.Material, color = 0xffffff, strength = 0.45) {
  const mm = m as any; if (mm.userData?.rim) { mm.userData.rim.c.value.setHex(color); mm.userData.rim.s.value = strength; return m; }
  const u = { c: { value: new THREE.Color(color) }, s: { value: strength } }; mm.userData = { ...(mm.userData || {}), rim: u };
  m.onBeforeCompile = sh => { sh.uniforms.rimC = u.c; sh.uniforms.rimS = u.s;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 rimC; uniform float rimS;\nvoid main() {')
      .replace('#include <opaque_fragment>', 'float rimF = 1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0); outgoingLight += rimC * smoothstep(0.62, 0.86, rimF) * rimS;\n#include <opaque_fragment>'); };
  m.customProgramCacheKey = () => 'rim'; m.needsUpdate = true; return m;
}
/** Inflate a geometry along its (smoothed) normals — inverted-hull outline for instanced crowds */
export function inflate(g: THREE.BufferGeometry, t: number) {
  const o = g.clone(); const p = o.getAttribute('position') as THREE.BufferAttribute; const n = o.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t); p.needsUpdate = true; return o;
}
