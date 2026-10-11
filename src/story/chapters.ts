import type { Objective, Line, Txt } from './objectives';
import type { Flags } from './save';
import type { Area } from '../rendering/areas';
export type V3 = [number, number, number];
export interface Shot { cam: V3; to?: V3; look: V3 | string; dur: number; lines?: Line[]; event?: string }
export interface Cutscene { shots: Shot[] }
export interface Chapter { n: number; title: Txt; area: Area; mode: 'duel' | 'war'; player: string; allies: string[]; start: [number, number]; yaw?: number;
  war?: { hogwarts: boolean; death: boolean; missions: boolean }; bossFight?: boolean; intro: Cutscene; outro: (f: Flags) => Cutscene; objectives: Objective[]; variant?: (f: Flags, c: Chapter) => void }
const L = (who: string, en: string, th: string): Line => ({ who, en, th });
const T = (en: string, th: string): Txt => ({ en, th });
export const NAMES_TH: Record<string, string> = { 'Harry': 'แฮร์รี่', 'Ron': 'รอน', 'Hermione': 'เฮอร์ไมโอนี่', 'Neville': 'เนวิลล์', 'Luna': 'ลูน่า', 'McGonagall': 'มักกอนนากัล', 'Voldemort': 'โวลเดอมอร์', 'Bellatrix': 'เบลลาทริกซ์', 'Fred': 'เฟร็ด', 'Dolohov': 'โดโลฮอฟ', 'Greyback': 'เกรย์แบ็ก', 'Carrow': 'แคร์โรว์', 'Narrator': 'ผู้บรรยาย', 'Dumbledore': 'ดัมเบิลดอร์', 'Golgor': 'กอลกอร์', 'Death Eater': 'ผู้เสพความตาย' };

