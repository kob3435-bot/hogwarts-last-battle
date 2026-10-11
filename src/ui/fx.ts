import * as THREE from 'three';
import type { Game } from '../game';
import { marker } from '../combat/clash';
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const nums: { el: HTMLDivElement; p: THREE.Vector3; t: number }[] = [];
export function damageNumber(p: THREE.Vector3, amt: number, color: string, big: boolean) {
  if (amt <= 0 && color !== '#9fe0ff') return; let n = nums.find(x => x.t <= 0);
  if (!n) { if (nums.length > 40) return; const el = document.createElement('div'); el.className = 'dmg'; $('#fx').appendChild(el); n = { el, p: new THREE.Vector3(), t: 0 }; nums.push(n); }
  n.p.copy(p).add(new THREE.Vector3((Math.random() - .5) * 0.6, 0, (Math.random() - .5) * 0.6)); n.t = 1; n.el.textContent = color === '#9fe0ff' ? `🛡${amt}` : color === '#6dffa8' ? `+${amt}` : String(amt);
  n.el.style.color = color; n.el.style.fontSize = big ? '34px' : '22px'; n.el.style.display = 'block';
}
const bubbles: { el: HTMLDivElement; e: any; t: number }[] = [];
/** anime speech bubble anchored above a character's head */
export function speech(e: any, text: string) { let b = bubbles.find(x => x.e === e) ?? bubbles.find(x => x.t <= 0); if (!b) { if (bubbles.length > 8) return; const el = document.createElement('div'); el.className = 'bubble'; $('#fx').appendChild(el); b = { el, e, t: 0 }; bubbles.push(b); }
  b.e = e; b.t = 2.2; b.el.textContent = text; b.el.style.display = 'block'; }
export function banner(title: string, sub = '', color = '#ffd34d') { const b = $('#banner'); b.innerHTML = `<b style="color:${color}">${title}</b><small>${sub}</small>`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
export function flash(color: string) { const f = $('#flash'); f.style.background = color; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
export function updateFx(g: Game, dt: number) {
  const w = innerWidth, h = innerHeight; const v = new THREE.Vector3();
  for (const n of nums) { if (n.t <= 0) continue; n.t -= dt; n.p.y += dt * 1.4; v.copy(n.p).project(g.camera);
    if (n.t <= 0 || v.z > 1) { n.el.style.display = 'none'; n.t = 0; continue; }
    n.el.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px) translate(-50%,-50%) scale(${1 + Math.max(0, n.t - 0.8) * 2})`; n.el.style.opacity = String(Math.min(1, n.t * 2)); }
  for (const b of bubbles) { if (b.t <= 0) continue; b.t -= dt; v.copy(b.e.pos).setY(2.6 * (b.e.def.look.scale ?? 1)).project(g.camera); if (b.t <= 0 || v.z > 1 || !b.e.alive) { b.el.style.display = 'none'; b.t = 0; continue; }
    b.el.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px) translate(-50%,-100%)`; b.el.style.opacity = String(Math.min(1, b.t * 3)); }
  $('#speed').style.opacity = String(Math.min(0.85, g.speedFx * 0.6));
  const c = g.clash, ui = $('#clashUI');
  if (c && c.playerSide) { ui.style.display = 'block'; const mine = c.playerSide === 'a' ? c.st.pos : -c.st.pos;
    ($('#clashBar') as HTMLElement).style.left = (50 + mine * 48) + '%'; ($('#clashMarker') as HTMLElement).style.left = marker(c.st.t) * 100 + '%';
    $('#clashTime').textContent = `${Math.max(0, 7 - c.st.t).toFixed(1)}s`; }
  else ui.style.display = 'none';
}
