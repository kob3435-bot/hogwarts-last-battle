import { newCombo, registerHit, tickCombo, comboMult } from '../src/combat/combo';
import { newClash, stepClash, marker, timingQuality, pushStrength, aiPress, CLASH_TIME } from '../src/combat/clash';
import { bossPhase, PHASES } from '../src/ai/boss';
import { SKILLS, ultGain, ULT_MAX } from '../src/combat/skills';
import { SPELLS, applyHit } from '../src/combat/spells';
import { PLAYABLE } from '../src/character/roster';
describe('combo', () => {
  it('chaining different spells raises multiplier; repeating same spell does not', () => { const c = newCombo(); registerHit(c, 'stupefy'); registerHit(c, 'stupefy'); expect(c.count).toBe(1); registerHit(c, 'confringo'); expect(c.count).toBe(2); expect(comboMult(6)).toBe(1.5); expect(comboMult(20)).toBe(1.5); });
  it('combo expires after the window', () => { const c = newCombo(); registerHit(c, 'stupefy'); tickCombo(c, 5); expect(c.count).toBe(0); expect(registerHit(c, 'confringo').bonus).toBeNull(); });
  it('named bonus combos', () => { const c = newCombo(); registerHit(c, 'expelliarmus'); expect(registerHit(c, 'stupefy').bonus?.name).toBe('Disarm Lock'); });
});
describe('spell clash', () => {
  it('timing marker sweeps and centre is perfect', () => { expect(marker(0)).toBe(0); expect(marker(0.5 / 0.9 * 0.5 * 2)).toBeCloseTo(1); expect(timingQuality(0.5)).toBe(1); expect(timingQuality(0)).toBe(0); });
  it('outcome depends on mastery/stamina/timing, not OVR', () => { expect(pushStrength({ mastery: 90, stamina: 100 }, 1)).toBeGreaterThan(pushStrength({ mastery: 90, stamina: 10 }, 1)); expect(pushStrength({ mastery: 90, stamina: 100 }, 1)).toBeGreaterThan(pushStrength({ mastery: 90, stamina: 100 }, 0)); });
  it('perfect-timing presser beats a stronger but sloppy opponent', () => { const s = newClash({ mastery: 80, stamina: 100 }, { mastery: 95, stamina: 100 });
    for (let i = 0; i < 600 && !s.done; i++) stepClash(s, 1 / 60, i % 6 === 0, i % 6 === 3, 1, 0.1); expect(s.done).toBe(1); });
  it('no presses → resolves by timeout', () => { const s = newClash({ mastery: 50, stamina: 50 }, { mastery: 50, stamina: 50 }); for (let i = 0; i < 1000 && !s.done; i++) stepClash(s, 1 / 30, false, false); expect(s.done).not.toBe(0); expect(s.t).toBeGreaterThanOrEqual(CLASH_TIME); });
  it('pressing drains stamina', () => { const s = newClash({ mastery: 50, stamina: 50 }, { mastery: 50, stamina: 50 }); stepClash(s, 0, true, false, 1); expect(s.a.stamina).toBeLessThan(50); });
  it('AI press quality scales with mastery', () => { const r = () => 0.5; const [p1, qLow] = aiPress(40, 1, r); const [p2, qHigh] = aiPress(95, 1, r); expect(p1 && p2).toBe(true); expect(qHigh).toBeGreaterThan(qLow); });
});
describe('Voldemort phases', () => {
  it('4 phases by HP', () => { expect([1, 0.8, 0.6, 0.3, 0.1].map(bossPhase)).toEqual([1, 1, 2, 3, 4]); expect(Object.keys(PHASES)).toHaveLength(4); });
  it('each phase escalates and changes environment', () => { const envs = new Set([1, 2, 3, 4].map(p => PHASES[p as 1].env)); expect(envs.size).toBe(4); expect(PHASES[4].speed).toBeGreaterThan(PHASES[1].speed); expect(PHASES[4].reaction).toBeLessThan(PHASES[1].reaction); });
});
describe('skills & roster', () => {
  it('every playable character has 3 signatures + ultimate, all unique', () => { const names = new Set<string>(); for (const c of PLAYABLE) { const k = SKILLS[c.id]; expect(k.sigs.length).toBe(3); expect(k.ult.ultimate).toBe(true); [...k.sigs, k.ult].forEach(s => names.add(s.name)); } expect(names.size).toBe(PLAYABLE.length * 4); });
  it('includes McGonagall, Neville, Luna, Bellatrix with distinct stats', () => { for (const id of ['mcgonagall', 'neville', 'luna', 'bellatrix']) expect(PLAYABLE.some(c => c.id === id)).toBe(true); expect(new Set(PLAYABLE.map(c => `${c.hp}-${c.power}-${c.speed}-${c.mastery}`)).size).toBe(PLAYABLE.length); });
  it('ult gauge gain from dealing and taking damage', () => { expect(ultGain(10, 0)).toBeGreaterThan(ultGain(0, 10)); expect(ULT_MAX).toBe(100); });
  it('team barrier (Protego Maxima) blocks without draining energy', () => { const t: any = { hp: 100, maxHp: 100, energy: 50, maxEnergy: 100, stamina: 100, maxStamina: 100, shielding: false, barrier: 2, stunned: 0, disarmed: 0, invuln: 0, power: 1, defense: 1 }; const r = applyHit(t, SPELLS.bombarda); expect(r.blocked).toBe(true); expect(t.energy).toBe(50); expect(t.hp).toBeGreaterThan(95); });
  it('homing/pierce spells defined', () => { expect(SPELLS.patronus.pierce).toBe(true); expect(SPELLS.avis.homing).toBeGreaterThan(0); });
});
