import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const errs = []; const out = {};
// desktop war: minions in battle + perf
{ const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push('D ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('D ' + m.text()); });
  await p.goto('http://localhost:4175/'); await p.waitForTimeout(700); await p.click('#btnSpectator'); await p.waitForTimeout(9000);
  out.war = await p.evaluate(() => { const g = __game(); const w = g.war; return { units: w ? w.aliveUnits().length : -1, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, fps: g.fpsAvg ?? null }; });
  await p.screenshot({ path: 'minions_battle.png' }); await p.close(); }
// mobile
{ const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('M ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('M ' + m.text()); });
  await p.goto('http://localhost:4175/'); await p.waitForTimeout(800); await p.tap('#btnPlay'); await p.waitForTimeout(300); await p.tap('[data-char="harry"]'); await p.waitForTimeout(2000);
  const box = async s => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, s);
  out.tCam = await box('#tCam'); out.tAim = await box('#tAim');
  const m0 = await p.evaluate(() => __game().camMode); await p.tap('#tCam'); await p.waitForTimeout(400); out.camTap = m0 + ' -> ' + await p.evaluate(() => __game().camMode);
  // swipe-look on right half via CDP touch
  const y0 = await p.evaluate(() => __game().camYaw); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 150 }] }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 600 - i * 15, y: 150 }] }); await p.waitForTimeout(40); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300); out.swipeYawDelta = (await p.evaluate(() => __game().camYaw) - y0).toFixed(3);
  // overlap check between tAim and other controls
  out.aimOverlaps = await p.evaluate(() => { const a = document.querySelector('#tAim').getBoundingClientRect(); return [...document.querySelectorAll('#touch button, #stick')].filter(e => e.id !== 'tAim' && e.offsetParent).filter(e => { const r = e.getBoundingClientRect(); return r.width && !(r.right <= a.left || r.left >= a.right || r.bottom <= a.top || r.top >= a.bottom); }).map(e => e.id); });
  await p.evaluate(() => __game().setCamMode('fps')); await p.waitForTimeout(800); await p.screenshot({ path: 'cam_fps_mobile.png' }); await ctx.close(); }
console.log(JSON.stringify(out), 'errors', errs.length, errs.slice(0, 4)); await b.close();
