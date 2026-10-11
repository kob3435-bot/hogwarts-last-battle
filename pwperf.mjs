import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:4175/'); await p.waitForTimeout(800); await p.click('#btnSpectator'); await p.waitForTimeout(2500);
console.log(await p.evaluate(async () => { const g = __game(); for (let i = 0; i < 300; i++) g.step(1 / 30);
  const m = async () => { g.renderer.info.autoReset = false; g.renderer.info.reset(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const c = g.renderer.info.render.calls / 2; g.renderer.info.autoReset = true; return c; };
  const all = await m(); for (const e of g.entities) e.model.root.visible = false; const none = await m(); const per = {}; let k = 0; g.entities[0].model.root.traverse(o => { if (o.isMesh) k++; });
  return JSON.stringify({ all, withoutHeroes: none, heroes: g.entities.length, meshesPerHero: k, pr: g.renderer.getPixelRatio(), post: !!g.composer }); }));
await b.close();
