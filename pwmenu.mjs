import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(600);
const state = () => p.evaluate(() => { const vis = ['#menu', '#settings', '#select', '#story', '#screen', '#end', '#hud'].filter(s => !document.querySelector(s).classList.contains('hidden')); const g = window.__game?.(); return vis.join(',') + (g ? ` game:${g.mode}/${g.state}` : '') + (document.querySelector('#replayUI') ? ' replay' : ''); });
const home = async () => { if (await p.evaluate(() => !!window.__game?.() || !!window.__replay)) { await p.evaluate(() => { window.__replay?.exit(); window.__toMenu(); }); await p.waitForTimeout(300); return; } await p.evaluate(() => { document.exitPointerLock?.(); }); await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(200); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /^(btnPauseMenu|btnMenu|btnBack|btnBack2|fbBack|wiBack|tmBack|gBack|spBack|pBack|btnStoryBack|btnBack3|rpExit)$/.test(b.id) && b.offsetParent); b?.click(); }); await p.waitForTimeout(400); };
const ids = await p.evaluate(() => [...document.querySelectorAll('#menu button')].map(b => b.id));
for (const id of ids) { if (id === 'btnLang') continue; if (await p.evaluate(id => document.getElementById(id).disabled, id)) { console.log(id.padEnd(15), '(disabled: no replay yet)'); continue; } await p.click('#' + id); await p.waitForTimeout(900); let s = await state();
  if (id === 'btnPlay' || id === 'btnWar') { await p.click('[data-char="hermione"]'); await p.waitForTimeout(900); s += ' → ' + await state(); }
  if (id === 'btnStory') { const bs = await p.evaluate(() => [...document.querySelectorAll('#story button')].map(b => b.id || b.dataset.ch || b.textContent.slice(0, 12)).join('|')); s += ' [' + bs + ']'; }
  console.log(id.padEnd(15), s); await home(); await home(); }
// lang toggle
await p.click('#btnLang'); console.log('lang', await p.evaluate(() => document.documentElement.lang + ' ' + document.querySelector('#btnSetup').textContent));
// settings controls
await p.click('#btnSettings'); await p.selectOption('#sGfx', 'low'); await p.check('#sAssist'); await p.click('#btnBack'); await p.waitForTimeout(200);
console.log('settings saved', await p.evaluate(() => localStorage.getItem('hp-lastbattle-settings-v1')));
await p.evaluate(() => __start('harry', 'duel')); await p.waitForTimeout(500); console.log('assist/low', await p.evaluate(() => { const g = __game(); for (let i = 0; i < 600; i++) g.step(1 / 30); return g.assist + ' ' + g.gfx + ' post=' + !!g.post + ' shadows=' + g.renderer.shadowMap.enabled + ' casts=' + g.stats.cast; }));
console.log('errors', errs.length, errs.slice(0, 5)); await b.close();
