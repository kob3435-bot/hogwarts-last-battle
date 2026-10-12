/** Selectable combat camera modes: FPS, over-the-shoulder TPS, follow, far/cinematic, top-down. */
import * as THREE from 'three';
import { toon } from './toon';
export type CamMode = 'fps' | 'tps' | 'follow' | 'far' | 'top';
export const CAM_MODES: CamMode[] = ['tps', 'fps', 'follow', 'far', 'top'];
export const CAM_LABEL: Record<CamMode, { en: string; th: string }> = { fps: { en: 'First-person', th: 'มุมมองบุคคลที่หนึ่ง' }, tps: { en: 'Over-shoulder', th: 'มุมไหล่ (TPS)' }, follow: { en: 'Follow', th: 'ติดตาม' }, far: { en: 'Cinematic', th: 'ภาพยนตร์ (ไกล)' }, top: { en: 'Top-down', th: 'มุมบน' } };
export interface CamCfg { dist: number; height: number; side: number; fov: number; pitchMin: number; pitchMax: number; lerp: number; mouseLook: boolean }
export const CAM_CFG: Record<CamMode, CamCfg> = {
  fps: { dist: 0, height: 1.72, side: 0, fov: 74, pitchMin: -1.25, pitchMax: 1.25, lerp: 40, mouseLook: true },
  tps: { dist: 3.0, height: 1.85, side: 0.85, fov: 58, pitchMin: -0.9, pitchMax: 1.0, lerp: 22, mouseLook: true },
  follow: { dist: 6, height: 2.0, side: 0.8, fov: 62, pitchMin: -0.5, pitchMax: 1.1, lerp: 14, mouseLook: true },
  far: { dist: 11.5, height: 2.6, side: 0, fov: 50, pitchMin: 0.05, pitchMax: 1.2, lerp: 5, mouseLook: true },
  top: { dist: 20, height: 1, side: 0, fov: 50, pitchMin: 1.05, pitchMax: 1.05, lerp: 10, mouseLook: false },
};
export const nextMode = (m: CamMode) => CAM_MODES[(CAM_MODES.indexOf(m) + 1) % CAM_MODES.length];
/** pitch convention: positive = camera above pivot looking down. invertY flips mouse dy. */
export function applyLook(yaw: number, pitch: number, dx: number, dy: number, sens: number, invertY: boolean, mode: CamMode) {
  const c = CAM_CFG[mode]; if (!c.mouseLook) return [yaw, c.pitchMin] as const;
  yaw -= dx * sens; pitch += (invertY ? -dy : dy) * sens * (mode === 'fps' ? -1 : 1) * (mode === 'fps' ? -1 : 1);
  return [yaw, THREE.MathUtils.clamp(pitch, c.pitchMin, c.pitchMax)] as const;
}
/** First-person view model: sleeve, hand and wand parented to the camera. */
export function buildViewModel(robe: number, skin: number, wandColor: number, glow: number) {
  const g = new THREE.Group(); const arm = new THREE.Group(); g.add(arm);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.42, 14), toon(robe)); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, 0.05); arm.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 16), toon(glow)); cuff.position.z = -0.16; arm.add(cuff);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), toon(skin)); hand.scale.set(0.9, 0.8, 1.15); hand.position.set(0, 0, -0.21); arm.add(hand);
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, 0.36, 8), toon(wandColor)); wand.rotation.x = Math.PI / 2; wand.position.set(0, 0.012, -0.38); arm.add(wand);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.9 })); tip.position.set(0, 0.012, -0.56); arm.add(tip);
  const left = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), toon(skin)); left.position.set(-0.42, -0.32, -0.55); g.add(left); g.scale.setScalar(0.8);
  arm.position.set(0.2, -0.17, -0.18); arm.rotation.set(0.05, 0.08, 0);
  for (const m of [sleeve, cuff, hand, wand, tip, left]) { m.renderOrder = 10; (m.material as THREE.Material).depthTest = false; }
  return { g, arm, tip };
}
