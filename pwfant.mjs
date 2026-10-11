import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4176/'); await p.waitForTimeout(700); await p.click('#btnLang');
console.log(await p.evaluate(() => document.title + ' | ' + document.querySelector('#menu').innerText.replace(/\n+/g, ' / ').slice(0, 300)));
await p.click('#btnPlay'); await p.waitForTimeout(300); console.log(await p.evaluate(() => document.querySelector('#select').innerText.replace(/\n+/g, ' ').slice(0, 200))); await p.click('[data-char="harry"]'); await p.waitForTimeout(1000);
await p.evaluate(() => __toMenu()); await p.click('#btnStory'); await p.click('[data-ch="1"]'); await p.waitForTimeout(2500); console.log('sub:', await p.evaluate(() => document.querySelector('#sub').innerText));
await p.screenshot({ path: 'fantasy_story.png' }); console.log('errors', errs); await b.close();
