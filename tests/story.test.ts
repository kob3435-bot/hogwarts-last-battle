import { describe, it, expect } from 'vitest';
import { newCampaign, completeChapter, setCheckpoint, saveToSlot, loadFromSlot, memoryKV, loadCampaign, saveCampaign, migrate, isUnlocked } from '../src/story/save';
import { evaluate, Objective, ObjState } from '../src/story/objectives';
import { CHAPTERS_DATA, chapterFor } from '../src/story/chapters';
import { STORY_CHARS, charById } from '../src/character/roster';
const st = (o: Partial<ObjState> = {}): ObjState => ({ t: 0, px: 0, pz: 0, tagAlive: 1, tagTotal: 1, interacted: 0, collected: false, warScore: 0, alive: () => true, hpFrac: () => 1, posOf: () => null, revived: 0, partyAlive: true, ...o });
describe('campaign save', () => {
  it('unlocks next chapter and sets checkpoint on completion', () => { const s = completeChapter(newCampaign(), 1, { a: true }, 100); expect(s.unlocked).toBe(2); expect(s.completed).toEqual([1]); expect(s.checkpoint?.chapter).toBe(2); expect(s.best[1]).toBe(100); expect(isUnlocked(s, 3)).toBe(false); });
  it('final chapter clears checkpoint and caps unlock', () => { const s = completeChapter(newCampaign(), 12, {}); expect(s.unlocked).toBe(12); expect(s.checkpoint).toBeNull(); });
  it('checkpoints merge flags', () => { const s = newCampaign(); s.flags.x = true; setCheckpoint(s, 3, 1, { y: 2 }); expect(s.checkpoint).toMatchObject({ chapter: 3, objective: 1, flags: { x: true, y: 2 } }); });
  it('manual slots snapshot and restore', () => { let s = completeChapter(newCampaign(), 1, { fredSaved: true }); saveToSlot(s, 1); s = completeChapter(s, 2, {}); expect(s.unlocked).toBe(3); s = loadFromSlot(s, 1); expect(s.unlocked).toBe(2); expect(s.slots[1]).not.toBeNull(); expect(s.flags.fredSaved).toBe(true); });
  it('persists through a KV store (refresh)', async () => { const kv = memoryKV(); const s = completeChapter(newCampaign(), 4, { wardsComplete: true }); await saveCampaign(s, kv); const r = await loadCampaign(kv); expect(r.unlocked).toBe(5); expect(r.flags.wardsComplete).toBe(true); });
  it('migrate rejects garbage', () => { expect(migrate({ version: 9 }).unlocked).toBe(1); expect(migrate(null).slots.length).toBe(3); });
});
describe('objective evaluation', () => {
  it('reach', () => { const o: Objective = { kind: 'reach', label: { en: '', th: '' }, x: 10, z: 0, r: 2 }; expect(evaluate(o, st())).toBe('active'); expect(evaluate(o, st({ px: 9 }))).toBe('done'); });
  it('defeat needs all tagged dead', () => { const o: Objective = { kind: 'defeat', label: { en: '', th: '' } }; expect(evaluate(o, st({ tagAlive: 2, tagTotal: 3 }))).toBe('active'); expect(evaluate(o, st({ tagAlive: 0, tagTotal: 3 }))).toBe('done'); });
  it('time limit fails, protect fails when target dies', () => { const o: Objective = { kind: 'defeat', label: { en: '', th: '' }, timeLimit: 45, protect: 'fred' }; expect(evaluate(o, st({ t: 46 }))).toBe('fail'); expect(evaluate(o, st({ alive: id => id !== 'fred' }))).toBe('fail'); expect(evaluate(o, st({ t: 10, tagAlive: 0 }))).toBe('done'); });
  it('party wipe fails', () => { expect(evaluate({ kind: 'survive', secs: 5, label: { en: '', th: '' } }, st({ t: 9, partyAlive: false }))).toBe('fail'); });
  it('survive, interact, collect, warScore, bossHp, revive, talk', () => { const L = { en: '', th: '' };
    expect(evaluate({ kind: 'survive', secs: 30, label: L }, st({ t: 31 }))).toBe('done'); expect(evaluate({ kind: 'interact', points: [[0, 0], [1, 1]], label: L }, st({ interacted: 2 }))).toBe('done');
    expect(evaluate({ kind: 'collect', label: L }, st({ collected: true }))).toBe('done'); expect(evaluate({ kind: 'warScore', score: 10, label: L }, st({ warScore: 9 }))).toBe('active');
    expect(evaluate({ kind: 'bossHp', target: 'b', frac: 0.35, label: L }, st({ hpFrac: () => 0.3 }))).toBe('done'); expect(evaluate({ kind: 'revive', count: 3, label: L }, st({ revived: 3 }))).toBe('done');
    expect(evaluate({ kind: 'talk', target: 'm', label: L }, st({ posOf: () => [1, 1] }))).toBe('done'); });
});
describe('chapters', () => {
  it('has all 12 chapters with objectives, bilingual text and cutscenes', () => { expect(CHAPTERS_DATA.length).toBe(12);
    for (const c of CHAPTERS_DATA) { expect(c.title.th && c.title.en).toBeTruthy(); expect(c.objectives.length).toBeGreaterThan(0); expect(c.intro.shots.length).toBeGreaterThan(0); expect(c.outro({}).shots.length).toBeGreaterThan(0);
      for (const sh of [...c.intro.shots, ...c.outro({}).shots]) for (const l of sh.lines ?? []) { expect(l.en.length).toBeGreaterThan(0); expect(l.th.length).toBeGreaterThan(0); }
      for (const o of c.objectives) { expect(o.label.th).toBeTruthy(); for (const sp of o.spawn ?? []) if (!sp.npc) expect(() => charById(sp.id)).not.toThrow(); }
      expect(() => charById(c.player)).not.toThrow(); c.allies.forEach(a => expect(() => charById(a)).not.toThrow()); } });
  it('every required boss appears', () => { const ids = CHAPTERS_DATA.flatMap(c => c.objectives.flatMap(o => (o.spawn ?? []).map(s => s.id)));
    for (const b of ['bellatrix', 'dolohov', 'greyback', 'nagini', 'giantcmdr', 'voldemort']) expect(ids).toContain(b); expect(STORY_CHARS.length).toBeGreaterThanOrEqual(5); });
  it('saving Fred changes later roster and dialogue', () => { const a = chapterFor(11, { fredSaved: true }), b = chapterFor(11, { fredSaved: false });
    expect(a.allies).toContain('fred'); expect(b.allies).not.toContain('fred'); expect(a.intro.shots[0].lines!.length).toBeGreaterThan(b.intro.shots[0].lines!.length);
    expect(chapterFor(12, { fredSaved: true }).allies).toContain('fred'); const end = (f: any) => chapterFor(12, f).outro(f).shots.slice(-1)[0].lines!.map(l => l.who);
    expect(end({ fredSaved: true })).toContain('Fred'); expect(end({ fredSaved: false })).not.toContain('Fred');
    expect(CHAPTERS_DATA[10].allies).not.toContain('fred'); /* variant must not mutate base data */ });
  it('chapter 8 Fred mission is optional, timed and protect-gated', () => { const o = CHAPTERS_DATA[7].objectives[0]; expect(o).toMatchObject({ optional: true, flag: 'fredSaved', protect: 'fred', onFail: 'explodeFred' }); expect(o.timeLimit).toBeGreaterThan(0); });
});
