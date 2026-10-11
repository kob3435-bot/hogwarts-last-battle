/** Phase 5 full roster: Hogwarts/Order, Death Eaters, Legends. Kits are generated from archetypes with per-character names. */
import type { CharDef } from './roster';
import { PLAYABLE, STORY_CHARS } from './roster';
import { SPELLS, SpellId } from '../combat/spells';
import type { HairStyle, Look } from './model';
import { SKILLS, Skill, Effect } from '../combat/skills';
export type Faction = 'hogwarts' | 'order' | 'death' | 'legend';
export type Archetype = 'duelist' | 'guardian' | 'striker' | 'brute' | 'trickster' | 'healer' | 'dark';
export interface RosterMeta { faction: Faction; archetype: Archetype; role: { en: string; th: string }; legend?: boolean }
const sk = (id: string, name: string, nameTh: string, cooldown: number, cost: number, range: number, effects: Effect[], extra: Partial<Skill> = {}): Skill => ({ id, name, nameTh, cooldown, cost, range, effects, ...extra });
type N = [string, string];
function kit(id: string, a: Archetype, c: number, s1: N, s2: N, u: N, spell: SpellId): { sigs: Skill[]; ult: Skill } {
  const S = (i: number, n: N, cd: number, cost: number, r: number, e: Effect[], x: Partial<Skill> = {}) => sk(`${id}${i}`, n[0], n[1], cd, cost, r, e, x);
  switch (a) {
    case 'duelist': return { sigs: [S(1, s1, 8, 20, 24, [{ kind: 'volley', spell, count: 3, spread: 0.1, delay: 0.1 }]), S(2, s2, 10, 14, 6, [{ kind: 'dash', dist: 7, damage: 18, knock: 6, color: c }])],
      ult: S(9, u, 0, 0, 26, [{ kind: 'volley', spell, count: 6, spread: 0.25, dmgMul: 1.5, delay: 0.06 }, { kind: 'buff', dur: 5, power: 1.25, defense: 1.2, speed: 1.2, color: c }], { ultimate: true }) };
    case 'guardian': return { sigs: [S(1, s1, 15, 26, 0, [{ kind: 'barrier', dur: 3.5, radius: 9 }], { support: true }), S(2, s2, 10, 18, 7, [{ kind: 'nova', radius: 6, damage: 16, stun: 0.8, knock: 9, color: c }])],
      ult: S(9, u, 0, 0, 10, [{ kind: 'barrier', dur: 5, radius: 14 }, { kind: 'nova', radius: 10, damage: 30, stun: 1.4, knock: 12, color: c }], { ultimate: true }) };
    case 'striker': return { sigs: [S(1, s1, 9, 22, 22, [{ kind: 'volley', spell, count: 2, spread: 0.2, dmgMul: 1.3 }]), S(2, s2, 11, 12, 0, [{ kind: 'buff', dur: 5, power: 1.3, defense: 1, speed: 1.2, color: c }])],
      ult: S(9, u, 0, 0, 24, [{ kind: 'volley', spell: 'bombarda', count: 4, spread: 0.35, dmgMul: 1.5 }, { kind: 'nova', radius: 7, damage: 22, stun: 0.6, knock: 10, color: c }], { ultimate: true }) };
    case 'brute': return { sigs: [S(1, s1, 8, 14, 8, [{ kind: 'dash', dist: 9, damage: 24, knock: 10, color: c }]), S(2, s2, 12, 20, 6, [{ kind: 'nova', radius: 5, damage: 22, stun: 0.9, knock: 12, color: c }])],
      ult: S(9, u, 0, 0, 8, [{ kind: 'buff', dur: 7, power: 1.4, defense: 1.5, speed: 1.25, color: c }, { kind: 'nova', radius: 9, damage: 34, stun: 1.2, knock: 16, color: c }], { ultimate: true }) };
    case 'trickster': return { sigs: [S(1, s1, 9, 16, 18, [{ kind: 'volley', spell, count: 3, spread: 0.25, delay: 0.08 }, { kind: 'buff', dur: 3, power: 1, defense: 1.15, speed: 1.4, color: c }]), S(2, s2, 10, 18, 22, [{ kind: 'volley', spell: 'firework', count: 5, spread: 0.4, delay: 0.05 }])],
      ult: S(9, u, 0, 0, 24, [{ kind: 'volley', spell: 'firework', count: 10, spread: 0.6, dmgMul: 1.4, delay: 0.04 }, { kind: 'buff', dur: 5, power: 1.2, defense: 1.1, speed: 1.4, color: c }], { ultimate: true }) };
    case 'healer': return { sigs: [S(1, s1, 12, 26, 0, [{ kind: 'heal', radius: 10, amount: 34 }], { support: true }), S(2, s2, 9, 16, 20, [{ kind: 'volley', spell, count: 2, spread: 0.15 }])],
      ult: S(9, u, 0, 0, 0, [{ kind: 'heal', radius: 16, amount: 70 }, { kind: 'barrier', dur: 3, radius: 12 }], { ultimate: true, support: true }) };
    case 'dark': return { sigs: [S(1, s1, 9, 22, 22, [{ kind: 'volley', spell: 'crucio', count: 2, spread: 0.12 }, { kind: 'volley', spell, count: 1, spread: 0 }]), S(2, s2, 11, 14, 8, [{ kind: 'buff', dur: 4, power: 1.1, defense: 1.4, speed: 1.3, color: c }, { kind: 'dash', dist: 6, damage: 14, knock: 5, color: c }])],
      ult: S(9, u, 0, 0, 26, [{ kind: 'volley', spell: 'fiendfyre', count: 3, spread: 0.3, dmgMul: 1.3 }, { kind: 'buff', dur: 5, power: 1.3, defense: 1.2, speed: 1.1, color: c }], { ultimate: true }) };
  }
}
const ARCH: Record<Archetype, { hp: number; en: number; pw: number; df: number; sp: number; ai: CharDef['ai']; spells: SpellId[] }> = {
  duelist: { hp: 1, en: 1, pw: 1.05, df: 1, sp: 6, ai: { aggression: 0.7, caution: 0.45, range: 12, reaction: 0.3 }, spells: ['expelliarmus', 'stupefy', 'confringo', 'depulso', 'bombarda'] },
  guardian: { hp: 1.2, en: 1.1, pw: 0.95, df: 1.2, sp: 5.4, ai: { aggression: 0.5, caution: 0.6, range: 13, reaction: 0.3, canHeal: true }, spells: ['stupefy', 'depulso', 'confringo', 'expelliarmus', 'lumos'] },
  striker: { hp: 0.95, en: 1, pw: 1.15, df: 0.95, sp: 6, ai: { aggression: 0.8, caution: 0.35, range: 12, reaction: 0.3 }, spells: ['confringo', 'bombarda', 'stupefy', 'expelliarmus', 'depulso'] },
  brute: { hp: 1.45, en: 0.8, pw: 1.1, df: 1.25, sp: 5.6, ai: { aggression: 0.95, caution: 0.2, range: 5, reaction: 0.32 }, spells: ['depulso', 'bombarda', 'stupefy', 'confringo'] },
  trickster: { hp: 0.95, en: 1.05, pw: 1.0, df: 1, sp: 6.5, ai: { aggression: 0.75, caution: 0.4, range: 11, reaction: 0.3 }, spells: ['firework', 'stupefy', 'confringo', 'depulso', 'expelliarmus'] },
  healer: { hp: 1.05, en: 1.3, pw: 0.9, df: 1.05, sp: 5.6, ai: { aggression: 0.45, caution: 0.65, range: 14, reaction: 0.32, canHeal: true }, spells: ['stupefy', 'lumos', 'expelliarmus', 'depulso', 'confringo'] },
  dark: { hp: 1.05, en: 1.1, pw: 1.1, df: 1, sp: 5.8, ai: { aggression: 0.85, caution: 0.4, range: 11, reaction: 0.28 }, spells: ['crucio', 'sectum', 'stupefy', 'confringo', 'expelliarmus'] },
};
interface Row { id: string; n: string; th: string; f: Faction; ovr: number; a: Archetype; look: Partial<Look> & { hairStyle: HairStyle }; s1: N; s2: N; u: N; sig: SpellId; role: N; team?: 'hogwarts' | 'death' }
const R = (id: string, n: string, th: string, f: Faction, ovr: number, a: Archetype, look: Row['look'], s1: N, s2: N, u: N, sig: SpellId, role: N, team?: 'hogwarts' | 'death'): Row => ({ id, n, th, f, ovr, a, look, s1, s2, u, sig, role, team });
const GRY = 0xb3152a, GOLD = 0xffc93c, SLY = 0x1f8a4a, SIL = 0xc0c8d8, RAV = 0x2453c7, HUF = 0xe0b020;
const ROWS: Row[] = [
  // Hogwarts / Order
  R('ginny', 'Ginny Weasley', 'จินนี่ วีสลีย์', 'hogwarts', 84, 'striker', { robe: 0x22243a, skin: 0xffe3cf, hair: 0xff5a14, accent: GRY, accent2: GOLD, hairStyle: 'long', eye: 0x7a4a20 }, ['Bat-Bogey Barrage', 'บุกด้วยคาถาค้างคาวน้ำมูก'], ['Chaser Rush', 'พุ่งแบบเชสเซอร์'], ['Weasley Fury', 'โทสะแห่งวีสลีย์'], 'stupefy', ['Fierce striker', 'นักโจมตีดุดัน']),
  R('george', 'George Weasley', 'จอร์จ วีสลีย์', 'hogwarts', 76, 'trickster', { robe: 0x3a6a8a, skin: 0xffe3cf, hair: 0xff6a1a, accent: 0x2a9aff, accent2: GOLD, hairStyle: 'messy', eye: 0x5a3a20, scale: 1.08 }, ['Decoy Detonator', 'ระเบิดหลอกล่อ'], ['Skiving Snackbox', 'ขนมหนีเรียน'], ['Weasleys\' Wizard Wheezes', 'ร้านเกมกลวิเศษวีสลีย์'], 'confringo', ['Prankster', 'นักแกล้ง']),
  R('molly', 'Molly Weasley', 'มอลลี่ วีสลีย์', 'order', 85, 'guardian', { robe: 0x7a3a5a, skin: 0xffd8c0, hair: 0xd84a14, accent: 0xa05a3a, accent2: 0xffd0a0, hairStyle: 'bushy', eye: 0x5a3a20, scale: 1.05 }, ['Mother\'s Shield', 'โล่ของแม่'], ['Not My Daughter!', 'อย่าแตะลูกสาวฉัน!'], ['Fury of the Burrow', 'โทสะแห่งโพรงกระต่าย'], 'stupefy', ['Protective duelist', 'นักดวลผู้ปกป้อง']),
  R('arthur', 'Arthur Weasley', 'อาเธอร์ วีสลีย์', 'order', 74, 'guardian', { robe: 0x4a5a3a, skin: 0xffe0cc, hair: 0xc85a24, accent: 0x6a7a4a, accent2: 0xd0c080, hairStyle: 'short', glasses: true, eye: 0x3a5a7a }, ['Muggle Contraption', 'ของเล่นมักเกิ้ล'], ['Ministry Ward', 'เวทกระทรวง'], ['Flying Ford Anglia', 'รถฟอร์ดบินได้'], 'depulso', ['Steady defender', 'ผู้พิทักษ์มั่นคง']),
  R('kingsley', 'Kingsley Shacklebolt', 'คิงส์ลีย์ ชัคเคิลโบลต์', 'order', 88, 'duelist', { robe: 0x6a2a8a, skin: 0x5a3a2a, hair: 0x1a1010, accent: 0xffc93c, accent2: 0x9a4ad8, hairStyle: 'bald', eye: 0x2a1a10, scale: 1.12 }, ['Auror Volley', 'ระดมยิงมือปราบมาร'], ['Shackle Step', 'ก้าวพันธนาการ'], ['Minister\'s Resolve', 'ปณิธานรัฐมนตรี'], 'stupefy', ['Elite Auror', 'มือปราบมารชั้นยอด']),
  R('lupin', 'Remus Lupin', 'รีมัส ลูปิน', 'order', 85, 'duelist', { robe: 0x6a5a4a, skin: 0xf0d0b8, hair: 0x8a7a6a, accent: 0x5a4a3a, accent2: 0xb0a090, hairStyle: 'short', eye: 0x8a6a3a }, ['Moony\'s Barrage', 'ระดมยิงของมูนนี่'], ['Wolf Lunge', 'กระโจนหมาป่า'], ['Full Moon', 'คืนจันทร์เต็มดวง'], 'stupefy', ['Defence master', 'ปรมาจารย์การป้องกัน']),
  R('tonks', 'Nymphadora Tonks', 'นิมฟาดอรา ท็องส์', 'order', 83, 'trickster', { robe: 0x2a2a3a, skin: 0xffe0d0, hair: 0xff3aa8, accent: 0xff3aa8, accent2: 0x8a3aff, hairStyle: 'spiky', eye: 0x5a2a8a }, ['Metamorph Feint', 'แปลงร่างหลอกล่อ'], ['Clumsy Cascade', 'คาถาซุ่มซ่าม'], ['Auror\'s Gambit', 'กลยุทธ์มือปราบมาร'], 'stupefy', ['Metamorphmagus', 'ผู้แปลงกายได้']),
  R('hagrid', 'Rubeus Hagrid', 'รูเบอัส แฮกริด', 'hogwarts', 82, 'brute', { robe: 0x5a3a20, skin: 0xf0c8a8, hair: 0x2a1a10, accent: 0x3a2a14, accent2: 0x7a5a30, hairStyle: 'wild', eye: 0x1a1008, scale: 1.9 }, ['Half-Giant Charge', 'พุ่งชนแบบครึ่งยักษ์'], ['Umbrella Slam', 'ทุบด้วยร่มชมพู'], ['Fang & Buckbeak', 'ฟางและบั๊กบีก'], 'depulso', ['Gentle giant', 'ยักษ์ใจดี']),
  R('flitwick', 'Filius Flitwick', 'ฟิเลียส ฟลิตวิก', 'hogwarts', 87, 'duelist', { robe: 0x24308a, skin: 0xffe0cc, hair: 0xf0f0f0, accent: RAV, accent2: SIL, hairStyle: 'messy', eye: 0x2a2a2a, scale: 0.7 }, ['Charms Cascade', 'สายธารเวทมนตร์'], ['Duelling Champion', 'แชมป์ดวลเวท'], ['Rain of Charms', 'ฝนเวทมนตร์'], 'lumos', ['Charms master', 'ปรมาจารย์คาถา']),
  R('slughorn', 'Horace Slughorn', 'ฮอเรซ สลักฮอร์น', 'hogwarts', 79, 'healer', { robe: 0x2a6a3a, skin: 0xffd8c0, hair: 0xd8c8a0, accent: SLY, accent2: SIL, hairStyle: 'bald', eye: 0x3a3a2a, scale: 1.2 }, ['Felix Felicis', 'ยาเฟลิกซ์ เฟลิซิส'], ['Potion Flask', 'ขวดยาวิเศษ'], ['Slug Club Rally', 'ชมรมสลักรวมพล'], 'confringo', ['Potions master', 'ปรมาจารย์ปรุงยา']),
  R('sprout', 'Pomona Sprout', 'โพโมนา สเปราต์', 'hogwarts', 76, 'healer', { robe: 0x6a5a20, skin: 0xffdcc0, hair: 0x9a8a6a, accent: HUF, accent2: 0x5a8a3a, hairStyle: 'witchhat', eye: 0x3a5a2a }, ['Herbal Remedy', 'ยาสมุนไพร'], ['Mandrake Scream', 'เสียงกรีดร้องแมนเดรก'], ['Devil\'s Snare', 'กับดักปีศาจ'], 'stupefy', ['Herbology support', 'ผู้สนับสนุนสายสมุนไพร']),
  R('aberforth', 'Aberforth Dumbledore', 'อาเบอร์ฟอร์ธ ดัมเบิลดอร์', 'order', 84, 'brute', { robe: 0x5a4a3a, skin: 0xf0d0c0, hair: 0xd0d0d0, accent: 0x7a6a5a, accent2: 0xa09080, hairStyle: 'wild', glasses: true, eye: 0x4a7ad8, scale: 1.1 }, ['Goat Patronus', 'ผู้พิทักษ์แพะ'], ['Hog\'s Head Brawl', 'ศึกหัวหมูป่า'], ['Brother\'s Wrath', 'โทสะของพี่ชาย'], 'stupefy', ['Grumpy brawler', 'นักสู้อารมณ์ร้าย']),
  R('cho', 'Cho Chang', 'โช แชง', 'hogwarts', 72, 'striker', { robe: 0x22243a, skin: 0xffe8d0, hair: 0x101018, accent: RAV, accent2: SIL, hairStyle: 'long', eye: 0x2a1a10 }, ['Seeker\'s Strike', 'จู่โจมแบบซีกเกอร์'], ['Ravenclaw Focus', 'สมาธิเรเวนคลอ'], ['Swan Patronus', 'ผู้พิทักษ์หงส์'], 'stupefy', ['Agile striker', 'นักโจมตีว่องไว']),
  R('seamus', 'Seamus Finnigan', 'ชีมัส ฟินนิแกน', 'hogwarts', 70, 'striker', { robe: 0x22243a, skin: 0xffe0cc, hair: 0xc8a060, accent: GRY, accent2: GOLD, hairStyle: 'short', eye: 0x3a6a3a }, ['Accidental Explosion', 'ระเบิดโดยบังเอิญ'], ['Pyro Grin', 'ยิ้มนักวางเพลิง'], ['Bridge Demolition', 'ระเบิดสะพาน'], 'bombarda', ['Demolitions', 'ผู้เชี่ยวชาญการระเบิด']),
  // Death Eaters
  R('lucius', 'Lucius Malfoy', 'ลูเซียส มัลฟอย', 'death', 84, 'dark', { robe: 0x14141e, skin: 0xfff0e0, hair: 0xf4ecd0, accent: SLY, accent2: SIL, hairStyle: 'long', eye: 0x8aa0b0, scale: 1.08 }, ['Serpent Cane', 'ไม้เท้างู'], ['Apparate', 'หายตัว'], ['Pure-Blood Pride', 'ความทะนงแห่งเลือดบริสุทธิ์'], 'sectum', ['Aristocrat duelist', 'นักดวลชนชั้นสูง']),
  R('narcissa', 'Narcissa Malfoy', 'นาร์ซิสซา มัลฟอย', 'death', 78, 'guardian', { robe: 0x1a1a2a, skin: 0xfff4ea, hair: 0xf0e8d8, accent: 0x2a2a4a, accent2: SIL, hairStyle: 'long', eye: 0x6a8aa0 }, ['Black Family Ward', 'เวทตระกูลแบล็ก'], ['Cold Rebuke', 'คำตำหนิเย็นชา'], ['A Mother\'s Lie', 'คำโกหกของแม่'], 'stupefy', ['Protective mother', 'แม่ผู้ปกป้อง']),
  R('draco', 'Draco Malfoy', 'เดรโก มัลฟอย', 'death', 77, 'duelist', { robe: 0x18201a, skin: 0xfff0e4, hair: 0xf8f0d0, accent: SLY, accent2: SIL, hairStyle: 'short', eye: 0x8aa0b0 }, ['Slytherin Volley', 'ระดมยิงสลิธีริน'], ['Seeker Feint', 'ซีกเกอร์หลอกล่อ'], ['Heir of Malfoy', 'ทายาทมัลฟอย'], 'sectum', ['Reluctant duelist', 'นักดวลผู้ลังเล']),
  R('yaxley', 'Corban Yaxley', 'คอร์บาน แย็กซ์ลีย์', 'death', 80, 'striker', { robe: 0x201a14, skin: 0xe8d0b8, hair: 0xb09a70, accent: 0x5a4a2a, accent2: 0x8a7a5a, hairStyle: 'long', eye: 0x3a2a1a, scale: 1.1 }, ['Imperius Strike', 'จู่โจมสะกดใจ'], ['Ministry Mandate', 'คำสั่งกระทรวง'], ['Regime of Terror', 'ยุคแห่งความหวาดกลัว'], 'crucio', ['Ministry enforcer', 'ผู้บังคับใช้ของกระทรวง']),
  R('rookwood', 'Augustus Rookwood', 'ออกัสตัส รุควูด', 'death', 79, 'striker', { robe: 0x1a1a1a, skin: 0xe0c8b0, hair: 0x4a4a4a, accent: 0x3a3a3a, accent2: 0x8a8a8a, hairStyle: 'messy', eye: 0x2a2a2a }, ['Wall Breaker', 'ทำลายกำแพง'], ['Unspeakable Focus', 'สมาธิผู้ไร้นาม'], ['Castle Collapse', 'ปราสาทถล่ม'], 'bombarda', ['Saboteur', 'ผู้ก่อวินาศกรรม']),
  R('macnair', 'Walden Macnair', 'วอลเดน แม็กแนร์', 'death', 74, 'brute', { robe: 0x2a1a14, skin: 0xd8b8a0, hair: 0x1a1a1a, accent: 0x5a2a1a, accent2: 0x7a5a4a, hairStyle: 'short', eye: 0x1a1a1a, scale: 1.25 }, ['Executioner\'s Swing', 'เหวี่ยงขวานเพชฌฆาต'], ['Beast Tamer', 'ผู้ปราบสัตว์'], ['The Axe Falls', 'คมขวานตกลง'], 'depulso', ['Executioner', 'เพชฌฆาต']),
  R('alecto', 'Alecto Carrow', 'อเล็กโต แคร์โรว์', 'death', 68, 'dark', { robe: 0x2a2030, skin: 0xe0c8b0, hair: 0x4a3a2a, accent: 0x3a2a3a, accent2: 0x6a5a6a, hairStyle: 'bushy', eye: 0x332211 }, ['Detention Curse', 'คำสาปกักบริเวณ'], ['Sibling Swap', 'สลับพี่น้อง'], ['Carrow Reign', 'ยุคแคร์โรว์'], 'crucio', ['Cruel teacher', 'ครูโหดร้าย']),
  R('snape', 'Severus Snape', 'เซเวอรัส สเนป', 'death', 92, 'dark', { robe: 0x0e0e14, skin: 0xf0e6dc, hair: 0x101010, accent: 0x1a1a24, accent2: 0x3a3a4a, hairStyle: 'long', eye: 0x101010, scale: 1.08 }, ['Half-Blood Prince', 'เจ้าชายเลือดผสม'], ['Shadow Flight', 'บินดั่งเงา'], ['Always', 'ตลอดไป'], 'sectum', ['Double agent', 'สายลับสองหน้า']),
  // Legends (What If only)
  R('dumbledore', 'Albus Dumbledore', 'อัลบัส ดัมเบิลดอร์', 'legend', 99, 'guardian', { robe: 0x5a2a9a, skin: 0xf6e0d0, hair: 0xf4f4f4, accent: 0xffc93c, accent2: 0xd8c0ff, hairStyle: 'witchhat', glasses: true, eye: 0x4a8af0, scale: 1.12 }, ['Elder Shield', 'โล่ผู้เฒ่า'], ['Phoenix Flame', 'เปลวไฟนกฟีนิกซ์'], ['Greatest Wizard of the Age', 'พ่อมดผู้ยิ่งใหญ่ที่สุดแห่งยุค'], 'lumos', ['Legendary headmaster', 'อาจารย์ใหญ่ในตำนาน'], 'hogwarts'),
  R('grindelwald', 'Gellert Grindelwald', 'เกลเลิร์ต กรินเดลวัลด์', 'legend', 97, 'dark', { robe: 0x1a1a24, skin: 0xf6ece4, hair: 0xe8e8f0, accent: 0x4aa0ff, accent2: 0xd0d8ff, hairStyle: 'short', eye: 0x8ad0ff, scale: 1.05 }, ['Blue Flame Ring', 'วงแหวนเพลิงสีน้ำเงิน'], ['For the Greater Good', 'เพื่อประโยชน์ที่ยิ่งใหญ่กว่า'], ['Nurmengard Inferno', 'นรกนูร์เมนการ์ด'], 'fiendfyre', ['Dark revolutionary', 'นักปฏิวัติศาสตร์มืด'], 'death'),
  R('sirius', 'Sirius Black', 'ซิเรียส แบล็ก', 'legend', 89, 'duelist', { robe: 0x2a1a2a, skin: 0xf0d8c8, hair: 0x1a1018, accent: GRY, accent2: 0x8a8a9a, hairStyle: 'long', eye: 0x5a6a7a }, ['Padfoot Barrage', 'ระดมยิงของแพดฟุต'], ['Black Dog Pounce', 'สุนัขดำกระโจน'], ['Marauder\'s Defiance', 'การต่อต้านของตัวกวน'], 'stupefy', ['Reckless duelist', 'นักดวลบ้าบิ่น'], 'hogwarts'),
  R('james', 'James Potter', 'เจมส์ พอตเตอร์', 'legend', 88, 'striker', { robe: 0x22243a, skin: 0xffdcc0, hair: 0x1a1220, accent: GRY, accent2: GOLD, hairStyle: 'spiky', glasses: true, eye: 0x6a4a2a }, ['Prongs Charge', 'พรองส์พุ่งชน'], ['Chaser\'s Pride', 'ความภูมิใจของเชสเซอร์'], ['Stag Patronus', 'ผู้พิทักษ์กวาง'], 'stupefy', ['Bold striker', 'นักโจมตีกล้าหาญ'], 'hogwarts'),
  R('lily', 'Lily Potter', 'ลิลี่ พอตเตอร์', 'legend', 90, 'healer', { robe: 0x22243a, skin: 0xffe8d8, hair: 0xd8401a, accent: GRY, accent2: GOLD, hairStyle: 'long', eye: 0x2fbf5a }, ['Sacrificial Light', 'แสงแห่งการเสียสละ'], ['Doe Patronus', 'ผู้พิทักษ์กวางตัวเมีย'], ['A Mother\'s Love', 'ความรักของแม่'], 'patronus', ['Ancient protection', 'เวทคุ้มครองโบราณ'], 'hogwarts'),
  R('moody', 'Alastor Moody', 'อลาสเตอร์ มู้ดดี้', 'legend', 90, 'duelist', { robe: 0x3a3020, skin: 0xd8b8a0, hair: 0x6a6050, accent: 0x5a4a30, accent2: 0x7ad0ff, hairStyle: 'wild', eye: 0x7ad0ff }, ['Constant Vigilance', 'ระวังตัวตลอดเวลา'], ['Mad-Eye Lunge', 'แม้ดอายพุ่งเข้าใส่'], ['Auror Legend', 'ตำนานมือปราบมาร'], 'stupefy', ['Veteran Auror', 'มือปราบมารผ่านศึก'], 'hogwarts'),
  R('riddle', 'Tom Riddle (Young)', 'ทอม ริดเดิ้ล (วัยหนุ่ม)', 'legend', 93, 'dark', { robe: 0x18201a, skin: 0xf8ece4, hair: 0x14101a, accent: SLY, accent2: SIL, hairStyle: 'short', eye: 0xc02020 }, ['Heir of Slytherin', 'ทายาทสลิธีริน'], ['Diary Shade', 'เงาจากไดอารี่'], ['Chamber Opened', 'ห้องแห่งความลับเปิดแล้ว'], 'avada', ['Young dark prodigy', 'อัจฉริยะศาสตร์มืดวัยเยาว์'], 'death'),
];
const def = (r: Row): CharDef => { const A = ARCH[r.a]; const k = r.ovr / 85; const team = r.team ?? (r.f === 'death' ? 'death' : 'hogwarts');
  return { id: r.id, name: r.n, nameTh: r.th, team, hp: Math.round(130 * A.hp * (0.7 + 0.3 * k)), energy: Math.round(110 * A.en), power: +(A.pw * (0.75 + 0.3 * k)).toFixed(2), defense: +(A.df * (0.85 + 0.15 * k)).toFixed(2), speed: A.sp,
    mastery: r.ovr, playable: true, spells: Array.from(new Set([r.sig, ...A.spells])).filter(id => SPELLS[id].cost > 0).slice(0, 5) as SpellId[], look: { robe: 0x22243a, skin: 0xffdcc0, hair: 0x333333, accent: 0x666666, ...r.look } as Look, ai: { ...A.ai }, ovr: r.ovr }; };
