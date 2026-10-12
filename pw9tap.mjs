import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const vp of [{ width: 915, height: 412 }, { width: 412, height: 915 }]) {
const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: vp, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800); await p.tap('#btnPlay'); await p.waitForTimeout(300); await p.tap('[data-char="harry"]'); await p.waitForTimeout(2000);
const hit = await p.evaluate(() => ['#tCam', '#tAuto', '#tAim'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return s + '->' + (e?.closest('button')?.id ?? e?.id); }));
const r = []; for (let i = 0; i < 3; i++) { await p.tap('#tCam'); await p.waitForTimeout(300); r.push(await p.evaluate(() => __game().camMode)); }
await p.tap('#tAuto'); await p.waitForTimeout(300); const au = await p.evaluate(() => __game().auto);
console.log(JSON.stringify(vp), hit, r, 'auto', au, errs); await ctx.close(); }
await b.close();
