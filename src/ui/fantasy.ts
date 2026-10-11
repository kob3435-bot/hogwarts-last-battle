/** "Original Fantasy" mode: replaces franchise names/terms with original ones for a legally distributable build.
 * Enabled by settings.fantasy (runtime toggle, applied on reload) or the build flag VITE_FANTASY=1. */
const EN: [string, string][] = [
  ['Mad-Eye', 'Hawk-Eye'], ['Moony', 'Greymoon'], ['Nymphadora', 'Nymphelle'], ['Padfoot', 'Blackpaw'], ['Prongs', 'Antlers'], ['Wrackspurts', 'Buzzwisps'], ['Wrackspurt', 'Buzzwisp'], ['Bat-Bogey', 'Bat-Hex'], ['Golgor', 'Gorrak'],
  ['Harry Potter', 'Aren Vale'], ['Hermione Granger', 'Mira Thorne'], ['Ron Weasley', 'Rowan Ashby'], ['Ginny Weasley', 'Gwen Ashby'], ['Fred Weasley', 'Finn Ashby'], ['George Weasley', 'Garrick Ashby'], ['Molly Weasley', 'Maud Ashby'], ['Arthur Weasley', 'Alden Ashby'],
  ['Lord Voldemort', 'The Hollow King'], ['Voldemort', 'the Hollow King'], ['Tom Riddle', 'Tobias Rell'], ['Tom', 'Tobias'], ['Bellatrix Lestrange', 'Belisa Vex'], ['Bellatrix', 'Belisa'], ['Minerva McGonagall', 'Morwen Gale'], ['McGonagall', 'Morwen'],
  ['Neville Longbottom', 'Nolan Brook'], ['Longbottom', 'Brook'], ['Neville', 'Nolan'], ['Luna Lovegood', 'Lyra Moonwell'], ['Luna', 'Lyra'], ['Albus Dumbledore', 'Aldric Thorn'], ['Aberforth Dumbledore', 'Abner Thorn'], ['Dumbledore', 'Aldric'],
  ['Gellert Grindelwald', 'Gerrit Vael'], ['Grindelwald', 'Vael'], ['Severus Snape', 'Silas Crowe'], ['Snape', 'Crowe'], ['Sirius Black', 'Soren Black'], ['Sirius', 'Soren'], ['James Potter', 'Jarek Vale'], ['Lily Potter', 'Lise Vale'], ['Potters', 'Vales'], ['Potter', 'Vale'],
  ['Remus Lupin', 'Rhys Lowe'], ['Lupin', 'Lowe'], ['Nymphadora Tonks', 'Nyx Tanner'], ['Tonks', 'Tanner'], ['Kingsley Shacklebolt', 'Kael Stormwright'], ['Rubeus Hagrid', 'Rufus Hale'], ['Hagrid', 'Hale'], ['Filius Flitwick', 'Fenn Whitlock'], ['Horace Slughorn', 'Horatio Sloane'], ['Pomona Sprout', 'Petra Bloom'],
  ['Lucius Malfoy', 'Lucan Mordaine'], ['Narcissa Malfoy', 'Nerys Mordaine'], ['Draco Malfoy', 'Dorian Mordaine'], ['Malfoy', 'Mordaine'], ['Fenrir Greyback', 'Fenris Grael'], ['Greyback', 'Grael'], ['Antonin Dolohov', 'Anton Drevik'], ['Dolohov', 'Drevik'], ['Alastor Moody', 'Alaric Grimm'],
  ['Corban Yaxley', 'Corvin Yarrow'], ['Augustus Rookwood', 'August Rooke'], ['Walden Macnair', 'Waldo Macrae'], ['Amycus Carrow', 'Amos Carrick'], ['Alecto Carrow', 'Alys Carrick'], ['Carrows', 'Carricks'], ['Carrow', 'Carrick'], ['Cho Chang', 'Cora Lin'], ['Seamus Finnigan', 'Shay Finnick'],
  ['Nagini', 'Nazreth'], ['Harry', 'Aren'], ['Hermione', 'Mira'], ['Ron', 'Rowan'], ['Weasleys', 'Ashbys'], ['Weasley', 'Ashby'], ['Fred', 'Finn'], ['George', 'Garrick'], ['Ginny', 'Gwen'], ['Molly', 'Maud'],
  ['Hogwarts', 'Highspire'], ['Death Eaters', 'Shade Legion'], ['Death Eater', 'Shade'], ['Dark Lord', 'Hollow King'], ['Horcrux', 'Soul Anchor'], ['Ravenclaw', 'Ravenmark'], ['Slytherin', 'Serpentine'], ['Gryffindor', 'Lionheart'], ['Hufflepuff', 'Badgerholt'],
  ['Order of the Phoenix', 'Order of the Ember'], ['Dumbledore\'s Army', 'Aldric\'s Guard'], ['Marauders', 'Night Wanderers'], ['Expecto Patronum', 'Guardian Light'], ['Patronum', 'Guardian'], ['Patronus', 'Guardian'], ['Avada Kedavra', 'Word of Ending'], ['Expelliarmus', 'Disarm Bolt'], ['Stupefy', 'Stun Bolt'],
  ['Crucio', 'Torment'], ['Cruciatus', 'Torment'], ['Sectumsempra', 'Rending Curse'], ['Fiendfyre', 'Hellflame'], ['Confringo', 'Blast Hex'], ['Bombarda', 'Breaker'], ['Depulso', 'Repulse'], ['Lumos Maxima', 'Sunburst'], ['Piertotum Locomotor', 'Stoneguard Awaken'], ['Piertotum', 'Stoneguard'], ['Protego', 'Ward'],
  ['Forbidden Forest', 'Thornwood'], ['Room of Requirement', 'Hall of Needs'], ['Elder Wand', 'Eldest Staff'], ['Deathstick', 'Eldest Staff'], ['Dementors', 'Wraiths'], ['Dementor', 'Wraith'], ['Mudblood', 'commoner'], ['Muggle', 'Plainfolk'], ['Ministry', 'Council'], ['Auror', 'Warden'],
  ['Weasleys\' Wizard Wheezes', 'Ashby Mischief Co.'], ['Wildfire Whizzbang', 'Skyfire Rocket'], ['The Boy Who Lived', 'The Child Who Endured'], ['Boy Who Lived', 'Child Who Endured'], ['Quidditch', 'Skyball'],
];
const TH: [string, string][] = [
  ['แม้ดอาย', 'ตาเหยี่ยว'], ['มูนนี่', 'เกรย์มูน'], ['นิมฟาดอรา', 'นิมเฟล'], ['แพดฟุต', 'แบล็กพอว์'], ['พรองส์', 'แอนท์เลอร์'], ['แร็กสเปิร์ต', 'บัซวิสป์'], ['กอลกอร์', 'กอร์รัก'],
  ['แฮร์รี่ พอตเตอร์', 'อาเรน เวล'], ['แฮร์รี่', 'อาเรน'], ['เฮอร์ไมโอนี่ เกรนเจอร์', 'มีร่า ธอร์น'], ['เฮอร์ไมโอนี่', 'มีร่า'], ['รอน วีสลีย์', 'โรวัน แอชบี'], ['รอน', 'โรวัน'], ['วีสลีย์', 'แอชบี'], ['เฟร็ด', 'ฟินน์'], ['จอร์จ', 'แกร์ริก'], ['จินนี่', 'เกว็น'], ['มอลลี่', 'มอด'],
  ['ลอร์ดโวลเดอมอร์', 'ราชาแห่งความว่างเปล่า'], ['โวลเดอมอร์', 'ราชาแห่งความว่างเปล่า'], ['จอมมาร', 'ราชาว่างเปล่า'], ['ทอม ริดเดิ้ล', 'โทเบียส เรล'], ['เบลลาทริกซ์ เลสแตรงจ์', 'เบลิซา เว็กซ์'], ['เบลลาทริกซ์', 'เบลิซา'], ['มิเนอร์วา มักกอนนากัล', 'มอร์เวน เกล'], ['มักกอนนากัล', 'มอร์เวน'],
  ['เนวิลล์ ลองบัตท่อม', 'โนแลน บรูค'], ['ลองบัตท่อม', 'บรูค'], ['เนวิลล์', 'โนแลน'], ['ลูน่า เลิฟกู๊ด', 'ไลรา มูนเวลล์'], ['ลูน่า', 'ไลรา'], ['ดัมเบิลดอร์', 'อัลดริก'], ['กรินเดลวัลด์', 'แวล'], ['สเนป', 'โครว์'], ['ซิเรียส', 'โซเรน'], ['พอตเตอร์', 'เวล'],
  ['ลูปิน', 'โลว์'], ['ท็องส์', 'แทนเนอร์'], ['แฮกริด', 'เฮล'], ['มัลฟอย', 'มอร์เดน'], ['เกรย์แบ็ก', 'เกรล'], ['โดโลฮอฟ', 'เดรวิก'], ['แคร์โรว์', 'คาร์ริก'], ['นากีนี', 'นาซเรธ'],
  ['ฮอกวอตส์', 'ไฮสไปร์'], ['ผู้เสพความตาย', 'กองทัพเงา'], ['ฮอร์ครักซ์', 'สมอวิญญาณ'], ['เรเวนคลอ', 'เรเวนมาร์ก'], ['สลิธีริน', 'เซอร์เพนไทน์'], ['ป่าต้องห้าม', 'ป่าธอร์นวูด'], ['ห้องต้องประสงค์', 'ห้องแห่งความต้องการ'],
  ['เอ็กซ์เป็กโต พาโตรนุม', 'แสงผู้พิทักษ์'], ['อวาดา เคดาฟรา', 'วจนะแห่งจุดจบ'], ['เอ็กซ์เปลลิอาร์มัส', 'คาถาปลดอาวุธ'], ['ภาคีนกฟีนิกซ์', 'ภาคีถ่านเพลิง'], ['กองทัพดัมเบิลดอร์', 'องครักษ์อัลดริก'], ['ผู้คุมวิญญาณ', 'วิญญาณร้าย'], ['มักเกิ้ล', 'คนธรรมดา'],
];
const sortL = (l: [string, string][]) => [...l].sort((a, b) => b[0].length - a[0].length);
const EN_S = sortL(EN), TH_S = sortL(TH);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EN_RE = new RegExp(EN_S.map(([a]) => `\\b${esc(a)}\\b`).join('|'), 'g'), EN_MAP = new Map(EN_S), TH_RE = new RegExp(TH_S.map(([a]) => esc(a)).join('|'), 'g'), TH_MAP = new Map(TH_S);
export function fantasize(s: string): string { return s.replace(EN_RE, m => EN_MAP.get(m) ?? m).replace(TH_RE, m => TH_MAP.get(m) ?? m); }
/** Deep-rewrite all string values in-place (skips keys that are identifiers). */
export function fantasizeDeep(o: any, seen = new Set<any>()) { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
  for (const k of Object.keys(o)) { if (k === 'id' || k === 'who' || k === 'target' || k === 'kind' || k === 'hairStyle' || k === 'spells' || k === 'members' || k === 'player' || k === 'allies' || k === 'hogwarts' || k === 'death') { if (k === 'hogwarts' || k === 'death') { /* id lists */ } continue; }
    const v = o[k]; if (typeof v === 'string') o[k] = fantasize(v); else if (typeof v === 'object') fantasizeDeep(v, seen); } }
export const FANTASY_TITLE = { en: 'The Last Battle of Highspire', th: 'ศึกสุดท้ายแห่งไฮสไปร์', big: 'HIGHSPIRE' };

export const fantasyState = { on: false };