export const CHAPTERS_DATA: Chapter[] = [
  { n: 1, title: T('Return to Hogwarts', 'กลับสู่ฮอกวอตส์'), area: 'courtyard', mode: 'duel', player: 'harry', allies: ['ron', 'hermione'], start: [0, 82], yaw: Math.PI,
    intro: { shots: [
      { cam: [30, 40, 120], to: [10, 18, 95], look: [0, 10, 0], dur: 6, lines: [L('Narrator', 'May 1998. The castle that was once a home now lies under the Dark Lord\'s shadow.', 'พฤษภาคม 1998 ปราสาทที่เคยเป็นบ้าน บัดนี้ตกอยู่ใต้เงาของจอมมาร')] },
      { cam: [3, 2.4, -6], look: 'harry', dur: 5, lines: [L('Hermione', 'One Horcrux is hidden inside Hogwarts. We go in quietly, find it, and get out.', 'ฮอร์ครักซ์ชิ้นหนึ่งซ่อนอยู่ในฮอกวอตส์ เราเข้าไปเงียบ ๆ หามันให้เจอแล้วรีบออกมา'), L('Ron', '"Quietly." Right. Because that always works for us.', '"เงียบ ๆ" งั้นเหรอ เหมือนพวกเราเคยทำได้งั้นแหละ'), L('Harry', 'Stay close. The Carrows patrol the bridge at night.', 'อยู่ใกล้ ๆ ไว้ พวกแคร์โรว์ลาดตระเวนบนสะพานตอนกลางคืน')] } ] },
    outro: () => ({ shots: [{ cam: [3, 2.4, 6], look: 'mcgonagall', dur: 5, lines: [L('McGonagall', 'Potter! You should not be here... but I am very glad you are.', 'พอตเตอร์! เธอไม่ควรมาที่นี่... แต่ฉันดีใจมากที่เธอมา'), L('Harry', 'He\'s coming, Professor. We need time — and the Room of Requirement.', 'เขากำลังมาครับศาสตราจารย์ เราต้องการเวลา และห้องต้องประสงค์')] }] }),
    objectives: [
      { kind: 'reach', label: T('Cross the bridge to the courtyard gate', 'ข้ามสะพานไปยังประตูลานปราสาท'), x: 0, z: 38, r: 4, barks: [L('Ron', 'Mind the gaps in the planks, mate.', 'ระวังช่องว่างไม้กระดานด้วยนะเพื่อน')] },
      { kind: 'defeat', label: T('Defeat Amycus Carrow\'s patrol', 'จัดการหน่วยลาดตระเวนของอามีคัส แคร์โรว์'), spawn: [{ id: 'carrow', x: 0, z: 18 }, { id: 'de0', x: -6, z: 14 }, { id: 'de1', x: 6, z: 14 }], barks: [L('Carrow', 'Potter?! Summon the Dark Lord — no, seize him first!', 'พอตเตอร์?! เรียกจอมมาร — ไม่ จับมันก่อน!')] },
      { kind: 'talk', label: T('Find Professor McGonagall at the Great Hall doors', 'ไปหาศาสตราจารย์มักกอนนากัลที่ประตูห้องโถงใหญ่'), target: 'mcgonagall', spawn: [{ id: 'mcgonagall', x: 0, z: -40, team: 'hogwarts', scripted: true }] } ] },
  { n: 2, title: T('The Room of Requirement', 'ห้องต้องประสงค์'), area: 'room', mode: 'duel', player: 'harry', allies: ['ron', 'hermione'], start: [0, 24],
    intro: { shots: [{ cam: [0, 14, 30], to: [0, 6, 14], look: [0, 2, 0], dur: 5, lines: [L('Neville', 'Harry! The Room has kept us safe all year. It gives us whatever we need.', 'แฮร์รี่! ห้องนี้คุ้มครองพวกเรามาทั้งปี มันมอบทุกอย่างที่เราต้องการ'), L('Luna', 'It also gave us a lot of hammocks. That was nice.', 'แล้วมันก็ให้เปลญวนเรามาเยอะด้วย ดีออก')] }] },
    outro: () => ({ shots: [{ cam: [-6, 4, 6], look: 'harry', dur: 5, lines: [L('Harry', 'Ravenclaw\'s lost diadem — it\'s the Horcrux. And I think I know where it is.', 'มงกุฎที่หายไปของเรเวนคลอ — นั่นคือฮอร์ครักซ์ และฉันคิดว่ารู้แล้วว่ามันอยู่ที่ไหน'), L('Luna', 'The Grey Lady would know. But you already do.', 'ท่านหญิงสีเทาคงรู้ แต่เธอรู้อยู่แล้วนี่')] }] }),
    objectives: [
      { kind: 'talk', label: T('Greet Neville and Luna', 'ทักทายเนวิลล์และลูน่า'), target: 'neville', spawn: [{ id: 'neville', x: -3, z: 2, team: 'hogwarts' }, { id: 'luna', x: 3, z: 2, team: 'hogwarts' }] },
      { kind: 'defeat', label: T('Snatchers followed you in — drive them out', 'พวกสแนตเชอร์ตามเข้ามา — ขับไล่พวกมัน'), spawn: [{ id: 'de0', x: -20, z: -22 }, { id: 'de1', x: 20, z: -22 }, { id: 'de2', x: 0, z: -26 }, { id: 'carrow', x: 0, z: -22 }], barks: [L('Neville', 'Dumbledore\'s Army — wands up!', 'กองทัพดัมเบิลดอร์ — ชูไม้กายสิทธิ์!')] },
      { kind: 'survive', secs: 30, label: T('Hold the Room against the second wave (30s)', 'ป้องกันห้องจากระลอกที่สอง (30 วินาที)'), spawn: [{ id: 'de3', x: -22, z: -20 }, { id: 'de4', x: 22, z: -20 }, { id: 'de0', x: 0, z: -26 }, { id: 'de1', x: -10, z: -26 }] } ] },
  { n: 3, title: T('The Last Horcrux Hunt', 'ตามล่าฮอร์ครักซ์'), area: 'room', mode: 'duel', player: 'harry', allies: ['ron', 'hermione'], start: [-20, 22],
    intro: { shots: [{ cam: [-24, 10, 26], to: [10, 12, 0], look: [20, 3, -22], dur: 6, lines: [L('Narrator', 'The Room of Hidden Things: centuries of secrets stacked like mountains.', 'ห้องของที่ถูกซ่อน: ความลับนับศตวรรษถูกกองไว้ราวภูเขา'), L('Hermione', 'Something here is calling to you, Harry. I can see it in your face.', 'มีบางอย่างที่นี่กำลังเรียกเธอ แฮร์รี่ ฉันเห็นได้จากสีหน้าเธอ')] }] },
    outro: () => ({ shots: [{ cam: [0, 6, 34], look: [0, 2, 20], dur: 5, event: 'flash', lines: [L('Ron', 'That fire was alive. It was hunting us!', 'ไฟนั่นมีชีวิต มันไล่ล่าพวกเรา!'), L('Hermione', 'Fiendfyre destroys Horcruxes. The diadem is gone.', 'ไฟปีศาจทำลายฮอร์ครักซ์ได้ มงกุฎหายไปแล้ว'), L('Harry', 'Then only the snake is left.', 'งั้นเหลือแค่งูตัวนั้น')] }] }),
    objectives: [
      { kind: 'collect', label: T('Find the diadem among the junk piles', 'ค้นหามงกุฎในกองของเก่า'), x: 22, z: -24, spawn: [{ id: 'de2', x: 14, z: -6 }, { id: 'de3', x: 22, z: -8 }], barks: [L('Harry', 'It\'s here somewhere... I can feel it.', 'มันอยู่แถวนี้... ฉันรู้สึกได้')] },
      { kind: 'reach', label: T('FIENDFYRE! Escape to the door', 'ไฟปีศาจ! หนีไปที่ประตู'), x: 0, z: 27, r: 3, timeLimit: 45, event: 'fiendfyre', barks: [L('Ron', 'RUN!', 'วิ่ง!')] } ] },
  { n: 4, title: T('Hogwarts Prepares for War', 'เตรียมป้องกันปราสาท'), area: 'courtyard', mode: 'war', player: 'mcgonagall', allies: ['harry', 'neville'], start: [0, -28], yaw: Math.PI, war: { hogwarts: true, death: false, missions: false },
    intro: { shots: [{ cam: [0, 25, -60], to: [0, 18, -20], look: [0, 0, 10], dur: 6, lines: [L('Voldemort', 'You have until midnight. Give me Harry Potter, and none shall be harmed.', 'พวกเจ้ามีเวลาถึงเที่ยงคืน ส่งแฮร์รี่ พอตเตอร์มา แล้วจะไม่มีใครต้องเจ็บ'), L('McGonagall', 'Hogwarts is threatened. Man the boundaries. Protect us!', 'ฮอกวอตส์ถูกคุกคาม ประจำแนวป้องกัน ปกป้องพวกเรา!')] }] },
    outro: f => ({ shots: [{ cam: [8, 5, 20], look: [0, 2, 30], dur: 5, lines: f.wardsComplete ? [L('McGonagall', 'Every barricade holds a ward. Let them come.', 'ทุกแนวกั้นมีเวทคุ้มกันแล้ว ให้พวกมันมาเถอะ')] : [L('McGonagall', 'Not every ward is finished... we fight with what we have.', 'เวทคุ้มกันยังไม่ครบ... เราต้องสู้ด้วยสิ่งที่มี')] }] }),
    objectives: [
      { kind: 'interact', label: T('Cast protective wards: stand in 3 ward circles (F = faster)', 'ร่ายเวทคุ้มกัน: ยืนในวงเวท 3 จุด (กด F = เร็วขึ้น)'), points: [[-6, 31], [6, 31], [0, -37]], hold: 1.5, timeLimit: 60, optional: true, flag: 'wardsComplete', barks: [L('McGonagall', 'Protego Maxima... Fianto Duri... Repello Inimicum!', 'โพรเทโก แม็กซิมา... ฟิอันโต ดูริ... รีเปลโล อินิมิคัม!')] },
      { kind: 'reach', label: T('Animate the stone guardians at the fountain', 'ปลุกอัศวินหินที่น้ำพุ'), x: 0, z: -6, r: 5, event: 'statues', barks: [L('McGonagall', 'I have always wanted to use that spell.', 'ฉันอยากใช้คาถานั้นมานานแล้ว')] },
      { kind: 'defeat', label: T('Repel the scouts on the bridge', 'ขับไล่หน่วยสอดแนมบนสะพาน'), spawn: [{ id: 'de0', x: 0, z: 50 }, { id: 'de1', x: -2, z: 56 }, { id: 'de2', x: 2, z: 56 }, { id: 'carrow', x: 0, z: 60 }] } ] },
  { n: 5, title: T('The First Assault', 'การโจมตีระลอกแรก'), area: 'courtyard', mode: 'war', player: 'harry', allies: ['ron', 'hermione'], start: [0, -24],
    intro: { shots: [{ cam: [0, 30, 100], to: [0, 14, 40], look: [0, 4, 0], dur: 6, lines: [L('Narrator', 'Midnight. The shield above the castle cracks like glass.', 'เที่ยงคืน เกราะเหนือปราสาทแตกร้าวราวกระจก'), L('Harry', 'Here they come. Hold the courtyard!', 'พวกมันมาแล้ว รักษาลานปราสาทไว้!')] }] },
    outro: () => ({ shots: [{ cam: [6, 4, 6], look: 'harry', dur: 4, lines: [L('Hermione', 'Dolohov\'s down — but listen. Something huge is crossing the bridge.', 'โดโลฮอฟล้มแล้ว — แต่ฟังสิ มีอะไรตัวใหญ่มากกำลังข้ามสะพาน')] }] }),
    variant: (f, c) => { if (f.wardsComplete) c.objectives[0].label = T('Hold the line (wards slow the enemy) — 60s', 'ยึดแนวไว้ (เวทคุ้มกันช่วยชะลอศัตรู) — 60 วินาที'); },
    objectives: [
      { kind: 'survive', secs: 60, label: T('Survive the first assault — 60s', 'ต้านการบุกระลอกแรก — 60 วินาที') },
      { kind: 'defeat', label: T('Duel Antonin Dolohov', 'ดวลกับแอนโทนิน โดโลฮอฟ'), target: 'dolohov', spawn: [{ id: 'dolohov', x: 0, z: 14 }], barks: [L('Dolohov', 'I remember you, boy. The Ministry. This time there is no one to save you.', 'ข้าจำเจ้าได้ ไอ้หนู ที่กระทรวง คราวนี้ไม่มีใครช่วยเจ้าแล้ว')] } ] },
  { n: 6, title: T('The Giants Arrive', 'ยักษ์บุกฮอกวอตส์'), area: 'courtyard', mode: 'war', player: 'ron', allies: ['harry', 'hermione', 'neville'], start: [0, -10],
    intro: { shots: [{ cam: [-12, 6, 40], to: [-6, 12, 30], look: [0, 6, 60], dur: 5, event: 'giants', lines: [L('Ron', 'Giants. Of course it\'s giants. Why is it never something small?', 'ยักษ์ แน่นอนว่าต้องเป็นยักษ์ ทำไมไม่เคยเป็นอะไรตัวเล็ก ๆ บ้างนะ'), L('Golgor', 'SMASH THE STONE HOUSE!', 'ทุบบ้านหินให้พัง!')] }] },
    outro: () => ({ shots: [{ cam: [5, 8, 30], look: [0, 0, 36], dur: 4, lines: [L('Neville', 'The big one\'s down! They\'re pulling back to the courtyard!', 'ตัวใหญ่ล้มแล้ว! พวกมันถอยกลับไปที่ลานปราสาท!')] }] }),
    objectives: [
      { kind: 'defeat', label: T('Bring down Giant Commander Golgor', 'โค่นผู้บัญชาการยักษ์กอลกอร์'), target: 'giantcmdr', spawn: [{ id: 'giantcmdr', x: 0, z: 40 }, { id: 'x', npc: 'giant', x: 0, z: 70 }] },
      { kind: 'warScore', score: 5, secs: 120, label: T('Retake the courtyard (war progress ≥ +5, or hold out 120s)', 'ยึดลานปราสาทคืน (ความคืบหน้า ≥ +5 หรือยื้อไว้ 120 วินาที)') } ] },
  { n: 7, title: T('The Battle of the Courtyard', 'ศึกกลางลานปราสาท'), area: 'courtyard', mode: 'war', player: 'hermione', allies: ['ron', 'luna', 'neville'], start: [0, -12],
    intro: { shots: [{ cam: [6, 3, 5], look: 'bellatrix', dur: 5, event: 'spawnBella', lines: [L('Bellatrix', 'The Mudblood! I still have your scream in my ears, little girl.', 'ยัยเลือดสีโคลน! ข้ายังได้ยินเสียงกรีดร้องของเจ้าอยู่เลย'), L('Hermione', 'Not this time.', 'ไม่ใช่ครั้งนี้')] }] },
    outro: f => ({ shots: [{ cam: [0, 6, 10], look: [0, 1, 0], dur: 4, lines: f.bellatrixWounded ? [L('Luna', 'She ran. She won\'t forget you hurt her.', 'นางหนีไปแล้ว นางจะไม่ลืมว่าเธอทำให้นางเจ็บ')] : [L('Ron', 'She got away... she\'ll be back.', 'นางหนีไปได้... นางจะกลับมาอีก')] }] }),
    objectives: [
      { kind: 'bossHp', target: 'bellatrix', frac: 0.35, label: T('Drive back Bellatrix (reduce to 35%)', 'ผลักดันเบลลาทริกซ์ (ลดพลังเหลือ 35%)'), event: 'bellaFight', spawn: [{ id: 'bellatrix', x: 0, z: 10 }] },
      { kind: 'revive', count: 3, label: T('Revive 3 wounded students (hold F / healing)', 'ชุบชีวิตนักเรียนที่บาดเจ็บ 3 คน (กด F ค้าง / เวทรักษา)'), timeLimit: 50, optional: true, flag: 'studentsSaved', spawn: [{ id: 'x', npc: 'student', x: -8, z: -14, downed: true, count: 4 }] } ] },
  { n: 8, title: T('The Fall of the Defenders', 'การสูญเสียครั้งใหญ่'), area: 'courtyard', mode: 'war', player: 'harry', allies: ['ron', 'hermione'], start: [10, -10],
    intro: { shots: [{ cam: [-6, 3, 3], look: 'fred', dur: 5, event: 'spawnFred', lines: [L('Fred', 'Percy just made a joke! Did everyone hear it? Mark the date!', 'เพอร์ซีย์เพิ่งเล่นมุก! ทุกคนได้ยินไหม จดวันที่ไว้เลย!'), L('Harry', 'Fred — the wall behind you! They\'re blasting it!', 'เฟร็ด — กำแพงข้างหลังนาย! พวกมันกำลังระเบิดมัน!')] }] },
    outro: f => ({ shots: [{ cam: [24, 3, -6], look: [22, 1, -4], dur: 6, lines: f.fredSaved ? [L('Fred', 'Saved by Harry Potter. George will never let me live this down.', 'แฮร์รี่ พอตเตอร์ช่วยชีวิตไว้ จอร์จคงล้อฉันไปตลอดชีวิต'), L('Ron', 'Shut up and duck, Fred.', 'หุบปากแล้วหมอบลงซะ เฟร็ด')] : [L('Ron', 'Fred... no. NO!', 'เฟร็ด... ไม่ ไม่นะ!'), L('Hermione', 'Ron — we have to keep moving. For him.', 'รอน — เราต้องไปต่อ เพื่อเขา')] }] }),
    objectives: [
      { kind: 'defeat', label: T('Save Fred — defeat his attackers before the wall blows (45s)', 'ช่วยเฟร็ด — จัดการผู้โจมตีก่อนกำแพงระเบิด (45 วินาที)'), protect: 'fred', timeLimit: 45, optional: true, flag: 'fredSaved', onFail: 'explodeFred', spawn: [{ id: 'fred', x: 22, z: -4, team: 'hogwarts' }, { id: 'de0', x: 28, z: 6 }, { id: 'de1', x: 28, z: -14 }, { id: 'de2', x: 31, z: -4 }, { id: 'carrow', x: 20, z: 8 }] },
      { kind: 'defeat', label: T('Stop Fenrir Greyback', 'หยุดเฟนเรียร์ เกรย์แบ็ก'), target: 'greyback', spawn: [{ id: 'greyback', x: -20, z: 6 }], barks: [L('Greyback', 'So many young ones... so tender.', 'เด็ก ๆ มากมาย... ช่างน่ากินนัก')] } ] },
  { n: 9, title: T('The Forbidden Forest', 'การเผชิญหน้ากับโวลเดอมอร์'), area: 'forest', mode: 'duel', player: 'harry', allies: [], start: [0, 55],
    intro: { shots: [{ cam: [3, 2.4, -6], look: 'harry', dur: 6, lines: [L('Voldemort', 'Harry Potter. I will wait one hour in the Forbidden Forest. Come alone.', 'แฮร์รี่ พอตเตอร์ ข้าจะรอหนึ่งชั่วโมงในป่าต้องห้าม มาคนเดียว'), L('Harry', 'Everyone who dies tonight dies because of me. Not anymore.', 'ทุกคนที่ตายคืนนี้ตายเพราะฉัน พอกันที')] }] },
    outro: () => ({ shots: [
      { cam: [6, 3, 6], look: 'voldemort', dur: 5, event: 'voldyReveal', lines: [L('Voldemort', 'Harry Potter... the Boy Who Lived. Come to die.', 'แฮร์รี่ พอตเตอร์... เด็กชายผู้รอดชีวิต มาเพื่อตาย')] },
      { cam: [-3, 2.2, -5], look: 'harry', dur: 4, lines: [L('Harry', '...', '...')] },
      { cam: [0, 8, 14], look: [0, 1, 2], dur: 4, event: 'avada', lines: [L('Voldemort', 'Avada Kedavra!', 'อวาดา เคดาฟรา!')] } ] }),
    objectives: [
      { kind: 'defeat', label: T('Repel the Dementors (use Expecto Patronum: key 1)', 'ขับไล่ผู้คุมวิญญาณ (ใช้เอ็กซ์เป็กโต พาโตรนุม: ปุ่ม 1)'), spawn: [{ id: 'dementorE', x: -6, z: 32 }, { id: 'dementorE', x: 6, z: 30 }, { id: 'dementorE', x: 0, z: 24 }], barks: [L('Harry', 'Think of something happy... Expecto Patronum!', 'นึกถึงสิ่งที่มีความสุข... เอ็กซ์เป็กโต พาโตรนุม!')] },
      { kind: 'reach', label: T('Walk alone into the clearing', 'เดินเข้าไปในลานโล่งเพียงลำพัง'), x: 0, z: 6, r: 3 } ] },
  { n: 10, title: T('The Return of Harry Potter', 'การกลับมาของแฮร์รี่'), area: 'courtyard', mode: 'duel', player: 'harry', allies: [], start: [0, 70],
    intro: { shots: [
      { cam: [0, 5, 5], look: [0, 3, 0], dur: 6, event: 'white', lines: [L('Dumbledore', 'You are braver than I ever was, Harry. The part of him inside you is gone.', 'เธอกล้าหาญกว่าที่ฉันเคยเป็น แฮร์รี่ ส่วนของเขาที่อยู่ในตัวเธอได้หายไปแล้ว'), L('Harry', 'Then I can go back.', 'งั้นผมกลับไปได้')] },
      { cam: [5, 4, 6], look: 'harry', dur: 5, event: 'unwhite', lines: [L('Narrator', 'Hidden beneath the Cloak, Harry slips past the Death Eaters guarding the bridge.', 'ซ่อนตัวใต้ผ้าคลุมล่องหน แฮร์รี่ลอบผ่านผู้เสพความตายที่เฝ้าสะพาน')] } ] },
    outro: () => ({ shots: [{ cam: [-4, 3, 4], look: 'neville', dur: 6, event: 'reveal', lines: [L('Neville', 'It doesn\'t matter that Harry\'s gone. He\'s still with us — and so is everyone we lost!', 'ไม่สำคัญว่าแฮร์รี่จะจากไป เขายังอยู่กับพวกเรา — และทุกคนที่เราเสียไปด้วย!'), L('Harry', 'Neville! I\'m here!', 'เนวิลล์! ฉันอยู่นี่!')] }] }),
    objectives: [
      { kind: 'reach', label: T('Sneak past the guards under the Cloak (casting reveals you)', 'ลอบผ่านยามใต้ผ้าคลุม (ร่ายเวทจะทำให้ถูกเห็น)'), x: 0, z: 8, r: 4, event: 'cloak', spawn: [{ id: 'de0', x: -3, z: 46 }, { id: 'de1', x: 3, z: 40 }, { id: 'carrow', x: 0, z: 30 }, { id: 'neville', x: 0, z: 0, team: 'hogwarts', scripted: true }] },
      { kind: 'defeat', label: T('Fight alongside Neville!', 'ต่อสู้เคียงข้างเนวิลล์!'), event: 'uncloak', spawn: [{ id: 'de2', x: -8, z: 18 }, { id: 'de3', x: 8, z: 18 }, { id: 'de4', x: 0, z: 22 }, { id: 'ron', x: -4, z: -6, team: 'hogwarts' }, { id: 'hermione', x: 4, z: -6, team: 'hogwarts' }] } ] },
  { n: 11, title: T('The Final Resistance', 'การต่อสู้ครั้งสุดท้าย'), area: 'courtyard', mode: 'war', player: 'neville', allies: ['ron', 'hermione', 'luna'], start: [0, -6],
    intro: { shots: [{ cam: [5, 4, 10], look: 'nagini', dur: 5, event: 'spawnNagini', lines: [L('Neville', 'The snake. Harry said it has to die. Leave it to me.', 'งูตัวนั้น แฮร์รี่บอกว่ามันต้องตาย ปล่อยให้ผมจัดการ'), L('Luna', 'Nargles hate snakes too, you know.', 'นาร์เกิลก็เกลียดงูนะ รู้ไหม')] }] },
    variant: (f, c) => { if (f.fredSaved) { c.allies = [...c.allies, 'fred']; c.intro.shots[0].lines!.push(L('Fred', 'Did someone order fireworks? Wildfire Whizzbangs, on the house!', 'มีใครสั่งดอกไม้ไฟไหม ไวลด์ไฟร์วิซแบง ฟรีจ้า!')); } },
    outro: f => ({ shots: [{ cam: [0, 5, 12], look: [0, 1, 0], dur: 5, lines: [L('Narrator', 'The last Horcrux is gone. Only the Dark Lord himself remains.', 'ฮอร์ครักซ์ชิ้นสุดท้ายถูกทำลาย เหลือเพียงจอมมารเท่านั้น'), ...(f.fredSaved ? [L('Fred', 'Right then. Let\'s go win this.', 'เอาล่ะ ไปชนะกันเถอะ')] : [])] }] }),
    objectives: [
      { kind: 'defeat', label: T('Destroy Nagini — only Neville\'s sword truly harms her (key 1-3 / R)', 'ทำลายนากีนี — มีแค่ดาบของเนวิลล์ที่ทำร้ายนางได้จริง (ปุ่ม 1-3 / R)'), target: 'nagini', spawn: [{ id: 'nagini', x: 0, z: 14 }] },
      { kind: 'defeat', label: T('Defeat Bellatrix Lestrange', 'เอาชนะเบลลาทริกซ์ เลสแตรงจ์'), target: 'bellatrix', spawn: [{ id: 'bellatrix', x: 0, z: 18 }], event: 'bellaFinal', barks: [L('Bellatrix', 'Little Longbottom! I knew your parents...', 'เจ้าลองบัตท่อมตัวน้อย! ข้ารู้จักพ่อแม่เจ้านะ...')] } ] },
  { n: 12, title: T('Harry Potter vs Lord Voldemort', 'การดวลตัดสินสงคราม'), area: 'hall', mode: 'duel', player: 'harry', allies: [], start: [0, 22], bossFight: true,
    intro: { shots: [
      { cam: [14, 12, 30], to: [6, 6, 10], look: [0, 2, 0], dur: 6, event: 'hallCrowd', lines: [L('Narrator', 'The Great Hall. Every survivor watches as the last duel begins.', 'ห้องโถงใหญ่ ผู้รอดชีวิตทุกคนเฝ้ามองการดวลครั้งสุดท้าย')] },
      { cam: [-3, 2.5, 6], look: 'voldemort', dur: 5, lines: [L('Voldemort', 'Dumbledore\'s puppet. Do you think love will save you twice?', 'หุ่นเชิดของดัมเบิลดอร์ คิดว่าความรักจะช่วยเจ้าได้สองครั้งหรือ')] },
      { cam: [3, 2.5, -6], look: 'harry', dur: 5, lines: [L('Harry', 'The wand was never yours, Tom. It answers to me.', 'ไม้กายสิทธิ์นั่นไม่เคยเป็นของคุณ ทอม มันตอบสนองผม')] } ] },
    outro: f => ({ shots: [
      { cam: [0, 6, 14], to: [0, 10, 24], look: [0, 1, -16], dur: 5, lines: [L('Narrator', 'The Dark Lord falls. Morning light pours through the broken windows.', 'จอมมารล้มลง แสงยามเช้าส่องผ่านหน้าต่างที่แตกร้าว')] },
      { cam: [4, 2.5, -6], look: 'harry', dur: 7, lines: ending(f) } ] }),
    variant: (f, c) => { if (f.fredSaved) c.allies = ['fred']; },
    objectives: [
      { kind: 'defeat', label: T('Defeat Lord Voldemort (4 phases)', 'เอาชนะลอร์ดโวลเดอมอร์ (4 เฟส)'), target: 'voldemort', spawn: [{ id: 'voldemort', x: 0, z: -22, hpFrac: 0.5 }], barks: [L('Voldemort', 'Kneel, boy!', 'คุกเข่าซะ ไอ้หนู!')] } ] },
];
function ending(f: Flags): Line[] {
  const l: Line[] = [];
  l.push(f.fredSaved ? L('Fred', 'Both Weasley twins alive to see this. Mum\'s going to cry for a week.', 'แฝดวีสลีย์รอดมาเห็นวันนี้ทั้งคู่ แม่คงร้องไห้ไปทั้งสัปดาห์') : L('Ron', 'Fred would have made a joke right now.', 'ถ้าเฟร็ดอยู่ เขาคงเล่นมุกตอนนี้แน่'));
  l.push(f.wardsComplete ? L('McGonagall', 'The wards held the castle long enough. Hogwarts stands.', 'เวทคุ้มกันยื้อปราสาทไว้ได้นานพอ ฮอกวอตส์ยังยืนหยัด') : L('McGonagall', 'We will rebuild every stone.', 'เราจะสร้างทุกก้อนหินขึ้นมาใหม่'));
  l.push(f.studentsSaved ? L('Neville', 'Every student we pulled off the courtyard is alive because you didn\'t give up.', 'นักเรียนทุกคนที่เราช่วยจากลานปราสาทรอดเพราะพวกเธอไม่ยอมแพ้') : L('Hermione', 'Not everyone made it. We will remember every name.', 'ไม่ใช่ทุกคนที่รอด เราจะจดจำทุกชื่อ'));
  l.push(L('Harry', 'It\'s over. Let\'s go home.', 'มันจบแล้ว กลับบ้านกันเถอะ'));
  return l;
}
export function chapterFor(n: number, flags: Flags): Chapter {
  const base = CHAPTERS_DATA[n - 1]; const c: Chapter = { ...base, allies: [...base.allies], intro: { shots: base.intro.shots.map(s => ({ ...s, lines: s.lines ? [...s.lines] : undefined })) }, objectives: base.objectives.map(o => ({ ...o })) };
  base.variant?.(flags, c); return c;
}
