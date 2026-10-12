import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { threatAt, countNear, lead, los, AGGRO } from '../src/ai/autobrain';
const box = { minX: -1, maxX: 1, minZ: -1, maxZ: 1, h: 4 };
describe('tactical AUTO brain', () => {
  it('threat grows with nearby melee crowds and hazards', () => { const npcs = [{ x: 1, z: 0, melee: true, dmg: 8 }, { x: 0, z: 1, melee: true, dmg: 8 }];
    expect(threatAt({ x: 0, z: 0 }, [], npcs, [], [])).toBeGreaterThan(threatAt({ x: 20, z: 20 }, [], npcs, [], [])); expect(threatAt({ x: 0, z: 0 }, [], [], [{ x: 0, z: 0, r: 2 }], [])).toBeGreaterThan(5); });
  it('counts clusters', () => { expect(countNear({ x: 0, z: 0 }, [], [{ x: 1, z: 1 }, { x: -1, z: 0 }, { x: 9, z: 9 }], 3)).toBe(2); });
  it('leads a moving target', () => { const p = lead(new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 0, 0), new THREE.Vector3(0, 0, 5), 40); expect(p.z).toBeGreaterThan(2); });
  it('line of sight is blocked by boxes', () => { expect(los([box], { x: -5, z: 0 }, { x: 5, z: 0 })).toBe(false); expect(los([box], { x: -5, z: 5 }, { x: 5, z: 5 })).toBe(true); });
  it('aggression presets are ordered', () => { expect(AGGRO.defensive.lowHp).toBeGreaterThan(AGGRO.aggressive.lowHp); expect(AGGRO.aggressive.push).toBeGreaterThan(AGGRO.defensive.push); });
});
