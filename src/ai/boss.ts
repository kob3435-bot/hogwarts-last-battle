/** Multi-phase Voldemort boss definition. */
export type Phase = 1 | 2 | 3 | 4;
export function bossPhase(hpRatio: number): Phase { return hpRatio > 0.75 ? 1 : hpRatio > 0.5 ? 2 : hpRatio > 0.25 ? 3 : 4; }
export interface PhaseDef { name: string; nameTh: string; speed: number; reaction: number; teleport: number; avadaBias: number; summon: number; env: 'night' | 'fire' | 'storm' | 'eclipse'; hazard: number; }
export const PHASES: Record<Phase, PhaseDef> = {
  1: { name: 'The Dark Lord Watches', nameTh: 'จอมมารเฝ้ามอง', speed: 1, reaction: 1, teleport: 0, avadaBias: 0, summon: 0, env: 'night', hazard: 0 },
  2: { name: 'Fiendfyre Ring', nameTh: 'วงแหวนไฟปีศาจ', speed: 1.05, reaction: 0.9, teleport: 0.05, avadaBias: 0.5, summon: 2, env: 'fire', hazard: 1 },
  3: { name: 'Storm of the Dark Mark', nameTh: 'พายุตรามาร', speed: 1.15, reaction: 0.8, teleport: 0.2, avadaBias: 1, summon: 0, env: 'storm', hazard: 2 },
  4: { name: 'Desperate Fury', nameTh: 'ความคลั่งครั้งสุดท้าย', speed: 1.3, reaction: 0.6, teleport: 0.3, avadaBias: 2, summon: 2, env: 'eclipse', hazard: 3 },
};
