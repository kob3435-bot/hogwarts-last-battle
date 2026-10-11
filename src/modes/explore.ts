/** Free exploration of castle areas: patrols to fight, hidden Chocolate Frog cards (XP), fast travel via the map (M). */
import * as THREE from 'three';
import type { Game } from '../game';
import { animateExplore, AREA_NAMES } from '../rendering/areas2';
import { getLang } from '../ui/i18n';
import { sfx } from '../audio/audio';
const CARD_NAMES = ['Merlin', 'Morgana', 'Agrippa', 'Circe', 'Paracelsus', 'Cliodna', 'Hengist', 'Bertie Bott', 'Gulliver Pokeby', 'Elfrida Clagg'];
export class Explorer {
  cards: THREE.Mesh[] = []; found = 0; raf = 0; last = 0; t = 0;
  constructor(public g: Game, public area: string, private onXP: (xp: number) => void) {
    const rnd = (s: number) => { const x = Math.sin(s * 91.7 + area.length * 13.1) * 43758.5; return x - Math.floor(x); };
    const lim = area === 'courtyard' ? 28 : area === 'forest' ? 40 : 14;
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xffd34d })); let x = (rnd(i) - .5) * 2 * lim, z = (rnd(i + 7) - .5) * 2 * lim; [x, z] = g.world.clamp(x, z); m.position.set(x, 1.2, z); m.userData.name = CARD_NAMES[(i + area.length) % CARD_NAMES.length]; g.world.scene.add(m); this.cards.push(m); }
    const n = 2 + Math.floor(rnd(3) * 3); for (let i = 0; i < n; i++) { const [x, z] = g.world.clamp((rnd(i + 20) - .5) * 2 * lim, -(rnd(i + 30)) * lim); g.spawnEntity(i === 0 ? 'carrow' : 'de' + (i % 5), x, z); }
    const el = document.getElementById('exploreHud')!; el.classList.remove('hidden');
    this.last = performance.now(); const loop = (now: number) => { this.raf = requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now; this.update(dt); }; this.raf = requestAnimationFrame(loop);
  }
  update(dt: number) { this.t += dt; animateExplore(this.g.world.scene, this.t); const p = this.g.ctrl.pos; const th = getLang() === 'th';
    for (const c of this.cards) { if (!c.visible) continue; c.rotation.y += dt * 2; c.position.y = 1.2 + Math.sin(this.t * 3 + c.position.x) * 0.2; if (Math.hypot(c.position.x - p.x, c.position.z - p.z) < 1.8 && this.g.ctrl.alive) { c.visible = false; this.found++; this.onXP(30); sfx.ui(); this.g.particles.emit(c.position.clone(), 0xffd34d, 30, 5, 1, 0.8); this.g.onBanner?.(`🐸 ${c.userData.name}`, th ? '+30 XP — การ์ดกบช็อกโกแลต' : '+30 XP — Chocolate Frog card'); } }
    const foes = this.g.entities.filter(e => e.alive && e.def.team !== this.g.playerTeam).length;
    document.getElementById('exploreHud')!.innerHTML = `📍 <b>${AREA_NAMES[this.area]?.[th ? 'th' : 'en'] ?? this.area}</b> · 🐸 ${this.found}/5 · ⚔ ${foes} · <button id="exMap">🗺 ${th ? 'แผนที่ (M)' : 'Map (M)'}</button>`;
    if (!this.g.ctrl.alive && this.g.state === 'playing') { this.g.ctrl.hp = this.g.ctrl.maxHp; const [sx, sz] = this.g.world.spawnPoints.start ?? this.g.world.spawnPoints.south ?? [0, 10]; this.g.ctrl.pos.set(sx, 0, sz); this.g.onBanner?.(th ? 'ฟื้นคืนที่จุดเริ่ม' : 'Respawned', ''); }
  }
  stop() { cancelAnimationFrame(this.raf); document.getElementById('exploreHud')?.classList.add('hidden'); }
}
