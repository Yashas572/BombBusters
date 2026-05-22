# CLAUDE.md — Working in this Repository

Project-specific guidance for Claude Code (and any other AI agent) when editing this codebase. Read this first before making changes.

---

## What this project is

A web-based 1v1 adaptation of the cooperative deduction board game **Bomb Busters** by Hisashi Hayashi. Player vs. AI, with an integrated GPT-4 coach. Personal fan project — not commercial.

See [README.md](README.md) for the player-facing description and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the original technical design doc.

---

## Architecture in one minute

Three layers, strictly separated:

```
React UI (src/components/)
       ↕
Zustand store (src/store/)
       ↕
Pure TS engine (src/engine/)
```

**The engine has no React imports.** Test it in Node, run it on a server, use it in a worker — it doesn't matter. Every file under `src/engine/` is a pure function library.

The **store** is the only place that calls engine functions and exposes the result to React via Zustand selectors. Components never call engine functions directly.

The **GPT-4 coach** (`src/coach/`) is a read-only sibling — it reads game state but never mutates it. It calls OpenAI or OpenRouter directly from the browser.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 with `persist` middleware for settings |
| Tests | Vitest 2 + React Testing Library |
| Coach | OpenAI `gpt-4o` (or OpenRouter routing the same model, auto-detected by key prefix) |

---

## File map

```
src/
├── engine/                  Pure TS, no React, no DOM
│   ├── types.ts             ALL shared types — touch carefully
│   ├── rng.ts               Seeded xorshift RNG
│   ├── deck.ts              Tile generation, dealing, sorting, initial state
│   ├── rules.ts             Validation + helpers (holdsValue, hasGuaranteedSoloCut, etc.)
│   ├── gameState.ts         The state machine — applyAction() is the single entry point
│   ├── tutorial.ts          Hand-crafted deterministic deck for the tutorial
│   ├── ai/
│   │   ├── probabilityModel.ts   Sort-order + frequency constraint propagation
│   │   └── aiOpponent.ts         Difficulty-shaped action selection
│   └── missions/missions.ts      Training missions 1-8 + custom mission builder
├── store/
│   ├── gameStore.ts         Main game store: state, screen routing, actions, tutorial mode
│   └── settingsStore.ts     Persisted prefs (difficulty, API key, coach toggle)
├── coach/
│   ├── coachPrompt.ts       System prompt + game state serialization
│   ├── coachCache.ts        60s in-memory LRU
│   └── coachApi.ts          REST client; auto-detects OpenAI vs OpenRouter by key prefix
├── components/
│   ├── ui/Tooltip.tsx       Reusable hover tooltip (pure CSS, no state)
│   ├── coach/               CoachSidebar + CoachMessage (Hint:/Move: parsing + typing indicator)
│   ├── game/                Tile, Rack, DetonationTracker, CutHistory, EquipmentPanel,
│   │                        ActionPanel, RedWireFlash, TutorialOverlay
│   └── screens/             MainMenu, MissionSelect, GameScreen, GameOver, Settings
├── lib/clsx.ts              Tiny class-name joiner
├── App.tsx                  Screen router (switch over store.screen)
├── main.tsx                 React entry
├── index.css                Tailwind directives + tutorial-spotlight keyframes
└── vite-env.d.ts            Vite env-var typings

tests/
├── setup.ts                 jest-dom matchers
└── engine/
    ├── deck.test.ts
    ├── rules.test.ts
    ├── gameState.test.ts
    ├── ai.test.ts
    ├── fullGame.test.ts     End-to-end simulations
    └── analysis/
        └── biasAnalysis.test.ts   Stats collection, not assertions
```

---

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (port 5173) |
| Build | `npm run build` |
| Preview prod build | `npm run preview` (port 4173) |
| Test (watch) | `npm run test` |
| Test (once) | `npm run test:run` |
| Engine tests only | `npm run test:engine` |
| Type check | `npm run lint` (no emit) |
| Bias analysis | `npx vitest run tests/analysis/biasAnalysis.test.ts` |

**Always run `npm run lint` and `npm run test:run` before committing.** Both must be clean.

