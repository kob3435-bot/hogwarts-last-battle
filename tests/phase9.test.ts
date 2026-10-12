import { describe, it, expect } from 'vitest';
import { CAM_MODES, CAM_CFG, nextMode } from '../src/rendering/camera';
import { crowdLayers, unitPalette } from '../src/war/crowd';
describe('camera modes', () => {
  it('cycles through all five modes', () => { let m = CAM_MODES[0]; const seen = new Set([m]); for (let i = 0; i < 5; i++) { m = nextMode(m); seen.add(m); } expect(seen.size).toBe(5); expect(nextMode('top')).toBe('tps'); });
  it('has sane pitch clamps and distances', () => { for (const m of CAM_MODES) { const c = CAM_CFG[m]; expect(c.pitchMin).toBeLessThanOrEqual(c.pitchMax); } expect(CAM_CFG.fps.dist).toBe(0); expect(CAM_CFG.far.dist).toBeGreaterThan(CAM_CFG.follow.dist); expect(CAM_CFG.top.mouseLook).toBe(false); });
});
describe('anime crowd models', () => {
  it('every unit type builds coloured, multi-layer geometry', () => { for (const t of ['student', 'order', 'deathEater', 'giant', 'acromantula', 'dementor', 'statue'] as const) { const L = crowdLayers(t); expect(L.length).toBeGreaterThanOrEqual(2); for (const l of L) { expect(l.geo.getAttribute('color')).toBeTruthy(); expect(l.geo.getAttribute('position').count).toBeGreaterThan(30); } } });
  it('students get house trim colours, distinct per house', () => { const c = [0xb3152a, 0x2453c7, 0xe0b020, 0x1f8a4a].map(b => unitPalette('student', b).c2); expect(new Set(c).size).toBe(4); });
});
