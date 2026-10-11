import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } }); await p.goto('http://localhost:4175/'); await p.waitForTimeout(500);
const ids = process.argv.slice(2).map(Number);
for (const i of ids) { const r = await p.evaluate(async i => { const { WHAT_IFS } = window; let out = ''; await window.__simulate(window.__whatifs[i], 4, t => out = t); return out.replace(/<br>/g, ' | ').replace(/<[^>]+>/g, ''); }, i); console.log(i, r); }
await b.close();
