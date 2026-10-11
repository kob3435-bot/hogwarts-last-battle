import type { SpellId } from './spells';
export type Effect =
  | { kind: 'volley'; spell: SpellId; count: number; spread: number; dmgMul?: number; delay?: number; color?: number }
  | { kind: 'nova'; radius: number; damage: number; stun: number; knock: number; color: number }
  | { kind: 'heal'; radius: number; amount: number }
  | { kind: 'buff'; dur: number; power: number; defense: number; speed: number; color: number }
  | { kind: 'barrier'; dur: number; radius: number }
  | { kind: 'teleport'; behind: boolean }
  | { kind: 'dash'; dist: number; damage: number; knock: number; color: number }
  | { kind: 'zone'; at: 'self' | 'target'; radius: number; dur: number; dps: number; slow: number; color: number; heal?: number }
  | { kind: 'pull'; radius: number; force: number; color: number }
  | { kind: 'chain'; jumps: number; damage: number; range: number; color: number }
  | { kind: 'meteor'; count: number; radius: number; damage: number; delay: number; color: number; spread: number }
  | { kind: 'mark'; dur: number; amp: number; radius?: number }
  | { kind: 'drain'; damage: number; ratio: number; color: number }
  | { kind: 'cleanse'; radius: number; heal: number }
  | { kind: 'haste'; radius: number; dur: number; power: number; defense: number; speed: number; color: number }
  | { kind: 'silence'; radius: number; dur: number; color: number }
  | { kind: 'blink'; dist: number; color: number }
  | { kind: 'execute'; damage: number; threshold: number; color: number };
