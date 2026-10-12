/** Phase 5 menu screens: Free Battle setup, What If, Fast-travel map, Character Gallery, Spell Encyclopedia, Progression, Post-battle. */
import * as THREE from 'three';
import { FULL_ROSTER, META, isLegend, factionOf, Faction } from '../character/fullroster';
import type { CharDef } from '../character/roster';
import { SKILLS } from '../combat/skills';
import { SPELLS } from '../combat/spells';
import { SYNERGIES } from '../combat/synergy';
import { WHAT_IFS, WhatIf } from '../modes/whatif';
import { AREA_NAMES } from '../rendering/areas2';
import { buildModel } from '../character/model';
import { animateRig } from '../character/rig';
import { lineup, crowdLineup } from './lineup';
import { getLang } from './i18n';
import type { CustomBattle, Victory } from '../game';
import type { Area } from '../rendering/areas';
import { BRANCHES, Progress, getChar, levelOf, points, rankUp, respec, xpForLevel, MAX_RANK } from '../progress/progress';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const th = () => getLang() === 'th';
const L = (en: string, tht: string) => th() ? tht : en;
const nm = (c: CharDef) => th() ? c.nameTh : c.name;
const FAC: Record<Faction, [string, string]> = { hogwarts: ['Hogwarts', 'ฮอกวอตส์'], order: ['Order', 'ภาคี'], death: ['Death Eaters', 'ผู้เสพความตาย'], legend: ['Legends', 'ตำนาน'] };
export interface ScreenCtx { open: (html: string) => HTMLElement; close: () => void; back: () => void; startCustom: (player: string, area: Area, b: CustomBattle) => void; simulate: (w: WhatIf, runs: number, onProgress: (txt: string) => void) => Promise<void>;
  explore: (a: Area) => void; progress: Progress; saveProgress: () => void }
