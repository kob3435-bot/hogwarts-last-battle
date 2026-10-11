import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1600, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4175/'); await p.waitForTimeout(600); await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('hp-lastbattle-settings-v1') || '{}'); s.fantasy = false; s.lang = 'en'; localStorage.setItem('hp-lastbattle-settings-v1', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(600);
const shots = JSON.parse(process.argv[2]);
for (const [name, ids, opts, w, h] of shots) { await p.setViewportSize({ width: w ?? 1600, height: h ?? 700 }); await p.evaluate(([ids, o]) => __lineup(ids, o), [ids, opts]); await p.waitForTimeout(1500); await p.screenshot({ path: name }); }
console.log('errors', errs); await b.close();
