import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(600); await p.screenshot({ path: 'menu3.png' });
const btns = await p.evaluate(() => [...document.querySelectorAll('#menu button')].map(b => (b.disabled ? '[off] ' : '[on] ') + b.textContent.trim()));
console.log(btns.join('\n'));
await p.click('#btnWar'); await p.click('[data-char="harry"]'); await p.waitForTimeout(1500);
// fast-forward so the armies meet, then play a little
await p.evaluate(() => { const g = window.__game(); for (let i = 0; i < 30 * 25; i++) g.step(1 / 30); });
await p.keyboard.down('KeyW'); await p.waitForTimeout(800); await p.keyboard.up('KeyW');
await p.evaluate(() => { window.__game().input.fire = true; }); await p.waitForTimeout(1500); await p.evaluate(() => { window.__game().input.fire = false; });
await p.screenshot({ path: 'shot3.png' });
console.log('war', JSON.stringify(await p.evaluate(() => { const g = window.__game(), w = g.war; return { units: w.aliveUnits().length, cap: w.cap, fps: w.scaler.fps.toFixed(1), score: w.score.toFixed(1), controls: w.controls.map(c => +c.toFixed(2)), missions: w.missions.map(m => m.kind + ':' + m.status), destroyed: g.destruction.destroyed, stats: w.stats }; })));
// rescue test: create a downed student next to player and hold F
const rescued = await p.evaluate(async () => { const g = window.__game(), w = g.war; const u = w.spawn('hogwarts', false, 'student', { x: g.ctrl.pos.x + 1, z: g.ctrl.pos.z }, 0, true); u.x = g.ctrl.pos.x + 1; u.z = g.ctrl.pos.z; const before = w.stats.revived; g.input.keys.add('KeyF'); for (let i = 0; i < 60; i++) g.step(1 / 30); g.input.keys.delete('KeyF'); return [before, w.stats.revived, u.state]; });
console.log('rescue', rescued);
// destructible test
console.log('destruct', await p.evaluate(() => { const g = window.__game(); const d = g.world.destructibles[0]; const b0 = g.world.boxes.length; g.destruction.damage(d, 1000); return [d.state, b0 - g.world.boxes.length, g.destruction.destroyed]; }));
// commander
await p.evaluate(() => window.__start('harry', 'commander')); await p.waitForTimeout(1200);
const clk = s => p.evaluate(s => document.querySelector(s).click(), s);
await clk('[data-sq="2"]'); await clk('[data-zone="4"]'); await clk('[data-order="attack"]'); await clk('[data-sq="3"]'); await clk('[data-zone="2"]'); await clk('[data-order="defend"]');
await p.evaluate(() => { const g = window.__game(); for (let i = 0; i < 30 * 20; i++) g.step(1 / 30); });
await p.waitForTimeout(1500); await p.screenshot({ path: 'commander.png' });
console.log('cmd', JSON.stringify(await p.evaluate(() => { const w = window.__game().war; return { squads: w.squads.map(s => s.name + ':' + s.order + '@' + s.zone + (s.manual ? '*' : '')), sq2z: (w.units.filter(u => u.active && u.squad === 2 && u.state === 'fight').reduce((a, u) => a + u.z, 0) / Math.max(1, w.units.filter(u => u.active && u.squad === 2 && u.state === 'fight').length)).toFixed(1) }; })));
// spectator
await p.evaluate(() => window.__start('harry', 'spectator')); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game(); for (let i = 0; i < 30 * 30; i++) g.step(1 / 30); });
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500); await p.screenshot({ path: 'spectator.png' });
console.log('spec', await p.evaluate(() => window.__game().specLabel), await p.textContent('#warStats'));
console.log('ERRORS', JSON.stringify(errs)); await b.close();
