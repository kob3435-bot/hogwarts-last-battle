import type { SpellId } from '../combat/spells';
import type { Look } from './model';
export interface CharDef { id: string; name: string; nameTh: string; team: 'hogwarts' | 'death'; hp: number; energy: number; power: number; defense: number; speed: number; mastery: number;
  spells: SpellId[]; look: Look; ai: { aggression: number; caution: number; range: number; reaction: number; canHeal?: boolean }; boss?: boolean; ovr: number; playable?: boolean; }
const GRY = 0xb3152a, GOLD = 0xffc93c;
const DE = (i: number): CharDef => ({ id: 'de' + i, name: 'Death Eater', nameTh: 'ผู้เสพความตาย', team: 'death', hp: 65, energy: 80, power: 0.86, defense: 1, speed: 5.2, mastery: 45,
  spells: ['stupefy', 'confringo', 'expelliarmus', 'bombarda'], look: { robe: 0x1c1c26, skin: 0xffe0cc, hair: 0x15151c, accent: 0x3a3a4a, hairStyle: 'hood', mask: true, outfit: 'deatheater', acc: ['mask', 'cloak'], wand: (['dark', 'bone', 'crooked', 'thin', 'knobby'] as const)[i % 5], wandColor: 0x2a2020, spellColor: 0x8a2a5a, cast: (['whip', 'thrust', 'snap'] as const)[i % 3], idle: 'stern', build: (['normal', 'slim', 'stocky'] as const)[i % 3] },
  ai: { aggression: 0.55 + (i % 3) * 0.12, caution: 0.35 + (i % 2) * 0.2, range: 11 + (i % 3) * 3, reaction: 0.45 }, ovr: 62 + i });
export const HEROES: CharDef[] = [
  { id: 'harry', name: 'Harry Potter', nameTh: 'แฮร์รี่ พอตเตอร์', team: 'hogwarts', hp: 150, energy: 110, power: 1.3, defense: 1.05, speed: 6, mastery: 88, playable: true, spells: ['expelliarmus', 'stupefy', 'confringo', 'bombarda', 'depulso'],
    look: { robe: 0x22243a, skin: 0xffdcc0, hair: 0x1a1220, accent: GRY, accent2: GOLD, hairStyle: 'spiky', glasses: true, eye: 0x2fbf5a }, ai: { aggression: 0.65, caution: 0.5, range: 12, reaction: 0.3 }, ovr: 88 },
  { id: 'hermione', name: 'Hermione Granger', nameTh: 'เฮอร์ไมโอนี่ เกรนเจอร์', team: 'hogwarts', hp: 125, energy: 140, power: 1.2, defense: 1.0, speed: 5.8, mastery: 86, playable: true, spells: ['stupefy', 'confringo', 'expelliarmus', 'depulso', 'bombarda'],
    look: { robe: 0x22243a, skin: 0xf3c69f, hair: 0x8a4f2a, accent: GRY, accent2: GOLD, hairStyle: 'bushy', eye: 0x7a4a22 }, ai: { aggression: 0.45, caution: 0.9, range: 16, reaction: 0.22, canHeal: true }, ovr: 87 },
  { id: 'ron', name: 'Ron Weasley', nameTh: 'รอน วีสลีย์', team: 'hogwarts', hp: 140, energy: 100, power: 1.15, defense: 1.0, speed: 6.2, mastery: 72, playable: true, spells: ['bombarda', 'depulso', 'stupefy', 'expelliarmus', 'confringo'],
    look: { robe: 0x22243a, skin: 0xffe3cf, hair: 0xff6a1a, accent: GRY, accent2: GOLD, hairStyle: 'messy', eye: 0x3a7bd5, scale: 1.06 }, ai: { aggression: 0.95, caution: 0.25, range: 8, reaction: 0.38 }, ovr: 80 },
  { id: 'mcgonagall', name: 'Minerva McGonagall', nameTh: 'มิเนอร์วา มักกอนนากัล', team: 'hogwarts', hp: 150, energy: 150, power: 1.35, defense: 1.2, speed: 5.4, mastery: 92, playable: true, spells: ['stupefy', 'confringo', 'depulso', 'expelliarmus', 'bombarda'],
    look: { robe: 0x0f7a4a, skin: 0xf7dccb, hair: 0x2b2b2b, accent: 0x0a4d2e, accent2: GOLD, hairStyle: 'witchhat', eye: 0x2a6b3a, scale: 1.04 }, ai: { aggression: 0.6, caution: 0.7, range: 14, reaction: 0.2 }, ovr: 91 },
  { id: 'neville', name: 'Neville Longbottom', nameTh: 'เนวิลล์ ลองบัตท่อม', team: 'hogwarts', hp: 150, energy: 100, power: 1.1, defense: 1.25, speed: 5.8, mastery: 74, playable: true, spells: ['stupefy', 'expelliarmus', 'confringo', 'depulso', 'bombarda'],
    look: { robe: 0x22243a, skin: 0xffdcc6, hair: 0x6b4428, accent: GRY, accent2: GOLD, hairStyle: 'short', eye: 0x5a3a20, scale: 1.05 }, ai: { aggression: 0.75, caution: 0.45, range: 10, reaction: 0.35 }, ovr: 79 },
  { id: 'luna', name: 'Luna Lovegood', nameTh: 'ลูน่า เลิฟกู๊ด', team: 'hogwarts', hp: 115, energy: 130, power: 1.15, defense: 1.0, speed: 6.1, mastery: 80, playable: true, spells: ['lumos', 'stupefy', 'expelliarmus', 'confringo', 'depulso'],
    look: { robe: 0x2453c7, skin: 0xfff0e6, hair: 0xfff3a6, accent: 0x1a3a8a, accent2: 0xc0c8d8, hairStyle: 'long', eye: 0x8fc8ff }, ai: { aggression: 0.5, caution: 0.65, range: 15, reaction: 0.28, canHeal: true }, ovr: 81 },
];
export const VOLDEMORT: CharDef = { id: 'voldemort', name: 'Lord Voldemort', nameTh: 'ลอร์ดโวลเดอมอร์', team: 'death', hp: 420, energy: 220, power: 1.15, defense: 1.3, speed: 5.5, mastery: 95, boss: true, playable: true,
  spells: ['avada', 'confringo', 'bombarda', 'stupefy', 'depulso', 'expelliarmus'], look: { robe: 0x14101e, skin: 0xe9f2ec, hair: 0, accent: 0x3a1460, accent2: 0x22ff44, hairStyle: 'bald', eye: 0xff1a1a, scale: 1.14, snake: true },
  ai: { aggression: 0.85, caution: 0.55, range: 14, reaction: 0.2 }, ovr: 98 };
