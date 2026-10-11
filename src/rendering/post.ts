import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
/** Bloom post-processing so spells glow (anime "sakuga" feel). Half-res bloom for performance. */
export function makeComposer(r: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera, low: boolean) {
  const c = new EffectComposer(r); c.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), low ? 0.55 : 0.7, 0.45, 0.85); c.addPass(bloom); c.addPass(new OutputPass());
  return { composer: c, bloom, resize(w: number, h: number) { c.setSize(w, h); bloom.resolution.set(w / 2, h / 2); } };
}
