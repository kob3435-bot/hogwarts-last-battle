import { describe, it, expect } from 'vitest';
import { FULL_ROSTER, META, isLegend, NEW_CHARS } from '../src/character/fullroster';
import { SKILLS } from '../src/combat/skills';
import { synergyBonus, activeSynergies, moraleReaction } from '../src/combat/synergy';
import { WHAT_IFS } from '../src/modes/whatif';
import { charById } from '../src/character/roster';
import { newProgress, award, levelOf, points, rankUp, multipliers, battleXP, xpForLevel, respec, MAX_RANK } from '../src/progress/progress';
import { chooseMood, MOODS } from '../src/audio/music';
import { sample, battleStats, Replay } from '../src/replay/recorder';
import { fantasize, fantasizeDeep } from '../src/ui/fantasy';
import { EXPLORE_AREAS } from '../src/rendering/areas2';
describe('full roster', () => {
  it('has 40+ characters across 4 factions with kits (2 signatures + 1 ultimate) and OVR', () => { expect(FULL_ROSTER.length).toBeGreaterThanOrEqual(40);
    for (const f of ['hogwarts', 'order', 'death', 'legend']) expect(FULL_ROSTER.some(c => META[c.id]?.faction === f)).toBe(true);
    for (const c of FULL_ROSTER) { const k = SKILLS[c.id]; expect(k, c.id).toBeTruthy(); expect(k.sigs.length).toBeGreaterThanOrEqual(2); expect(k.ult.ultimate).toBe(true); expect(c.ovr).toBeGreaterThan(50); expect(c.ovr).toBeLessThanOrEqual(99); } });
  it('ids are unique and resolvable, looks are distinct', () => { const ids = FULL_ROSTER.map(c => c.id); expect(new Set(ids).size).toBe(ids.length); for (const id of ids) expect(charById(id).id).toBe(id);
    const looks = new Set(NEW_CHARS.map(c => `${c.look.hair}-${c.look.robe}-${c.look.hairStyle}`)); expect(looks.size).toBe(NEW_CHARS.length); });
  it('legends are flagged and higher OVR on average', () => { const L = FULL_ROSTER.filter(c => isLegend(c.id)); expect(L.length).toBeGreaterThanOrEqual(6); expect(L.reduce((a, c) => a + c.ovr, 0) / L.length).toBeGreaterThan(88); });
});
describe('synergy & morale', () => {
  it('Golden Trio needs 2+ members nearby', () => { expect(synergyBonus('harry', []).power).toBe(1); expect(synergyBonus('harry', ['ron']).power).toBeGreaterThan(1.1); expect(activeSynergies('fred', ['george']).map(s => s.id)).toContain('twins'); });
  it('Malfoy family boosts defense, bonuses are capped', () => { expect(synergyBonus('draco', ['lucius', 'narcissa']).defense).toBeGreaterThan(1.1); expect(synergyBonus('ron', ['harry', 'hermione', 'ginny', 'fred', 'george', 'molly', 'neville', 'luna']).power).toBeLessThanOrEqual(1.35); });
  it('morale reactions', () => { expect(moraleReaction('ginny', 'molly', 'hogwarts')?.power).toBeGreaterThan(1.3); expect(moraleReaction('fred', 'george', 'hogwarts')?.kind).toBe('grief'); expect(moraleReaction('voldemort', 'bellatrix', 'death')?.power).toBeLessThan(1); expect(moraleReaction('seamus', 'draco', 'death')).toBeNull(); });
});
describe('what if', () => {
  it('has 9 scenarios, uses legends, all ids valid', () => { expect(WHAT_IFS.length).toBe(9); expect(WHAT_IFS.some(w => [...w.battle.hogwarts, ...w.battle.death].some(isLegend))).toBe(true);
    for (const w of WHAT_IFS) { [...w.battle.hogwarts, ...w.battle.death].forEach(id => expect(() => charById(id)).not.toThrow()); expect([...w.battle.hogwarts, ...w.battle.death]).toContain(w.player); if (w.battle.army > 0) expect(w.area).toBe('courtyard'); } });
});
describe('progression', () => {
  it('levels, points, ranks, multipliers', () => { const p = newProgress(); expect(levelOf(0)).toBe(1); award(p, 'harry', xpForLevel(4)); expect(levelOf(p.chars.harry.xp)).toBe(4); expect(points(p.chars.harry)).toBe(3);
    expect(rankUp(p, 'harry', 'power')).toBe(true); expect(multipliers(p, 'harry').power).toBeCloseTo(1.03); for (let i = 0; i < 9; i++) rankUp(p, 'harry', 'power'); expect(p.chars.harry.ranks.power).toBeLessThanOrEqual(MAX_RANK); expect(points(p.chars.harry)).toBe(0);
    respec(p, 'harry'); expect(points(p.chars.harry)).toBe(3); expect(battleXP({ dmg: 400, kos: 2, healed: 0, won: true, secs: 120 })).toBeGreaterThan(battleXP({ dmg: 400, kos: 2, healed: 0, won: false, secs: 120 })); });
});
describe('music', () => { it('chooses moods from intensity', () => { expect(chooseMood({ state: 'won', boss: true, enemiesNear: 3, hpFrac: 1 })).toBe('victory'); expect(chooseMood({ state: 'lost', boss: false, enemiesNear: 0, hpFrac: 0 })).toBe('tragedy');
  expect(chooseMood({ state: 'playing', boss: true, enemiesNear: 0, hpFrac: 1 })).toBe('boss'); expect(chooseMood({ state: 'playing', boss: false, enemiesNear: 3, hpFrac: 1 })).toBe('battle'); expect(chooseMood({ state: 'playing', boss: false, enemiesNear: 1, hpFrac: 1 })).toBe('tension');
  expect(chooseMood({ state: 'playing', boss: false, enemiesNear: 0, hpFrac: 1 })).toBe('exploration'); expect(Object.keys(MOODS).length).toBe(6); }); });
