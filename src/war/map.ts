/** Battlefield layout: courtyard + Great Hall entrance (north) + bridge (south). */
export interface ZoneDef { id: string; name: string; nameTh: string; x: number; z: number; r: number; weight: number; home?: 'hogwarts' | 'death' }
export const ZONES: ZoneDef[] = [
  { id: 'hall', name: 'Great Hall Entrance', nameTh: 'ทางเข้าห้องโถงใหญ่', x: 0, z: -50, r: 10, weight: 1.5, home: 'hogwarts' },
  { id: 'west', name: 'West Cloister', nameTh: 'ระเบียงตะวันตก', x: -22, z: -4, r: 9, weight: 1 },
  { id: 'center', name: 'Courtyard Fountain', nameTh: 'น้ำพุกลางลาน', x: 0, z: 0, r: 10, weight: 1.2 },
  { id: 'east', name: 'East Cloister', nameTh: 'ระเบียงตะวันออก', x: 22, z: -4, r: 9, weight: 1 },
  { id: 'bridge', name: 'Wooden Bridge', nameTh: 'สะพานไม้', x: 0, z: 62, r: 10, weight: 1.5, home: 'death' },
];
export const SPAWN = { hogwarts: { x: 0, z: -58 }, death: { x: 0, z: 88 } };
export const S = 33, GATE = 4.2;
/** Keep a point inside walkable space (courtyard ∪ hall corridor ∪ bridge deck). */
export function clampToMap(x: number, z: number): [number, number] {
  if (z < -S) return [Math.max(-11, Math.min(11, x)), Math.max(-62, z)];
  if (z > S) return [Math.max(-4, Math.min(4, x)), Math.min(92, z)];
  return [Math.max(-S, Math.min(S, x)), z];
}
/** Simple waypoint routing through the north/south gates. */
export function waypoint(fx: number, fz: number, tx: number, tz: number): [number, number] {
  const region = (z: number) => z < -S ? -1 : z > S ? 1 : 0; const a = region(fz), b = region(tz);
  if (a === b) return [tx, tz];
  const gateZ = (a === -1 || b === -1) && a !== 1 && b !== 1 ? -S : S; // gate between regions
  if (a === 0) { // inside courtyard: head to the gate first, aligned
    if (Math.abs(fx) > 2.5 || Math.abs(fz - gateZ) > 3) return [0, gateZ - Math.sign(gateZ) * 2];
    return [0, gateZ + Math.sign(gateZ) * 4];
  }
  // in corridor/bridge going out: go to gate center
  const g = a === -1 ? -S : S; if (Math.abs(fz - g) > 2 || Math.abs(fx) > 2.5) return [0, g]; return [0, g - Math.sign(g) * 4];
}
export function zoneAt(x: number, z: number): number { return ZONES.findIndex(zn => (zn.x - x) ** 2 + (zn.z - z) ** 2 < zn.r * zn.r); }
