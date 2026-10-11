import * as THREE from 'three';
import { SpellDef } from './spells';
export interface Projectile { spell: SpellDef; ownerId: number; team: string; pos: THREE.Vector3; prev: THREE.Vector3; vel: THREE.Vector3; life: number; mesh: THREE.Mesh; power: number; alive: boolean; target?: any; hitSet?: Set<number>; }
let glowTex: THREE.Texture | null = null;
export function glow(): THREE.Texture {
  if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (glowTex = new THREE.CanvasTexture(c));
}
/** Pooled additive particles */
export class Particles {
  sprites: THREE.Sprite[] = []; data: { v: THREE.Vector3; life: number; max: number; size: number; g: number }[] = []; i = 0;
  constructor(scene: THREE.Scene, n = 400) {
    for (let k = 0; k < n; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); this.sprites.push(s); this.data.push({ v: new THREE.Vector3(), life: 0, max: 1, size: 1, g: 2 }); }
  }
  emit(p: THREE.Vector3, color: number, n: number, speed: number, size: number, life: number, gravity = 2, blend = true) {
    for (let k = 0; k < n; k++) { const j = this.i++ % this.sprites.length; const s = this.sprites[j], d = this.data[j];
      s.position.copy(p); (s.material as THREE.SpriteMaterial).color.setHex(color); s.visible = true;
      d.v.set(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(speed * (0.3 + Math.random())); d.life = d.max = life * (0.5 + Math.random() * 0.5); d.size = size; d.g = gravity; const mat = s.material as THREE.SpriteMaterial; const want = blend ? THREE.AdditiveBlending : THREE.NormalBlending; if (mat.blending !== want) { mat.blending = want; mat.needsUpdate = true; } }
  }
  update(dt: number) {
    for (let k = 0; k < this.sprites.length; k++) { const d = this.data[k]; if (d.life <= 0) continue; const s = this.sprites[k];
      d.life -= dt; if (d.life <= 0) { s.visible = false; continue; } s.position.addScaledVector(d.v, dt); d.v.multiplyScalar(0.94); d.v.y -= dt * d.g;
      const f = d.life / d.max; s.scale.setScalar(d.size * f); (s.material as THREE.SpriteMaterial).opacity = f; }
  }
}
export function makeBoltMesh(spell: SpellDef): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(spell.radius * 0.7, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(spell.color).multiplyScalar(1.6) }));
  if (spell.id === 'patronus') { m.scale.set(1, 1, 1.8); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: spell.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  halo.scale.setScalar(spell.radius * 6); m.add(halo); return m;
}