export interface Skill { id: string; name: string; nameTh: string; cooldown: number; cost: number; effects: Effect[]; ultimate?: boolean; range: number; support?: boolean }
export const ULT_MAX = 100;
/** Ultimate gauge gain from dealing / taking damage */
export function ultGain(dealt: number, taken: number) { return dealt * 0.55 + taken * 0.35; }
const sk = (id: string, name: string, nameTh: string, cooldown: number, cost: number, range: number, effects: Effect[], extra: Partial<Skill> = {}): Skill => ({ id, name, nameTh, cooldown, cost, range, effects, ...extra });
export const SKILLS: Record<string, { sigs: Skill[]; ult: Skill }> = {
  harry: { sigs: [
    sk('h1', 'Expecto Patronum', 'เอ็กซ์เป็กโต พาโตรนุม', 12, 25, 30, [{ kind: 'volley', spell: 'patronus', count: 1, spread: 0 }]),
    sk('h2', 'Disarming Flurry', 'ปลดอาวุธต่อเนื่อง', 8, 20, 22, [{ kind: 'volley', spell: 'expelliarmus', count: 4, spread: 0.12, delay: 0.12 }]),
    sk('h3', 'Seeker Dodge', 'หลบแบบซีกเกอร์', 9, 10, 0, [{ kind: 'buff', dur: 4, power: 1.15, defense: 1.2, speed: 1.35, color: 0xffd34d }]) ],
    ult: sk('hU', 'The Boy Who Lived', 'เด็กชายผู้รอดชีวิต', 0, 0, 30, [{ kind: 'volley', spell: 'patronus', count: 3, spread: 0.3, dmgMul: 1.6 }, { kind: 'buff', dur: 6, power: 1.3, defense: 1.5, speed: 1.2, color: 0xffe680 }], { ultimate: true }) },
  hermione: { sigs: [
    sk('he1', 'Protego Maxima', 'โพรเทโก แม็กซิมา', 16, 30, 0, [{ kind: 'barrier', dur: 3.5, radius: 10 }], { support: true }),
    sk('he2', 'Oppugno Avis', 'ฝูงนกโจมตี', 9, 22, 24, [{ kind: 'volley', spell: 'avis', count: 6, spread: 0.5 }]),
    sk('he3', 'Episkey', 'เอพิสคีย์', 10, 20, 0, [{ kind: 'heal', radius: 12, amount: 28 }], { support: true }) ],
    ult: sk('heU', 'Brightest Witch of Her Age', 'แม่มดที่ฉลาดที่สุดแห่งยุค', 0, 0, 0, [{ kind: 'heal', radius: 16, amount: 45 }, { kind: 'nova', radius: 9, damage: 30, stun: 1.6, knock: 9, color: 0x9fd8ff }], { ultimate: true, support: true }) },
  ron: { sigs: [
    sk('r1', 'Weasley Wildfire', 'ดอกไม้ไฟวีสลีย์', 10, 22, 22, [{ kind: 'volley', spell: 'firework', count: 5, spread: 0.45, delay: 0.08 }]),
    sk('r2', "Knight's Charge", 'บุกแบบอัศวินหมากรุก', 7, 15, 10, [{ kind: 'dash', dist: 9, damage: 22, knock: 12, color: 0xff7a2a }]),
    sk('r3', 'Stubborn Courage', 'ความกล้าดื้อรั้น', 14, 10, 0, [{ kind: 'buff', dur: 6, power: 1.2, defense: 1.6, speed: 1.1, color: 0xff7a2a }]) ],
    ult: sk('rU', "King's Sacrifice", 'การเสียสละของราชา', 0, 0, 22, [{ kind: 'volley', spell: 'bombarda', count: 6, spread: 0.55, dmgMul: 1.3, delay: 0.1 }], { ultimate: true }) },
  mcgonagall: { sigs: [
    sk('m1', 'Piertotum Locomotor', 'ปิแอร์โททุม โลโคมอเตอร์', 11, 25, 24, [{ kind: 'volley', spell: 'stone', count: 3, spread: 0.25, delay: 0.15 }]),
    sk('m2', 'Transfiguration Snare', 'แปลงร่างตรึง', 10, 20, 0, [{ kind: 'nova', radius: 6, damage: 14, stun: 1.8, knock: 3, color: 0x4dff9a }]),
    sk('m3', 'Animagus Pounce', 'กระโจนแบบแอนิเมจัส', 7, 12, 12, [{ kind: 'dash', dist: 11, damage: 16, knock: 8, color: 0x7dffb0 }]) ],
    ult: sk('mU', 'Duelling Mistress', 'ปรมาจารย์การดวล', 0, 0, 26, [{ kind: 'buff', dur: 7, power: 1.5, defense: 1.4, speed: 1.2, color: 0x4dff9a }, { kind: 'volley', spell: 'stone', count: 5, spread: 0.5 }], { ultimate: true }) },
  neville: { sigs: [
    sk('n1', 'Devil\'s Snare', 'กับดักมาร', 11, 22, 0, [{ kind: 'nova', radius: 6.5, damage: 12, stun: 2.0, knock: 0, color: 0x5bd63a }]),
    sk('n2', 'Mandrake Scream', 'เสียงกรีดร้องแมนเดรก', 12, 20, 0, [{ kind: 'nova', radius: 9, damage: 18, stun: 0.8, knock: 6, color: 0xc6ff6a }]),
    sk('n3', 'Gryffindor Resolve', 'ปณิธานกริฟฟินดอร์', 15, 10, 0, [{ kind: 'buff', dur: 6, power: 1.25, defense: 1.8, speed: 1, color: 0xffcc33 }]) ],
    ult: sk('nU', 'Sword of Gryffindor', 'ดาบกริฟฟินดอร์', 0, 0, 14, [{ kind: 'dash', dist: 12, damage: 55, knock: 16, color: 0xffd700 }, { kind: 'nova', radius: 5, damage: 25, stun: 1, knock: 10, color: 0xffd700 }], { ultimate: true }) },
  luna: { sigs: [
    sk('l1', 'Hare Patronus', 'พาโตรนุสกระต่าย', 11, 22, 30, [{ kind: 'volley', spell: 'patronus', count: 1, spread: 0 }]),
    sk('l2', 'Quibbler Insight', 'ญาณจากเดอะควิบเบลอร์', 13, 18, 0, [{ kind: 'heal', radius: 10, amount: 18 }, { kind: 'buff', dur: 5, power: 1.15, defense: 1.15, speed: 1.15, color: 0xb6e3ff }], { support: true }),
    sk('l3', 'Lumos Flash', 'แสงลูมอสวาบ', 8, 15, 0, [{ kind: 'nova', radius: 7, damage: 8, stun: 1.4, knock: 4, color: 0xfffbe0 }]) ],
    ult: sk('lU', 'Moonlit Dreamscape', 'ห้วงฝันใต้แสงจันทร์', 0, 0, 0, [{ kind: 'nova', radius: 12, damage: 20, stun: 2.2, knock: 5, color: 0xcfe0ff }, { kind: 'heal', radius: 14, amount: 25 }], { ultimate: true }) },
  voldemort: { sigs: [
    sk('v1', 'Fiendfyre', 'ไฟปีศาจ', 9, 25, 26, [{ kind: 'volley', spell: 'fiendfyre', count: 3, spread: 0.4 }]),
    sk('v2', 'Dark Apparition', 'หายตัวแห่งความมืด', 8, 15, 30, [{ kind: 'teleport', behind: true }]),
    sk('v3', 'Dark Shockwave', 'คลื่นกระแทกมืด', 10, 20, 0, [{ kind: 'nova', radius: 8, damage: 24, stun: 0.5, knock: 14, color: 0x6a1bff }]) ],
    ult: sk('vU', "Dark Lord's Wrath", 'พิโรธจอมมาร', 0, 0, 30, [{ kind: 'volley', spell: 'avada', count: 3, spread: 0.35, delay: 0.2 }, { kind: 'nova', radius: 10, damage: 30, stun: 1, knock: 12, color: 0x22ff44 }], { ultimate: true }) },
  bellatrix: { sigs: [
    sk('b1', 'Cursed Daggers', 'มีดต้องสาป', 7, 18, 24, [{ kind: 'volley', spell: 'dagger', count: 5, spread: 0.35, delay: 0.06 }]),
    sk('b2', 'Mad Lunge', 'พุ่งอย่างบ้าคลั่ง', 7, 12, 12, [{ kind: 'dash', dist: 10, damage: 18, knock: 8, color: 0xd0106a }]),
    sk('b3', 'Crucio Frenzy', 'ครูซิโอคลั่ง', 10, 22, 22, [{ kind: 'volley', spell: 'crucio', count: 3, spread: 0.2, delay: 0.15 }]) ],
    ult: sk('bU', 'Unhinged Fanatic', 'ผู้คลั่งศรัทธา', 0, 0, 24, [{ kind: 'buff', dur: 6, power: 1.45, defense: 1.2, speed: 1.35, color: 0xd0106a }, { kind: 'volley', spell: 'dagger', count: 10, spread: 0.8 }], { ultimate: true }) },
};
