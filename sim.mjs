import { chromium } from 'playwright';
const [,, diffs = 'normal,easy', N = '10', char = 'harry'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4175/');
for (const d of diffs.split(',')) { let w = 0; const times = [];
  for (let i = 0; i < +N; i++) { const r = await p.evaluate(([c, d]) => window.__sim(c, d), [char, d]); if (r.state === 'won') w++; times.push(r.secs + (r.state[0])); if (process.env.V) console.log(JSON.stringify(r)); }
  console.log(d, 'hero/player-side wins', w, '/', N, times.join(' ')); }
console.log('errors', errs.slice(0, 5)); await b.close();
