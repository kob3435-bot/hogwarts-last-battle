import { chromium } from 'playwright';
const N = +(process.argv[2] || 4), mode = process.argv[3] || 'spectator', diff = process.argv[4] || 'normal';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4175/');
for (let i = 0; i < N; i++) { const t0 = Date.now(); const r = await p.evaluate(([m, d]) => window.__sim('harry', d, 600, m), [mode, diff]); console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(r)); }
console.log('errors', errs.slice(0, 5)); await b.close();