const battleChars = () => FULL_ROSTER.filter(c => c.playable && !isLegend(c.id));
// ---------------- Free Battle setup ----------------
export function freeBattle(ctx: ScreenCtx) {
  const sel = { hogwarts: ['harry', 'hermione', 'ron'], death: ['voldemort', 'bellatrix', 'dolohov'] } as Record<'hogwarts' | 'death', string[]>; let player = 'harry';
  const render = () => { const el = ctx.open(`<h2>${L('Free Battle Setup', 'ตั้งค่าศึกอิสระ')}</h2>
    <div class="setup"><div><h3>${L('Defenders', 'ฝ่ายปกป้อง')} (${sel.hogwarts.length}/6)</h3><div class="chips" id="fbH"></div></div><div><h3>${L('Attackers', 'ฝ่ายบุก')} (${sel.death.length}/6)</h3><div class="chips" id="fbD"></div></div></div>
    <p class="hint">${L('Click to add/remove · ★ = your character (any side) · Legends appear only in What If', 'คลิกเพื่อเพิ่ม/ลบ · ★ = ตัวละครที่คุณเล่น (ฝ่ายใดก็ได้) · ตัวละครตำนานมีเฉพาะโหมด What If')}</p>
    <div class="opts"><label>${L('Army size (NPC)', 'ขนาดกองทัพ (NPC)')}<select id="fbArmy"><option value="0">0 (${L('duel', 'ดวล')})</option><option>50</option><option selected>100</option><option>200</option><option>300</option></select></label>
    <label>${L('Area', 'พื้นที่')}<select id="fbArea">${(['courtyard', 'hall', 'room', 'forest', 'library', 'clocktower', 'hagrid', 'astronomy'] as Area[]).map(a => `<option value="${a}">${AREA_NAMES[a][th() ? 'th' : 'en']}</option>`).join('')}</select></label>
    <label>${L('Victory', 'เงื่อนไขชนะ')}<select id="fbWin"><option value="elimination">${L('Eliminate all named foes', 'กำจัดศัตรูหลักทั้งหมด')}</option><option value="leader">${L('Defeat the enemy leader', 'โค่นผู้นำฝ่ายตรงข้าม')}</option><option value="score">${L('War progress ±60 (army)', 'คะแนนสงคราม ±60 (มีกองทัพ)')}</option><option value="survival">${L('Survive the time limit', 'เอาชีวิตรอดตามเวลา')}</option></select></label>
    <label>${L('Time limit (s)', 'เวลาจำกัด (วินาที)')}<input id="fbTime" type="number" value="120" min="30" max="900"></label></div>
    <p class="hint" id="fbNote"></p><button id="fbStart">⚔ ${L('Start battle', 'เริ่มการต่อสู้')}</button><button id="fbBack">${L('Back', 'กลับ')}</button>`);
    const chip = (c: CharDef, team: 'hogwarts' | 'death') => { const on = sel[team].includes(c.id); return `<button class="chip ${on ? 'on' : ''} ${c.id === player ? 'me' : ''}" data-fb="${team}:${c.id}" title="${META[c.id]?.role?.[th() ? 'th' : 'en'] ?? ''}">${c.id === player ? '★ ' : ''}${nm(c)} <small>${c.ovr}</small></button>`; };
    const pool = battleChars();
    el.querySelector('#fbH')!.innerHTML = pool.filter(c => factionOf(c.id) !== 'death').map(c => chip(c, 'hogwarts')).join('') + '<hr>' + pool.filter(c => factionOf(c.id) === 'death').map(c => chip(c, 'hogwarts')).join('');
    el.querySelector('#fbD')!.innerHTML = pool.filter(c => factionOf(c.id) === 'death').map(c => chip(c, 'death')).join('') + '<hr>' + pool.filter(c => factionOf(c.id) !== 'death').map(c => chip(c, 'death')).join('');
    el.querySelectorAll<HTMLElement>('[data-fb]').forEach(b => { b.onclick = () => { const [team, id] = b.dataset.fb!.split(':') as ['hogwarts' | 'death', string]; const other = team === 'hogwarts' ? 'death' : 'hogwarts';
      if (sel[team].includes(id)) { if (player === id) { player = id; } sel[team] = sel[team].filter(x => x !== id); if (player === id) player = sel.hogwarts[0] ?? sel.death[0] ?? ''; } else if (sel[team].length < 6) { sel[team].push(id); sel[other] = sel[other].filter(x => x !== id); }
      render(); }; b.oncontextmenu = e => { e.preventDefault(); const id = b.dataset.fb!.split(':')[1]; if (sel.hogwarts.includes(id) || sel.death.includes(id)) { player = id; render(); } }; b.ondblclick = () => { const id = b.dataset.fb!.split(':')[1]; if (sel.hogwarts.includes(id) || sel.death.includes(id)) { player = id; render(); } }; });
    const army = el.querySelector('#fbArmy') as HTMLSelectElement, area = el.querySelector('#fbArea') as HTMLSelectElement, note = el.querySelector('#fbNote') as HTMLElement;
    const upd = () => { if (+army.value > 0 && area.value !== 'courtyard') note.textContent = L('Armies need the open courtyard map — the area will be set to Courtyard.', 'กองทัพต้องใช้แผนที่ลานปราสาท — จะเปลี่ยนพื้นที่เป็นลานปราสาท'); else note.textContent = L('Tip: double-click a selected character to play as them.', 'เคล็ดลับ: ดับเบิลคลิกตัวละครที่เลือกเพื่อเล่นเป็นตัวนั้น'); };
    army.onchange = area.onchange = upd; upd();
    (el.querySelector('#fbBack') as HTMLElement).onclick = ctx.back;
    (el.querySelector('#fbStart') as HTMLElement).onclick = () => { if (!sel.hogwarts.length || !sel.death.length) { note.textContent = L('Pick at least one character per side.', 'เลือกอย่างน้อยฝ่ายละหนึ่งตัวละคร'); return; }
      const a = +army.value; const ar = (a > 0 ? 'courtyard' : area.value) as Area; if (!player || !(sel.hogwarts.includes(player) || sel.death.includes(player))) player = sel.hogwarts[0];
      ctx.startCustom(player, ar, { hogwarts: [...sel.hogwarts], death: [...sel.death], army: a, victory: (el.querySelector('#fbWin') as HTMLSelectElement).value as Victory, timeLimit: +(el.querySelector('#fbTime') as HTMLInputElement).value || 120, record: true }); };
  };
  render();
}
// ---------------- What If ----------------
export function whatIf(ctx: ScreenCtx) {
  const el = ctx.open(`<h2>What If?</h2><p class="hint">${L('Alternate histories — Legends are available only here. Play it yourself, or let the engine simulate the battle AI-vs-AI (real simulation, 5 runs).', 'ประวัติศาสตร์ทางเลือก — ตัวละครตำนานมีเฉพาะที่นี่ เล่นเองหรือให้เอนจินจำลองการต่อสู้ AI ปะทะ AI (จำลองจริง 5 รอบ)')}</p>
    <div class="wi">${WHAT_IFS.map((w, i) => `<div class="wicard"><b>${i + 1}. ${w.title[th() ? 'th' : 'en']}</b><small>${w.desc[th() ? 'th' : 'en']}</small><div class="wiroster">🛡 ${w.battle.hogwarts.map(id => nm(FULL_ROSTER.find(c => c.id === id)!)).join(', ')}<br>⚔ ${w.battle.death.map(id => nm(FULL_ROSTER.find(c => c.id === id)!)).join(', ')}${w.battle.army ? ` · 👥${w.battle.army}` : ''}</div>
    <div class="row"><button data-wip="${i}">▶ ${L('Play', 'เล่น')}</button><button data-wis="${i}">🎲 ${L('Simulate ×5', 'จำลอง ×5')}</button></div><div class="wires" id="wir${i}"></div></div>`).join('')}</div><button id="wiBack">${L('Back', 'กลับ')}</button>`);
  el.querySelectorAll<HTMLElement>('[data-wip]').forEach(b => b.onclick = () => { const w = WHAT_IFS[+b.dataset.wip!]; ctx.startCustom(w.player, w.area, { ...w.battle, record: true }); });
  el.querySelectorAll<HTMLElement>('[data-wis]').forEach(b => b.onclick = async () => { const i = +b.dataset.wis!; el.querySelectorAll<HTMLButtonElement>('[data-wis]').forEach(x => x.disabled = true); await ctx.simulate(WHAT_IFS[i], 5, txt => { (el.querySelector('#wir' + i) as HTMLElement).innerHTML = txt; }); el.querySelectorAll<HTMLButtonElement>('[data-wis]').forEach(x => x.disabled = false); });
  (el.querySelector('#wiBack') as HTMLElement).onclick = ctx.back;
}
// ---------------- Fast travel map ----------------
export function travelMap(ctx: ScreenCtx, inGame = false) {
  const pos: Record<string, [number, number]> = { courtyard: [50, 55], hall: [50, 38], room: [62, 30], forest: [18, 22], clocktower: [70, 50], library: [38, 30], hospital: [62, 42], hagrid: [25, 62], boathouse: [80, 78], astronomy: [36, 14], office: [55, 18] };
  const el = ctx.open(`<h2>${L('Hogwarts Map — Fast Travel', 'แผนที่ฮอกวอตส์ — เดินทางด่วน')}</h2><div class="hmap">${Object.entries(pos).map(([a, [x, y]]) => `<button class="pin" style="left:${x}%;top:${y}%" data-go="${a}">📍 ${AREA_NAMES[a][th() ? 'th' : 'en']}</button>`).join('')}</div>
    <p class="hint">${L('Explore freely: find hidden Chocolate Frog cards (XP) and fight patrols. Press M in-game to reopen this map.', 'สำรวจอย่างอิสระ: หาการ์ดกบช็อกโกแลต (XP) และต่อสู้กับหน่วยลาดตระเวน กด M ในเกมเพื่อเปิดแผนที่')}</p><button id="tmBack">${inGame ? L('Close', 'ปิด') : L('Back', 'กลับ')}</button>`);
  el.querySelectorAll<HTMLElement>('[data-go]').forEach(b => b.onclick = () => ctx.explore(b.dataset.go as Area)); (el.querySelector('#tmBack') as HTMLElement).onclick = inGame ? ctx.close : ctx.back;
}
// ---------------- Gallery ----------------
let gal: { r: THREE.WebGLRenderer; raf: number } | null = null;
export function stopGallery() { if (gal) { cancelAnimationFrame(gal.raf); gal.r.dispose(); gal = null; } }
export function gallery(ctx: ScreenCtx) {
  let fac: Faction = 'hogwarts'; let cur = 'harry';
  const el = ctx.open(`<h2>${L('Character Gallery', 'แกลเลอรีตัวละคร')} <small>(${FULL_ROSTER.length})</small></h2><div class="tabs">${(Object.keys(FAC) as Faction[]).map(f => `<button data-fac="${f}">${FAC[f][th() ? 1 : 0]}</button>`).join('')}</div>
    <div class="gal"><div class="glist" id="gList"></div><div class="gdet"><canvas id="gCv" width="260" height="300"></canvas><div id="gInfo"></div></div></div><button id="gPose">🎭 ${L('Next pose', 'ท่าถัดไป')}</button><button id="gLineup">👥 ${L('Lineup', 'เรียงแถว')}</button><button id="gBack">${L('Back', 'กลับ')}</button>`);
  const r = new THREE.WebGLRenderer({ canvas: el.querySelector('#gCv') as HTMLCanvasElement, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(260, 300); const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(35, 260 / 300, 0.1, 50); cam.position.set(0, 1.7, 5.2); cam.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 2)); const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 5, 4); scene.add(dl); let model: THREE.Object3D | null = null; let mdl: any = null; let pose = 0;
  stopGallery(); gal = { r, raf: 0 }; let gt = 0; const loop = () => { gal!.raf = requestAnimationFrame(loop); gt += 1 / 60; if (model) model.rotation.y = Math.sin(gt * 0.6) * 0.7; if (mdl?.rig) { const ph = pose % 4; animateRig(mdl, { dt: 1 / 60, speed: 0, maxSpeed: 9, castT: ph === 1 ? (gt % 1.2) : 9, ultT: ph === 2 ? (gt % 2) : 9, hitT: 9, dodge: 0, stunned: false, down: false, dead: false, victory: ph === 3, clashing: false, shielding: false, camDist: 5 }); } r.render(scene, cam); }; loop();
  const show = (id: string) => { cur = id; const c = FULL_ROSTER.find(x => x.id === id)!; if (model) scene.remove(model); const m = buildModel(c.look); mdl = m; m.ring.visible = false; model = m.root; const s = c.look.scale ?? 1; model.scale.setScalar(1 / Math.max(1, s * 0.75)); scene.add(model);
    const k = SKILLS[id]; const meta = META[id]; const syn = SYNERGIES.filter(s => s.members.includes(id) && s.min > 1); const pc = getChar(ctx.progress, id);
    const bar = (lab: string, v: number, max: number) => `<div class="sbar"><span>${lab}</span><i style="width:${Math.min(100, v / max * 100)}%"></i><em>${v}</em></div>`;
    (el.querySelector('#gInfo') as HTMLElement).innerHTML = `<h3>${nm(c)} <span class="ovr">OVR ${c.ovr}</span></h3><small>${meta ? FAC[meta.faction][th() ? 1 : 0] + ' · ' + meta.role[th() ? 'th' : 'en'] + ' · ' + meta.archetype : ''} · Lv ${levelOf(pc.xp)}</small>
      ${bar('HP', c.hp, 300)}${bar(L('Power', 'พลัง'), Math.round(c.power * 100), 150)}${bar(L('Defense', 'ป้องกัน'), Math.round(c.defense * 100), 150)}${bar(L('Speed', 'ความเร็ว'), c.speed, 8)}${bar(L('Mastery', 'ความชำนาญ'), c.mastery, 100)}
      ${c.look.lines ? `<p class="hint">💬 “${c.look.lines.cast[th() ? 1 : 0]}” · ★ “${c.look.lines.ult[th() ? 1 : 0]}”</p>` : ''}<p><b>${L('Spells', 'คาถา')}:</b> ${c.spells.map(s => SPELLS[s].name).join(', ')}</p>${k ? `<p>${k.sigs.map((s, i) => `<b>${i + 1}</b> ${th() ? s.nameTh : s.name}`).join(' · ')}<br><b>R</b> ★ ${th() ? k.ult.nameTh : k.ult.name}</p>` : ''}
      ${syn.length ? `<p><b>${L('Synergies', 'ซินเนอร์จี')}:</b> ${syn.map(s => `${th() ? s.nameTh : s.name} (+${Math.round((s.power - 1) * 100)}%⚔ +${Math.round((s.defense - 1) * 100)}%🛡)`).join(', ')}</p>` : ''}${isLegend(id) ? `<p class="hint">⭐ ${L('Legend — What If only', 'ตำนาน — เฉพาะโหมด What If')}</p>` : ''}`;
    el.querySelectorAll('[data-gc]').forEach(b => b.classList.toggle('sel', (b as HTMLElement).dataset.gc === id)); };
  const list = () => { (el.querySelector('#gList') as HTMLElement).innerHTML = FULL_ROSTER.filter(c => (META[c.id]?.faction ?? 'death') === fac).map(c => `<button data-gc="${c.id}">${nm(c)}<small>${c.ovr}</small></button>`).join('');
    el.querySelectorAll<HTMLElement>('[data-gc]').forEach(b => b.onclick = () => show(b.dataset.gc!)); el.querySelectorAll('[data-fac]').forEach(b => b.classList.toggle('sel', (b as HTMLElement).dataset.fac === fac)); };
  el.querySelectorAll<HTMLElement>('[data-fac]').forEach(b => b.onclick = () => { fac = b.dataset.fac as Faction; list(); const first = FULL_ROSTER.find(c => (META[c.id]?.faction ?? 'death') === fac); if (first) show(first.id); });
  (el.querySelector('#gPose') as HTMLElement).onclick = () => { pose++; };
  { const ab = document.createElement('button'); ab.id = 'gArmy'; ab.textContent = getLang() === 'th' ? '⚔ กองทัพ' : '⚔ Army units'; (el.querySelector('#gLineup') as HTMLElement).after(ab); ab.onclick = () => crowdLineup(); }
  (el.querySelector('#gLineup') as HTMLElement).onclick = () => { lineup(FULL_ROSTER.filter(c => (META[c.id]?.faction ?? 'death') === fac).map(c => c.id), { poses: ['idle', 'cast', 'victory', 'idle', 'ult', 'walk', 'cast', 'idle', 'victory', 'idle', 'cast', 'idle', 'walk', 'idle', 'victory'] }); };
  list(); show(cur); (el.querySelector('#gBack') as HTMLElement).onclick = () => { stopGallery(); ctx.back(); };
}
// ---------------- Spell Encyclopedia ----------------
const SPELL_DESC: Record<string, [string, string]> = { expelliarmus: ['Disarms the target, interrupting casting.', 'ปลดอาวุธเป้าหมาย ขัดจังหวะการร่าย'], stupefy: ['Stunning bolt.', 'ลำแสงทำให้มึนงง'], confringo: ['Explosive curse with splash.', 'คำสาประเบิดพร้อมแรงกระจาย'],
  bombarda: ['Heavy blast that breaks walls.', 'ระเบิดรุนแรง ทำลายกำแพงได้'], depulso: ['Banishing knock-back.', 'ผลักกระเด็นอย่างแรง'], patronus: ['Homing guardian; devastating vs Dementors.', 'ผู้พิทักษ์ติดตามเป้า รุนแรงต่อผู้คุมวิญญาณ'], crucio: ['Torture curse: stuns in pain.', 'คำสาปทรมาน ทำให้ชะงัก'],
  fiendfyre: ['Cursed fire that hunts targets.', 'ไฟต้องสาปที่ไล่ล่าเป้าหมาย'], stone: ['Animated statue strike.', 'การโจมตีของรูปปั้นมีชีวิต'], avis: ['Homing birds.', 'ฝูงนกติดตามเป้า'], firework: ['Weasley firework, splash.', 'ดอกไม้ไฟวีสลีย์ ระเบิดกระจาย'], dagger: ['Fast cursed blade.', 'ใบมีดต้องสาปเร็ว'],
  sectum: ['Slashing curse.', 'คำสาปฟันเฉือน'], lumos: ['Blinding light burst.', 'แสงจ้าทำให้ตาพร่า'], avada: ['Killing Curse: unblockable.', 'คำสาปพิฆาต ป้องกันไม่ได้'] };
export function spells(ctx: ScreenCtx) {
  const users = (id: string) => FULL_ROSTER.filter(c => c.spells.includes(id as any)).length;
  const el = ctx.open(`<h2>${L('Spell Encyclopedia', 'สารานุกรมคาถา')}</h2><table class="enc"><tr><th></th><th>${L('Spell', 'คาถา')}</th><th>DMG</th><th>⚡</th><th>CD</th><th>AoE</th><th>${L('Effect', 'ผล')}</th><th>${L('Users', 'ผู้ใช้')}</th></tr>
    ${Object.values(SPELLS).map(s => `<tr><td><i style="background:#${s.color.toString(16).padStart(6, '0')}"></i></td><td><b>${s.name}</b><br><small>${(SPELL_DESC[s.id] ?? ['', ''])[th() ? 1 : 0]}</small></td><td>${s.damage}</td><td>${s.cost}</td><td>${s.cooldown}s</td><td>${s.aoe || '-'}</td><td>${[s.stun ? '💫' + s.stun + 's' : '', s.disarm ? '✋' : '', s.homing ? '🎯' : '', s.unblockable ? '⛔🛡' : '', s.knockback >= 7 ? '💨' : ''].join(' ')}</td><td>${users(s.id)}</td></tr>`).join('')}</table>
    <h3>${L('Signature & Ultimate skills', 'สกิลประจำตัวและสุดยอดสกิล')} (${Object.keys(SKILLS).length * 3})</h3><div class="skl">${FULL_ROSTER.filter(c => SKILLS[c.id]).map(c => `<div><b>${nm(c)}</b>: ${SKILLS[c.id].sigs.map(s => th() ? s.nameTh : s.name).join(' · ')} · ★ ${th() ? SKILLS[c.id].ult.nameTh : SKILLS[c.id].ult.name}</div>`).join('')}</div><button id="spBack">${L('Back', 'กลับ')}</button>`);
  (el.querySelector('#spBack') as HTMLElement).onclick = ctx.back;
}
// ---------------- Progression / skill tree ----------------
export function progression(ctx: ScreenCtx) {
  let cur = 'harry';
  const render = () => { const el = ctx.open(`<h2>${L('Skill Tree & Progression', 'ผังสกิลและความก้าวหน้า')}</h2><div class="gal"><div class="glist" id="pList"></div><div class="gdet" id="pDet"></div></div><button id="pBack">${L('Back', 'กลับ')}</button>`);
    (el.querySelector('#pList') as HTMLElement).innerHTML = FULL_ROSTER.filter(c => SKILLS[c.id]).map(c => { const p = getChar(ctx.progress, c.id); const pts = points(p); return `<button data-pc="${c.id}" class="${c.id === cur ? 'sel' : ''}">${nm(c)}<small>Lv ${levelOf(p.xp)}${pts > 0 ? ' · ' + pts + '⬆' : ''}</small></button>`; }).join('');
    const c = FULL_ROSTER.find(x => x.id === cur)!; const p = getChar(ctx.progress, cur); const lv = levelOf(p.xp); const nx = xpForLevel(lv + 1);
    (el.querySelector('#pDet') as HTMLElement).innerHTML = `<h3>${nm(c)} — Lv ${lv}</h3><div class="sbar"><span>XP</span><i style="width:${Math.min(100, (p.xp - xpForLevel(lv)) / Math.max(1, nx - xpForLevel(lv)) * 100)}%"></i><em>${p.xp}/${nx}</em></div><p>${L('Skill points', 'แต้มสกิล')}: <b>${points(p)}</b></p>
      ${BRANCHES.map(b => `<div class="branch"><b>${th() ? b.th : b.en}</b> <span>${'◆'.repeat(p.ranks[b.id])}${'◇'.repeat(MAX_RANK - p.ranks[b.id])}</span><small>${b.desc[th() ? 'th' : 'en']}</small><button data-rk="${b.id}" ${points(p) <= 0 || p.ranks[b.id] >= MAX_RANK ? 'disabled' : ''}>+</button></div>`).join('')}
      <button id="pRespec">${L('Reset points', 'รีเซ็ตแต้ม')}</button><p class="hint">${L('Earn XP by fighting in any mode. Bonuses apply to this character on your side.', 'รับ XP จากการต่อสู้ทุกโหมด โบนัสมีผลกับตัวละครนี้เมื่ออยู่ฝ่ายคุณ')}</p>`;
    el.querySelectorAll<HTMLElement>('[data-pc]').forEach(b => b.onclick = () => { cur = b.dataset.pc!; render(); });
    el.querySelectorAll<HTMLElement>('[data-rk]').forEach(b => b.onclick = () => { if (rankUp(ctx.progress, cur, b.dataset.rk as any)) { ctx.saveProgress(); render(); } });
    (el.querySelector('#pRespec') as HTMLElement).onclick = () => { respec(ctx.progress, cur); ctx.saveProgress(); render(); }; (el.querySelector('#pBack') as HTMLElement).onclick = ctx.back; };
  render();
}
