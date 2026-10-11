import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const u of ['hogwarts-last-battle', 'highspire-last-battle']) { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`https://kob3435-bot.github.io/${u}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await p.click('#btnSpectator'); await p.waitForTimeout(3000);
  const st = await p.evaluate(() => ({ title: document.title, ents: window.__game?.()?.entities.length, disc: document.querySelector('.disc')?.textContent.slice(0, 60) }));
  await p.screenshot({ path: `/workspace/hogwarts-battle/live_${u}.png` }); console.log(u, JSON.stringify(st), 'errors', errs.length, errs.slice(0, 3)); }
await b.close();
