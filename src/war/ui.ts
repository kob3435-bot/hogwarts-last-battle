import type { Game } from '../game';
import { ZONES } from './map';
import { MISSION_TEXT } from './missions';
import type { Order } from './war';
import { getLang } from '../ui/i18n';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const ctrlColor = (c: number) => c > 0.4 ? '#4cc3ff' : c < -0.4 ? '#ff4d6d' : '#d8c070';
/** Minimap: map outline, zones coloured by control, every unit as a dot, heroes as larger markers. */
export function drawMinimap(g: Game) {
  const cv = $('#minimap') as HTMLCanvasElement; const w = g.war; if (!cv || !w) return; const ctx = cv.getContext('2d')!; const W = cv.width, H = cv.height;
  const sx = (x: number) => W / 2 + x * (W / 90), sz = (z: number) => (z + 66) * (H / 162);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(20,14,50,.85)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5a4a6a'; ctx.fillRect(sx(-33), sz(-33), sx(33) - sx(-33), sz(33) - sz(-33)); ctx.fillRect(sx(-11), sz(-63), sx(11) - sx(-11), sz(-33) - sz(-63)); ctx.fillRect(sx(-4.5), sz(33), sx(4.5) - sx(-4.5), sz(93) - sz(33));
  ZONES.forEach((z, i) => { ctx.beginPath(); ctx.arc(sx(z.x), sz(z.z), z.r * W / 90, 0, 7); ctx.fillStyle = ctrlColor(w.controls[i]) + '55'; ctx.fill(); ctx.strokeStyle = ctrlColor(w.controls[i]); ctx.lineWidth = 2; ctx.stroke(); });
  for (const u of w.units) { if (!u.active || u.state === 'dead') continue; ctx.fillStyle = u.state === 'downed' ? '#7dff9a' : u.def.team === 'hogwarts' ? '#7fd4ff' : '#ff6b81'; const r = u.def.type === 'giant' ? 3 : 1.3; ctx.fillRect(sx(u.x) - r, sz(u.z) - r, r * 2, r * 2); }
  for (const e of g.entities) { if (!e.alive) continue; ctx.beginPath(); ctx.arc(sx(e.pos.x), sz(e.pos.z), e.def.boss ? 5 : 3.5, 0, 7); ctx.fillStyle = e.def.team === 'hogwarts' ? '#ffe066' : '#b8ff3a'; ctx.fill(); if (e.playerControlled) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } }
  for (const m of w.missions) { if (m.status !== 'active') continue; const z = ZONES[m.zone]; ctx.fillStyle = '#7dd3ff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('⚑', sx(z.x) - 5, sz(z.z) - z.r * W / 90); }
  if (g.mode === 'commander') { ctx.strokeStyle = '#fff8'; ctx.strokeRect(sx(g.tac.x) - 20, sz(g.tac.z) - 14, 40, 28); }
}
export function updateWarHUD(g: Game) {
  const w = g.war; const box = $('#warHud'); if (!w) { box.style.display = 'none'; return; } box.style.display = 'block'; const th = getLang() === 'th';
  $('#progFill').style.left = (50 + Math.min(0, w.score) / 2) + '%'; $('#progFill').style.width = Math.abs(w.score) / 2 + '%'; $('#progFill').style.background = w.score >= 0 ? '#4cc3ff' : '#ff4d6d';
  $('#progTxt').textContent = `${th ? 'ความคืบหน้าสงคราม' : 'War progress'} ${w.score >= 0 ? '+' : ''}${w.score.toFixed(0)}  ·  ${th ? 'ฮอกวอตส์' : 'Hogwarts'} ${w.teamCount('hogwarts')} vs ${w.teamCount('death')} ${th ? 'ฝ่ายมืด' : 'Dark'}  ·  ${th ? 'ทหาร NPC สูงสุด' : 'NPC cap'} ${w.cap} (${w.scaler.fps.toFixed(0)} fps)`;
  $('#zones').innerHTML = ZONES.map((z, i) => `<span style="border-color:${ctrlColor(w.controls[i])}">${th ? z.nameTh : z.name}<i style="width:${(w.controls[i] + 1) * 50}%;background:${ctrlColor(w.controls[i])}"></i></span>`).join('');
  $('#missions').innerHTML = w.missions.filter(m => m.status === 'active').map(m => { const T = MISSION_TEXT[m.kind]; return `<div>⚑ ${th ? T.th : T.en} — ${th ? ZONES[m.zone].nameTh : ZONES[m.zone].name}${m.targetName ? ' (' + m.targetName + ')' : ''}<br><small>${m.kind === 'hold' || m.kind === 'protect' ? m.progress.toFixed(0) + '/' + m.goal + 's' : m.progress + '/' + m.goal} · ⏱ ${Math.max(0, m.limit - m.time).toFixed(0)}s</small></div>`; }).join('');
  const s = w.stats; $('#warStats').innerHTML = `☠ ${th ? 'ฝ่ายฮอกวอตส์โค่น' : 'Hogwarts KOs'} ${s.kills.hogwarts} · ${th ? 'ฝ่ายมืดโค่น' : 'Dark KOs'} ${s.kills.death} · ✚ ${s.revived} · ⚑ ${s.missionsWon}/${s.missionsWon + s.missionsLost} · 🧱 ${g.destruction.destroyed}`;
  if (g.mode === 'spectator') $('#specName').textContent = (th ? 'กำลังติดตาม: ' : 'Following: ') + g.specLabel + (g.specSlow ? ' · SLOW-MO' : '');
  if (g.mode === 'commander') renderSquads(g);
  drawMinimap(g);
}
let selSquad = 0;
function renderSquads(g: Game) {
  const w = g.war!; const th = getLang() === 'th'; const L: Record<Order, string> = th ? { attack: 'บุก', defend: 'ป้องกัน', retreat: 'ถอย', protect: 'คุ้มกัน' } : { attack: 'Attack', defend: 'Defend', retreat: 'Retreat', protect: 'Protect' };
  const list = $('#squadList'); const hs = w.squads.filter(s => s.team === 'hogwarts');
  if (list.children.length !== hs.length) { list.innerHTML = hs.map(s => `<button class="sq" data-sq="${s.id}"><span></span><small></small></button>`).join('');
    list.querySelectorAll<HTMLElement>('[data-sq]').forEach(b => b.onclick = () => { selSquad = +b.dataset.sq!; }); }
  hs.forEach((s, k) => { const b = list.children[k] as HTMLElement; const n = w.units.filter(u => u.active && u.squad === s.id && u.state === 'fight').length; const dn = w.units.filter(u => u.active && u.squad === s.id && u.state === 'downed').length;
    b.classList.toggle('sel', s.id === selSquad); b.children[0].textContent = th ? s.nameTh : s.name;
    b.children[1].textContent = `${n} ${th ? 'นาย' : 'units'}${dn ? ` · ${dn} ${th ? 'บาดเจ็บ' : 'down'}` : ''} — ${L[s.order]} ${s.order === 'protect' && s.protect ? s.protect.def.name : (th ? ZONES[s.zone].nameTh : ZONES[s.zone].name)}`; });

}
export function setupCommander(g: Game) {
  const w = g.war!; w.manualHogwarts = true; g.input.noLock = true; $('#squadList').innerHTML = '';
  g.input.drag = (dx, dy) => { g.tac.x -= dx * g.tac.zoom * 0.002; g.tac.z -= dy * g.tac.zoom * 0.002; };
  g.input.wheel = d => { g.tac.zoom = Math.max(18, Math.min(110, g.tac.zoom * (d > 0 ? 1.1 : 0.9))); };
  $('#zoneBtns').innerHTML = ZONES.map((z, i) => `<button data-zone="${i}">${getLang() === 'th' ? z.nameTh : z.name}</button>`).join('');
  let zone = 2; document.querySelectorAll<HTMLElement>('[data-zone]').forEach(b => b.onclick = () => { zone = +b.dataset.zone!; document.querySelectorAll('[data-zone]').forEach(x => x.classList.toggle('sel', x === b)); const z = ZONES[zone]; g.tac.x = z.x; g.tac.z = z.z; });
  document.querySelectorAll<HTMLElement>('[data-order]').forEach(b => b.onclick = () => { const o = b.dataset.order as Order;
    const hero = o === 'protect' ? g.entities.find(e => e.def.team === 'hogwarts' && e.alive && (e.def.id === 'harry' || true)) ?? null : null; w.setOrder(selSquad, o, zone, hero); g.onEvent(`${w.squads[selSquad].name} → ${o.toUpperCase()} ${o === 'protect' ? hero?.def.name ?? '' : ZONES[zone].name}`, '#7dd3ff'); });
  ($('#cmd') as HTMLElement).style.display = 'block';
  // touch/click on the minimap jumps the tactical camera there
  const mm = $('#minimap') as HTMLCanvasElement; const jump = (cx: number, cy: number) => { const r = mm.getBoundingClientRect(); const W = mm.width, H = mm.height; const px = (cx - r.left) / r.width * W, py = (cy - r.top) / r.height * H; g.tac.x = (px - W / 2) / (W / 90); g.tac.z = py / (H / 162) - 66; };
  mm.style.pointerEvents = 'auto'; mm.onclick = e => jump(e.clientX, e.clientY); mm.ontouchstart = e => { e.preventDefault(); jump(e.touches[0].clientX, e.touches[0].clientY); };
  let tog = document.getElementById('cmdToggle'); if (!tog) { tog = document.createElement('button'); tog.id = 'cmdToggle'; document.getElementById('hud')!.appendChild(tog); }
  tog.textContent = '☰ ' + (getLang() === 'th' ? 'คำสั่ง' : 'Orders'); tog.ontouchstart = e => { e.preventDefault(); $('#cmd').classList.toggle('collapsed'); }; tog.onclick = () => $('#cmd').classList.toggle('collapsed');
}
