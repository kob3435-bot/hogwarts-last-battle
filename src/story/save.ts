/** Campaign progress model (pure) + IndexedDB persistence with localStorage/memory fallback. */
export type Flags = Record<string, boolean | number>;
export interface Checkpoint { chapter: number; objective: number; flags: Flags; at: number }
export interface CampaignState { version: 1; unlocked: number; completed: number[]; flags: Flags; checkpoint: Checkpoint | null; slots: (Omit<CampaignState, 'slots'> | null)[]; best: Record<number, number>; updated: number }
export const CHAPTERS = 12;
export function newCampaign(): CampaignState { return { version: 1, unlocked: 1, completed: [], flags: {}, checkpoint: null, slots: [null, null, null], best: {}, updated: Date.now() }; }
export function setCheckpoint(s: CampaignState, chapter: number, objective: number, flags: Flags): CampaignState {
  s.checkpoint = { chapter, objective, flags: { ...s.flags, ...flags }, at: Date.now() }; s.updated = Date.now(); return s; }
export function completeChapter(s: CampaignState, chapter: number, flags: Flags, timeSec = 0): CampaignState {
  s.flags = { ...s.flags, ...flags }; if (!s.completed.includes(chapter)) s.completed.push(chapter); s.completed.sort((a, b) => a - b);
  s.unlocked = Math.max(s.unlocked, Math.min(CHAPTERS, chapter + 1)); s.checkpoint = chapter < CHAPTERS ? { chapter: chapter + 1, objective: 0, flags: { ...s.flags }, at: Date.now() } : null;
  if (timeSec && (!s.best[chapter] || timeSec < s.best[chapter])) s.best[chapter] = Math.round(timeSec); s.updated = Date.now(); return s; }
export function saveToSlot(s: CampaignState, i: number): CampaignState { const { slots, ...rest } = s; void slots; s.slots[i] = JSON.parse(JSON.stringify(rest)); return s; }
export function loadFromSlot(s: CampaignState, i: number): CampaignState { const snap = s.slots[i]; if (!snap) return s; return { ...JSON.parse(JSON.stringify(snap)), slots: s.slots }; }
export function isUnlocked(s: CampaignState, chapter: number) { return chapter <= s.unlocked; }
export function migrate(raw: any): CampaignState { const d = newCampaign(); if (!raw || raw.version !== 1) return d; return { ...d, ...raw, slots: Array.isArray(raw.slots) ? [0, 1, 2].map(i => raw.slots[i] ?? null) : d.slots }; }

export interface KV { get(k: string): Promise<any>; set(k: string, v: any): Promise<void> }
export function memoryKV(): KV { const m = new Map<string, any>(); return { async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : undefined; }, async set(k, v) { m.set(k, JSON.stringify(v)); } }; }
export function idbKV(dbName = 'hp-lastbattle', store = 'kv'): KV {
  const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(dbName, 1); r.onupgradeneeded = () => r.result.createObjectStore(store); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => { const db = await open(); return new Promise<T>((res, rej) => { const t = db.transaction(store, mode); const q = fn(t.objectStore(store)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
  return { get: k => tx('readonly', s => s.get(k)), set: async (k, v) => { await tx('readwrite', s => s.put(v, k)); } };
}
const KEY = 'campaign-v1';
let kv: KV | null = null;
export function storage(): KV { if (kv) return kv; try { kv = typeof indexedDB !== 'undefined' ? idbKV() : memoryKV(); } catch { kv = memoryKV(); } return kv; }
export async function loadCampaign(store: KV = storage()): Promise<CampaignState> { try { return migrate(await store.get(KEY)); } catch { try { return migrate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return newCampaign(); } } }
export async function saveCampaign(s: CampaignState, store: KV = storage()) { s.updated = Date.now(); try { await store.set(KEY, JSON.parse(JSON.stringify(s))); } catch { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } } }
