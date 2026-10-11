import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const U = 'http://localhost:4175/'; await p.goto(U); await p.waitForTimeout(700);
const log = (...a) => console.log(...a);
log('menu', await p.evaluate(() => [...document.querySelectorAll('#menu button')].map(b => (b.disabled ? '[off]' : '') + b.id).join(' ')));
await p.screenshot({ path: 'menu5.png' });
// free battle setup
await p.click('#btnSetup'); await p.waitForTimeout(500); await p.screenshot({ path: 'setup5.png' });
await p.click('[data-fb="hogwarts:neville"]'); await p.selectOption('#fbArmy', '0'); await p.selectOption('#fbArea', 'library'); await p.click('#fbStart'); await p.waitForTimeout(1500);
log('custom', JSON.stringify(await p.evaluate(() => { const g = __game(); return { area: g.opts.area, n: g.entities.length, ids: g.entities.map(e => e.def.id), syn: (g.updateSynergy(), g.entities.map(e => e.synNames.join('+')).filter(Boolean)) }; })));
await p.evaluate(() => { const g = __game(); g.ctrl.playerControlled = false; for (let i = 0; i < 30 * 300 && g.state === 'playing'; i++) g.step(1 / 30); });
await p.waitForTimeout(2500); await p.screenshot({ path: 'postbattle5.png' });
log('post', await p.evaluate(() => document.querySelector('#endTitle').textContent + ' | ' + document.querySelector('#endMvp').textContent + ' | replay=' + getComputedStyle(document.querySelector('#btnReplay')).display + ' | ' + document.querySelector('#endTimeline').innerText.slice(-120)));
await p.click('#btnReplay'); await p.waitForTimeout(1200); await p.click('[data-sp="0.25"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'replay5.png' });
log('replay', await p.evaluate(() => document.querySelector('#rpT').textContent + ' events=' + document.querySelectorAll('[data-ev]').length));
await p.click('#rpExit'); await p.waitForTimeout(400);
// gallery / spells / progression
await p.click('#btnGallery'); await p.waitForTimeout(600); await p.click('[data-fac="legend"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'gallery5.png' });
log('gallery', await p.evaluate(() => document.querySelectorAll('[data-gc]').length + ' ' + document.querySelector('#gInfo h3').textContent)); await p.click('#gBack');
await p.click('#btnSpells'); await p.waitForTimeout(400); log('spells rows', await p.evaluate(() => document.querySelectorAll('.enc tr').length)); await p.screenshot({ path: 'spells5.png' }); await p.click('#spBack');
await p.click('#btnProgress'); await p.waitForTimeout(500); log('prog', await p.evaluate(() => document.querySelector('#pDet h3').textContent + ' ' + document.querySelector('#pDet p').textContent)); await p.click('#pBack');
// What If simulate (duel scenario, real sim)
await p.click('#btnWhatIf'); await p.waitForTimeout(400); await p.screenshot({ path: 'whatif5.png' });
await p.click('[data-wis="8"]'); await p.waitForFunction(() => /\/5/.test(document.querySelector('#wir8').textContent) && !/⏳/.test(document.querySelector('#wir8').textContent), null, { timeout: 240000 });
log('sim ages', await p.evaluate(() => document.querySelector('#wir8').innerText.replace(/\n/g, ' ')));
await p.click('[data-wip="0"]'); await p.waitForTimeout(2500); log('whatif0', JSON.stringify(await p.evaluate(() => { const g = __game(); return { mode: g.mode, ids: g.entities.map(e => e.def.id + ':' + e.def.team[0]), units: g.war?.aliveUnits().length }; })));
await p.evaluate(() => { const g = __game(); for (let i = 0; i < 30 * 15; i++) g.step(1 / 30); }); await p.waitForTimeout(800); await p.screenshot({ path: 'shot5.png' });
// explore every area
const areas = ['clocktower', 'library', 'hospital', 'hagrid', 'boathouse', 'astronomy', 'office'];
for (const a of areas) { await p.evaluate(a => __explore(a), a); await p.waitForTimeout(900); await p.evaluate(() => { const g = __game(); for (let i = 0; i < 30; i++) g.step(1 / 30); });
  if (a === 'clocktower' || a === 'boathouse' || a === 'office') await p.screenshot({ path: `explore_${a}.png` });
  log('explore', a, await p.evaluate(() => document.querySelector('#exploreHud').textContent)); }
// card pickup
log('card', await p.evaluate(() => { const g = __game(); const ex = g.world.scene.children.find(o => o.geometry?.type === 'OctahedronGeometry'); g.ctrl.pos.set(ex.position.x, 0, ex.position.z); return 'ok'; })); await p.waitForTimeout(600);
log('cards', await p.evaluate(() => document.querySelector('#exploreHud').textContent));
// travel map in-game
await p.keyboard.press('KeyM'); await p.waitForTimeout(500); log('map pins', await p.evaluate(() => document.querySelectorAll('[data-go]').length)); await p.click('[data-go="hall"]'); await p.waitForTimeout(900); log('travelled', await p.evaluate(() => __game().opts.area));
// gamepad emulation
await p.evaluate(() => { const pad = { connected: true, axes: [0, -1, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [pad]; window.__pad = pad; });
const z0 = await p.evaluate(() => __game().ctrl.pos.z); await p.waitForTimeout(800); const z1 = await p.evaluate(() => __game().ctrl.pos.z);
await p.evaluate(() => { __pad.buttons[7].pressed = true; }); await p.waitForTimeout(500); const casts = await p.evaluate(() => __game().stats.cast); await p.evaluate(() => { __pad.buttons[7].pressed = false; __pad.axes[1] = 0; });
log('gamepad moved', (z0 - z1).toFixed(2), 'casts', casts);
// settings presets + assist
await p.evaluate(() => __start('harry', 'duel')); await p.waitForTimeout(600); log('gfx', await p.evaluate(() => { const g = __game(); return g.gfx + ' pr=' + g.pr + ' post=' + !!g.post; }));
await p.reload(); await p.waitForTimeout(900); log('xp after reload', await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(__progress().chars).slice(0,4).map(([k,v]) => [k, v.xp])))));
// fantasy mode
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('hp-lastbattle-settings-v1') || '{}'); s.fantasy = true; s.lang = 'en'; s.gfx = 'low'; localStorage.setItem('hp-lastbattle-settings-v1', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(800);
log('fantasy', await p.evaluate(() => document.title + ' | ' + document.querySelector('#bigTitle').textContent + ' | ' + document.querySelector('#menu h2').textContent));
await p.click('#btnGallery'); await p.waitForTimeout(500); log('fantasy gallery', await p.evaluate(() => [...document.querySelectorAll('[data-gc]')].slice(0, 6).map(b => b.textContent).join(', '))); await p.screenshot({ path: 'fantasy5.png' });
log('errors', errs.length, errs.slice(0, 8)); await b.close();
