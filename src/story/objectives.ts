/** Story objective definitions + pure evaluation. */
export interface Txt { en: string; th: string }
export interface Spawn { id: string; x: number; z: number; team?: 'hogwarts' | 'death'; count?: number; scripted?: boolean; hpFrac?: number; npc?: string; downed?: boolean }
export interface Line { who: string; en: string; th: string }
export type ObjKind = 'reach' | 'defeat' | 'survive' | 'interact' | 'collect' | 'warScore' | 'protect' | 'bossHp' | 'talk' | 'revive';
export interface Objective {
  kind: ObjKind; label: Txt; x?: number; z?: number; r?: number; target?: string; frac?: number; secs?: number; points?: [number, number][]; hold?: number; score?: number; count?: number;
  spawn?: Spawn[]; barks?: Line[]; timeLimit?: number; optional?: boolean; flag?: string; protect?: string; event?: string; onFail?: string;
}
export interface ObjState { t: number; px: number; pz: number; tagAlive: number; tagTotal: number; interacted: number; collected: boolean; warScore: number; alive: (id: string) => boolean; hpFrac: (id: string) => number; posOf: (id: string) => [number, number] | null; revived: number; partyAlive: boolean }
export type ObjResult = 'active' | 'done' | 'fail';
export function evaluate(o: Objective, s: ObjState): ObjResult {
  if (!s.partyAlive) return 'fail';
  if (o.protect && !s.alive(o.protect)) return 'fail';
  let done = false;
  switch (o.kind) {
    case 'reach': done = Math.hypot(s.px - o.x!, s.pz - o.z!) <= (o.r ?? 3); break;
    case 'talk': { const p = o.target ? s.posOf(o.target) : null; done = !!p && Math.hypot(s.px - p[0], s.pz - p[1]) <= (o.r ?? 3.5); break; }
    case 'defeat': done = s.tagTotal > 0 && s.tagAlive === 0 || (!!o.target && !s.alive(o.target) && s.tagAlive === 0); break;
    case 'survive': done = s.t >= (o.secs ?? 30); break;
    case 'interact': done = s.interacted >= (o.points?.length ?? 1); break;
    case 'collect': done = s.collected; break;
    case 'warScore': done = s.warScore >= (o.score ?? 0) || (!!o.secs && s.t >= o.secs); break;
    case 'protect': done = s.t >= (o.secs ?? 30); break;
    case 'bossHp': done = !s.alive(o.target!) || s.hpFrac(o.target!) <= (o.frac ?? 0.3); break;
    case 'revive': done = s.revived >= (o.count ?? 3); break;
  }
  if (done) return 'done';
  if (o.timeLimit && s.t >= o.timeLimit) return 'fail';
  return 'active';
}
export function pick(t: Txt, lang: 'th' | 'en') { return t[lang]; }
