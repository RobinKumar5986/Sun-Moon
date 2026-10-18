# AI Context: Sun & Moon

This is the full handoff file for anyone (human or AI) working on this project. Read it fully before making changes. **Update this file and `README.md` whenever you change something they describe.**

## 1. What this is

- **Sun & Moon** is a stage-based binary logic puzzle (the same genre as LinkedIn's "Tango", also known as Takuzu / Binairo) built for **YouTube Playables**, and also playable on **GitHub Pages**.
- Owner: solo developer (Rk). Target: get accepted on YouTube Playables (via the interest form, then the Developer Portal certification).
- Don't use the names "Tango" or "LinkedIn", and don't copy their visuals. Only the generic puzzle rules are used.

## 2. Project rules (from `../PROJECT_RULES.md`)

1. Keep `AI_CONTEXT.md` (this file) and `README.md` (public) up to date after every change.
2. Keep the project clean: reuse existing functions/components/styles, follow existing patterns, keep comments minimal, no dead code.
3. Assets are self-made (SVG/code) or downloaded with a free license recorded in the README credits and here.
4. Music is generated in code (or royalty-free with license). It must not get boring.
5. Proper structure: `index.html` at the game root, everything else in folders. Relative paths only. File names only `[A-Za-z0-9_.-]`.
6. Follow the YouTube Playables certification requirements (see section 9).

## 3. Game rules (player-facing)

- Fill an N×N grid (4×4, 6×6 or 8×8) with ☀ sun or ☾ moon.
- No more than **2 of the same** symbol adjacent in a row or column.
- Every row and column has **equal** suns and moons.
- `=` clue between two cells: same symbol. `×` clue: opposite symbols.
- Every puzzle has **exactly one solution** and is solvable by logic (no guessing).

## 4. Game design

- **Stages**: infinite, generated per player. `save.stage` is the next stage to play.
- **Difficulty curve** (`js/puzzle/difficulty.js`, Candy-Crush style: slow ramp with spikes):
  - Stages 1–3: 4×4 intro (8, 6, 5 givens).
  - Stage 4+: 6×6. `=`/`×` clues start at stage 8 (`SIGNS_FROM_STAGE`); the "New clue" tip is shown once.
  - Every 5th stage is **Hard** (fewer givens, can require trial logic). Every 10th is **Super hard** (minimal givens; 8×8 from stage 30).
  - Stage after a spike (`stage % 5 === 1`, stage > 5) is a **relief** stage (more givens, basic logic only).
  - Trial logic (`LEVEL_TRIAL`) is allowed in normal stages from stage 14. Hard 8×8 from stage 75, some normal 8×8 from stage 120.
  - Base ease uses `1 - exp(-(stage-1)/50)` so givens decrease slowly.
- **Input**: no symbol picker. **Tapping cycles** empty → sun → moon → empty (right-click cycles backwards). Cells are set instantly with no per-tap validation. Keyboard: arrows move the cursor, `1`/`S` = sun, `2`/`M` = moon, `0`/Backspace/Delete = clear, Space/Enter = tap, `H` = hint, Esc closes dialogs. The toolbar has only Help, Hint (big, centre) and Settings.
- **Validation (line-based)**: nothing is checked per tap. `CHECK_DELAY_MS` (500 ms, `controller.js`) after the last change, `session.checkLines()` checks every **completely filled** row/column that isn't already fully locked, against the unique solution:
  - Correct line: its cells become **locked** (mint-green tiles, `.tile.locked`) and can't be changed. It shines with particles and the line sound.
  - Wrong line(s): **one life** is lost per check (even if several lines are wrong). The lines flash red and shake, a toast says "Not quite!", and only the wrong cells are cleared after 650 ms.
  - Win = board equals the solution (all lines verified).
- Locked cells = givens + verified lines + hint cells. Tapping a locked cell just plays a small `nudge` animation.
- **Lives**: 3 per stage. At 0, the "Out of lives" modal offers **Watch ad (+3 lives)** (only when `sdk.adsAvailable`) and **Retry stage** (full reset: board, lives, hints, timer). Esc/backdrop = retry.
- **Hints**: 3 per stage. A hint fills (and locks) the next logically deducible cell and shows the reason in a toast. Deduction uses only **trusted** cells (locked ones), because unlocked player cells may be wrong. At 0 hints, the button offers a rewarded ad (+1 hint) if ads are available.
- **Timer**: top HUD. It runs only while playing (it stops during modals, pause, and after win/lose).
- **Stars**: 3★ = no mistakes and no hints, 2★ = up to 2 total, 1★ otherwise. Best stars per stage are saved.
- **Tutorial**: 5 slides, shown automatically before the first stage only. It can always be reopened from the `?` button (game toolbar, home, settings).
- **Score sent to YouTube**: `save.best` (highest stage completed), via `sendScore` after each win.

## 5. Tech stack

- Plain HTML + CSS + vanilla JavaScript ES modules. **No build step, no dependencies** at runtime.
- Audio: Web Audio API (music and SFX are fully generated in code, with no audio files).
- Graphics: SVG files + CSS (candy style) + one `<canvas>` for particles/confetti.
- `package.json` exists only for dev scripts (`npm test`, `npm run serve`, `npm run package`). `"type": "module"` lets Node run the game modules for tests.

## 6. File map

```
sun-and-moon/
├── index.html              Root page. Loads the Playables SDK first, then css/main.css and js/main.js
├── AI_CONTEXT.md           This file
├── README.md               Public readme
├── package.json            Dev scripts only
├── .gitignore
├── css/main.css            All styles. Tokens in :root, sections: Sky, Screens, Home, Buttons, Game, Board, Modals, Tutorial, Toast & FX, Wide screens, Animations
├── assets/images/
│   ├── sun.svg moon.svg    Cell symbols (cute faces)
│   ├── heart.svg star.svg bulb.svg
│   └── icons.svg           <symbol> sprite: help gear home retry play video clock music sparkle check cross equal flame
├── js/
│   ├── main.js             Bootstrap: firstFrameReady → loadSave → wire UI/audio/pause → home → gameReady
│   ├── core/
│   │   ├── sdk.js          The ONLY place that touches window.ytgame. Safe no-op fallbacks outside Playables
│   │   ├── storage.js      Save schema, migrate(), loadSave(), writeSave(), writeSaveSoon()
│   │   ├── version.js      APP_VERSION (shown at the bottom of Settings; must match package.json)
│   │   └── rng.js          hashSeed(), createRng() (mulberry32), randomSalt()
│   ├── puzzle/             Pure logic, no DOM (runs in Node for tests)
│   │   ├── rules.js        EMPTY/SUN/MOON, SIGN_SAME/DIFF, getLines, createContext, conflictAt
│   │   ├── solver.js       basicStep (signs, pair, sandwich, count), trialStep, nextDeduction, solveLogic
│   │   ├── generator.js    randomSolution → pickSigns → remove givens while logic-solvable
│   │   └── difficulty.js   stageTier(), stageConfig() (the difficulty curve)
│   ├── game/
│   │   ├── session.js      StageSession: one stage's state (board, lives, hints, timer, stars), toJSON/fromJSON
│   │   └── controller.js   GameController: HUD, input, timer, hints, win/lose flows, ads, saving
│   ├── ui/
│   │   ├── dom.js          $, $$, el, icon(), image(), formatTime, showScreen, toast
│   │   ├── board.js        Board class (game + mini boards) and miniBoard()
│   │   ├── modal.js        openModal() stack, Esc/backdrop close, isModalOpen(), bindAction()
│   │   ├── tutorial.js     openTutorial({ slides, onDone }), SIGNS_SLIDE
│   │   ├── settings.js     openSettings(): Music + Sound effects toggles, How to play, Home
│   │   ├── home.js         renderHome(): stage path, play label, star total
│   │   └── effects.js      Canvas particles: burst(), confetti(), pause()/resume()
│   └── audio/
│       ├── engine.js       AudioEngine: context, master/music/sfx buses, tone(), noise(), YouTube mute
│       ├── music.js        Generative MusicPlayer (6 songs, 4 sections, rotating, phrases composed live)
│       └── sfx.js          Named sound effects (tap, place, wrong, line, hint, win, star, lose, click, reward)
└── tools/
    ├── test-generator.mjs  `npm test [stages] [salts]`: checks every stage is logic-solvable + unique, timing
    └── package.sh          `npm run package` → dist/sun-and-moon.zip (index.html, css, js, assets only)
```

## 7. Key data formats

**Grid values**: `0` empty, `1` sun, `2` moon. Cell index = `row * size + col`.

**Sign**: `{ a, b, type }`, where `b = a + 1` (horizontal) or `a + size` (vertical), and `type` is `'same' | 'diff'`.

**Save (v1)**, stored with `ytgame.game.saveData` in Playables or `localStorage['sun-and-moon-save']` elsewhere:
```json
{
  "version": 1,
  "salt": 123456,
  "stage": 12,
  "best": 11,
  "stars": [3, 2, 3],
  "tutorialDone": true,
  "signsTipSeen": true,
  "settings": { "music": true, "sfx": true },
  "current": {
    "stage": 12, "tier": "normal", "size": 6,
    "givens": "102000...", "solution": "121212...", "board": "102010...", "locked": "101000...",
    "signs": [[3, 4, 0], [10, 16, 1]],
    "lives": 2, "hints": 3, "mistakes": 1, "hintsUsed": 0, "elapsed": 42
  }
}
```
- `signs` triples are `[a, b, 0=same | 1=diff]`.
- `board` holds the player's values, which may be wrong in unlocked cells. `locked` holds `1` for givens, verified lines and hint cells. Old saves without `locked` fall back to "every filled cell is locked" (in v1.0–1.2 only correct cells could be placed).
- `current` is the in-progress stage (resumed exactly, including the timer). It is `null` after a win.
- Puzzles are deterministic per player: `hashSeed(salt, stage)`. The full puzzle is still stored in `current`, so generator changes never break a saved stage.
- **Migration**: `storage.js → migrate()` merges onto defaults. When adding fields, add a default there. If the format changes, bump `SAVE_VERSION` and convert old data in `migrate()`. Old saves must always load (Playables requirement).

## 8. Puzzle engine notes

- `solveLogic` only uses sound deductions, so if it fills the grid, the solution is unique. The generator only removes a given if the puzzle stays logic-solvable at the stage's `maxLevel`.
- `LEVEL_BASIC`: signs, pairs (`XX → neighbours opposite`), sandwich (`X_X → middle opposite`), count (line has N/2 of one symbol, so the rest are the other).
- `LEVEL_TRIAL`: try a value, propagate basic rules, and if there's a contradiction it must be the other value.
- Hints use `nextDeduction` on the trusted (locked-only) grid.
- Signs on two given cells are removed after generation (they add no information).
- Performance: 6×6 takes about 1 ms, and the slowest 8×8 about 20 ms (Node). Run `npm test 150 3` after any engine change.

## 9. YouTube Playables compliance (must keep)

- The SDK `<script src="https://www.youtube.com/game_api/v1">` is the **first script** in `index.html`.
- `firstFrameReady()` is called while the loading screen shows, and `gameReady()` after the home screen is interactive.
- Saves: **only** `ytgame.game.saveData` in Playables (localStorage only outside Playables). `loadData` is awaited before any save. Save size is tiny (well under 500 KiB).
- Audio: follows `isAudioEnabled()` / `onAudioEnabledChange()` (master gain). There is **no global mute button** in-game, only separate Music / Sound-effect toggles. Audio starts only after a user gesture.
- Pause: `onPause` → stop the timer, music scheduler, AudioContext, particles and CSS animations (`body.is-paused`), then save. `onResume` restores everything. **Never use the Page Visibility API.**
- No external network calls (the SDK script is the only URL), no external links, no share buttons, no exit/quit button, no extra user agreements.
- Responsive for every aspect ratio (portrait column layout; `min-aspect-ratio: 5/4` switches the game and home screens to a row layout, and the home dock gets a fixed 280 px width there). On small landscape screens (`min-aspect-ratio: 5/4` and `max-width: 1000px`) the home screen uses a 2-column grid (stage path on the left, title + Play on the right). The owner likes the current desktop layout, so don't restyle it unless asked.
- Board size: `fitBoard()` uses `min(width, height)` of `#board-area` and runs on ResizeObserver **and** window `resize`. In row layout, `.board-area` uses `flex-basis: 100vh` so it can shrink and the side panels stay visible.
- Home stage path: `fitPath()` (home.js) removes far-future nodes first, then past nodes, until the path doesn't overflow. It re-runs on window resize. `showScreen` must run before `renderHome` (it measures).
- Verified layouts (v1.4): 320×568, 360×640, 375×812, 360×840, 360×1280 (9:32), 500×500, 600×800, 700×700, 800×600, 1024×768, 1280×720, 1680×720, 1920×540 (32:9), 640×360, 568×320. There's no overflow or overlap on the home or game screens, and modals fit or scroll.
- Touch + mouse + keyboard. Esc closes modals (never `preventDefault` on Esc).
- Language: English only. Never use `navigator.language`. If localizing, use `ytgame.system.getLanguage()`.
- Ads: only through `ytgame.ads.requestRewardedAd` (reward IDs `sun-moon-refill-3-lives`, `sun-moon-extra-hint`). Hidden when not in Playables. Ad monetization must also be enabled in the Developer Portal.
- Bundle: about 100 KB total, about 30 files, all relative paths.

## 10. How to run / test / ship

- Local: `npm run serve` (or `python3 -m http.server 8080`), then open http://localhost:8080. ES modules need http, not `file://`.
- Engine tests: `npm test` (or `node tools/test-generator.mjs 150 3`).
- Scenario tests (game flows in jsdom with a fake `ytgame`): run `npm install` once (dev-only `jsdom`), then `npm run test:scenarios`. Each scenario in `tools/scenarios/scenarios.mjs` runs in its own Node process (`run-all.mjs`). They cover win, Esc→next stage, last cell then Home, zero-lives resume, stale timers, double win on pause/resume, pause during win delay, failed cloud load, corrupt/garbage saves, old saves without `locked`, smart hints, locked taps, keyboard, pause during a pending check, the signs tip, 8×8, the frozen timer and retry, rewarded ads (lives/hint/failure), rapid taps and settings. **Add a scenario for every bug you fix.**
- Playables certification: use the [SDK test suite](https://developers.google.com/youtube/gaming/playables/test_suite) and upload `dist/sun-and-moon.zip` from `npm run package` in the Developer Portal.
- GitHub Pages: push this folder as the repo root, then Settings → Pages → deploy from branch `main` / root.

## 10b. Robustness rules (from the v1.4 bug sweep)

- **Delayed UI callbacks** (clear wrong cells, show the lose/win modal, star sounds) must use `controller.later(fn, ms)`. It drops the callback if the session changed (Home, retry, next stage) and defers it while paused. `clearTimers()` runs in `begin()` and `goHome()`.
- `controller.finished` is set by `win()`, which runs only once. After a win, `checkLines`, `resume` and `persist` never resurrect the stage (`save.current` stays `null`).
- `begin()` always re-checks lines (so a board finished just before leaving still wins) and shows "Out of lives" if a saved stage has 0 lives.
- `running` is false during modals, pause, ads (`adBusy`), after the win and at 0 lives, so the timer and input stop.
- Rewarded ads: the lives modal is non-dismissible while the ad plays, and a second ad request is ignored (`adBusy`).
- Saves: if cloud `loadData` fails 3 times, saving is disabled for the session, so it never overwrites real progress with defaults. `migrate()` sanitises every field, and `StageSession.fromJSON` validates sizes and lengths and throws (then a fresh stage is generated).
- Hints never waste a charge on a cell the player already filled correctly. Those cells get locked for free and the hint moves on.
- Board animation classes are removed on `animationend` (`ANIMATION_CLASS` map in `board.js`).
- Music scheduling stops completely when music is off, YouTube mute is on, or the game is paused (`music.refresh()`).
- The SDK pause/mute listeners are registered at module start, before `loadSave`.
- Screens get `inert` while a modal is open (keyboard focus can't reach the game behind it).

## 10c. Versioning

- The single source of truth for players is `js/core/version.js → APP_VERSION`. It's shown as "Version x.y.z" at the bottom of the Settings dialog, so players can include it in bug reports.
- **Every release**: bump `APP_VERSION` **and** `package.json → version` to the same value, and add a change-log entry (section 13). `npm test` fails if the two versions differ.
- Semantic versioning: patch = bug fix, minor = new feature or behaviour change, major = save-format break (avoid it; migrate instead).

## 11. Conventions

- ES modules with named exports. Classes for stateful things (`Board`, `StageSession`, `GameController`, `AudioEngine`, `MusicPlayer`, `Effects`); singletons are exported as instances (`audio`, `music`, `effects`, `sdk`).
- DOM is built with small template strings + `el()`. Icons use `icon(name)` (sprite) and `image(name)` (SVG file).
- CSS: BEM-ish simple class names, state classes `is-*` (`is-active`, `is-selected`, `is-lost`, `is-earned`, `is-paused`). Colors and tokens live in `:root`. Candy look = vertical gradients + solid bottom `box-shadow`.
- Modals: always use `openModal()`, and give every modal an `onClose` default action (Esc/backdrop must work).
- Keep comments minimal.

## 12. Ideas / TODO

- Store thumbnails and metadata for the Developer Portal (several aspect ratios, no logos).
- Optional bundled rounded font (OFL license, e.g. Fredoka). It currently uses the system rounded font stack.
- Daily challenge mode (seed = date), streaks, stage map with more history, more music songs, localization via `getLanguage()`.
- Optional haptics (requires an in-game toggle per the Playables rules).

## 13. Change log

- **v1.5.0**: The app version is shown in Settings (`js/core/version.js`). `npm test` checks it matches `package.json`.
- **v1.4.0**: Bug sweep (see 10b): frozen won board on resume, a 0-lives soft-lock, stale timers after Home, double win on pause/resume, `save.current` not cleared after a win, cloud-load failure wiping progress, corrupt-save crash, hints wasted on correct cells, ad races, animation classes not cleaned up, music scheduling while muted. Added a jsdom scenario test suite (`tools/scenarios`) and removed dead code and CSS. Layout fixes found in the browser sweep: board overflow on 1:1/4:3/short landscape, home stage path overlapping on short screens, home actions off-screen on small landscape, bigger `=`/`×` clue badges on 8×8, smaller tutorial on short screens.
- **v1.3.0**: Validation is now per completed row/column instead of per tap. Taps cycle empty/sun/moon freely, correct lines lock (mint), and a wrong line costs one life and clears its wrong cells. Save gains `locked`. The settle/preview tap mechanic was removed.
- **v1.2.0**: Taps toggle sun/moon and settle 450 ms after the last tap. Music starts faster (it begins in the melody section with a short pad attack, and audio unlocks on pointerdown/touchend/click/keydown). Home bottom bar (help / stars / settings) is restyled as one dock with equal-height items. The rest of the desktop layout is unchanged.
- **v1.1.0**: Removed the sun/moon picker buttons. Single tap = sun, double tap = moon (with preview), and right-click = moon. The hint button is now the large centre toolbar button.
- **v1.0.0**: First playable version. Stages with difficulty curve and spikes, 3 lives / 3 hints, timer, win/lose screens, tutorial, generative music + SFX, cloud save with resume, Playables SDK integration.
