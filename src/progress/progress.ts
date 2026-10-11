/** XP / level / skill-tree progression per character (pure logic + KV persistence). */
import { storage, KV } from '../story/save';
export type Branch = 'power' | 'defense' | 'vitality' | 'focus';
export const BRANCHES: { id: Branch; en: string; th: string; per: number; desc: { en: string; th: string } }[] = [
  { id: 'power', en: 'Spell Power', th: 'พลังเวท', per: 0.03, desc: { en: '+3% spell damage per rank', th: '+3% ความแรงเวทต่อระดับ' } },
  { id: 'defense', en: 'Warding', th: 'การป้องกัน', per: 0.03, desc: { en: '-3% damage taken per rank', th: '-3% ความเสียหายที่ได้รับต่อระดับ' } },
  { id: 'vitality', en: 'Vitality', th: 'พลังชีวิต', per: 0.05, desc: { en: '+5% max HP per rank', th: '+5% พลังชีวิตสูงสุดต่อระดับ' } },
  { id: 'focus', en: 'Focus', th: 'สมาธิ', per: 0.04, desc: { en: '-4% skill cooldowns per rank', th: '-4% คูลดาวน์สกิลต่อระดับ' } },
];
export const MAX_RANK = 5, MAX_LEVEL = 20;
export interface CharProg { xp: number; ranks: Record<Branch, number> }
export interface Progress { version: 1; chars: Record<string, CharProg> }
export const newProgress = (): Progress => ({ version: 1, chars: {} });
export const xpForLevel = (l: number) => 50 * l * (l - 1); // xp needed to reach level l
export function levelOf(xp: number) { let l = 1; while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++; return l; }
export function getChar(p: Progress, id: string): CharProg { return p.chars[id] ??= { xp: 0, ranks: { power: 0, defense: 0, vitality: 0, focus: 0 } }; }
export function spent(c: CharProg) { return Object.values(c.ranks).reduce((a, b) => a + b, 0); }
export function points(c: CharProg) { return levelOf(c.xp) - 1 - spent(c); }
export function rankUp(p: Progress, id: string, b: Branch): boolean { const c = getChar(p, id); if (points(c) <= 0 || c.ranks[b] >= MAX_RANK) return false; c.ranks[b]++; return true; }
export function respec(p: Progress, id: string) { const c = getChar(p, id); c.ranks = { power: 0, defense: 0, vitality: 0, focus: 0 }; }
/** XP from a battle performance */
export function battleXP(r: { dmg: number; kos: number; healed: number; won: boolean; secs: number }) { return Math.round(r.dmg * 0.25 + r.kos * 25 + r.healed * 0.3 + (r.won ? 120 : 40) + Math.min(60, r.secs / 5)); }
export function award(p: Progress, id: string, xp: number) { const c = getChar(p, id); const before = levelOf(c.xp); c.xp += xp; return { levelUp: levelOf(c.xp) > before, level: levelOf(c.xp) }; }
export function multipliers(p: Progress | null, id: string) { if (!p || !p.chars[id]) return { power: 1, defense: 1, hp: 1, cd: 1 }; const r = p.chars[id].ranks;
  return { power: 1 + r.power * 0.03, defense: 1 / (1 - r.defense * 0.03), hp: 1 + r.vitality * 0.05, cd: 1 - r.focus * 0.04 }; }
const KEY = 'progress-v1';
export async function loadProgress(kv: KV = storage()): Promise<Progress> { try { const r = await kv.get(KEY); return r?.version === 1 ? r : newProgress(); } catch { return newProgress(); } }
export async function saveProgress(p: Progress, kv: KV = storage()) { try { await kv.set(KEY, JSON.parse(JSON.stringify(p))); } catch { /* ignore */ } }
