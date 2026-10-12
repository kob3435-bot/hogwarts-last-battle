import { Game } from './game';
import { Input } from './character/input';
import { updateHUD, feed } from './ui/hud';
import { speech, damageNumber, banner, flash, updateFx } from './ui/fx';
import { t, setLang, getLang, Key } from './ui/i18n';
import { initAudio, setVolume, sfx } from './audio/audio';
import { loadSettings, saveSettings } from './save/settings';
import { PLAYABLE } from './character/roster';
import { SKILLS } from './combat/skills';
import { updateWarHUD, setupCommander } from './war/ui';
import './character/fullroster';
import { FULL_ROSTER } from './character/fullroster';
import { SKILLS as SKILLS_ALL } from './combat/skills';
import { Recorder, battleStats, Replay } from './replay/recorder';
import { loadProgress, saveProgress as saveProg, Progress, newProgress, award, battleXP, multipliers, getChar, levelOf } from './progress/progress';
import { music, chooseMood } from './audio/music';
import { audioCtx } from './audio/audio';
import { fantasizeDeep, FANTASY_TITLE, fantasize, fantasyState } from './ui/fantasy';
import { I18N } from './ui/i18n';
import { SPELLS } from './combat/spells';
import { SYNERGIES } from './combat/synergy';
import { CHAPTERS_DATA as CH_ALL, NAMES_TH } from './story/chapters';
import { WHAT_IFS } from './modes/whatif';
import { AREA_NAMES } from './rendering/areas2';
import { STORY_CHARS, VOLDEMORT as VOLDY, makeDeathEater } from './character/roster';
import { BRANCHES } from './progress/progress';
import { MISSION_TEXT } from './war/missions';
import { ZONES } from './war/map';
import type { Area } from './rendering/areas';
import type { CustomBattle } from './game';
import type { Mode, GameOpts } from './game';
import { StoryRunner } from './story/runner';
import { CHAPTERS_DATA } from './story/chapters';
import { loadCampaign, saveCampaign, newCampaign, saveToSlot, loadFromSlot, CampaignState } from './story/save';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const settings = loadSettings(); setLang(settings.lang);
// Original Fantasy mode: rename every franchise term before any UI is built
export const FANTASY = settings.fantasy || (import.meta as any).env?.VITE_FANTASY === '1';
if (FANTASY) { for (const o of [FULL_ROSTER, STORY_CHARS, VOLDY, SKILLS_ALL, SPELLS, SYNERGIES, CH_ALL, NAMES_TH, WHAT_IFS, AREA_NAMES, BRANCHES, MISSION_TEXT, ZONES, I18N]) fantasizeDeep(o); for (let i = 0; i < 5; i++) fantasizeDeep(makeDeathEater(i));
  I18N.title = { ...FANTASY_TITLE }; fantasyState.on = true; document.getElementById('bigTitle')!.textContent = FANTASY_TITLE.big; document.title = FANTASY_TITLE.en; document.body.classList.add('fantasy'); }
(window as any).__fantasize = fantasize;
let progress: Progress = newProgress(); const progReady = loadProgress().then(p => (progress = p)); void progReady;
const persistProgress = () => saveProg(progress);
var lastReplay: Replay | null = null; let lastExtra: (Partial<GameOpts> & Record<string, any>) | undefined;
const canvas = $('#c') as HTMLCanvasElement; const input = new Input(canvas);
if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) input.setupTouch($('#hud'));
let game: Game | null = null; let hudTimer = 0; let lastChar = 'harry'; let fxRaf = 0; let selMode: Mode = 'duel'; let lastMode: Mode = 'duel';
function applyLang() { document.documentElement.lang = getLang(); document.querySelectorAll<HTMLElement>('[data-t]').forEach(el => (el.textContent = t(el.dataset.t as Key))); $('#help').textContent = t('controls'); buildSelect(); }
function buildSelect() { const th = getLang() === 'th';
  for (const [id, team] of [['#gridH', 'hogwarts'], ['#gridD', 'death']] as const) $(id).innerHTML = PLAYABLE.filter(c => c.team === team).map(c =>
    `<button data-char="${c.id}" class="${team === 'death' ? 'd' : ''}">${th ? c.nameTh : c.name}<small>OVR ${c.ovr} · ${SKILLS[c.id].ult[th ? 'nameTh' : 'name']}</small></button>`).join('');
  document.querySelectorAll<HTMLElement>('[data-char]').forEach(b => b.onclick = () => startGame(b.dataset.char!, selMode)); }
