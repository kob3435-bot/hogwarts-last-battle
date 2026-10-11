/** Battle replay: records key events + unit positions at fixed intervals; compact, serialisable. */
import type { Game } from '../game';
export interface EntSnap { id: string; x: number; z: number; yaw: number; hp: number; team: 0 | 1 }
export interface Frame { t: number; ents: EntSnap[]; units: number[] /* packed [x,z,team,type]... */; score: number }
export interface ReplayEvent { t: number; kind: string; text: string; color: string }
export interface Replay { area: string; mode: string; frames: Frame[]; events: ReplayEvent[]; roster: { id: string; team: 0 | 1 }[]; duration: number; result?: string }
const UT: Record<string, number> = { student: 0, order: 1, statue: 2, deathEater: 3, giant: 4, acromantula: 5, dementor: 6 };
export class Recorder {
  data: Replay; acc = 0; constructor(area: string, mode: string, public interval = 0.2, public maxFrames = 9000) { this.data = { area, mode, frames: [], events: [], roster: [], duration: 0 }; }
  event(t: number, kind: string, text: string, color: string) { this.data.events.push({ t, kind, text, color }); }
  tick(g: Game, dt: number) { this.acc += dt; if (this.acc < this.interval) return; this.acc = 0; if (this.data.frames.length >= this.maxFrames) return;
    const ents: EntSnap[] = g.entities.map(e => ({ id: e.def.id, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), yaw: +e.yaw.toFixed(2), hp: Math.max(0, Math.round(e.hp / e.maxHp * 100)), team: e.def.team === 'hogwarts' ? 0 : 1 }));
    for (const e of ents) if (!this.data.roster.some(r => r.id === e.id && r.team === e.team)) this.data.roster.push({ id: e.id, team: e.team });
    const units: number[] = []; if (g.war) for (const u of g.war.units) if (u.active && u.state !== 'dead') units.push(Math.round(u.x * 10) / 10, Math.round(u.z * 10) / 10, u.def.team === 'hogwarts' ? 0 : 1, UT[u.def.type] ?? 0, u.state === 'downed' ? 1 : 0);
    this.data.frames.push({ t: +g.time.toFixed(2), ents, units, score: g.war ? Math.round(g.war.score) : 0 }); this.data.duration = g.time; }
}
/** Interpolated sample of a replay at time t. */
export function sample(r: Replay, t: number): { a: Frame; b: Frame; k: number } | null {
  const f = r.frames; if (!f.length) return null; if (t <= f[0].t) return { a: f[0], b: f[0], k: 0 }; if (t >= f[f.length - 1].t) return { a: f[f.length - 1], b: f[f.length - 1], k: 0 };
  let lo = 0, hi = f.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (f[m].t <= t) lo = m; else hi = m; }
  return { a: f[lo], b: f[hi], k: (t - f[lo].t) / Math.max(1e-6, f[hi].t - f[lo].t) };
}
export interface PlayerStat { id: string; name: string; team: string; dmg: number; taken: number; kos: number; healed: number; score: number; alive: boolean }
/** Post-battle stats & MVP: damage + 60 per KO + healing*0.8 */
export function battleStats(ents: { def: { id: string; name: string; team: string }; dmgDealt: number; dmgTaken: number; kos: number; healed: number; alive: boolean }[]) {
  const rows: PlayerStat[] = ents.filter(e => !e.def.id.startsWith('de')).map(e => ({ id: e.def.id, name: e.def.name, team: e.def.team, dmg: Math.round(e.dmgDealt), taken: Math.round(e.dmgTaken), kos: e.kos, healed: Math.round(e.healed), alive: e.alive, score: Math.round(e.dmgDealt + e.kos * 60 + e.healed * 0.8) }));
  rows.sort((a, b) => b.score - a.score); return { rows, mvp: rows[0] ?? null };
}
