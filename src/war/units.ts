export type UnitType = 'student' | 'order' | 'statue' | 'deathEater' | 'giant' | 'acromantula' | 'dementor';
export interface UnitDef { type: UnitType; team: 'hogwarts' | 'death'; hp: number; dmg: number; range: number; speed: number; rate: number; melee: boolean; scale: number; radius: number; canDown: boolean; medic?: boolean; drain?: boolean; smash?: boolean; color: number[]; name: string; nameTh: string }
export const UNITS: Record<UnitType, UnitDef> = {
  student: { type: 'student', team: 'hogwarts', hp: 40, dmg: 6, range: 14, speed: 4.5, rate: 1.3, melee: false, scale: 0.85, radius: 0.4, canDown: true, color: [0xb3152a, 0x2453c7, 0xe0b020, 0x1f8a4a], name: 'Student', nameTh: 'นักเรียน' },
  order: { type: 'order', team: 'hogwarts', hp: 60, dmg: 9, range: 16, speed: 4.8, rate: 1.1, melee: false, scale: 1, radius: 0.45, canDown: true, medic: true, color: [0x7a4ac8, 0x3a8a9a, 0xa05a2a], name: 'Order of the Phoenix', nameTh: 'ภาคีนกฟีนิกซ์' },
  statue: { type: 'statue', team: 'hogwarts', hp: 170, dmg: 14, range: 2.2, speed: 3.2, rate: 1.4, melee: true, scale: 1.3, radius: 0.6, canDown: false, color: [0xb8b4a8], name: 'Stone Guardian', nameTh: 'อัศวินหิน' },
  deathEater: { type: 'deathEater', team: 'death', hp: 40, dmg: 6, range: 15, speed: 4.6, rate: 1.2, melee: false, scale: 1, radius: 0.45, canDown: false, color: [0x1c1c26, 0x2a1630], name: 'Death Eater', nameTh: 'ผู้เสพความตาย' },
  giant: { type: 'giant', team: 'death', hp: 650, dmg: 22, range: 4.5, speed: 2.6, rate: 2.4, melee: true, scale: 3.6, radius: 1.6, canDown: false, smash: true, color: [0x8a6a4a], name: 'Giant', nameTh: 'ยักษ์' },
  acromantula: { type: 'acromantula', team: 'death', hp: 60, dmg: 8, range: 2.2, speed: 6.5, rate: 0.9, melee: true, scale: 1.4, radius: 0.8, canDown: false, color: [0x1a1418], name: 'Acromantula', nameTh: 'แมงมุมยักษ์' },
  dementor: { type: 'dementor', team: 'death', hp: 80, dmg: 3, range: 4, speed: 3.6, rate: 0.8, melee: true, scale: 1.5, radius: 0.6, canDown: false, drain: true, color: [0x15121e], name: 'Dementor', nameTh: 'ผู้คุมวิญญาณ' },
};
export const MIX: Record<'hogwarts' | 'death', [UnitType, number][]> = {
  hogwarts: [['student', 0.58], ['order', 0.27], ['statue', 0.15]],
  death: [['deathEater', 0.6], ['acromantula', 0.25], ['dementor', 0.1], ['giant', 0.05]],
};
export function pickType(team: 'hogwarts' | 'death', r: number): UnitType { let a = 0; for (const [t, w] of MIX[team]) { a += w; if (r < a) return t; } return MIX[team][0][0]; }
/** Patronus-type spells deal triple damage to dementors; others half. */
export function dmgVs(type: UnitType, dmg: number, spellId: string) { if (type === 'dementor') return spellId === 'patronus' || spellId === 'lumos' ? dmg * 3 : dmg * 0.5; if (type === 'giant' && spellId === 'stupefy') return dmg * 0.6; return dmg; }
