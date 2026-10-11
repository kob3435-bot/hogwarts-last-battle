/** Unified keyboard/mouse/touch input state for the controlled character. */
export class Input {
  keys = new Set<string>(); autoToggle = false; fire = false; shield = false; dodge = false; cycle = 0; switchChar = false; pause = false; skill = -1; clashPress = false;
  lookDX = 0; lookDY = 0; moveX = 0; moveY = 0; touchSprint = false; locked = false; touch = false; noLock = false; drag: ((dx: number, dy: number) => void) | null = null; wheel: ((d: number) => void) | null = null; private down = false;
  constructor(private canvas: HTMLCanvasElement) {
    addEventListener('keydown', e => { if (e.code === 'Tab') e.preventDefault(); if (e.repeat) return; this.keys.add(e.code);
      if (e.code === 'Space') { this.dodge = true; this.clashPress = true; e.preventDefault(); } if (e.code === 'KeyF') this.clashPress = true;
      if (e.code === 'Digit1') this.skill = 0; if (e.code === 'Digit2') this.skill = 1; if (e.code === 'Digit3') this.skill = 2; if (e.code === 'KeyR') this.skill = 3; if (e.code === 'KeyQ') this.cycle = -1; if (e.code === 'KeyE') this.cycle = 1;
      if (e.code === 'KeyT') this.autoToggle = true; if (e.code === 'Tab') this.switchChar = true; if (e.code === 'Escape' || e.code === 'KeyP') this.pause = true; });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => { if (!this.locked && !this.touch && !this.noLock) { canvas.requestPointerLock?.(); } this.down = true; if (e.button === 0) { this.fire = true; this.clashPress = true; } if (e.button === 2) this.shield = true; });
    addEventListener('mouseup', e => { this.down = false; if (e.button === 0) this.fire = false; if (e.button === 2) this.shield = false; });
    canvas.addEventListener('wheel', e => { this.wheel?.(e.deltaY); e.preventDefault(); }, { passive: false });
    addEventListener('mousemove', e => { if (this.down && this.drag) this.drag(e.movementX, e.movementY); if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
  }
  fireTap = false; gpPrev: boolean[] = []; gpX = 0; gpY = 0; gamepad = false;
  /** Standard-mapping gamepad: LS move, RS look, RT fire, LT shield, A dodge, X/Y/B skills 1-3, RB ultimate, LB/D-pad cycle, Back switch, Start pause, L3 sprint. */
  pollGamepad() { const pads = navigator.getGamepads?.() ?? []; const gp = Array.from(pads).find(p => p && p.connected); if (!gp) { if (this.gamepad) { this.gpX = this.gpY = 0; this.gamepad = false; this.fire = false; this.shield = false; } return; }
    this.gamepad = true; const dz = (v: number) => Math.abs(v) < 0.18 ? 0 : v; const b = (i: number) => !!gp.buttons[i]?.pressed; const edge = (i: number) => b(i) && !this.gpPrev[i];
    this.gpX = dz(gp.axes[0] ?? 0); this.gpY = -dz(gp.axes[1] ?? 0); this.lookDX += dz(gp.axes[2] ?? 0) * 14; this.lookDY += dz(gp.axes[3] ?? 0) * 10;
    this.fire = b(7); this.shield = b(6); if (edge(7) || edge(0)) this.clashPress = true; if (edge(0)) this.dodge = true; if (edge(2)) this.skill = 0; if (edge(3)) this.skill = 1; if (edge(1)) this.skill = 2; if (edge(5)) this.skill = 3;
    if (edge(4) || edge(14)) this.cycle = -1; if (edge(15)) this.cycle = 1; if (edge(8)) this.switchChar = true; if (edge(9)) this.pause = true; this.touchSprint = b(10) || (this.touch && this.touchSprint);
    this.gpPrev = gp.buttons.map(x => x.pressed); }
  axis(): [number, number] {
    let x = this.moveX + this.gpX, y = this.moveY + this.gpY;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1; if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1; if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    const l = Math.hypot(x, y); return l > 1 ? [x / l, y / l] : [x, y];
  }
  sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprint; }
  /** Build on-screen touch controls */
  setupTouch(root: HTMLElement) {
    this.touch = true; root.classList.add('touch');
    const stick = root.querySelector('#stick') as HTMLElement, knob = stick.querySelector('.knob') as HTMLElement;
    let sid = -1, sx = 0, sy = 0, lid = -1, lx = 0, ly = 0, pinch = 0;
    const bind = (id: string, down: () => void, up?: () => void) => { const b = root.querySelector(id) as HTMLElement;
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
      b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); up?.(); }, { passive: false }); };
    bind('#tFire', () => { this.fire = true; this.fireTap = true; this.clashPress = true; }, () => this.fire = false); bind('#tShield', () => this.shield = true, () => this.shield = false);
    bind('#tDodge', () => this.dodge = true); bind('#tNext', () => this.cycle = 1); bind('#tSwitch', () => this.switchChar = true);
    bind('#tSprint', () => this.touchSprint = !this.touchSprint); bind('#tPause', () => this.pause = true); bind('#tAuto', () => this.autoToggle = true);
    bind('#tS1', () => this.skill = 0); bind('#tS2', () => this.skill = 1); bind('#tS3', () => this.skill = 2); bind('#tUlt', () => this.skill = 3);
    this.canvas.addEventListener('touchstart', e => { for (const t of Array.from(e.changedTouches)) {
      if ((document.body.classList.contains('lefty') ? t.clientX > innerWidth * 0.6 : t.clientX < innerWidth * 0.4) && sid < 0) { sid = t.identifier; sx = t.clientX; sy = t.clientY; const hw = stick.offsetWidth / 2; stick.style.left = sx - hw + 'px'; stick.style.top = sy - hw + 'px'; stick.style.bottom = 'auto'; stick.style.right = 'auto'; stick.style.opacity = '1'; }
      else if (lid < 0) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } } if (this.wheel && e.touches.length >= 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); e.preventDefault(); }, { passive: false });
    this.canvas.addEventListener('touchmove', e => { if (this.wheel && e.touches.length >= 2 && pinch > 0) { // pinch zoom (commander tactical camera)
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (Math.abs(d - pinch) > 24) { this.wheel(d < pinch ? 1 : -1); pinch = d; } e.preventDefault(); return; }
      for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === sid) { let dx = (t.clientX - sx) / 50, dy = (t.clientY - sy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } this.moveX = dx; this.moveY = -dy; const kr = stick.offsetWidth * 0.32; knob.style.transform = `translate(${dx * kr}px,${dy * kr}px)`; }
      if (t.identifier === lid && this.drag) { this.drag(t.clientX - lx, t.clientY - ly); lx = t.clientX; ly = t.clientY; } else if (t.identifier === lid) { this.lookDX += (t.clientX - lx) * 2.2; this.lookDY += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY; } } e.preventDefault(); }, { passive: false });
    const end = (e: TouchEvent) => { if (e.touches.length < 2) pinch = 0; for (const t of Array.from(e.changedTouches)) { if (t.identifier === sid) { sid = -1; this.moveX = this.moveY = 0; knob.style.transform = ''; stick.style.opacity = ''; stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; stick.style.right = ''; } if (t.identifier === lid) lid = -1; } };
    this.canvas.addEventListener('touchend', end); this.canvas.addEventListener('touchcancel', end);
  }
  consume() { const r = { auto: this.autoToggle, skill: this.skill, clashPress: this.clashPress, dodge: this.dodge, cycle: this.cycle, sw: this.switchChar, pause: this.pause, dx: this.lookDX, dy: this.lookDY };
    this.autoToggle = false; this.skill = -1; this.clashPress = false; this.dodge = false; this.cycle = 0; this.switchChar = false; this.pause = false; this.lookDX = this.lookDY = 0; return r; }
}
