# QA pass — Phase 5/6 (automated + manual-by-script)
| Area | Check | Result |
|---|---|---|
| Unit tests | `npx vitest run` | 79/79 pass |
| Build | `npm run build` (code-split) | main `index` chunk 28 kB (was 233 kB); three 577 kB, engine 102 kB, content 108 kB, screens/replay/explore lazy |
| Fantasy build | `npm run build:fantasy` -> `dist-fantasy/` | no "Harry/Voldemort/Hermione/Dumbledore/Weasley/Potter/แฮร์รี่/ฮอกวอตส์" strings left in bundle (only internal identifier `manualHogwarts`) |
| Menu | every menu button clicked (pwmenu.mjs) | all open a screen/game; Replay is disabled until a battle has been recorded |
| Story | all 12 chapters AI-driven (pw4.mjs) | 12/12 on the last run; one earlier run lost ch.9 (AI-vs-AI outcomes are random) |
| Free battle / What If / Explore / Gallery / Spells / Skill tree / Replay / Gamepad / Fantasy toggle | pw5.mjs | working, 0 console errors |
| Mobile (Pixel 7 landscape, touch) | pwmobile.mjs | stick moves, fire tap casts, skills, pause; Commander: one-finger pan, pinch zoom, minimap tap, squad/zone/order taps, panel collapse; story skip; setup screen fits |
| Persistence | XP/skill tree survives reload (IndexedDB), settings in localStorage | pass |
Not verified: real GPU frame rates (headless uses SwiftShader at ~10-15 fps), real gamepads (tested only with a mocked `navigator.getGamepads`), real phones, audio quality (WebAudio runs, but nobody listened to it).

## Phase 7 — anime character overhaul
- New rig `src/character/rig.ts`: ~5 heads tall, hips→torso→neck→head, shoulder→elbow→hand, thigh→knee→foot, 8 hip-pivoted skirt panels + optional cape; static parts merged per joint (draw-call reduction).
- Procedural animation: idle breathing + 10 idle styles, walk/run cycle, 8 cast styles, shield, clash, ultimate, hit reaction, stun wobble, knockdown/KO, dodge somersault, victory pose; cloth/hair-tail sway.
- Face: layered eyes (white, iris in eye colour, dark top gradient, pupil, 2 highlights, lashes), brows, nose, mouth, blush; blinking; expressions neutral/cast/hurt/ult(glowing irises)/ko/happy. Face hidden beyond ~38 m (LOD).
- 18 hair styles, 10 outfits, 37 accessory types; `identity.ts` gives all 41 + story units hair/eye/outfit/accessories/wand/spell colour/idle/cast style/bilingual callouts (speech bubbles in game).
- `uniquekits.ts`: 29 template characters get distinct sig-1 + ultimate using 12 new effect mechanics (zone, chain, meteor, pull, mark, drain, cleanse, haste, silence, blink, execute, coloured volleys).
- Tests: 86 pass. pw5/pwmobile/pwmenu/pw4/pw7: 0 console errors. Spectator (13 heroes + ~200 instanced units, SwiftShader): ~860 draw calls/frame, ~320 without heroes.
- Screenshots: lineup.png, lineup_order.png, lineup_death.png, lineup_legends.png, closeup_*.png, shot7*.png, gallery7*.png.

## Phase 8 — AUTO + controls redesign
- AUTO: T hotkey, desktop HUD button, mobile top button; AI fully drives the controlled hero; glowing ON state + banner; optional "input cancels AUTO" setting.
- Mobile: floating joystick, 96px attack button, skills 1/2/3 + ultimate arc with radial cooldowns/icons/names, shield/dodge/spell-switch, AUTO/switch/pause top area; all >=56px, no overlaps (checked in landscape 750x342 and portrait 412x839), left-hand mirror, size/opacity sliders (persisted). Commander keeps pause only.
- Desktop: hotbar tooltips + key-hint line.
- Bug fix: stale rAF timestamps could make timeScale negative (game ran backwards: stuns/cooldowns grew). dt now clamped >=0 in all loops.
- Highspire build: neutral disclaimer (no franchise owners named).

## Phase 9 — camera modes + anime model pass
- Camera modes (V / HUD 🎥 button / Settings, persisted): Over-shoulder TPS (B swaps shoulder), First-person (own model hidden, hands + wand view-model with bob/recoil/shield pose), Follow, Cinematic far, Top-down (mouse cursor aims on desktop; nearest foe on touch). Commander/Spectator keep their own cameras.
- Look: pointer-lock mouse-look, sensitivity, invert-Y, smoothing slider, per-mode pitch clamps; aim/zoom on hold (Z, middle mouse, gamepad R3/D-pad down, touch 🎯 Aim) reduces FOV and sensitivity; body faces aim in FPS/TPS; spells fire to the crosshair raycast point (verified: projectile direction · aim vector = 1.000 in all 5 modes); camera collision against walls in TPS/Follow/Far.
- Mobile: swipe-look on right half with sensitivity slider, 🎥 camera button in the top bar, 🎯 Aim button. Gamepad: right stick look, D-pad up cycles camera.
- Crowd: new multi-layer instanced anime models (vertex-coloured, rim light, smooth-normal inverted-hull outline) for students (house scarf/tie/trim per house, skin/hair variety, big eyes), Order (coloured coats, phoenix pin), Death Eaters (pointed hood, tattered hem, silver mask with red eyes), giants, acromantulas (striped, jointed legs, red eye cluster), dementors (tattered transparent cloak, bony hands), stone knights (shield + sword). ~5-6 draw calls per unit type regardless of count.
- Heroes: higher-segment rounded rig primitives, layered hair strands + ahoge, signature-colour sleeve cuffs/sash/hem trim, signature rim light and ground glow.
- Known: headless (SwiftShader) runs are slow so touch taps can apply one frame-batch late; no LOD reduction for crowd meshes beyond instancing (they are low-poly enough).