applyLang();
function show(id: string | null) { const rl = document.getElementById('btnReplayLast') as HTMLButtonElement | null; if (rl) rl.disabled = !lastReplay; for (const o of ['#menu', '#settings', '#end', '#select', '#story', '#storyEnd', '#screen']) $(o).classList.toggle('hidden', o !== id); $('#hud').classList.toggle('hidden', id !== null); }
function startGame(char = lastChar, mode: Mode = lastMode, extra?: Partial<GameOpts> & Record<string, any>): Game {
  const isStory = !!extra?.story; if (!isStory) { runner?.stop(); runner = null; $('#storyObj').classList.add('hidden'); lastExtra = extra; } explorer?.stop(); explorer = null;
  lastChar = char; lastMode = mode; document.body.className = 'm-' + mode + (isStory ? ' m-story' : '') + (extra?.custom ? ' m-custom' : '') + (extra?.explore ? ' m-explore' : '') + (FANTASY ? ' fantasy' : ''); input.noLock = mode === 'commander' || mode === 'spectator'; input.drag = null; input.wheel = null; ($('#cmd') as HTMLElement).style.display = 'none'; initAudio(); setVolume(settings.volume); sfx.ui(); game?.dispose(); cancelAnimationFrame(fxRaf);
  input.pause = false; input.switchChar = false; input.skill = -1; input.cycle = 0; input.dodge = false;
  game?.dispose(); game = new Game(canvas, settings, input, { playerChar: char, mode, ...extra });
  if (mode === 'commander') setupCommander(game);
  // progression bonuses for characters on the player's side
  for (const e of game.entities) if (e.def.team === game.playerTeam) { const m = multipliers(progress, e.def.id); e.progPow *= m.power; e.progDef *= m.defense; e.progCd = m.cd; e.maxHp = Math.round(e.maxHp * m.hp); e.hp = e.maxHp; }
  if (!isStory && !extra?.explore && !game.recorder) game.recorder = new Recorder(extra?.area ?? 'courtyard', mode);
  const ac = audioCtx(); if (ac) { music.init(ac.ctx, ac.master); music.setVolume(settings.music); }
  if (mode === 'spectator') { $('#help').textContent = t('specHelp'); } else $('#help').textContent = t('controls');
  game.autoCancel = settings.autoCancel; input.touchLook = settings.touchLook ?? 1;
  game.onCam = m => { settings.camMode = m; saveSettings(settings); updCam(m); }; updCam(game.camMode);
  game.autoCancel = settings.autoCancel; game.onAuto = on => { document.body.classList.toggle('auto-on', on); $('#autoBtn').classList.toggle('on', on); $('#tAuto').classList.toggle('on', on); $('#autoBanner').textContent = t(on ? 'autoOn' : 'autoOff'); feed(t(on ? 'autoOn' : 'autoOff'), on ? '#ffd34d' : '#9fe0ff'); }; game.onAuto(false); document.body.classList.remove('auto-on');
  game.onEvent = (m, c) => feed(m, c); game.onCallout = (e, txt) => speech(e, txt); game.onDamage = damageNumber; game.onBanner = banner; game.onFlash = flash;
  game.onEnd = won => { const g = game!; setTimeout(() => postBattle(g, won), 1500); };
  show(null); game.start(); if (!input.touch && !input.noLock && !extra) canvas.requestPointerLock?.(); if (!extra) banner(t('title'), t(game.playerTeam === 'hogwarts' ? 'objective' : 'objectiveDeath'));
  clearInterval(hudTimer); hudTimer = window.setInterval(() => { if (game) { updateHUD(game); updateWarHUD(game); const c = game.ctrl; music.setMood(game.cinematic ? 'tension' : chooseMood({ state: game.state, boss: game.entities.some(e => e.alive && e.def.team !== game!.playerTeam && (e.def.boss || e.def.ovr >= 95)) && game.entities.some(e => e.alive && e.def.team !== game!.playerTeam && e.pos.distanceTo(c.pos) < 30 && (e.def.boss || e.def.ovr >= 95)), enemiesNear: game.entities.filter(e => e.alive && e.def.team !== game!.playerTeam && e.pos.distanceTo(c.pos) < 22).length + (game.war ? Math.min(3, Math.floor(game.war.aliveUnits().filter(u => u.def.team !== game!.playerTeam && Math.hypot(u.x - c.pos.x, u.z - c.pos.z) < 20).length / 4)) : 0), hpFrac: c.hp / c.maxHp })); } }, 100);
  let last = performance.now(); const fx = (now: number) => { fxRaf = requestAnimationFrame(fx); if (game) updateFx(game, Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now; }; cancelAnimationFrame(fxRaf); fxRaf = requestAnimationFrame(fx); return game;
}
function toMenu() { explorer?.stop(); explorer = null; music.setMood('exploration'); runner?.stop(); runner = null; $('#storyObj').classList.add('hidden'); document.body.className = ''; game?.dispose(); game = null; clearInterval(hudTimer); cancelAnimationFrame(fxRaf); document.exitPointerLock?.(); show('#menu'); }
$('#btnPlay').onclick = () => { sfx.ui(); selMode = 'duel'; show('#select'); };
$('#btnWar').onclick = () => { sfx.ui(); selMode = 'war'; show('#select'); };
$('#btnCommander').onclick = () => startGame('harry', 'commander');
$('#btnSpectator').onclick = () => startGame('harry', 'spectator'); $('#btnBack2').onclick = () => show('#menu');
$('#btnRestart').onclick = () => startGame(lastChar, lastMode, lastExtra); $('#btnMenu').onclick = toMenu; $('#btnPauseMenu').onclick = toMenu;
$('#btnResume').onclick = () => { input.pause = true; if (!input.touch) canvas.requestPointerLock?.(); };
$('#btnLang').onclick = () => { settings.lang = getLang() === 'th' ? 'en' : 'th'; setLang(settings.lang); saveSettings(settings); applyLang(); };
const vol = $('#sVol') as HTMLInputElement, sens = $('#sSens') as HTMLInputElement, diff = $('#sDiff') as HTMLSelectElement;
$('#btnSettings').onclick = () => { vol.value = String(settings.volume); sens.value = String(settings.sensitivity); diff.value = settings.difficulty; show('#settings'); };
vol.oninput = () => { settings.volume = +vol.value; setVolume(settings.volume); saveSettings(settings); };
sens.oninput = () => { settings.sensitivity = +sens.value; saveSettings(settings); };
diff.onchange = () => { settings.difficulty = diff.value as any; saveSettings(settings); };
$('#btnBack').onclick = () => show('#menu');
(window as any).__game = () => game; (window as any).__start = startGame;
(window as any).__sim = (char = 'harry', diff2 = 'normal', maxSec = 300, mode: Mode = 'duel') => { // headless AI-vs-AI simulation for balance testing
  const g = new Game(document.createElement('canvas'), { ...settings, difficulty: diff2 as any }, input, { playerChar: char, auto: true, mode }); let n = 0;
  while (g.state === 'playing' && n < maxSec * 30) { g.step(1 / 30); n++; } const r = { state: g.state, secs: Math.round(n / 30), phase: g.phase, score: g.war ? Math.round(g.war.score) : null, war: g.war ? { units: g.war.aliveUnits().length, controls: g.war.controls.map(c => +c.toFixed(2)), stats: g.war.stats, destroyed: g.destruction.destroyed } : null, alive: g.entities.filter(e => e.alive).map(e => e.def.id + ':' + Math.round(e.hp)).join(' ') }; g.dispose(); g.renderer.forceContextLoss(); return r; };

// ---------------- Story campaign ----------------
let camp: CampaignState = newCampaign(); let runner: StoryRunner | null = null; const campReady = loadCampaign().then(c => (camp = c));
const makeStoryGame = (c: (typeof CHAPTERS_DATA)[number]) => startGame(c.player, c.mode === 'war' ? 'war' : 'duel', { area: c.area, story: { allies: c.allies, start: c.start, yaw: c.yaw }, warCfg: c.war ? { ...c.war } : { hogwarts: true, death: true, missions: false, deathPower: 0.85 }, bossFight: !!c.bossFight });
function playChapter(n: number, from = 0) { show(null); runner = new StoryRunner(camp, makeStoryGame, { onEnd: storyEnd }); runner.start(n, from); }
function storyEnd(won: boolean, r: StoryRunner) { document.exitPointerLock?.(); const th = getLang() === 'th';
  setTimeout(() => { if (runner !== r) return; show('#storyEnd'); $('#seTitle').textContent = won ? t('chDone') : t('chFail');
    const fl = r.flags; const notes: string[] = [];
    if (won) { if (fl.wardsComplete !== undefined && r.n === 4) notes.push(fl.wardsComplete ? (th ? '✔ เวทคุ้มกันครบ — อัศวินหินเสริมกำลังในบทต่อไป' : '✔ All wards cast — extra stone guardians later') : (th ? '✘ เวทคุ้มกันไม่ครบ' : '✘ Wards incomplete'));
      if (r.n === 7) notes.push(fl.bellatrixWounded ? (th ? '✔ เบลลาทริกซ์บาดเจ็บ — จะอ่อนแอลงในบทที่ 11' : '✔ Bellatrix wounded — weaker in Chapter 11') : (th ? '✘ เบลลาทริกซ์หนีไปโดยไม่บาดเจ็บหนัก' : '✘ Bellatrix escaped unharmed'));
      if (r.n === 7) notes.push(fl.studentsSaved ? (th ? '✔ ช่วยนักเรียนได้' : '✔ Students rescued') : (th ? '✘ ช่วยนักเรียนไม่ทัน' : '✘ Students not rescued'));
      if (r.n === 8) notes.push(fl.fredSaved ? (th ? '✔ เฟร็ดรอดชีวิต — จะร่วมรบในบทที่ 11-12' : '✔ Fred survived — he joins you in Chapters 11–12') : (th ? '✘ เฟร็ดเสียชีวิต' : '✘ Fred fell'));
      if (r.n === 12) notes.push(t('theEnd')); notes.push(`⏱ ${r.elapsed.toFixed(0)}s`); }
    $('#seText').innerHTML = notes.join('<br>'); $('#btnNextCh').style.display = won && r.n < 12 ? '' : 'none'; $('#btnRetryCp').style.display = won ? 'none' : ''; }, 600); }
function renderStoryMenu() { const th = getLang() === 'th';
  $('#storyProg').textContent = `${th ? 'ผ่านแล้ว' : 'Completed'} ${camp.completed.length}/12 · ${th ? 'ปลดล็อกถึงบท' : 'Unlocked up to ch.'} ${camp.unlocked}` + (camp.flags.fredSaved !== undefined ? ` · ${th ? 'เฟร็ด' : 'Fred'}: ${camp.flags.fredSaved ? '✔' : '✘'}` : '');
  const cp = camp.checkpoint; $('#btnContinue').style.display = cp ? '' : 'none'; if (cp) $('#btnContinue').textContent = `${t('continue')} — ${th ? 'บท' : 'Ch.'} ${cp.chapter}${cp.objective ? ` (${th ? 'เป้าหมาย' : 'obj.'} ${cp.objective + 1})` : ''}`;
  $('#chapters').innerHTML = CHAPTERS_DATA.map(c => `<button data-ch="${c.n}" ${c.n > camp.unlocked ? 'disabled' : ''}>${camp.completed.includes(c.n) ? '✔ ' : c.n > camp.unlocked ? '🔒 ' : ''}${c.n}. ${th ? c.title.th : c.title.en}<small>${camp.best[c.n] ? '⏱ ' + camp.best[c.n] + 's' : ''}</small></button>`).join('');
  document.querySelectorAll<HTMLElement>('[data-ch]').forEach(b => b.onclick = () => playChapter(+b.dataset.ch!));
  $('#slots').innerHTML = camp.slots.map((sl, i) => `<button data-load="${i}" ${sl ? '' : 'disabled'}>${t('loadSlot')} ${i + 1}<small>${sl ? (th ? 'บท ' : 'Ch. ') + (sl.checkpoint?.chapter ?? sl.unlocked) + ' · ' + new Date(sl.updated).toLocaleString() : t('empty')}</small></button>`).join('');
  document.querySelectorAll<HTMLElement>('[data-load]').forEach(b => b.onclick = async () => { camp = loadFromSlot(camp, +b.dataset.load!); await saveCampaign(camp); renderStoryMenu(); }); }
$('#btnStory').onclick = async () => { sfx.ui(); await campReady; renderStoryMenu(); show('#story'); };
$('#btnContinue').onclick = () => { const cp = camp.checkpoint; if (cp) playChapter(cp.chapter, cp.objective); };
$('#btnNewCamp').onclick = async () => { if (!confirm(getLang() === 'th' ? 'ล้างความคืบหน้าทั้งหมด?' : 'Erase all story progress?')) return; const slots = camp.slots; camp = newCampaign(); camp.slots = slots; await saveCampaign(camp); renderStoryMenu(); };
$('#btnBack3').onclick = () => show('#menu');
$('#btnNextCh').onclick = () => runner && playChapter(Math.min(12, runner.n + 1));
$('#btnRetryCp').onclick = () => { const cp = camp.checkpoint; if (runner) playChapter(runner.n, cp && cp.chapter === runner.n ? cp.objective : 0); };
$('#btnRestartCh').onclick = () => runner && playChapter(runner.n, 0);
$('#btnChSel').onclick = () => { toMenu(); renderStoryMenu(); show('#story'); };
$('#btnCheckpoint').onclick = () => { const cp = camp.checkpoint; if (runner) playChapter(runner.n, cp && cp.chapter === runner.n ? cp.objective : 0); };
document.querySelectorAll<HTMLElement>('[data-slot]').forEach(b => b.onclick = async () => { saveToSlot(camp, +b.dataset.slot!); await saveCampaign(camp); runner?.toast((getLang() === 'th' ? '💾 บันทึกช่อง ' : '💾 Saved to slot ') + (+b.dataset.slot! + 1)); });
addEventListener('keydown', e => { if (runner?.cine) { if (e.code === 'Space' || e.code === 'Enter') { runner.cine.advance(); e.preventDefault(); } if (e.code === 'Escape' || e.code === 'KeyK') runner.cine.finish(); } });
canvas.addEventListener('click', () => runner?.cine?.advance());
(window as any).__story = () => ({ runner, camp }); (window as any).__playChapter = playChapter;
// ---------------- Phase 5: screens, explore, replay, post-battle ----------------
import type { Explorer } from './modes/explore';
let explorer: Explorer | null = null; let screenStack: (() => void)[] = [];
const screens = () => import('./ui/screens');
const screenCtx = () => ({
  open: (html: string) => { show('#screen'); const b = $('#screenBody'); b.innerHTML = html; b.scrollTop = 0; return b; },
  close: () => { $('#screen').classList.add('hidden'); if (game) { $('#hud').classList.remove('hidden'); if (game.state === 'paused') input.pause = true; } else show('#menu'); },
  back: () => { screenStack.pop(); const prev = screenStack[screenStack.length - 1]; if (prev) prev(); else show('#menu'); },
  startCustom: (player: string, area: Area, b: CustomBattle) => { screenStack = []; startGame(player, b.army > 0 ? 'war' : 'duel', { area, custom: b, warCfg: { hogwarts: true, death: true, missions: false, deathPower: 1, army: b.army } }); },
  simulate, explore: (a: Area) => startExplore(a), progress, saveProgress: persistProgress,
});
const openScreen = (fn: (c: ReturnType<typeof screenCtx>) => void) => { const run = () => fn(screenCtx()); screenStack.push(run); run(); };
$('#btnSetup').onclick = () => { sfx.ui(); screenStack = []; screens().then(m => openScreen(m.freeBattle)); };
$('#btnWhatIf').onclick = () => { sfx.ui(); screenStack = []; screens().then(m => openScreen(m.whatIf)); };
$('#btnExplore').onclick = () => { sfx.ui(); screenStack = []; screens().then(m => openScreen(c => m.travelMap(c))); };
$('#btnGallery').onclick = () => { sfx.ui(); screenStack = []; screens().then(m => openScreen(m.gallery)); };
$('#btnSpells').onclick = () => { sfx.ui(); screenStack = []; screens().then(m => openScreen(m.spells)); };
$('#btnProgress').onclick = async () => { sfx.ui(); await progReady; screenStack = []; screens().then(m => openScreen(m.progression)); };
$('#btnReplayLast').onclick = () => { if (lastReplay) openReplay(lastReplay); };
async function startExplore(area: Area) { screenStack = []; $('#screen').classList.add('hidden'); const g = startGame(lastChar && FULL_ROSTER.some(c => c.id === lastChar && c.team === 'hogwarts') ? lastChar : 'harry', 'duel', { area, explore: true, story: { allies: [], start: area === 'courtyard' ? [0, 20] : area === 'forest' ? [0, 50] : area === 'hall' ? [0, 30] : [0, 8] } });
  document.body.classList.remove('m-story'); const { Explorer } = await import('./modes/explore'); explorer = new Explorer(g, area, xp => { award(progress, g.ctrl.def.id, xp); void persistProgress(); }); music.setMood('exploration'); }
document.addEventListener('click', e => { if ((e.target as HTMLElement)?.id === 'exMap') { document.exitPointerLock?.(); screens().then(m => { screenStack = []; m.travelMap(screenCtx(), true); }); } });
addEventListener('keydown', e => { if (e.code === 'KeyM' && explorer && game) { document.exitPointerLock?.(); screens().then(m => { screenStack = []; m.travelMap(screenCtx(), true); }); } });
/** Real AI-vs-AI simulation of a What If, stepped in chunks so the UI stays responsive. */
async function simulate(w: (typeof WHAT_IFS)[number], runs: number, onProgress: (t: string) => void) {
  const res: { win: boolean; secs: number; mvp: string }[] = []; const th = getLang() === 'th';
  for (let r = 0; r < runs; r++) {
    const cv = document.createElement('canvas'); const g = new Game(cv, { ...settings, gfx: 'low' } as any, input, { playerChar: w.player, auto: true, mode: w.battle.army > 0 ? 'war' : 'duel', area: w.area, custom: { ...w.battle }, warCfg: { hogwarts: true, death: true, missions: false, deathPower: 1, army: w.battle.army } } as any);
    let n = 0; while (g.state === 'playing' && n < 30 * 360) { for (let k = 0; k < 150 && g.state === 'playing' && n < 30 * 360; k++, n++) g.step(1 / 30); onProgress(`⏳ ${th ? 'รอบ' : 'run'} ${r + 1}/${runs} · ${Math.round(n / 30)}s`); await new Promise(rs => setTimeout(rs, 0)); }
    const st = battleStats(g.entities as any); res.push({ win: g.state === 'won', secs: Math.round(n / 30), mvp: st.mvp?.name ?? '-' }); g.dispose(); (g.renderer as any).forceContextLoss?.();
  }
  const wins = res.filter(x => x.win).length; const pteam = w.battle.hogwarts.includes(w.player) ? (th ? 'ฝ่ายปกป้อง' : 'Defenders') : (th ? 'ฝ่ายบุก' : 'Attackers');
  onProgress(`<b>${pteam} ${th ? 'ชนะ' : 'won'} ${wins}/${runs}</b> (${Math.round(wins / runs * 100)}%)<br>${res.map((x, i) => `${i + 1}: ${x.win ? '✔' : '✘'} ${x.secs}s · MVP ${x.mvp}`).join('<br>')}`);
}
function postBattle(g: Game, won: boolean) { const th = getLang() === 'th'; const st = battleStats(g.entities as any); const secs = g.time;
  const gains: string[] = []; for (const r of st.rows) if (r.team === g.playerTeam && SKILLS_ALL[r.id]) { const xp = battleXP({ dmg: r.dmg, kos: r.kos, healed: r.healed, won, secs }); const a = award(progress, r.id, xp); gains.push(`${r.name} +${xp}XP${a.levelUp ? ' ⬆Lv' + a.level : ''}`); } void persistProgress();
  if (g.recorder && g.recorder.data.frames.length > 5) { g.recorder.data.result = won ? 'win' : 'lose'; lastReplay = g.recorder.data; }
  $('#endTitle').textContent = t(won ? 'win' : 'lose'); const s = g.stats;
  $('#endStats').innerHTML = `⏱ ${secs.toFixed(0)}s · ✨ ${s.cast} · 🎯 ${s.hits} · ☠ ${s.kills} · ⚡ ${s.clashesWon} · 🔗 ${s.bestCombo}${g.war ? ` · ⚑ ${Math.round(g.war.score)} · ✚ ${g.war.stats.revived}` : ''}`;
  $('#endMvp').innerHTML = st.mvp ? `🏆 MVP: <b>${st.mvp.name}</b> (${st.mvp.dmg} ${th ? 'ดาเมจ' : 'dmg'}, ${st.mvp.kos} KO, ${st.mvp.healed} ${th ? 'ฮีล' : 'heal'})` : '';
  $('#endTable').innerHTML = `<table><tr><th></th><th>${th ? 'ตัวละคร' : 'Character'}</th><th>DMG</th><th>KO</th><th>${th ? 'ฮีล' : 'Heal'}</th><th>${th ? 'รับ' : 'Taken'}</th></tr>${st.rows.slice(0, 12).map(r => `<tr class="${r.team === g.playerTeam ? 'me' : 'foe'}"><td>${r.alive ? '' : '✖'}</td><td>${r.name}</td><td>${r.dmg}</td><td>${r.kos}</td><td>${r.healed}</td><td>${r.taken}</td></tr>`).join('')}</table>`;
  $('#endTimeline').innerHTML = g.timeline.slice(-14).map(e => `<div style="color:${e.color}">${e.t.toFixed(0)}s · ${e.text}</div>`).join('') + (gains.length ? `<div class="xp">${gains.join(' · ')}</div>` : '');
  $('#btnReplay').style.display = lastReplay ? '' : 'none'; show('#end'); }
$('#btnReplay').onclick = () => { if (lastReplay) openReplay(lastReplay); };
async function openReplay(r: Replay) { const { ReplayViewer } = await import('./replay/viewer'); game?.dispose(); game = null; clearInterval(hudTimer); show(null); $('#hud').classList.add('hidden'); document.body.className = 'm-replay';
  (window as any).__replay = new ReplayViewer(canvas, r, () => { (window as any).__replay = null; document.body.className = ''; show('#menu'); }); }
// camera modes (phase 9)
import { CAM_LABEL, nextMode } from './rendering/camera';
function updCam(m: string) { const L = (CAM_LABEL as any)[m]; const txt = L ? L[getLang() === 'th' ? 1 : 0 as any] ?? L.en : m; const lab = getLang() === 'th' ? L.th : L.en; $('#camL').textContent = lab; $('#tCamL').textContent = lab; ['fps', 'tps', 'follow', 'far', 'top'].forEach(k => document.body.classList.toggle('cam-' + k, k === m)); void txt; }
$('#camBtn').addEventListener('click', e => { e.stopPropagation(); if (game) game.setCamMode(nextMode(game.camMode)); else { settings.camMode = nextMode(settings.camMode); saveSettings(settings); updCam(settings.camMode); } });
{ const sc = $('#sCam') as HTMLSelectElement, iy = $('#sInvY') as HTMLInputElement, sm = $('#sSmooth') as HTMLInputElement, tl = $('#sTouchLook') as HTMLInputElement;
  const sync = () => { [...sc.options].forEach(o => o.textContent = (CAM_LABEL as any)[o.value][getLang() === 'th' ? 'th' : 'en']); sc.value = settings.camMode ?? 'tps'; iy.checked = !!settings.invertY; sm.value = String(settings.camSmooth ?? 0.3); tl.value = String(settings.touchLook ?? 1); }; sync(); $('#btnSettings').addEventListener('click', sync);
  sc.onchange = () => { settings.camMode = sc.value as any; saveSettings(settings); if (game) game.setCamMode(settings.camMode); updCam(settings.camMode); };
  iy.onchange = () => { settings.invertY = iy.checked; saveSettings(settings); }; sm.oninput = () => { settings.camSmooth = +sm.value; saveSettings(settings); }; tl.oninput = () => { settings.touchLook = +tl.value; saveSettings(settings); input.touchLook = +tl.value; }; }
// touch layout settings (phase 8)
new MutationObserver(() => { const want = !!settings.lefty; if (document.body.classList.contains('lefty') !== want) document.body.classList.toggle('lefty', want); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
const applyCtl = () => { document.documentElement.style.setProperty('--bs', String(settings.btnSize ?? 1)); document.documentElement.style.setProperty('--bo', String(settings.btnOpacity ?? 0.85)); document.body.classList.toggle('lefty', !!settings.lefty); }; applyCtl();
{ const bs = $('#sBtnSize') as HTMLInputElement, bo = $('#sBtnOp') as HTMLInputElement, lf = $('#sLefty') as HTMLInputElement, ac = $('#sAutoCancel') as HTMLInputElement;
  const sync = () => { bs.value = String(settings.btnSize ?? 1); bo.value = String(settings.btnOpacity ?? 0.85); lf.checked = !!settings.lefty; ac.checked = !!settings.autoCancel; }; sync(); $('#btnSettings').addEventListener('click', sync);
  bs.oninput = () => { settings.btnSize = +bs.value; saveSettings(settings); applyCtl(); }; bo.oninput = () => { settings.btnOpacity = +bo.value; saveSettings(settings); applyCtl(); };
  lf.onchange = () => { settings.lefty = lf.checked; saveSettings(settings); applyCtl(); }; ac.onchange = () => { settings.autoCancel = ac.checked; saveSettings(settings); if (game) game.autoCancel = ac.checked; }; }
$('#autoBtn').addEventListener('click', e => { e.stopPropagation(); if (game && game.state === 'playing') game.setAuto(!game.auto); });
// settings (phase 5)
const gfx = $('#sGfx') as HTMLSelectElement, adapt = $('#sAdapt') as HTMLInputElement, assist = $('#sAssist') as HTMLInputElement, fant = $('#sFantasy') as HTMLInputElement, mus = $('#sMusic') as HTMLInputElement;
const syncSettings = () => { gfx.value = settings.gfx; adapt.checked = settings.adaptive; assist.checked = settings.assist; fant.checked = settings.fantasy; mus.value = String(settings.music); }; syncSettings();
$('#btnSettings').addEventListener('click', syncSettings);
gfx.onchange = () => { settings.gfx = gfx.value as any; saveSettings(settings); }; adapt.onchange = () => { settings.adaptive = adapt.checked; saveSettings(settings); };
assist.onchange = () => { settings.assist = assist.checked; saveSettings(settings); if (game) game.assist = assist.checked; };
mus.oninput = () => { settings.music = +mus.value; saveSettings(settings); music.setVolume(settings.music); };
fant.onchange = () => { settings.fantasy = fant.checked; saveSettings(settings); location.reload(); };
document.addEventListener('pointerdown', () => { initAudio(); const ac = audioCtx(); if (ac && !music.ctx) { music.init(ac.ctx, ac.master); music.setVolume(settings.music); music.setMood('exploration'); } }, { once: true });
(window as any).__progress = () => progress; (window as any).__whatifs = WHAT_IFS; (window as any).__simulate = simulate; (window as any).__openReplay = () => lastReplay && openReplay(lastReplay); (window as any).__startCustom = (p: string, a: Area, b: CustomBattle) => screenCtx().startCustom(p, a, b); (window as any).__explore = startExplore;
(window as any).__toMenu = toMenu;

(window as any).__crowd = () => import('./ui/lineup').then(m => m.crowdLineup());
(window as any).__lineup = (ids: string[], o: any) => import('./ui/lineup').then(m => m.lineup(ids, o));
