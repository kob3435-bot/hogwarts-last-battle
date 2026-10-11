export interface Box { minX: number; maxX: number; minZ: number; maxZ: number; h: number; }
/** Push a circle (x,z,r) out of axis-aligned boxes. Returns corrected position. */
export function resolveCircle(x: number, z: number, r: number, boxes: Box[]): [number, number] {
  for (let it = 0; it < 2; it++) for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    let dx = x - cx, dz = z - cz; const d2 = dx*dx + dz*dz;
    if (d2 >= r*r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); x = cx + dx/d*r; z = cz + dz/d*r; }
    else { // centre inside box: push along smallest axis
      const pen = [x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z]; const m = Math.min(...pen);
      if (m === pen[0]) x = b.minX - r; else if (m === pen[1]) x = b.maxX + r; else if (m === pen[2]) z = b.minZ - r; else z = b.maxZ + r;
    }
  }
  return [x, z];
}
export function pointInBoxes(x: number, y: number, z: number, boxes: Box[]): boolean {
  return boxes.some(b => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y < b.h);
}
