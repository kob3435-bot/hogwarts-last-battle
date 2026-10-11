export interface Settings { lang: 'th' | 'en'; volume: number; sensitivity: number; difficulty: 'easy' | 'normal' | 'hard'; gfx: 'low' | 'med' | 'high' | 'ultra'; adaptive: boolean; assist: boolean; fantasy: boolean; music: number; }
const KEY = 'hp-lastbattle-settings-v1';
export const DEFAULTS: Settings = { lang: 'th', volume: 0.6, sensitivity: 1, difficulty: 'normal', gfx: 'high', adaptive: true, assist: false, fantasy: false, music: 0.5 };
export function loadSettings(storage: Pick<Storage, 'getItem'> | null = globalThis.localStorage ?? null): Settings {
  try { const raw = storage?.getItem(KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }; } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s: Settings, storage: Pick<Storage, 'setItem'> | null = globalThis.localStorage ?? null) { try { storage?.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
