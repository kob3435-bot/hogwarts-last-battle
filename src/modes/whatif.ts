import type { CustomBattle } from '../game';
import type { Area } from '../rendering/areas';
export interface WhatIf { id: string; title: { en: string; th: string }; desc: { en: string; th: string }; area: Area; player: string; battle: CustomBattle }
const W = (id: string, en: string, th: string, den: string, dth: string, area: Area, player: string, battle: CustomBattle): WhatIf => ({ id, title: { en, th }, desc: { en: den, th: dth }, area, player, battle });
export const WHAT_IFS: WhatIf[] = [
  W('dumbledore', 'What if Dumbledore had survived?', 'ถ้าดัมเบิลดอร์ยังมีชีวิตอยู่?', 'The headmaster stands at the castle gates beside the defenders.', 'อาจารย์ใหญ่ยืนหยัดที่ประตูปราสาทเคียงข้างผู้ปกป้อง', 'courtyard', 'dumbledore',
    { hogwarts: ['dumbledore', 'harry', 'mcgonagall', 'hermione'], death: ['voldemort', 'bellatrix', 'dolohov', 'lucius', 'yaxley'], army: 140, victory: 'leader' }),
  W('marauders', 'What if the Marauders returned?', 'ถ้ากลุ่มตัวกวนกลับมา?', 'James, Sirius and Remus fight together one last time.', 'เจมส์ ซิเรียส และรีมัส สู้เคียงกันอีกครั้ง', 'courtyard', 'sirius',
    { hogwarts: ['james', 'sirius', 'lupin', 'harry'], death: ['bellatrix', 'greyback', 'dolohov', 'snape', 'macnair'], army: 0, victory: 'elimination' }),
  W('snape', 'What if Snape revealed his loyalty?', 'ถ้าสเนปเปิดเผยว่าภักดีต่อฮอกวอตส์?', 'Severus Snape turns his wand on the Death Eaters in the Great Hall.', 'เซเวอรัส สเนปหันไม้กายสิทธิ์ใส่ผู้เสพความตายในห้องโถงใหญ่', 'hall', 'snape',
    { hogwarts: ['snape', 'mcgonagall', 'flitwick', 'kingsley'], death: ['voldemort', 'carrow', 'alecto', 'yaxley'], army: 0, victory: 'leader' }),
  W('grindelwald', 'What if Grindelwald allied with Voldemort?', 'ถ้ากรินเดลวัลด์ร่วมมือกับโวลเดอมอร์?', 'Two dark lords march on Hogwarts together.', 'จอมมารสองคนบุกฮอกวอตส์พร้อมกัน', 'courtyard', 'harry',
    { hogwarts: ['harry', 'hermione', 'ron', 'mcgonagall', 'kingsley', 'neville'], death: ['voldemort', 'grindelwald', 'bellatrix'], army: 160, victory: 'score' }),
  W('riddle', 'What if young Tom Riddle faced the Trio?', 'ถ้าทอม ริดเดิ้ลวัยหนุ่มเผชิญสามสหาย?', 'The diary memory escapes into the Room of Requirement.', 'ความทรงจำในไดอารี่หลุดออกมาในห้องต้องประสงค์', 'room', 'harry',
    { hogwarts: ['harry', 'ron', 'hermione'], death: ['riddle'], army: 0, victory: 'elimination', mods: { riddle: { hp: 2.9, power: 1.15 } } }),
  W('potters', 'What if the Potters fought back in the forest?', 'ถ้าครอบครัวพอตเตอร์สู้กลับในป่า?', 'Lily and James stand with Harry against the Dark Lord.', 'ลิลี่และเจมส์ยืนหยัดเคียงข้างแฮร์รี่ต่อสู้กับจอมมาร', 'forest', 'lily',
    { hogwarts: ['lily', 'james', 'harry'], death: ['voldemort', 'bellatrix'], army: 0, victory: 'leader', mods: { voldemort: { power: 0.85 } } }),
  W('elderwand', 'What if Voldemort mastered the Elder Wand?', 'ถ้าโวลเดอมอร์เป็นเจ้าของไม้เอลเดอร์อย่างแท้จริง?', 'The Deathstick finally obeys. Survive for 2 minutes.', 'ไม้มรณะยอมรับนายในที่สุด เอาชีวิตรอดให้ได้ 2 นาที', 'hall', 'harry',
    { hogwarts: ['harry', 'hermione', 'ron', 'neville', 'luna', 'ginny'], death: ['voldemort'], army: 0, victory: 'survival', timeLimit: 120, mods: { voldemort: { power: 1.75, hp: 2.5 } } }),
  W('malfoys', 'What if the Malfoys defected?', 'ถ้าครอบครัวมัลฟอยแปรพักตร์?', 'Lucius, Narcissa and Draco join the defence of Hogwarts.', 'ลูเซียส นาร์ซิสซา และเดรโก ร่วมปกป้องฮอกวอตส์', 'courtyard', 'draco',
    { hogwarts: ['lucius', 'narcissa', 'draco', 'harry'], death: ['bellatrix', 'voldemort', 'yaxley', 'rookwood'], army: 120, victory: 'leader' }),
  W('ages', 'Duel of the Ages: Dumbledore vs Grindelwald', 'ดวลแห่งยุค: ดัมเบิลดอร์ ปะทะ กรินเดลวัลด์', 'The legendary 1945 duel, replayed in the Great Hall.', 'การดวลในตำนานปี 1945 ในห้องโถงใหญ่', 'hall', 'dumbledore',
    { hogwarts: ['dumbledore'], death: ['grindelwald'], army: 0, victory: 'elimination' }),
];
