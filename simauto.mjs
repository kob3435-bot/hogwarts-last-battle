import { chromium } from 'playwright';
const [,, scen = 'duel', N = '6', brains = 'old,new', extra = '{}'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800);
const base = scen === 'duel' ? { mode: 'duel' } : scen === 'war' ? { mode: 'war', maxSec: 200 } : { chapter: +scen.replace('ch', ''), maxSec: 200 };
for (const br of brains.split(',')) { const rs = []; const t0 = Date.now();
  for (let i = 0; i < +N; i++) rs.push(await p.evaluate(o => window.__autoSim(o), { ...base, ...JSON.parse(extra), brain: br.split(':')[0], aggro: br.split(':')[1] ?? 'balanced' }));
  const wins = rs.filter(r => r.state === 'won').length, deaths = rs.filter(r => !r.survived).length, k = rs.reduce((a, r) => a + r.kills, 0), nk = rs.reduce((a, r) => a + r.npcKills, 0), surv = rs.reduce((a, r) => a + r.survival, 0) / rs.length;
  console.log(JSON.stringify({ scen, brain: br, n: rs.length, winRate: (wins / rs.length * 100).toFixed(0) + '%', deaths, avgSurvivalS: surv.toFixed(0), heroKills: k, npcKills: nk, KD: ((k + nk) / Math.max(1, deaths)).toFixed(1), heroKD: (k / Math.max(1, deaths)).toFixed(2), states: rs.map(r => r.state[0] + r.survival).join(' '), wallS: ((Date.now() - t0) / 1000).toFixed(0) })); }
console.log('errors', errs.slice(0, 3)); await b.close();
