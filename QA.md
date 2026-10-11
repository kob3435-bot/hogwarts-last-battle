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