describe('replay', () => {
  const rep: Replay = { area: 'courtyard', mode: 'duel', events: [], roster: [{ id: 'harry', team: 0 }], duration: 1, frames: [{ t: 0, ents: [{ id: 'harry', x: 0, z: 0, yaw: 0, hp: 100, team: 0 }], units: [], score: 0 }, { t: 1, ents: [{ id: 'harry', x: 10, z: 0, yaw: 0, hp: 50, team: 0 }], units: [], score: 0 }] };
  it('interpolates frames', () => { const s = sample(rep, 0.5)!; expect(s.k).toBeCloseTo(0.5); expect(s.a.t).toBe(0); expect(sample(rep, 5)!.a.t).toBe(1); });
  it('MVP ranks by damage + KOs + healing', () => { const e = (id: string, d: number, k: number, h: number) => ({ def: { id, name: id, team: 'hogwarts' }, dmgDealt: d, dmgTaken: 0, kos: k, healed: h, alive: true });
    const st = battleStats([e('a', 100, 0, 0), e('b', 50, 2, 0), e('c', 0, 0, 300), e('de1', 999, 9, 0)]); expect(st.mvp!.id).toBe('c'); expect(st.rows.find(r => r.id === 'de1')).toBeUndefined(); });
});
describe('fantasy rename', () => { it('rewrites franchise names in en/th and deep objects', () => { expect(fantasize('Harry Potter vs Lord Voldemort at Hogwarts')).toBe('Aren Vale vs The Hollow King at Highspire'); expect(fantasize('แฮร์รี่ พอตเตอร์')).toBe('อาเรน เวล');
  expect(fantasize('Ronald')).toBe('Ronald'); const o = { id: 'harry', name: 'Harry Potter', list: [{ en: 'Hermione' }] }; fantasizeDeep(o); expect(o.id).toBe('harry'); expect(o.name).toBe('Aren Vale'); expect(o.list[0].en).toBe('Mira'); }); });
describe('areas', () => { it('7 explorable areas', () => expect(EXPLORE_AREAS.length).toBe(7)); });
describe('roster basic spells', () => { it('no free (cost 0) spell is a basic attack', async () => { const { SPELLS } = await import('../src/combat/spells'); for (const c of FULL_ROSTER) for (const s of c.spells) expect(SPELLS[s].cost, c.id + ':' + s).toBeGreaterThan(0); }); });
