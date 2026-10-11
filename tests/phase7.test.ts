import { describe, it, expect } from 'vitest';
import { FULL_ROSTER } from '../src/character/fullroster';
import { buildModel } from '../src/character/model';
import { animateRig } from '../src/character/rig';
import { IDENTITY } from '../src/character/identity';
import { UNIQUE } from '../src/character/uniquekits';
import { SKILLS } from '../src/combat/skills';
import { NEW_CHARS } from '../src/character/fullroster';
const pose = (o: any = {}) => ({ dt: 1 / 30, speed: 0, maxSpeed: 9, castT: 9, ultT: 9, hitT: 9, dodge: 0, stunned: false, down: false, dead: false, victory: false, clashing: false, shielding: false, camDist: 5, ...o });
describe('anime rig', () => {
  it('every roster character builds a jointed rig with face', () => { for (const c of FULL_ROSTER) { const m = buildModel(c.look); expect(m.rig, c.id).toBeTruthy(); const r = m.rig!; expect(r.knL.parent).toBe(r.thL); expect(r.elR.parent).toBe(r.shR); expect(r.neck.parent).toBe(r.torso); expect(r.skirt.length).toBeGreaterThan(4); } });
  it('walk cycle moves legs in opposition; cast raises wand arm; blink closes eyes; hurt changes expression', () => { const m = buildModel(FULL_ROSTER[0].look); const r = m.rig!;
    for (let i = 0; i < 12; i++) animateRig(m, pose({ speed: 8 })); expect(Math.sign(r.thL.rotation.x)).not.toBe(Math.sign(r.thR.rotation.x));
    for (let i = 0; i < 20; i++) animateRig(m, pose({ castT: 0.05 })); expect(r.shR.rotation.x).toBeLessThan(-1); expect(r.st.expr).toBe('cast');
    animateRig(m, pose({ hitT: 0.05 })); expect(r.st.expr).toBe('hurt'); r.st.blink = -0.01; for (let i = 0; i < 3; i++) animateRig(m, pose({ dt: 0.02 })); expect(r.eyes[0].scale.y).toBeLessThan(0.6);
    for (let i = 0; i < 20; i++) animateRig(m, pose({ victory: true })); expect(r.shR.rotation.x).toBeLessThan(-2); expect(r.st.expr).toBe('happy'); });
  it('LOD hides face details at distance', () => { const m = buildModel(FULL_ROSTER[1].look); animateRig(m, pose({ camDist: 80 })); expect(m.rig!.detail.every(d => !d.visible)).toBe(true); });
});
describe('identity', () => {
  it('all 41 characters have identity entries with outfit, spell colour, idle/cast style and bilingual callouts', () => { for (const c of FULL_ROSTER) { const i = IDENTITY[c.id]; expect(i, c.id).toBeTruthy(); expect(c.look.spellColor).toBeTypeOf('number'); expect(c.look.lines?.ult[1].length).toBeGreaterThan(0); expect(c.look.outfit).toBeTruthy(); } });
  it('looks are unique (hair style+colour+outfit+eye)', () => { const keys = FULL_ROSTER.map(c => [c.look.hairStyle, c.look.hair, c.look.outfit, c.look.eye, c.look.robe].join()); expect(new Set(keys).size).toBe(keys.length); });
  it('signature accessories', () => { const has = (id: string, a: string) => FULL_ROSTER.find(c => c.id === id)!.look.acc!.includes(a as any);
    expect(has('harry', 'glasses') && has('harry', 'scar')).toBe(true); expect(has('luna', 'radish') && has('luna', 'spectrespecs')).toBe(true); expect(has('hermione', 'bag')).toBe(true); expect(has('neville', 'sword')).toBe(true);
    expect(has('dumbledore', 'beard') && has('dumbledore', 'halfmoon')).toBe(true); expect(has('voldemort', 'snakeface')).toBe(true); expect(has('hagrid', 'bigbeard')).toBe(true); expect(has('snape', 'cloak')).toBe(true); });
});
describe('unique kits', () => {
  it('29 template characters each have a distinct signature-1 + ultimate mechanic set', () => { expect(Object.keys(UNIQUE).length).toBe(29); const sigs = new Set<string>();
    for (const c of NEW_CHARS) { const k = SKILLS[c.id]; const key = JSON.stringify([k.sigs[0].effects, k.ult.effects]); expect(sigs.has(key), c.id).toBe(false); sigs.add(key); }
    const kinds = new Set(Object.values(UNIQUE).flatMap(u => [...u.s1, ...u.ult].map(e => e.kind))); for (const k of ['zone', 'chain', 'meteor', 'pull', 'mark', 'drain', 'cleanse', 'haste', 'silence', 'blink', 'execute']) expect(kinds.has(k as any), k).toBe(true); });
});
