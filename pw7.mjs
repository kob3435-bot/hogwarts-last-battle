import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const log = (...a) => console.log(...a);
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800);
const sims = (process.argv[2] ?? '0,1,2,3,4,5,6,7,8').split(',').filter(Boolean);
if (sims.length) { await p.click('#btnWhatIf'); await p.waitForTimeout(400);
  for (const i of sims) { await p.click(`[data-wis="${i}"]`); await p.waitForFunction(i => /\/5/.test(document.querySelector('#wir' + i).textContent) && !/⏳/.test(document.querySelector('#wir' + i).textContent), i, { timeout: 300000 }); log('sim', i, (await p.evaluate(i => document.querySelector('#wir' + i).innerText, i)).split('\n')[0]); }
  await p.evaluate(() => __toMenu()); await p.waitForTimeout(300); }
await p.click('#btnSpectator'); await p.waitForTimeout(2500);
const perf = await p.evaluate(async () => { const g = __game(); for (let i = 0; i < 30 * 20; i++) g.step(1 / 30); const t0 = performance.now(); let n = 0; await new Promise(r => { const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  g.renderer.info.autoReset = false; g.renderer.info.reset(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const calls = g.renderer.info.render.calls; g.renderer.info.autoReset = true;
  return { fps: (n / 3).toFixed(1), callsPerFrame: Math.round(calls / 2), meshes: (() => { let k = 0; g.world.scene.traverse(o => { if (o.isMesh && o.visible) k++; }); return k; })(), tris: g.renderer.info.render.triangles, heroes: g.entities.length, units: g.war?.aliveUnits().length }; });
log('spectator perf', JSON.stringify(perf)); await p.screenshot({ path: 'shot7_battle.png' });
await p.evaluate(() => { const g = __game(); const e = g.entities.find(x => x.alive && x.def.look.lines); e.ult = 999; g.useSkill(e, 3); window.__focus = e.def.id; });
await p.waitForTimeout(400); await p.screenshot({ path: 'shot7.png' });
log('callout', await p.evaluate(() => [...document.querySelectorAll('.bubble')].filter(b => b.style.display === 'block').map(b => b.textContent).join(' | ')));
await p.evaluate(() => __toMenu()); await p.waitForTimeout(300); await p.click('#btnPlay'); await p.waitForTimeout(300); await p.click('[data-char="harry"]'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = __game(); for (let i = 0; i < 30 * 4; i++) g.step(1 / 30); g.ctrl.ult = 999; g.useSkill(g.ctrl, 0); }); await p.waitForTimeout(300); await p.screenshot({ path: 'shot7_duel.png' });
await p.evaluate(() => __toMenu()); await p.click('#btnGallery'); await p.waitForTimeout(800); await p.screenshot({ path: 'gallery7.png' });
await p.click('#gLineup'); await p.waitForTimeout(1500); await p.screenshot({ path: 'gallery7_lineup.png' }); await p.click('#lineupClose');
log('errors', errs.length, errs.slice(0, 5)); await b.close();
