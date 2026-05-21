# Bomb Busters Digital Edition — Implementation Plan

## My Read on This Project

The PRD is solid and well-scoped. A few observations before the plan:

- **The co-op → competitive 1v1 adaptation is the biggest design risk.** The original game is cooperative; both players share a bomb. The PRD's scoring system (more cuts = win) creates a perverse incentive where a player might sandbag on safe cuts to keep the tracker low while banking points. This needs a tiebreaker and clear UI treatment so the player always understands the risk/reward tradeoff.
- **The AI opponent is the engineering heart of the project.** A convincing probability engine over sorted tiles with red-wire danger zones is non-trivial. This deserves its own isolated module with unit tests before any UI is built around it.
- **GPT-4 coaching is a UX multiplier, not a game mechanic.** It should be treated as a progressive enhancement — the game must be fully playable without it. Spoiler protection (hint-first, reveal on demand) is the right default.
- **66 missions is a lot.** Missions 1–8 (training) + a generic custom game covers 95% of value. Ship that, then add missions 9–30 as a second release. The PRD's 14-week timeline is aggressive for missions 51–66.
- **LocalStorage for API keys is acceptable for a personal project** but should be called out clearly in the UI (key stays on device, sent only to OpenAI).

---

## Tech Stack (Confirmed)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript | Vite for dev speed |
| Styling | Tailwind CSS v3 | No component lib — custom game UI |
| State | Zustand | Single store, serializable for coach |
| AI Opponent | Custom TS engine | No API calls |
| AI Coach | OpenAI `gpt-4o` | User-supplied key in localStorage |
| Persistence | localStorage | Game progress + settings |
| Testing | Vitest + React Testing Library | Faster than Jest in Vite |
| Deploy | Vercel | Static, zero config |

---

## Project Structure

```
bomb-busters/
├── src/
│   ├── engine/              # Pure TS game logic — no React
│   │   ├── types.ts         # All shared types/interfaces
│   │   ├── deck.ts          # Tile generation, distribution
│   │   ├── gameState.ts     # State machine transitions
│   │   ├── rules.ts         # Win/loss, solo-cut detection, action validation
│   │   ├── ai/
│   │   │   ├── probabilityModel.ts   # Core AI inference engine
│   │   │   ├── aiOpponent.ts         # Decision making + difficulty shaping
│   │   │   └── equipmentStrategy.ts  # Equipment usage logic
│   │   └── missions/
│   │       ├── missionConfig.ts      # Mission definitions
│   │       └── missions.ts           # All 66+ mission configs
│   ├── store/
│   │   ├── gameStore.ts     # Zustand game state
│   │   └── settingsStore.ts # Difficulty, API key, prefs
│   ├── coach/
│   │   ├── coachApi.ts      # OpenAI REST calls
│   │   ├── coachPrompt.ts   # System prompt + state serialization
│   │   └── coachCache.ts    # Query dedup/caching
│   ├── components/
│   │   ├── game/
│   │   │   ├── Board.tsx
│   │   │   ├── Rack.tsx          # Reused for both player + AI
│   │   │   ├── Tile.tsx          # Single wire tile (face-up/down/revealed)
│   │   │   ├── DetonationTracker.tsx
│   │   │   ├── CutHistory.tsx
│   │   │   ├── EquipmentPanel.tsx
│   │   │   └── ActionPanel.tsx   # Player's action controls
│   │   ├── coach/
│   │   │   ├── CoachSidebar.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── QuickActions.tsx
│   │   └── screens/
│   │       ├── MainMenu.tsx
│   │       ├── MissionSelect.tsx
│   │       ├── GameScreen.tsx
│   │       ├── GameOver.tsx
│   │       └── Settings.tsx
│   └── hooks/
│       ├── useGameLoop.ts    # Turn orchestration
│       └── useCoach.ts       # Coach query + highlight coordination
├── tests/
│   ├── engine/              # Unit tests for all pure logic
│   └── components/          # Integration tests
└── public/
```

---

## Phase 1 — Core Engine (Weeks 1–3)

**Goal:** Playable game in the browser with no AI. Two human perspectives (player sees own rack, AI rack shown face-down). Turn-based, win/loss detection.

### 1.1 Types (`engine/types.ts`)

Define all shared types first — this drives everything else:

