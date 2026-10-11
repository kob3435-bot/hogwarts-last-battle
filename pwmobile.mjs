import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['Pixel 7 landscape'] }); const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(700); const log = (...a) => console.log(...a);
log('viewport', JSON.stringify(p.viewportSize()), 'touch class', await p.evaluate(() => document.querySelector('#hud').classList.contains('touch')));
await p.screenshot({ path: 'mobile_menu.png' });
// synthetic multi-touch helper on the canvas
await p.evaluate(() => { window.__touch = (type, pts) => { const c = document.querySelector('#c'); const touches = pts.map(([id, x, y]) => new Touch({ identifier: id, target: c, clientX: x, clientY: y }));
  c.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : touches, changedTouches: touches, targetTouches: touches, bubbles: true, cancelable: true })); }; });
await p.tap('#btnPlay'); await p.waitForTimeout(300); await p.tap('[data-char="harry"]'); await p.waitForTimeout(1200);
log('touch ui', await p.evaluate(() => ['#touch', '#stick', '#tFire', '#tS1', '#tUlt'].map(s => s + ':' + getComputedStyle(document.querySelector(s)).display).join(' ')));
const z0 = await p.evaluate(() => __game().ctrl.pos.z);
await p.evaluate(() => { __touch('touchstart', [[1, 120, 300]]); }); for (let i = 0; i < 8; i++) { await p.evaluate(i => __touch('touchmove', [[1, 120, 300 - i * 8]]), i); await p.waitForTimeout(60); }
await p.waitForTimeout(600); const mv = await p.evaluate(() => [__game().input.moveX.toFixed(2), __game().input.moveY.toFixed(2)]); await p.evaluate(() => __touch('touchend', [[1, 120, 236]]));
const z1 = await p.evaluate(() => __game().ctrl.pos.z); log('stick move', mv.join(','), 'dz', (z0 - z1).toFixed(2));
const c0 = await p.evaluate(() => __game().stats.cast); await p.tap('#tFire'); await p.waitForTimeout(200); await p.evaluate(() => { document.querySelector('#tFire').dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true })); });
await p.tap('#tS1'); await p.waitForTimeout(300); log('fire casts', c0, '->', await p.evaluate(() => __game().stats.cast));
// look drag on right side
const y0 = await p.evaluate(() => __game().camYaw ?? __game().yaw ?? 0); await p.evaluate(() => { __touch('touchstart', [[2, 700, 200]]); __touch('touchmove', [[2, 760, 200]]); __touch('touchend', [[2, 760, 200]]); });
await p.screenshot({ path: 'mobile_duel.png' });
await p.tap('#tPause'); await p.waitForTimeout(300); log('pause', await p.evaluate(() => __game().state)); await p.tap('#btnPauseMenu'); await p.waitForTimeout(300);
// commander on touch
await p.tap('#btnCommander'); await p.waitForTimeout(1200);
log('cmd ui', await p.evaluate(() => ['#stick', '#tPause', '#tFire', '#cmdToggle', '#cmd', '#minimap'].map(s => s + ':' + getComputedStyle(document.querySelector(s)).display).join(' ')));
const t0 = await p.evaluate(() => ({ ...__game().tac }));
await p.evaluate(() => { __touch('touchstart', [[1, 100, 300]]); __touch('touchmove', [[1, 100, 240]]); }); await p.waitForTimeout(500); await p.evaluate(() => __touch('touchend', [[1, 100, 240]]));
const t1 = await p.evaluate(() => ({ ...__game().tac }));
await p.evaluate(() => { __touch('touchstart', [[3, 500, 200], [4, 560, 200]]); __touch('touchmove', [[3, 440, 200], [4, 640, 200]]); __touch('touchmove', [[3, 380, 200], [4, 720, 200]]); __touch('touchend', [[3, 380, 200], [4, 720, 200]]); });
const t2 = await p.evaluate(() => ({ ...__game().tac }));
await p.tap('#minimap'); await p.waitForTimeout(200); const t3 = await p.evaluate(() => ({ ...__game().tac }));
log('cmd pan', (t0.z - t1.z).toFixed(1), 'pinch zoom', t1.zoom.toFixed(1), '->', t2.zoom.toFixed(1), 'minimap jump', `${t2.x.toFixed(1)},${t2.z.toFixed(1)} -> ${t3.x.toFixed(1)},${t3.z.toFixed(1)}`);
await p.tap('[data-sq="1"]'); await p.tap('[data-zone="3"]'); await p.tap('[data-order="defend"]'); await p.waitForTimeout(200);
log('order', await p.evaluate(() => { const s = __game().war.squads[1]; return s.order + '@' + s.zone + (s.manual ? '*' : ''); }));
await p.screenshot({ path: 'mobile_commander.png' });
await p.tap('#cmdToggle', { timeout: 5000 }); await p.waitForTimeout(200); log('collapsed', await p.evaluate(() => document.querySelector('#cmd').classList.contains('collapsed'))); await p.screenshot({ path: 'mobile_commander_collapsed.png' });
await p.tap('#tPause'); await p.waitForTimeout(300); await p.tap('#btnPauseMenu'); await p.waitForTimeout(300);
// story on touch: start ch1, tap skip, objective tracker
await p.tap('#btnStory'); await p.waitForTimeout(400); await p.tap('[data-ch="1"]'); await p.waitForTimeout(1500); await p.tap('#skip'); await p.waitForTimeout(800);
log('story touch', await p.evaluate(() => document.querySelector('#storyObj').innerText.split('\n')[1])); await p.screenshot({ path: 'mobile_story.png' });
// screens on small viewport
await p.evaluate(() => { document.querySelector('#tPause').dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })); }); await p.waitForTimeout(300); await p.tap('#btnPauseMenu'); await p.waitForTimeout(300);
await p.tap('#btnSetup'); await p.waitForTimeout(400); await p.screenshot({ path: 'mobile_setup.png' }); log('setup fits', await p.evaluate(() => document.querySelector('#screenBody').scrollWidth <= innerWidth + 2)); await p.tap('#fbBack');
log('errors', errs.length, errs.slice(0, 6)); await b.close();
