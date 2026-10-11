import type { Game } from '../game';
import { SPELLS } from '../combat/spells';
import { ULT_MAX } from '../combat/skills';
import { PHASES } from '../ai/boss';
import { comboMult } from '../combat/combo';
import { t, getLang } from './i18n';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
export function updateHUD(g: Game) {
  const c = g.ctrl; const th = getLang() === 'th'; const nm = (e: any) => th ? e.def.nameTh : e.def.name;
  $('#cname').textContent = `${nm(c)}  ·  OVR ${c.def.ovr}`;
  bar('#hpBar', c.hp / c.maxHp, `${Math.ceil(c.hp)}/${c.maxHp}`); bar('#enBar', c.energy / c.maxEnergy, `${Math.floor(c.energy)}`); bar('#stBar', c.stamina / c.maxStamina, '');
  $('#spells').innerHTML = c.def.spells.map((id, i) => { const s = SPELLS[id]; const cd = Math.max(0, c.cds[id] ?? 0);
    return `<div class="slot ${i === c.spellIdx ? 'sel' : ''} ${c.energy < s.cost ? 'dim' : ''}" style="--c:${hex(s.color)}"><b>${s.name}</b><small>${s.cost}⚡ ${cd > 0 ? cd.toFixed(1) + 's' : ''}</small></div>`; }).join('');
  const kit = c.kit;
  $('#skills').innerHTML = kit ? kit.sigs.map((s, i) => { const cd = c.skillCd[i]; return `<div class="skill ${cd > 0 || c.energy < s.cost ? 'dim' : ''}"><kbd>${i + 1}</kbd><b>${th ? s.nameTh : s.name}</b><small>${cd > 0 ? cd.toFixed(1) + 's' : s.cost + '⚡'}</small><i style="height:${cd > 0 ? cd / s.cooldown * 100 : 0}%"></i></div>`; }).join('')
    + `<div class="skill ult ${c.ult >= ULT_MAX ? 'full' : ''}"><kbd>R</kbd><b>${th ? kit.ult.nameTh : kit.ult.name}</b><small>${c.ult >= ULT_MAX ? t('ready') : Math.floor(c.ult) + '%'}</small><i class="fill" style="height:${c.ult / ULT_MAX * 100}%"></i></div>` : '';
  const cb = c.combo; $('#combo').style.display = cb.count >= 2 && cb.timer > 0 ? 'block' : 'none'; $('#combo').innerHTML = `${cb.count} <small>${t('combo')} ×${comboMult(cb.count).toFixed(1)}</small>`;
  const foes = g.entities.filter(e => e.def.team !== g.playerTeam && e.alive).length;
  const C = g.custom; const VT: Record<string, [string, string]> = { elimination: ['Defeat every enemy hero', 'กำจัดศัตรูหลักทั้งหมด'], leader: ['Defeat the enemy leader', 'โค่นผู้นำฝ่ายตรงข้าม'], score: ['Push war progress to +60', 'ดันความคืบหน้าสงครามถึง +60'], survival: ['Survive', 'เอาชีวิตรอด'] };
  $('#objective').innerHTML = C ? `🎯 ${VT[C.victory][th ? 1 : 0]}${C.victory === 'survival' ? ` (${Math.max(0, Math.ceil((C.timeLimit ?? 120) - g.time))}s)` : ''}${C.victory === 'leader' ? ': ' + nm(g.entities.find(e => e.def.team !== g.playerTeam)!) : ''}<br><small>${t('remaining')}: ${foes}</small>` : `🎯 ${t(g.playerTeam === 'hogwarts' ? 'objective' : 'objectiveDeath')}<br><small>${t('remaining')}: ${foes}</small>`;
  $('#allies').innerHTML = g.entities.filter(e => e.def.team === g.playerTeam && e.def.playable).map(e => `<div class="ally ${e === c ? 'me' : ''} ${e.alive ? '' : 'dead'}" style="border-color:${hex(e.def.look.hair || e.def.look.accent)}">${nm(e)}<i style="width:${e.hp / e.maxHp * 100}%"></i><u style="width:${e.ult / ULT_MAX * 100}%"></u></div>`).join('');
  const boss = g.entities.find(e => e.def.boss && e.alive) ?? g.entities.find(e => e.alive && e.def.team !== g.playerTeam && ['dolohov', 'greyback', 'nagini', 'giantcmdr', 'bellatrix'].includes(e.def.id)); const showBoss = !!boss && boss.alive && boss !== c && !boss.scripted;
  $('#boss').style.display = showBoss ? 'block' : 'none';
  const ph = PHASES[g.phase]; if (boss) $('#bossName').textContent = boss.def.boss ? `${nm(boss)} — ${t('phase')} ${g.phase}: ${th ? ph.nameTh : ph.name}` : nm(boss); if (boss) $('#bossBar').style.width = boss.hp / boss.maxHp * 100 + '%';
  $('#status').textContent = c.clashing ? '⚡' : c.stunned > 0 ? t('stunned') : c.disarmed > 0 ? t('disarmed') : '';
  $('#clashHelp').textContent = t('clashHelp');
  $('#pauseOv').style.display = g.state === 'paused' ? 'flex' : 'none';
}
function bar(sel: string, f: number, txt: string) { const el = $(sel); (el.firstElementChild as HTMLElement).style.width = Math.max(0, f) * 100 + '%'; (el.lastElementChild as HTMLElement).textContent = txt; }
let feedT: any; export function feed(msg: string, color = '#fff') { if (!msg) return; const f = $('#feed'); const d = document.createElement('div'); d.textContent = msg; d.style.color = color; f.prepend(d); while (f.children.length > 6) f.lastChild!.remove(); clearTimeout(feedT); feedT = setTimeout(() => (f.innerHTML = ''), 5000); }
