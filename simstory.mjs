import { chromium } from 'playwright';
const [,, chs = '1,2,3,4,5,6,7,8,9,10,11,12', N = '3', brains = 'old,new'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800); const tot = {};
for (const c of chs.split(',')) for (const br of brains.split(',')) { const rs = []; for (let i = 0; i < +N; i++) rs.push(await p.evaluate(([c, br]) => window.__storySim(+c, br.split(':')[0], 240, br.split(':')[1] ?? 'balanced'), [c, br]));
  const T = tot[br] ??= { runs: 0, won: 0, died: 0, obj: 0, objTot: 0, k: 0, nk: 0, surv: 0 }; for (const r of rs) { T.runs++; T.won += +r.won; T.died += +r.died; T.obj += r.obj; T.objTot += r.objTotal; T.k += r.kills; T.nk += r.npcKills; T.surv += r.survival; }
  console.log('ch' + c, br, rs.map(r => `${r.won ? 'W' : r.lost ? 'L' : '-'} obj${r.obj}/${r.objTotal} ${r.died ? 'died@' + r.survival : 'alive'} k${r.kills}+${r.npcKills}`).join(' | ')); }
for (const [br, T] of Object.entries(tot)) console.log('TOTAL', br, JSON.stringify({ ...T, winRate: (T.won / T.runs * 100).toFixed(0) + '%', deathRate: (T.died / T.runs * 100).toFixed(0) + '%', objPct: (T.obj / T.objTot * 100).toFixed(0) + '%', avgSurv: (T.surv / T.runs).toFixed(0) }));
console.log('errors', errs.slice(0, 3)); await b.close();