See [HOWTORUN.md](HOWTORUN.md) for a full operations guide.

---

## Conventions

### State management

- **`applyAction(state, action)` is the only way the engine produces new state.** Don't mutate. Don't reach into state from a component.
- The store's `dispatch` helper wraps `applyAction` and handles error catching, event capture, and screen transitions on game over.
- When adding a new game action, update `GameAction` in [types.ts](src/engine/types.ts) and add the handler in [gameState.ts](src/engine/gameState.ts). Don't sprinkle game logic into components.

### Immutability

[gameState.ts](src/engine/gameState.ts) does a deep-ish clone at the top of `applyAction` (spread on the state object, map-over-spread on each rack's tiles, spread on the event arrays). Mutation *inside* `applyAction` is fine because we're working on the clone. Mutation outside `applyAction` is a bug.

A test in [gameState.test.ts](tests/engine/gameState.test.ts) verifies `JSON.stringify(prevState)` is unchanged after a dispatch — keep that test passing.

### Component patterns

- Components subscribe to specific store slices: `useGameStore(s => s.gameState)`, not `useGameStore()`.
- Tooltips use the `<Tooltip>` wrapper from [src/components/ui/Tooltip.tsx](src/components/ui/Tooltip.tsx).
- Animations come from Tailwind keyframes defined in [tailwind.config.js](tailwind.config.js). Don't inline `<style>` blocks.

### Typing

- TS strict mode is on. No `any`. No `// @ts-ignore` without a comment explaining why.
- `noUnusedLocals` and `noUnusedParameters` are on — clean up imports.
- One known cast: `(state.phase as GamePhase) !== 'gameover'` in [gameState.ts:336](src/engine/gameState.ts#L336) — TS narrows phase to `'playing'` from an earlier throw but doesn't widen it back after `checkGameEnd` mutates state. Leave that cast alone.

### Engine purity

Anything under `src/engine/` must not import from `react`, `zustand`, the DOM, `localStorage`, or browser APIs. The engine should still type-check and run if you swap React for Vue tomorrow.

### Coach prompt

[src/coach/coachPrompt.ts](src/coach/coachPrompt.ts) is the LLM contract. **Don't hardcode example outputs** (the model will copy them verbatim) and **don't enumerate trigger phrases** ("if user says 'hi' then..."). Define principles, then trust the model. Read the existing prompt for the tone.

When the coach needs to reference UI elements, use the format `position N on the AI rack` — that's the format the `parseTilePositionsFromResponse` regex looks for. Changing that format breaks the tile-highlight feature.

---

## Game logic gotchas

### Tile positions are 0-indexed internally, 1-indexed in the UI

`activeIdx` in [Rack.tsx](src/components/game/Rack.tsx) starts at 0 but is displayed as `position + 1`. The coach prompt always talks about 1-indexed positions. If you're computing a tile reference, double-check whether you're producing 0- or 1-indexed.

### Cut tiles stay in the rack

[Rack.tsx](src/components/game/Rack.tsx) renders ALL tiles, including cut ones — they animate out via `animate-tile-cut`. Filtering them on display would break the animation. The `activeIdx` counter skips cut tiles so position numbers stay correct.

### The AI doesn't take turns in tutorial mode

[gameStore.ts](src/store/gameStore.ts) — the `dispatch` helper flips `currentTurn` back to `'player'` when `tutorialMode` is true. `runAiTurn` also early-returns if `tutorialMode`. Both guards are needed.

### Solo cut penalty

If the player has a guaranteed solo cut available at the start of their turn and chooses any other action, they lose a point. This is enforced by the `pendingSoloCutForPlayer` / `pendingSoloCutForAi` flags refreshed at every turn boundary. Don't add new actions without considering whether they should also trigger `applySoloCutPenaltyCheck`.

### Yellow + red tiles share a decimal value space

Both are generated by `pickDecimalValue` in [deck.ts](src/engine/deck.ts) which uses a shared `occupied` set to avoid collisions. If you add another wire color with decimal values, extend that set.

### Equipment unlock requires ALL 4 copies cut

See bias #4 in [bias.md](bias.md). This rarely happens in short missions, meaning equipment is essentially unused. If you're tuning balance, this is a real lever.

---

## AI biases worth knowing

[bias.md](bias.md) documents five real biases in the current AI:

1. **First-move always position 0** (100% on Medium/Hard) — tiebreaker artifact
2. **Low values declared 2–3× more than high values** — same tiebreaker artifact
3. **Easy/Medium/Hard produce nearly identical play** in short missions
4. **Equipment is never used** by the AI in 200+ games on Mission 3
5. **~95% detonator-loss rate** in test simulations (player calibration, not pure AI fault)

**If you're tuning the AI**, read [bias.md](bias.md) first. There are concrete fix suggestions for each bias.

**If you're changing the probability model**, re-run the bias analysis (`npx vitest run tests/analysis/biasAnalysis.test.ts`) before and after to confirm you fixed what you intended and didn't break something else.

---

## Things NOT to do

- **Don't put game logic in components.** Add it to the engine, expose it via the store.
- **Don't `npm audit fix --force`.** It aggressively upgrades major versions and breaks the build. Live with the advisory warnings.
- **Don't deploy with the API key in `.env.local`** to a public URL. Vite bundles `VITE_*` env vars into the client JS. Either leave the env empty for prod and rely on user-supplied keys via Settings, or route through a server-side proxy.
- **Don't add `console.log` to production code paths.** Use the `lastEvents` array on the game state for in-engine signals, and let components subscribe to those.
- **Don't change the `parseTilePositionsFromResponse` regex** without updating the coach prompt — the highlight feature relies on a specific format.
- **Don't break the engine's purity rule.** No `window`, `localStorage`, `fetch`, etc. inside `src/engine/`.

---

## When you change something risky

1. Run `npm run lint`
2. Run `npm run test:run` — 35+ tests must pass
3. If you touched `src/engine/ai/`, also run `npx vitest run tests/analysis/biasAnalysis.test.ts` and eyeball the stats
4. Run `npm run dev` and play at least one round of Mission 1
5. If you touched the coach, ask the coach a casual question ("hi") AND a strategy question, and confirm both behaviors are right
6. For UI changes, refresh the tutorial too — that's the most-broken path historically

---

## Known limitations (don't be surprised)

- **Character cards are stubbed in types but unimplemented.** Mission 8 has `includeCharacterCards: true` but nothing wires them into the UI or engine.
- **Missions 9–66 don't exist.** Only training missions 1–8 are configured. `buildCustomMission` is the escape valve.
- **No mobile responsive layout.** Designed for ≥1024px screens. Coach sidebar would need a bottom-sheet collapse on small screens.
- **No persistence across refresh.** Game state lives only in memory. A refresh = lost game. Settings (API key, difficulty) DO persist via Zustand persist middleware.
- **Easy/Medium/Hard difficulty doesn't meaningfully differ in early missions.** See bias #3.
- **Bias analysis uses a deliberately weak auto-player.** The 95% detonator-loss rate is a property of the test, not necessarily of real human play.

---

## Open invitations for future work

Listed roughly by impact:

1. **Fix the AI tiebreaker biases** (bias #1, #2) — 5 minutes of code, big behavioral improvement.
2. **Real Easy/Hard differentiation** — see bias.md recommendations.
3. **Stats / progression tracking** — completed missions, win streak, total cuts. Hook into the existing `persist` middleware.
4. **Post-game coach review** — send the cut history + outcome to GPT-4 after game over, render the analysis on the Game Over screen.
5. **Sound effects** — already toggleable in settings, never implemented. Tile cut, wrong guess, detonation.
6. **Keyboard shortcuts** — number keys for declared values, Space to confirm, Esc to cancel.
7. **Missions 9–30** — config-only work, no engine changes needed. Increasing rack size and tightening detonator.
8. **Character cards** — needs design before implementation; types are already stubbed.
9. **Mobile responsive layout** — coach to bottom sheet, racks stack vertically.
10. **Multiplayer** — entirely new domain, would need a backend.

When in doubt about scope, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the original phased plan.
