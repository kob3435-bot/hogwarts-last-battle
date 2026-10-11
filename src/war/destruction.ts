import * as THREE from 'three';
import type { World, Destructible } from '../rendering/scene';
import type { Particles } from '../combat/projectiles';
import { damageState } from './perf';
import { toon } from '../rendering/toon';
interface Chunk { m: THREE.Mesh; v: THREE.Vector3; rest: boolean }
interface Emitter { p: THREE.Vector3; t: number; fire: boolean }
/** Destructible walls/pillars/barricades: damage states, debris, fire & smoke. */
export class Destruction {
  chunks: Chunk[] = []; emitters: Emitter[] = []; destroyed = 0; private chunkGeo = new THREE.DodecahedronGeometry(0.35, 0);
  onBreak: (d: Destructible) => void = () => {};
  constructor(public world: World, public particles: Particles) {}
  near(p: THREE.Vector3, pad = 0.8) { return this.world.destructibles.find(d => d.hp > 0 && p.x > d.box.minX - pad && p.x < d.box.maxX + pad && p.z > d.box.minZ - pad && p.z < d.box.maxZ + pad && p.y < d.box.h + pad); }
  damageAt(p: THREE.Vector3, dmg: number, radius = 0) {
    if (radius <= 0) { const d = this.near(p); if (d) this.damage(d, dmg); return; }
    for (const d of this.world.destructibles) { if (d.hp <= 0) continue; const cx = (d.box.minX + d.box.maxX) / 2, cz = (d.box.minZ + d.box.maxZ) / 2; const dist = Math.hypot(cx - p.x, cz - p.z); if (dist < radius + 1.5) this.damage(d, dmg * (1 - 0.5 * Math.min(1, dist / (radius + 1.5)))); }
  }
  damage(d: Destructible, dmg: number) {
    if (d.hp <= 0) return; d.hp -= dmg; const st = damageState(d.hp, d.maxHp); const c = d.mesh.position.clone(); c.y = d.h * 0.6;
    this.particles.emit(c, 0xd9c3a0, 4, 3, 0.5, 0.4, 6, false);
    if (st === d.state) return; d.state = st; const mat = d.mesh.material as THREE.MeshToonMaterial;
    if (st === 1) { mat.color.setHex(d.baseColor).multiplyScalar(0.75); d.mesh.rotation.z = 0.04; this.emitters.push({ p: c.clone(), t: 8, fire: false }); }
    if (st === 2) { mat.color.setHex(d.baseColor).multiplyScalar(0.5); d.mesh.scale.y = 0.72; d.mesh.position.y = d.h * 0.36; d.box.h = d.h * 0.72; d.mesh.rotation.z = 0.09; this.emitters.push({ p: c.clone(), t: 14, fire: true }); }
    if (st === 3) { this.world.scene.remove(d.mesh); const i = this.world.boxes.indexOf(d.box); if (i >= 0) this.world.boxes.splice(i, 1); this.destroyed++;
      for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(this.chunkGeo, toon(d.baseColor, { shared: true })); m.position.copy(c).add(new THREE.Vector3((Math.random() - .5) * 1.5, Math.random() * d.h * 0.5, (Math.random() - .5) * 1.5)); m.scale.setScalar(0.6 + Math.random()); m.castShadow = true; this.world.scene.add(m);
        this.chunks.push({ m, v: new THREE.Vector3((Math.random() - .5) * 8, 4 + Math.random() * 5, (Math.random() - .5) * 8), rest: false }); }
      this.particles.emit(c, 0xc8b8a0, 30, 6, 1.6, 1.2, -0.5, false); this.emitters.push({ p: c.clone().setY(0.5), t: 15, fire: true }); this.onBreak(d); }
  }
  update(dt: number) {
    for (const ch of this.chunks) { if (ch.rest) continue; ch.v.y -= 20 * dt; ch.m.position.addScaledVector(ch.v, dt); ch.m.rotation.x += dt * 5; if (ch.m.position.y < 0.2) { ch.m.position.y = 0.2; ch.v.multiplyScalar(0.4); ch.v.y = Math.abs(ch.v.y) * 0.3; if (ch.v.length() < 0.6) ch.rest = true; } }
    if (this.chunks.length > 160) { const old = this.chunks.splice(0, this.chunks.length - 160); old.forEach(c => this.world.scene.remove(c.m)); }
    for (const e of this.emitters) { e.t -= dt; if (Math.random() < 0.5) { if (e.fire) this.particles.emit(e.p.clone().add(new THREE.Vector3((Math.random() - .5), 0, (Math.random() - .5))), Math.random() < 0.5 ? 0xff7a1a : 0xffc040, 1, 1.2, 0.9, 0.7, -3);
      this.particles.emit(e.p.clone().setY(e.p.y + 1), 0x3a3448, 1, 0.8, 1.8, 2.2, -1.2, false); } }
    this.emitters = this.emitters.filter(e => e.t > 0);
  }
}
