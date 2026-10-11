/** Relationship / synergy bonuses and morale reactions (pure). */
export interface Synergy { id: string; name: string; nameTh: string; members: string[]; min: number; power: number; defense: number }
export const SYNERGIES: Synergy[] = [
  { id: 'trio', name: 'Golden Trio', nameTh: 'สามสหายทองคำ', members: ['harry', 'ron', 'hermione'], min: 2, power: 1.12, defense: 1.08 },
  { id: 'twins', name: 'Weasley Twins', nameTh: 'แฝดวีสลีย์', members: ['fred', 'george'], min: 2, power: 1.15, defense: 1.0 },
  { id: 'weasley', name: 'The Weasleys', nameTh: 'ครอบครัววีสลีย์', members: ['ron', 'ginny', 'fred', 'george', 'molly', 'arthur'], min: 3, power: 1.06, defense: 1.08 },
  { id: 'malfoy', name: 'Malfoy Family', nameTh: 'ตระกูลมัลฟอย', members: ['lucius', 'narcissa', 'draco'], min: 2, power: 1.05, defense: 1.15 },
  { id: 'da', name: 'Dumbledore\'s Army', nameTh: 'กองทัพดัมเบิลดอร์', members: ['harry', 'neville', 'luna', 'ginny', 'cho', 'seamus', 'hermione', 'ron'], min: 3, power: 1.06, defense: 1.04 },
  { id: 'order', name: 'Order of the Phoenix', nameTh: 'ภาคีนกฟีนิกซ์', members: ['kingsley', 'lupin', 'tonks', 'moody', 'molly', 'arthur', 'aberforth', 'sirius'], min: 2, power: 1.05, defense: 1.08 },
  { id: 'marauders', name: 'The Marauders', nameTh: 'กลุ่มตัวกวน', members: ['james', 'sirius', 'lupin'], min: 2, power: 1.14, defense: 1.0 },
  { id: 'staff', name: 'Hogwarts Staff', nameTh: 'คณาจารย์ฮอกวอตส์', members: ['mcgonagall', 'flitwick', 'sprout', 'slughorn', 'hagrid', 'dumbledore'], min: 2, power: 1.04, defense: 1.1 },
  { id: 'potters', name: 'The Potters', nameTh: 'ครอบครัวพอตเตอร์', members: ['harry', 'james', 'lily'], min: 2, power: 1.12, defense: 1.12 },
  { id: 'inner', name: 'Inner Circle', nameTh: 'วงในของจอมมาร', members: ['voldemort', 'bellatrix', 'dolohov', 'lucius', 'yaxley', 'snape'], min: 2, power: 1.08, defense: 1.0 },
  { id: 'carrows', name: 'The Carrows', nameTh: 'พี่น้องแคร์โรว์', members: ['carrow', 'alecto'], min: 2, power: 1.12, defense: 1.0 },
  { id: 'duel', name: 'Old Friends, Old Foes', nameTh: 'มิตรเก่า ศัตรูเก่า', members: ['dumbledore', 'grindelwald'], min: 1, power: 1.0, defense: 1.0 },
];
/** Active synergies for `id` given allied ids that are alive and nearby (including self). */
export function activeSynergies(id: string, nearbyAllies: string[]): Synergy[] {
  const set = new Set([id, ...nearbyAllies]); return SYNERGIES.filter(s => s.members.includes(id) && s.members.filter(m => set.has(m)).length >= s.min && s.min > 1);
}
export function synergyBonus(id: string, nearbyAllies: string[]) { let power = 1, defense = 1; const act = activeSynergies(id, nearbyAllies); for (const s of act) { power *= s.power; defense *= s.defense; }
  return { power: Math.min(power, 1.35), defense: Math.min(defense, 1.35), names: act.map(s => s.id) }; }
export type Reaction = { kind: 'rage' | 'grief' | 'resolve'; power: number; speed: number; dur: number; en: string; th: string } | null;
const BONDS: Record<string, string[]> = {
  fred: ['george', 'ron', 'ginny', 'molly', 'arthur'], george: ['fred', 'ron', 'ginny', 'molly'], ginny: ['molly', 'ron', 'harry', 'fred', 'george'], ron: ['hermione', 'harry', 'ginny', 'molly'],
  hermione: ['ron', 'harry'], harry: ['ron', 'hermione', 'ginny', 'neville', 'lily', 'james', 'sirius', 'lupin'], lupin: ['tonks', 'sirius', 'harry'], tonks: ['lupin'], sirius: ['harry', 'lupin', 'james'],
  james: ['lily', 'sirius', 'lupin', 'harry'], lily: ['james', 'harry', 'snape'], draco: ['narcissa', 'lucius'], narcissa: ['draco', 'lucius'], lucius: ['narcissa', 'draco'], dumbledore: ['mcgonagall', 'aberforth', 'harry', 'grindelwald'],
  neville: ['luna', 'ginny', 'harry'], luna: ['neville', 'ginny'], bellatrix: ['voldemort', 'narcissa'], voldemort: [], hagrid: ['harry'], molly: ['ginny', 'ron', 'fred', 'george', 'arthur'], arthur: ['molly'],
};
/** How does survivor react to the fall of `fallen`? Bonded heroes rage; Death Eaters waver when their lord falls. */
export function moraleReaction(fallen: string, survivor: string, survivorTeam: 'hogwarts' | 'death'): Reaction {
  if (fallen === 'voldemort' && survivorTeam === 'death') return { kind: 'grief', power: 0.8, speed: 0.85, dur: 20, en: 'The Dark Lord has fallen... the Death Eaters waver!', th: 'จอมมารล้มแล้ว... ผู้เสพความตายเริ่มหวั่นไหว!' };
  if (fallen === 'harry' && survivorTeam === 'hogwarts') return { kind: 'resolve', power: 1.15, speed: 1, dur: 25, en: 'For Harry!', th: 'เพื่อแฮร์รี่!' };
  if (!(BONDS[fallen] ?? []).includes(survivor) && !(BONDS[survivor] ?? []).includes(fallen)) return null;
  if (survivor === 'molly' && fallen === 'ginny') return { kind: 'rage', power: 1.4, speed: 1.15, dur: 25, en: 'NOT MY DAUGHTER!', th: 'อย่าแตะลูกสาวฉัน!' };
  if (survivor === 'george' && fallen === 'fred') return { kind: 'grief', power: 1.25, speed: 0.9, dur: 25, en: 'Fred... FRED!', th: 'เฟร็ด... เฟร็ด!' };
  return survivorTeam === 'hogwarts' ? { kind: 'rage', power: 1.25, speed: 1.1, dur: 15, en: 'You\'ll pay for that!', th: 'แกต้องชดใช้!' } : { kind: 'rage', power: 1.2, speed: 1.05, dur: 12, en: 'Vengeance!', th: 'แก้แค้น!' };
}