```typescript
type WireColor = 'blue' | 'yellow' | 'red';

interface Tile {
  id: string;
  value: number;       // integer 1-12 for blue, decimal (e.g. 5.5) for yellow/red
  color: WireColor;
  revealed: boolean;   // true after a wrong guess reveals via info token
}

interface Rack {
  owner: 'player' | 'ai';
  tiles: Tile[];       // always sorted ascending by value
}

interface GameState {
  playerRack: Rack;
  aiRack: Rack;
  detonationTracker: { current: number; max: number };
  cutHistory: CutRecord[];
  revealedInfo: RevealedInfo[];
  equipment: EquipmentCard[];
  currentTurn: 'player' | 'ai';
  phase: 'setup' | 'playing' | 'gameover';
  outcome: 'win' | 'loss_detonation' | 'loss_redwire' | null;
  playerScore: number;
  aiScore: number;
  missionId: number;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### 1.2 Deck Generation (`engine/deck.ts`)

- Generate 48 blue tiles (values 1–12, 4 copies each)
- Per mission config, append N yellow tiles (decimal values) and M red tiles
- Shuffle, deal into two racks
- Sort each rack ascending before play begins
- Each player places one info token at game start: pick a tile in your own rack to reveal its value to both players (starting hint)

**Edge case to solve:** Red and yellow tiles share the decimal value space. Values like 5.3 (red) vs 5.5 (yellow) must sort correctly and not collide. Use a seeded RNG so games are reproducible for post-game review.

### 1.3 State Machine (`engine/gameState.ts`)

Actions as pure functions (old state → new state, never mutate):

```
applyAction(state, action) → GameState
```

Actions:
- `GUESS_WIRE { targetRack, tileIndex, declaredValue }` → validates, removes matched tiles, advances tracker on failure, checks red wire
- `SOLO_CUT { tileIndices }` → validates both copies are in player's own hand, removes both
- `USE_EQUIPMENT { cardName, ...params }` → dispatches to equipment handlers
- `AI_TURN_COMPLETE { action }` → wraps AI decision as an action for logging

### 1.4 Rules Engine (`engine/rules.ts`)

Critical validations:
- Player must hold the declared value to make a guess (rule: "you must hold that same number")
- Solo cut requires both remaining copies are in the active player's rack
- Equipment is only usable after the corresponding wire pair is fully cut
- Detonation tracker at zero = immediate game over before any further actions

### 1.5 Basic UI

Minimal but functional:
- Player rack displayed as a row of tiles showing values
- AI rack displayed as face-down tiles (position numbers visible)
- Clicking an AI tile + entering a number submits a guess action
- Detonation counter shown prominently
- Pass-and-play style (player acts, then AI acts after a short delay)

---

## Phase 2 — AI Opponent (Weeks 4–5)

**Goal:** The AI plays a complete game at three difficulty levels using probability-based deduction.

### 2.1 Probability Model (`engine/ai/probabilityModel.ts`)

This is the hardest piece. The AI must maintain a belief distribution over the opponent's rack.

**What the AI knows:**
- Its own tiles (exact values)
- All revealed info tokens (tile positions + values on both racks)
- Cut history (which values have been partially/fully removed from play)
- The sorted-order invariant: rack[i].value < rack[i+1].value always

**Algorithm:** For each position on the player's rack, compute the set of values that are consistent with:
1. Frequency constraints (4 copies per number, track how many remain uncut)
2. Sort constraints (value at position i must be strictly between bounds set by neighbors whose values are known)
3. Red/yellow wire presence (from mission config, how many of each exist in the full pool)

This yields a probability distribution over possible values for each unknown position. With this the AI can:
- Identify the highest-confidence guess
- Identify guaranteed solo cuts (own copies cover all remaining instances of a number)
- Compute expected value of each guess (P(correct) × points_gained − P(wrong) × detonator_cost)

**Implementation approach:** Enumerate valid assignments using constraint propagation rather than brute-force. For small racks (≤8 tiles) full enumeration is feasible; for larger racks use interval-based bounds.

### 2.2 Difficulty Shaping (`engine/ai/aiOpponent.ts`)

| Difficulty | Mechanism |
|---|---|
| Easy | With 25% probability, skip the highest-confidence guess and pick the second-best. Never use equipment proactively. Introduce a 500ms "thinking" delay. |
| Medium | Follow the probability model faithfully. Use equipment when EV is clearly positive. |
| Hard | Optimal play. Preemptively solo-cut when available (never wastes a turn on a guess if a guaranteed cut exists). Times equipment for maximum impact. |

**Important:** Difficulty shaping happens in the decision layer only. The probability model always runs at full accuracy — the Easy AI just ignores some of its findings. This means you can show the "true" best move in the coach without contradicting the AI's internal logic.

### 2.3 Solo Cut Detection

After each action (any player), re-evaluate both racks for solo-cut eligibility. If the AI has a guaranteed solo cut, it should always take it (even on Easy) — it's free points.

---

## Phase 3 — Full Game UI (Weeks 6–8)

**Goal:** Complete, polished visual game board with animations.

### 3.1 Board Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Equipment Panel]     AI Rack (face-down tiles)     [Coach Toggle] │
│                                                                      │
│            Detonation Tracker  ●●●●○○   Cut History                 │
│            Wire Status: 1✓ 2✓ 3- 4- 5- ...                         │
│                                                                      │
│  [Equipment Panel]    Player Rack (all visible)    [Coach Sidebar]  │
│                                                                      │
│            [Guess]  [Solo Cut]  [Use Equipment]                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tile Component States

- **Face-down (AI rack, unknown):** Card back + position number
- **Face-down (AI rack, revealed by info token):** Card back with value badge overlay
- **Face-up (player rack):** Full tile showing value + wire color
- **Cut:** Greyed-out with a strike-through animation
- **Highlighted (coach suggestion):** Pulsing border in coach accent color
- **Selected (player targeting):** Bold outline, confirms the tile being targeted

### 3.3 Animations

Keep them short (150–300ms) so they don't frustrate experienced players:
- Tile cut: slide-out + fade
- Wrong guess: detonation counter shake + tile flip to reveal value
- Red wire: full-screen flash + explosion particle effect (then game over screen)
- AI thinking: subtle spinner on AI rack

### 3.4 Interaction Flow for a Guess

1. Player clicks a face-down tile on the AI rack → tile highlights as "selected"
2. Player clicks a tile on their own rack → that value populates the guess input
3. Player confirms → action dispatched → result rendered
4. If correct: both tiles animate out simultaneously
5. If wrong (blue): detonation counter animates, tile reveals, info token placed

---

## Phase 4 — GPT-4 Coach (Weeks 9–11)

**Goal:** Functional coaching sidebar using the OpenAI API with proper context injection.

### 4.1 Game State Serialization (`coach/coachPrompt.ts`)

The state sent to GPT-4 must be complete but concise. Based on Appendix B of the PRD, extend it:

```typescript
function serializeStateForCoach(state: GameState, playerQuestion: string): ChatMessage[] {
  const gameStateJson = {
    player_rack: state.playerRack.tiles.map(t => ({
      position: t.position,
      value: t.value,
      color: t.color,
    })),
    ai_rack: state.aiRack.tiles.map(t => ({
      position: t.position,
      value: t.revealed ? t.value : null,
      revealed: t.revealed,
    })),
    revealed_info: state.revealedInfo,
    cut_history: state.cutHistory,
    detonation_tracker: state.detonationTracker,
    equipment: state.equipment,
    current_turn: state.currentTurn,
    player_score: state.playerScore,
    ai_score: state.aiScore,
    mission_id: state.missionId,
    difficulty: state.difficulty,
  };

  return [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
    { role: 'user', content: `Game state:\n${JSON.stringify(gameStateJson, null, 2)}\n\nPlayer question: ${playerQuestion}` }
  ];
}
```

### 4.2 System Prompt Engineering (`coach/coachPrompt.ts`)

Extend the PRD's draft prompt with:
- Full sorted-order deduction rules spelled out explicitly
- Red wire danger zone explanation
- Equipment unlock conditions
- The 1v1 competitive scoring context
- Instruction to respond in ≤3 paragraphs unless asked for more
- Instruction to use "Hint:" prefix for spoiler-protected suggestions, "Move:" prefix when revealing the full recommendation

### 4.3 Caching (`coach/coachCache.ts`)

- Cache key: hash of (serialized game state + question)
- TTL: 60 seconds (game state changes frequently)
- Only cache successful responses — don't cache API errors
- Limit to 50 entries with LRU eviction (localStorage-backed)

### 4.4 Rate Limiting

- Max 1 request per 3 seconds (debounce rapid clicks)
- Max 20 requests per game session (show usage meter)
- Soft limit UI: warn at 15, disable quick-action buttons at 20 (manual type still works)

### 4.5 Quick-Action Buttons

| Button | Sends to GPT-4 |
|---|---|
| "Best Move" | "What's the best action I can take right now? Start with a hint." |
| "Explain Last Turn" | "What did the AI opponent just do and what does it tell us?" |
| "Any Tips?" | "What general strategic observations can you make about the current board state?" |
| "Risk Check" | Requires player to select a tile first. "How risky is it to guess [selected tile] as [value]?" |

### 4.6 Board Highlights

When the coach response contains a tile reference (e.g., "position 3 on the AI rack"), parse it and dispatch a `HIGHLIGHT_TILE` action to the UI store. Tiles pulse for 5 seconds then return to normal. This requires a lightweight NLP parser over the coach response — look for patterns like `position N`, `tile at position N`, `the Nth tile`.

---

## Phase 5 — Missions & Polish (Weeks 12–14)

### 5.1 Mission System

Each mission is a config object:

```typescript
interface MissionConfig {
  id: number;
  name: string;
  tier: 'training' | 'standard' | 'advanced' | 'expert';
  blueTileCount: number;      // tiles per player (from the 48 blue pool)
  yellowTileCount: number;
  redTileCount: number;
  detonationLimit: number;
  equipmentPool: EquipmentCardName[];
  characterCards: boolean;
  specialRules?: SpecialRule[];  // for advanced/expert missions
}
```

**Training missions (1–8) — implementation priority:**
- Mission 1: 6 blue tiles each, no yellow/red, 5 detonation limit, no equipment
- Mission 2: 8 blue tiles, 5 detonation limit — introduces info tokens
- Mission 3: Adds Double Detector equipment
- Mission 4: First yellow tile introduced
- Mission 5: Adds Freeze equipment
- Mission 6: Adds Scanner equipment
- Mission 7: First red tile (1 red each)
- Mission 8: Character cards introduced

### 5.2 Progression Tracking

Store in localStorage:
- Highest mission completed
- Win/loss per mission
- Total cuts made (player vs AI over all games)
- Number of coach interactions

### 5.3 Post-Game Review

On game over, auto-send the full game log (all actions + outcomes) to GPT-4 with the prompt: "Review this game. Identify the 2–3 most impactful decisions (good or bad) and explain what optimal play would have looked like." Display this as a scrollable review in the Game Over screen.

### 5.4 Polish Checklist

- [ ] Keyboard shortcuts (Space = confirm action, Escape = cancel selection, Tab = cycle AI tiles)
- [ ] Colorblind mode (pattern overlays instead of color alone for wire types)
- [ ] Sound effects (optional, toggle in settings): tile flip, successful cut, wrong guess, detonation
- [ ] Mobile responsive layout (coach sidebar collapses to bottom sheet on small screens)
- [ ] Attribution footer: "Inspired by Bomb Busters by Hisashi Hayashi / Pegasus Spiele"

---

## Critical Implementation Order

The dependency chain dictates this strict order:

```
types.ts → deck.ts → rules.ts → gameState.ts
                                      ↓
                              probabilityModel.ts → aiOpponent.ts
                                      ↓
                              Zustand store → React components
                                      ↓
                              coachPrompt.ts → coachApi.ts → CoachSidebar
                                      ↓
                              missionConfig.ts → MissionSelect screen
