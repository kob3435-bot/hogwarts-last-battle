/** LOD + FPS-driven population scaling (pure). */
export function lodInterval(dist: number): number { return dist < 40 ? 1 : dist < 80 ? 2 : 4; }
export function shouldUpdate(i: number, frame: number, interval: number) { return (i + frame) % interval === 0; }
export class FpsScaler {
  cap: number; private acc = 0; private frames = 0; fps = 60;
  constructor(public min = 100, public max = 300, start = 180) { this.cap = start; }
  /** feed real frame dt; every 2s adjusts cap. returns cap */
  tick(dt: number): number { this.acc += dt; this.frames++; if (this.acc >= 2) { this.fps = this.frames / this.acc; this.acc = 0; this.frames = 0;
    if (this.fps < 40) this.cap = Math.max(this.min, Math.round(this.cap * 0.85)); else if (this.fps > 55) this.cap = Math.min(this.max, this.cap + 20); } return this.cap; }
}
/** Uniform grid for neighbour queries */
export class Grid {
  cells = new Map<number, number[]>(); constructor(public size = 6) {}
  key(x: number, z: number) { return (Math.floor(x / this.size) + 512) * 4096 + (Math.floor(z / this.size) + 512); }
  clear() { this.cells.clear(); }
  insert(i: number, x: number, z: number) { const k = this.key(x, z); let c = this.cells.get(k); if (!c) this.cells.set(k, c = []); c.push(i); }
  query(x: number, z: number, r: number, out: number[] = []) { out.length = 0; const s = this.size; for (let gx = Math.floor((x - r) / s); gx <= Math.floor((x + r) / s); gx++) for (let gz = Math.floor((z - r) / s); gz <= Math.floor((z + r) / s); gz++) { const c = this.cells.get((gx + 512) * 4096 + gz + 512); if (c) for (const i of c) out.push(i); } return out; }
}
export function damageState(hp: number, max: number): 0 | 1 | 2 | 3 { const f = hp / max; return f <= 0 ? 3 : f < 0.34 ? 2 : f < 0.67 ? 1 : 0; }
