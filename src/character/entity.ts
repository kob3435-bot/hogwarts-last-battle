import * as THREE from 'three';
import { CharDef } from './roster';
import { buildModel } from './model';
import { Combatant, SpellId } from '../combat/spells';
import { newCombo } from '../combat/combo';
import { SKILLS } from '../combat/skills';
let NEXT = 1;
export class Entity implements Combatant {
  uid = NEXT++; hp: number; maxHp: number; energy: number; maxEnergy: number; stamina = 100; maxStamina = 100;
  shielding = false; barrier = 0; ccImmune = 0; stunned = 0; disarmed = 0; invuln = 0; power: number; defense: number; basePower: number; baseDefense: number;
  pos = new THREE.Vector3(); knock = new THREE.Vector3(); yaw = 0; spellIdx = 0; cds: Partial<Record<SpellId, number>> = {}; skillCd: number[] = [0, 0, 0];
  ult = 0; buffT = 0; buff = { power: 1, defense: 1, speed: 1 }; combo = newCombo(); clashing = false; dashT = 0; dashHit = new Set<number>(); dashDmg = 0; dashKnock = 0;
  model: ReturnType<typeof buildModel>; playerControlled = false; dodgeT = 0; dodgeDir = new THREE.Vector3(); flash = 0; deadT = 0; walkT = 0; speedMul = 1; cloaked = false; scripted = false; markT = 0; markAmp = 1; slowT = 0; castT = 9; ultT = 9; hitT = 9; synPow = 1; synDef = 1; synNames: string[] = []; moraleMul = 1; moraleSpd = 1; moraleT = 0; progPow = 1; progDef = 1; progCd = 1; dmgDealt = 0; dmgTaken = 0; kos = 0; healed = 0;
  ai = { think: 0, action: 'strafe' as string, strafeDir: 1, strafeT: 0, target: null as Entity | null, shieldT: 0 };
  constructor(public def: CharDef, scene: THREE.Scene, x: number, z: number, diffMul = 1) {
    const enemy = def.team === 'death';
    void enemy; this.maxHp = this.hp = Math.round(def.hp * diffMul); this.maxEnergy = this.energy = def.energy;
    this.power = this.basePower = def.power * diffMul; this.defense = this.baseDefense = def.defense;
    this.model = buildModel(def.look); this.pos.set(x, 0, z); scene.add(this.model.root);
    (this.model.ring.material as THREE.MeshBasicMaterial).color.setHex(def.team === 'hogwarts' ? 0x44ccff : 0xff3366);
  }
  get alive() { return this.hp > 0; }
  get spell(): SpellId { return this.def.spells[this.spellIdx % this.def.spells.length]; }
  get kit() { return SKILLS[this.def.id]; }
  chest() { return new THREE.Vector3(this.pos.x, 1.3 * (this.def.look.scale ?? 1), this.pos.z); }
  wandTip() { if (this.model.rig) { const sc = (this.def.look.scale ?? 1) * 1.08; return new THREE.Vector3(this.pos.x + Math.sin(this.yaw) * 0.75 * sc + Math.cos(this.yaw) * 0.22 * sc, 1.5 * sc, this.pos.z + Math.cos(this.yaw) * 0.75 * sc - Math.sin(this.yaw) * 0.22 * sc); }
    const r = this.model.root; r.position.set(this.pos.x, r.position.y, this.pos.z); r.rotation.y = this.yaw; r.updateMatrixWorld(true); const v = new THREE.Vector3(); this.model.tip.getWorldPosition(v); return v; }
}
