/** Dynamic missions with real effects on the battle (pure state machine; effects are applied by War). */
export type MissionKind = 'rescue' | 'giant' | 'hold' | 'dementors' | 'protect';
export interface Mission { id: number; kind: MissionKind; zone: number; time: number; limit: number; progress: number; goal: number; status: 'active' | 'success' | 'fail'; targetName?: string }
export const MISSION_TEXT: Record<MissionKind, { en: string; th: string; reward: number; penalty: number }> = {
  rescue: { en: 'Rescue wounded students', th: 'ช่วยนักเรียนที่บาดเจ็บ', reward: 8, penalty: 6 },
  giant: { en: 'Bring down the rampaging Giant', th: 'โค่นยักษ์ที่อาละวาด', reward: 10, penalty: 8 },
  hold: { en: 'Hold the zone', th: 'ยึดพื้นที่ไว้', reward: 10, penalty: 5 },
  dementors: { en: 'Repel the Dementor swarm', th: 'ขับไล่ฝูงผู้คุมวิญญาณ', reward: 8, penalty: 8 },
  protect: { en: 'Protect the hero', th: 'ปกป้องฮีโร่', reward: 6, penalty: 10 },
};
let NEXT = 1;
export function createMission(kind: MissionKind, zone: number, goal: number, limit: number, targetName?: string): Mission { return { id: NEXT++, kind, zone, time: 0, limit, progress: 0, goal, status: 'active', targetName }; }
/** Advance one mission. obs: rescued count / giant dead / zone control / dementors left / protectee alive */
export function stepMission(m: Mission, dt: number, obs: { rescued?: number; giantDead?: boolean; control?: number; remaining?: number; alive?: boolean }): Mission {
  if (m.status !== 'active') return m; m.time += dt;
  switch (m.kind) {
    case 'rescue': m.progress = obs.rescued ?? 0; if (m.progress >= m.goal) m.status = 'success'; break;
    case 'giant': if (obs.giantDead) { m.progress = 1; m.status = 'success'; } break;
    case 'hold': if ((obs.control ?? 0) > 0.4) m.progress += dt; if (m.progress >= m.goal) m.status = 'success'; break;
    case 'dementors': m.progress = m.goal - (obs.remaining ?? m.goal); if ((obs.remaining ?? 1) <= 0) m.status = 'success'; break;
    case 'protect': if (obs.alive === false) m.status = 'fail'; else m.progress = m.time; if (m.time >= m.limit && obs.alive !== false) m.status = 'success'; break;
  }
  if (m.status === 'active' && m.time >= m.limit) m.status = 'fail';
  return m;
}
