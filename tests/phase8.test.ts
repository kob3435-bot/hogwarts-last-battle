import { describe, it, expect } from 'vitest';
import { loadSettings, DEFAULTS } from '../src/save/settings';
import { skillIcon } from '../src/ui/hud';
describe('phase 8 controls', () => {
  it('settings default touch layout options and persist overrides', () => { expect(DEFAULTS.btnSize).toBe(1); expect(DEFAULTS.lefty).toBe(false); expect(DEFAULTS.autoCancel).toBe(false);
    const s = loadSettings({ getItem: () => JSON.stringify({ btnSize: 1.3, lefty: true, btnOpacity: 0.5 }) }); expect(s.btnSize).toBe(1.3); expect(s.lefty).toBe(true); expect(s.btnOpacity).toBe(0.5); expect(s.autoCancel).toBe(false); });
  it('skill icons map effect kinds', () => { expect(skillIcon({ effects: [{ kind: 'meteor' }] })).toBe('☄'); expect(skillIcon({ effects: [{ kind: 'heal' }] })).toBe('✚'); expect(skillIcon(null)).toBe('✦'); });
});
