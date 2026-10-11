import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800); await p.screenshot({ path: 'menu2.png' });
await p.click('#btnPlay'); await p.waitForTimeout(300); await p.screenshot({ path: 'select2.png' });
await p.click('[data-char="harry"]'); await p.waitForTimeout(1500);
await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); await p.keyboard.up('KeyW');
await p.evaluate(() => { const g = window.__game(); g.input.fire = true; }); await p.waitForTimeout(1500);
await p.keyboard.press('Digit2'); await p.waitForTimeout(600); await p.keyboard.press('Digit1'); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game(); g.input.fire = false; g.ctrl.ult = 100; });
await p.keyboard.press('KeyR'); await p.waitForTimeout(450); await p.screenshot({ path: 'ult.png' }); await p.waitForTimeout(1800); await p.screenshot({ path: 'shot2.png' });
const s1 = await p.evaluate(() => { const g = window.__game(); return { ult: g.ctrl.ult, cds: g.ctrl.skillCd.map(x => +x.toFixed(1)), buff: g.ctrl.buffT.toFixed(1), proj: g.projectiles.length, hits: g.stats.hits }; }); console.log('skills', JSON.stringify(s1));
// spell clash with player
await p.evaluate(() => { const g = window.__game(); const v = g.entities.find(e => e.def.id === 'voldemort'); v.pos.set(g.ctrl.pos.x, 0, g.ctrl.pos.z - 12); g.startClash(g.ctrl, v); });
for (let i = 0; i < 25; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(60); }
await p.screenshot({ path: 'clash.png' });
await p.waitForTimeout(6000);
const s2 = await p.evaluate(() => { const g = window.__game(); return { clash: !!g.clash, won: g.stats.clashesWon }; }); console.log('clash', JSON.stringify(s2));
// boss phase change
await p.evaluate(() => { const g = window.__game(); const v = g.entities.find(e => e.def.boss); v.hp = v.maxHp * 0.45; });
await p.waitForTimeout(2500); console.log('phase', await p.evaluate(() => window.__game().phase)); await p.screenshot({ path: 'phase3.png' });
// tab switch to mcgonagall-like and try playing as Voldemort
await p.keyboard.press('Tab'); await p.waitForTimeout(300); console.log('switched to', await p.evaluate(() => window.__game().ctrl.def.id));
await p.evaluate(() => window.__start('voldemort')); await p.waitForTimeout(1500); console.log('playing as', await p.evaluate(() => window.__game().ctrl.def.id + ' team ' + window.__game().playerTeam));
await p.screenshot({ path: 'voldemort.png' });
console.log('ERRORS', JSON.stringify(errs)); await b.close();
