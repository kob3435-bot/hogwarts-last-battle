import * as THREE from 'three';
import { toon, addOutline } from '../rendering/toon';
import { buildRig, Model, Look as RigLook, HairStyle as RigHair } from './rig';
export type HairStyle = RigHair; export type Look = RigLook; export type { Model };
/** Anime rig for humans (see rig.ts); Nagini keeps a serpent body. */
export function buildModel(l: Look): Model { if (l.creature === 'snake') return buildSnake(l); return buildRig(l); }
const buildHumanoid = buildRig;
function buildSnake(l: Look): Model {
  const h = buildHumanoid({ ...l, creature: undefined });
  // hide humanoid parts, build serpent body from a chain of spheres
  h.root.children.forEach(c => { if (c !== h.shield && c !== h.ring && c !== h.aura) c.visible = false; }); h.rig = undefined; h.arm = new THREE.Group(); h.root.add(h.arm); h.tip = new THREE.Object3D(); h.arm.add(h.tip); h.head = new THREE.Group(); h.root.add(h.head); h.body = new THREE.Group(); h.root.add(h.body);
  const mat = toon(l.skin), belly = toon(0xd8d890);
  for (let i = 0; i < 12; i++) { const r = 0.32 - i * 0.018; const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), i % 3 ? mat : belly); seg.position.set(Math.sin(i * 0.7) * 0.5, r, -i * 0.38); h.root.add(seg); addOutline(seg, 0.03); h.meshes.push(seg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), mat); head.scale.set(1, 0.7, 1.5); head.position.set(0, 0.75, 0.35); h.root.add(head); addOutline(head, 0.03); h.meshes.push(head);
  for (const sx of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: l.eye ?? 0xffd000 })); e.position.set(sx, 0.86, 0.55); h.root.add(e); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 8), mat); neck.position.set(0, 0.45, 0.15); neck.rotation.x = 0.5; h.root.add(neck); h.meshes.push(neck);
  h.arm.position.set(0, 0.75, 0.3); h.tip.position.set(0, 0, 0.5); return h;
}