export const BELLATRIX: CharDef = { id: 'bellatrix', name: 'Bellatrix Lestrange', nameTh: 'เบลลาทริกซ์ เลสแตรงจ์', team: 'death', hp: 170, energy: 130, power: 0.95, defense: 1.0, speed: 6.4, mastery: 84, playable: true,
  spells: ['crucio', 'sectum', 'stupefy', 'confringo', 'expelliarmus'], look: { robe: 0x2a0f2e, skin: 0xf6e6e6, hair: 0x0c0a12, accent: 0x6a1050, accent2: 0xc0c0d0, hairStyle: 'wild', eye: 0x6a1050 },
  ai: { aggression: 0.95, caution: 0.3, range: 9, reaction: 0.22 }, ovr: 89 };
export const DEATH_EATERS = [0, 1, 2, 3, 4].map(DE);
export const makeDeathEater = DE;
export const PLAYABLE = [...HEROES, VOLDEMORT, BELLATRIX];

// ---- Story-only characters (AI) ----
export const STORY_CHARS: CharDef[] = [
  { id: 'dolohov', name: 'Antonin Dolohov', nameTh: 'แอนโทนิน โดโลฮอฟ', team: 'death', hp: 230, energy: 140, power: 1.0, defense: 1.1, speed: 5.6, mastery: 80, spells: ['sectum', 'crucio', 'confringo', 'stupefy', 'expelliarmus'],
    look: { robe: 0x261a1a, skin: 0xe8cdb8, hair: 0x3a2a20, accent: 0x5a1a1a, accent2: 0xa0a0a0, hairStyle: 'short', eye: 0x5a1a1a, scale: 1.08 }, ai: { aggression: 0.8, caution: 0.45, range: 12, reaction: 0.25 }, ovr: 84 },
  { id: 'greyback', name: 'Fenrir Greyback', nameTh: 'เฟนเรียร์ เกรย์แบ็ก', team: 'death', hp: 280, energy: 90, power: 1.05, defense: 1.2, speed: 7.2, mastery: 50, spells: ['depulso', 'stupefy', 'confringo'],
    look: { robe: 0x3a3428, skin: 0xc8a888, hair: 0x9a9a9a, accent: 0x5a4a30, accent2: 0x7a6a50, hairStyle: 'wild', eye: 0xffcc00, scale: 1.18 }, ai: { aggression: 1, caution: 0.15, range: 4, reaction: 0.22 }, ovr: 78 },
  { id: 'nagini', name: 'Nagini', nameTh: 'นากีนี', team: 'death', hp: 260, energy: 120, power: 1.0, defense: 1.0, speed: 6.6, mastery: 60, spells: ['sectum', 'stupefy'],
    look: { robe: 0x2a5a2a, skin: 0x3a7a3a, hair: 0, accent: 0x1a3a1a, hairStyle: 'bald', eye: 0xffd000, creature: 'snake', scale: 1.4 }, ai: { aggression: 0.95, caution: 0.3, range: 5, reaction: 0.25 }, ovr: 82 },
  { id: 'giantcmdr', name: 'Giant Commander Golgor', nameTh: 'ผู้บัญชาการยักษ์ กอลกอร์', team: 'death', hp: 600, energy: 200, power: 1.4, defense: 1.5, speed: 3.6, mastery: 30, spells: ['bombarda', 'depulso', 'stone'],
    look: { robe: 0x6a4a2a, skin: 0xa07a5a, hair: 0x3a2a1a, accent: 0x4a3a2a, hairStyle: 'messy', eye: 0x221100, scale: 3.0 }, ai: { aggression: 0.9, caution: 0.1, range: 10, reaction: 0.45 }, ovr: 80 },
  { id: 'fred', name: 'Fred Weasley', nameTh: 'เฟร็ด วีสลีย์', team: 'hogwarts', hp: 220, energy: 100, power: 1.05, defense: 1.0, speed: 6.2, mastery: 70, spells: ['confringo', 'stupefy', 'depulso', 'expelliarmus', 'bombarda'],
    look: { robe: 0x6a3a8a, skin: 0xffe3cf, hair: 0xff6a1a, accent: 0xff9a2a, accent2: 0xffd34d, hairStyle: 'messy', eye: 0x5a3a20, scale: 1.08 }, ai: { aggression: 0.8, caution: 0.35, range: 11, reaction: 0.32 }, ovr: 76 },
  { id: 'dementorE', name: 'Dementor', nameTh: 'ผู้คุมวิญญาณ', team: 'death', hp: 45, energy: 100, power: 0.35, defense: 1, speed: 4.0, mastery: 20, spells: ['crucio'],
    look: { robe: 0x0e0b16, skin: 0x0e0b16, hair: 0x0e0b16, accent: 0x0e0b16, hairStyle: 'hood', eye: 0x000000, scale: 1.3 }, ai: { aggression: 1, caution: 0, range: 6, reaction: 0.4 }, ovr: 60 },
  { id: 'carrow', name: 'Amycus Carrow', nameTh: 'อามีคัส แคร์โรว์', team: 'death', hp: 110, energy: 90, power: 0.75, defense: 1, speed: 5.2, mastery: 55, spells: ['crucio', 'stupefy', 'expelliarmus'],
    look: { robe: 0x2a2030, skin: 0xe0c8b0, hair: 0x4a3a2a, accent: 0x3a2a3a, hairStyle: 'short', eye: 0x332211, scale: 1.05 }, ai: { aggression: 0.75, caution: 0.4, range: 11, reaction: 0.35 }, ovr: 66 },
];
export const ALL_CHARS: CharDef[] = [...PLAYABLE, ...STORY_CHARS, DE(0)];
export const EXTRA_CHARS: CharDef[] = [];
export function charById(id: string): CharDef { const c = ALL_CHARS.find(c => c.id === id) ?? EXTRA_CHARS.find(c => c.id === id) ?? (id.startsWith('de') ? DE(+id.slice(2) || 0) : undefined); if (!c) throw new Error('unknown char ' + id); return c; }