```

**Do not build UI components until the engine tests pass.** The game state machine and AI probability model are the foundation — bugs there corrupt everything above.

---

## Testing Strategy

### Engine Tests (must have before Phase 3)

```
deck.ts:
  - 48 blue tiles generated correctly (4×12)
  - Racks sorted ascending after deal
  - Info token placed correctly at start

rules.ts:
  - Guess requires player holds declared value
  - Solo cut rejected if opponent has remaining copies
  - Equipment locked before wire pair is fully cut
  - Red wire guess triggers loss immediately

gameState.ts:
  - Correct guess removes tiles from both racks
  - Wrong guess advances detonation tracker
  - Win condition triggers when all non-red tiles are cut
  - Detonation at zero triggers loss before action completes

probabilityModel.ts:
  - Sort constraint propagation: if position 3 = 5, positions 1-2 constrained to 1-4
  - Frequency constraint: if 4 copies of "7" are cut, no position can be 7
  - AI never guesses a value it doesn't hold
  - Solo cut detection: correct when AI holds last two copies
```

### Integration Tests

- Full game simulation: play 100 random games at each difficulty, verify no crashes and correct win/loss detection
- Coach serialization: verify game state JSON matches schema exactly
- Equipment unlock: verify equipment becomes available only after correct wire pair is cut

---

## Open Questions / Risks

1. **Competitive balance:** Does the "more cuts wins" scoring actually create interesting decisions? Could add a "time bonus" for surviving longer with fewer errors to reward risk management over aggressive play.

2. **Red wire frequency:** The PRD says red wires cause instant loss on wrong guess. With multiple red wires in later missions, what probability threshold should the AI use to avoid them? Needs playtesting to tune.

3. **Character Cards:** The PRD defers character cards to later missions but doesn't fully specify their abilities. These need design before Phase 1 types are finalized, otherwise the type system will need a breaking change.

4. **GPT-4 latency:** The target is <3 seconds. `gpt-4o` (not `gpt-4-turbo`) is the better choice — it's faster, cheaper, and as capable for this task. Worth switching the PRD's spec.

5. **Offline mode:** If the user has no API key or loses connectivity, the coach should gracefully degrade to pre-written tips keyed on game state patterns (solo cut available, detonator < 2, etc.).
