import { updateControl, scoreRate, clampScore, warWinner } from '../src/war/zones';
import { lodInterval, shouldUpdate, FpsScaler, Grid, damageState } from '../src/war/perf';
import { clampToMap, waypoint, zoneAt, ZONES } from '../src/war/map';
import { createMission, stepMission } from '../src/war/missions';
import { UNITS, pickType, dmgVs, MIX } from '../src/war/units';
import { DIFF } from '../src/war/difficulty';
describe('zones & progress', () => {
  it('presence moves control toward dominant side and clamps', () => { let c = 0; for (let i = 0; i < 200; i++) c = updateControl(c, 10, 2, 0.5); expect(c).toBe(1); for (let i = 0; i < 400; i++) c = updateControl(c, 0, 8, 0.5); expect(c).toBe(-1); expect(updateControl(0.3, 0, 0, 1)).toBe(0.3); });
  it('only firmly held zones score; score clamps and decides winner', () => { expect(scoreRate([0.3, -0.2], [1, 1])).toBe(0); expect(scoreRate([1, 1], [1, 1])).toBeGreaterThan(0); expect(clampScore(150)).toBe(100); expect(warWinner(100)).toBe(1); expect(warWinner(-100)).toBe(-1); expect(warWinner(20)).toBe(0); });
});
describe('performance systems', () => {
  it('AI LOD: far units update less often', () => { expect(lodInterval(10)).toBe(1); expect(lodInterval(60)).toBe(2); expect(lodInterval(150)).toBe(4); let n = 0; for (let f = 0; f < 40; f++) if (shouldUpdate(3, f, 4)) n++; expect(n).toBe(10); });
  it('FPS scaler lowers cap when slow, raises when fast, within 100..300', () => { const s = new FpsScaler(100, 300, 180); for (let i = 0; i < 60; i++) s.tick(1 / 20); expect(s.cap).toBeLessThan(180); for (let i = 0; i < 2000; i++) s.tick(1 / 60); expect(s.cap).toBe(300); for (let i = 0; i < 3000; i++) s.tick(1 / 10); expect(s.cap).toBe(100); });
  it('spatial grid returns neighbours', () => { const g = new Grid(6); g.insert(1, 0, 0); g.insert(2, 5, 5); g.insert(3, 50, 50); const r = g.query(1, 1, 6); expect(r).toContain(1); expect(r).toContain(2); expect(r).not.toContain(3); });
  it('destructible damage states', () => { expect([100, 60, 20, 0].map(h => damageState(h, 100))).toEqual([0, 1, 2, 3]); });
});
describe('map', () => {
  it('clamps to courtyard, hall corridor and bridge deck', () => { expect(clampToMap(50, 0)).toEqual([33, 0]); expect(clampToMap(20, -50)).toEqual([11, -50]); expect(clampToMap(10, 60)).toEqual([4, 60]); });
  it('routes through the gates', () => { const [x, z] = waypoint(-20, 10, 0, 62); expect(x).toBe(0); expect(z).toBeGreaterThan(25); expect(waypoint(0, -50, 0, -40)).toEqual([0, -40]); });
  it('5 zones incl. Great Hall and Bridge', () => { expect(ZONES.map(z => z.id)).toEqual(expect.arrayContaining(['hall', 'bridge', 'center'])); expect(zoneAt(0, 62)).toBe(4); });
});
describe('missions', () => {
  it('rescue succeeds when enough revived', () => { const m = createMission('rescue', 1, 3, 45); stepMission(m, 1, { rescued: 2 }); expect(m.status).toBe('active'); stepMission(m, 1, { rescued: 3 }); expect(m.status).toBe('success'); });
  it('hold accumulates only while controlled; fails on timeout', () => { const m = createMission('hold', 2, 5, 10); for (let i = 0; i < 4; i++) stepMission(m, 1, { control: 0.9 }); for (let i = 0; i < 5; i++) stepMission(m, 1, { control: -0.5 }); expect(m.progress).toBe(4); stepMission(m, 1, { control: -1 }); expect(m.status).toBe('fail'); });
  it('protect fails if hero dies, giant succeeds when dead', () => { const p = createMission('protect', 0, 40, 40, 'harry'); stepMission(p, 1, { alive: false }); expect(p.status).toBe('fail'); const g = createMission('giant', 4, 1, 60); stepMission(g, 1, { giantDead: true }); expect(g.status).toBe('success'); });
});
describe('units', () => {
  it('7 unit types with distinct roles; mix weights sum to 1', () => { expect(Object.keys(UNITS)).toHaveLength(7); for (const t of ['hogwarts', 'death'] as const) expect(MIX[t].reduce((a, [, w]) => a + w, 0)).toBeCloseTo(1); expect(UNITS.giant.smash).toBe(true); expect(UNITS.order.medic).toBe(true); expect(UNITS.student.canDown).toBe(true); });
  it('pickType follows weights; Patronus is super effective on dementors', () => { expect(pickType('death', 0)).toBe('deathEater'); expect(pickType('death', 0.99)).toBe('giant'); expect(dmgVs('dementor', 10, 'patronus')).toBe(30); expect(dmgVs('dementor', 10, 'stupefy')).toBe(5); });
  it('Hard difficulty toned down', () => { expect(DIFF.hard).toBeLessThanOrEqual(1.15); expect(DIFF.easy).toBeLessThan(DIFF.normal); });
});