export const NEW_CHARS: CharDef[] = ROWS.map(def);
for (const r of ROWS) SKILLS[r.id] = kit(r.id, r.a, r.look.accent ?? 0xffffff, r.s1, r.s2, r.u, r.sig);
// Story characters become playable in free battle too (give them kits)
const STORY_ARCH: Record<string, [Archetype, N, N, N, SpellId, Faction]> = {
  dolohov: ['dark', ['Purple Flame Curse', 'คำสาปเปลวม่วง'], ['Shadow Step', 'ก้าวเงา'], ['Ministry Massacre', 'สังหารหมู่ที่กระทรวง'], 'sectum', 'death'],
  greyback: ['brute', ['Feral Lunge', 'กระโจนดุร้าย'], ['Howl', 'เสียงหอน'], ['Blood Moon', 'จันทร์สีเลือด'], 'depulso', 'death'],
  fred: ['trickster', ['Portable Swamp', 'หนองน้ำพกพา'], ['Peruvian Darkness', 'ผงความมืดเปรู'], ['Wildfire Whizzbangs', 'ดอกไม้ไฟไวลด์ไฟร์'], 'confringo', 'hogwarts'],
  carrow: ['dark', ['Cruciatus Lesson', 'บทเรียนคำสาปทรมาน'], ['Sibling Swap', 'สลับพี่น้อง'], ['Carrow Reign', 'ยุคแคร์โรว์'], 'crucio', 'death'],
};
for (const c of STORY_CHARS) { const s = STORY_ARCH[c.id]; if (!s) continue; c.playable = true; SKILLS[c.id] = kit(c.id, s[0], c.look.accent, s[1], s[2], s[3], s[4]); }
export const META: Record<string, RosterMeta> = {};
for (const r of ROWS) META[r.id] = { faction: r.f, archetype: r.a, role: { en: r.role[0], th: r.role[1] }, legend: r.f === 'legend' };
const CORE: Record<string, [Faction, Archetype, N]> = { harry: ['hogwarts', 'duelist', ['The Chosen One', 'ผู้ถูกเลือก']], hermione: ['hogwarts', 'guardian', ['Brightest witch', 'แม่มดที่ฉลาดที่สุด']], ron: ['hogwarts', 'striker', ['Loyal strategist', 'นักวางแผนผู้ภักดี']],
  mcgonagall: ['hogwarts', 'guardian', ['Deputy headmistress', 'รองอาจารย์ใหญ่']], neville: ['hogwarts', 'brute', ['Brave heart', 'หัวใจกล้าหาญ']], luna: ['hogwarts', 'healer', ['Dreamy seer', 'ผู้มองเห็นต่าง']],
  voldemort: ['death', 'dark', ['The Dark Lord', 'จอมมาร']], bellatrix: ['death', 'dark', ['Fanatic lieutenant', 'ผู้ภักดีคลั่ง']], dolohov: ['death', 'dark', ['Veteran Death Eater', 'ผู้เสพความตายมือฉมัง']],
  greyback: ['death', 'brute', ['Werewolf', 'มนุษย์หมาป่า']], fred: ['hogwarts', 'trickster', ['Prankster', 'นักแกล้ง']], carrow: ['death', 'dark', ['Cruel teacher', 'ครูโหดร้าย']] };
for (const [id, [f, a, role]] of Object.entries(CORE)) META[id] = { faction: f, archetype: a, role: { en: role[0], th: role[1] } };
export const FULL_ROSTER: CharDef[] = [...PLAYABLE, ...STORY_CHARS.filter(c => c.playable), ...NEW_CHARS];
export const isLegend = (id: string) => !!META[id]?.legend;
export const factionOf = (id: string): Faction => META[id]?.faction ?? 'death';
import { EXTRA_CHARS } from './roster';
EXTRA_CHARS.push(...NEW_CHARS);
import { applyIdentity } from './identity';
for (const c of NEW_CHARS) applyIdentity(c);
import { applyUnique } from './uniquekits';
applyUnique();
