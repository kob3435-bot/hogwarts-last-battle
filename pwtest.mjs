import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.setExtraHTTPHeaders({'bypass-tunnel-reminder':'1'}); await p.goto(process.argv[2] || 'http://localhost:4175/'); await p.waitForTimeout(1000);
await p.screenshot({ path: 'menu.png' });
await p.click('#btnPlay'); await p.waitForTimeout(1500);
// simulate play: move forward and cast
await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
await p.evaluate(() => { const g = window.__game(); g.input.fire = true; });
await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game(); g.input.fire = false; g.input.cycle = 1; });
await p.keyboard.press('Tab'); await p.waitForTimeout(4000);
const st = await p.evaluate(() => { const g = window.__game(); return { state: g.state, ctrl: g.ctrl.def.id, stats: g.stats, ents: g.entities.map(e => [e.def.id, Math.round(e.hp), e.pos.x.toFixed(1), e.pos.z.toFixed(1)]), proj: g.projectiles.length }; });
console.log(JSON.stringify(st));
await p.screenshot({ path: 'shot.png' });
// fast-forward battle simulation
const end = await p.evaluate(() => { const g = window.__game(); g.setControlled(g.entities[0]); g.entities[0].playerControlled = false; let n = 0; while (g.state === 'playing' && n < 20000) { g.step(1/30); n++; } return { state: g.state, secs: (n/30).toFixed(0), ents: g.entities.map(e => [e.def.id, Math.round(e.hp)]) }; });
console.log(JSON.stringify(end)); await p.waitForTimeout(2000); await p.screenshot({ path: 'end.png' });
console.log('ERRORS', JSON.stringify(errs)); await b.close();
