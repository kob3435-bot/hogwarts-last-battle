import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(600);
console.log('story btn disabled?', await p.evaluate(() => document.querySelector('#btnStory').disabled));
await p.click('#btnStory'); await p.waitForTimeout(300);
console.log('chapters', await p.evaluate(() => [...document.querySelectorAll('[data-ch]')].map(b => (b.disabled ? 'L' : 'U')).join('')));
await p.click('[data-ch="1"]'); await p.waitForTimeout(2500); await p.screenshot({ path: 'cine1.png' });
console.log('sub', await p.evaluate(() => document.querySelector('#sub').textContent));
await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.click('#skip'); await p.waitForTimeout(800);
// solver: reach/talk/collect teleport (as a fast player would walk); fights are fought by the real combat AI in fast-forward
const solve = (maxSec) => p.evaluate((maxSec) => { const { runner: r } = window.__story(); const g = r.g; g.ctrl.playerControlled = false; let n = 0; const log = [];
  while (!r.over && n < maxSec * 30) { if (r.cine) { r.cine.finish(); } const o = r.obj;
    if (o && (o.kind === 'reach' || o.kind === 'collect') ) { g.ctrl.pos.x = o.x; g.ctrl.pos.z = o.z; }
    if (o && o.kind === 'talk') { const t = g.entities.find(e => e.def.id === o.target); if (t) { g.ctrl.pos.x = t.pos.x + 1; g.ctrl.pos.z = t.pos.z + 1; } }
    if (o && o.kind === 'interact') { const i = [...Array(o.points.length).keys()].find(i => !r.interacted.has(i)); if (i !== undefined) { g.ctrl.pos.x = o.points[i][0]; g.ctrl.pos.z = o.points[i][1]; } }
    if (o && o.kind === 'revive') { const u = g.war.units.find(u => u.active && u.state === 'downed'); if (u) { g.ctrl.pos.x = u.x; g.ctrl.pos.z = u.z + 1; g.input.keys.add('KeyF'); } }
    const pi = r.idx; g.ctrl.playerControlled = false; g.step(1 / 30); r.update(1 / 30); n++; if (r.idx !== pi) log.push(`obj${pi}->${r.idx}@${(n / 30).toFixed(0)}s`); }
  g.input.keys.delete('KeyF'); return { over: r.over, state: g.state, idx: r.idx, secs: Math.round(n / 30), flags: r.flags, log }; }, maxSec);
await p.screenshot({ path: 'ch1play.png' });
console.log('ch1', JSON.stringify(await solve(300)));
await p.waitForTimeout(1500); console.log('end', await p.evaluate(() => document.querySelector('#seTitle').textContent + ' | ' + document.querySelector('#seText').innerText));
await p.reload(); await p.waitForTimeout(800); await p.click('#btnStory'); await p.waitForTimeout(500);
console.log('after reload', await p.evaluate(() => document.querySelector('#storyProg').textContent + ' | ' + [...document.querySelectorAll('[data-ch]')].map(b => (b.disabled ? 'L' : 'U')).join('') + ' | ' + document.querySelector('#btnContinue').textContent));
// manual save slot + all other chapters smoke + auto-solve
const results = {};
for (const n of [2,3,4,5,6,7,8,9,10,11,12]) { await p.evaluate(n => window.__playChapter(n), n); await p.waitForTimeout(n === 12 ? 2500 : 700);
  if (n === 12) { await p.screenshot({ path: 'cine12.png' }); await p.click('#skip'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__game(); g.ctrl.playerControlled = false; for (let i = 0; i < 30 * 8; i++) { g.step(1 / 30); window.__story().runner.update(1 / 30); } g.ctrl.playerControlled = true; });
    await p.keyboard.down('KeyW'); await p.waitForTimeout(600); await p.keyboard.up('KeyW'); await p.evaluate(() => { window.__game().input.fire = true; }); await p.waitForTimeout(1200); await p.evaluate(() => { window.__game().input.fire = false; });
    await p.screenshot({ path: 'shot4.png' }); }
  results[n] = await solve(420); console.log(n, JSON.stringify(results[n])); }
await p.click('[data-slot="0"]', { force: true }).catch(() => {});
console.log('final camp', JSON.stringify(await p.evaluate(() => { const c = window.__story().camp; return { unlocked: c.unlocked, completed: c.completed, flags: c.flags }; })));
console.log('errors', errs.length, errs.slice(0, 8));
await b.close();
