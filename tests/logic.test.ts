import { SPELLS, applyHit, canCast, splashFalloff, segmentHitsSphere, Combatant } from '../src/combat/spells';
import { bestAction, pickSpell, scoreActions, AIContext } from '../src/ai/utility';
import { resolveCircle } from '../src/core/collision';
import { loadSettings, saveSettings, DEFAULTS } from '../src/save/settings';
const mk = (o: Partial<Combatant> = {}): Combatant => ({ hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, stamina: 100, maxStamina: 100, shielding: false, stunned: 0, disarmed: 0, invuln: 0, power: 1, defense: 1, ...o });
const ctx = (o: Partial<AIContext> = {}): AIContext => ({ hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, stamina: 100, distToTarget: 12, incomingThreat: 0, threatTime: 9, preferredRange: 12, aggression: .6, caution: .5, spells: ['expelliarmus', 'stupefy', 'confringo', 'bombarda', 'depulso'], cooldowns: {}, enemiesNearTarget: 0, ...o });
describe('combat', () => {
  it('five distinct player spells', () => { const s = ['expelliarmus', 'stupefy', 'confringo', 'bombarda', 'depulso'].map(k => SPELLS[k as never] as any); expect(new Set(s.map(x => x.color)).size).toBe(5); });
  it('damage reduces HP', () => { const t = mk(); const r = applyHit(t, SPELLS.bombarda); expect(r.damage).toBe(26); expect(t.hp).toBe(74); });
  it('Protego blocks 90% and drains energy', () => { const t = mk({ shielding: true }); const r = applyHit(t, SPELLS.bombarda); expect(r.blocked).toBe(true); expect(t.hp).toBeCloseTo(97.4); expect(t.energy).toBeLessThan(100); });
  it('Avada Kedavra is unblockable', () => { const t = mk({ shielding: true }); applyHit(t, SPELLS.avada); expect(t.hp).toBe(60); });
  it('Stupefy stuns, Expelliarmus disarms', () => { const t = mk(); applyHit(t, SPELLS.stupefy); expect(t.stunned).toBeGreaterThan(1); const u = mk(); applyHit(u, SPELLS.expelliarmus); expect(u.disarmed).toBeGreaterThan(1); });
  it('dodge i-frames negate damage', () => { const t = mk({ invuln: 0.2 }); expect(applyHit(t, SPELLS.confringo).damage).toBe(0); expect(t.hp).toBe(100); });
  it('HP never below zero; power & defense scale', () => { const t = mk({ hp: 5 }); applyHit(t, SPELLS.bombarda); expect(t.hp).toBe(0); const a = mk({ defense: 2 }); applyHit(a, SPELLS.bombarda, 1); expect(a.hp).toBe(87); });
  it('canCast checks energy, cooldown, disarm', () => { expect(canCast(mk(), SPELLS.stupefy, 0)).toBe(true); expect(canCast(mk({ energy: 5 }), SPELLS.stupefy, 0)).toBe(false); expect(canCast(mk(), SPELLS.stupefy, 0.2)).toBe(false); expect(canCast(mk({ disarmed: 1 }), SPELLS.stupefy, 0)).toBe(false); });
  it('splash falloff', () => { expect(splashFalloff(0, 4)).toBe(1); expect(splashFalloff(5, 4)).toBe(0); expect(splashFalloff(2, 4)).toBeCloseTo(0.7); });
  it('swept hit detection catches fast projectile tunnelling', () => { expect(segmentHitsSphere([0, 1, -5], [0, 1, 5], [0, 1, 0], 0.5)).toBe(true); expect(segmentHitsSphere([2, 1, -5], [2, 1, 5], [0, 1, 0], 0.5)).toBe(false); });
});
describe('AI utility', () => {
  it('shields or dodges against imminent threat', () => { expect(['shield', 'dodge']).toContain(bestAction(ctx({ incomingThreat: 1, threatTime: 0.3 }))); });
  it('cautious AI prefers shield over dodge', () => { const s = scoreActions(ctx({ incomingThreat: 1, threatTime: 0.3, caution: 1 })); expect(s.shield).toBeGreaterThan(s.dodge); });
  it('approaches when far, retreats when too close', () => { expect(bestAction(ctx({ distToTarget: 40, aggression: 0.2 }))).toBe('approach'); expect(bestAction(ctx({ distToTarget: 2, preferredRange: 16, aggression: 0, caution: 1, hp: 30 }))).toBe('retreat'); });
  it('heals hurt ally when able', () => { expect(bestAction(ctx({ canHeal: true, allyLowHp: true }))).toBe('heal'); });
  it('picks AoE when enemies clustered, avoids AoE point blank', () => { expect(['bombarda', 'confringo']).toContain(pickSpell(ctx({ enemiesNearTarget: 3, distToTarget: 14 }))); expect(pickSpell(ctx({ distToTarget: 2 }))).toBe('depulso'); });
  it('respects cooldown and energy', () => { expect(pickSpell(ctx({ energy: 5 }))).toBeNull(); expect(pickSpell(ctx({ spells: ['bombarda'], cooldowns: { bombarda: 1 } }))).toBeNull(); });
});
describe('collision & save', () => {
  it('pushes circle out of wall', () => { const [x] = resolveCircle(0.2, 0, 0.5, [{ minX: 0, maxX: 2, minZ: -1, maxZ: 1, h: 3 }]); expect(x).toBeLessThanOrEqual(-0.5 + 1e-9); });
  it('settings round-trip', () => { const m = new Map<string, string>(); const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(loadSettings(st)).toEqual(DEFAULTS); saveSettings({ ...DEFAULTS, lang: 'en', volume: 0.2 }, st); expect(loadSettings(st).lang).toBe('en'); });
});
describe('cc immunity', () => { it('cannot be stun-locked', () => { const t = mk(); applyHit(t, SPELLS.stupefy); t.stunned = 0; applyHit(t, SPELLS.stupefy); expect(t.stunned).toBe(0); applyHit(t, SPELLS.expelliarmus); expect(t.disarmed).toBe(0); }); });
