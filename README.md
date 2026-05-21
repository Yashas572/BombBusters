# Bomb Busters Digital Edition

A web-based adaptation of **Bomb Busters** by Hisashi Hayashi (Spiel des Jahres 2025), playable solo against an AI opponent with an integrated GPT-4 coaching assistant.

> *Inspired by the physical board game by Hisashi Hayashi / Pegasus Spiele. This is a personal fan project — not affiliated with or endorsed by the publisher.*

---

## What Is This?

Bomb Busters is a cooperative deduction game where players cut wires in ascending order — but you can only see your own rack, not your partner's. This digital edition adapts it into a **1v1 competitive format**: you and an AI opponent are both defusing the same bomb, racing to make more correct cuts while sharing the consequences of every mistake.

An AI coach powered by GPT-4 watches the board and answers your questions — explaining what the AI opponent likely deduced, warning you about dangerous guesses, or just suggesting the best move when you're stuck.

---

## How to Play

### The Setup

Each player gets a rack of wire tiles sorted in ascending order (lowest to highest). You can see all of your own tiles. Your opponent's tiles are face-down — you can only see their positions, not their values.

At the start of the game, each player reveals one tile from their own rack as a shared hint.

### Your Turn

On each turn you must do exactly one of:

**1. Cut a Wire (Standard Guess)**
- Point to a specific position on your opponent's rack
- Declare a number you think it is — you must hold that same number yourself
- If correct: both matching tiles are removed. You score a point.
- If wrong (blue/yellow tile): the detonation tracker advances by 1, and the tile's true value is revealed as an info token
- If wrong (red tile): **instant loss** — the bomb explodes

**2. Solo Cut**
If both remaining copies of a number are in your own rack (your opponent already cut the other two), you can reveal and remove both safely — no guessing required.

**3. Use Equipment**
Spend a shared equipment card for a special ability. Equipment unlocks once the corresponding wire number pair is fully cut.

### Winning

The player with the most successful cuts when all wires are defused wins. If the detonation tracker hits zero — or anyone guesses a red wire — the bomb explodes and both players lose.

### Key Deduction Tricks

- **Sorted order** is your main tool. If you know a tile at position 3 is a 5, everything to its left must be 1–4.
- **Track frequencies.** There are 4 copies of each number. When you see copies get cut, the remaining possibilities shrink.
- **Info tokens from wrong guesses** benefit everyone — a mistake that reveals a 7 at position 4 tells you a lot about both racks.
- **Yellow tiles** have decimal values (e.g., 5.5) and slot between integers. They add uncertainty.
- **Red tiles** also have decimal values. They sit invisibly between known values — danger zones.

---

## Equipment Cards

| Card | Effect |
|---|---|
| Double Detector | Point to two tiles instead of one. If either matches, it's a successful cut. |
| Freeze | Pause the detonation tracker for one wrong guess. |
| Scanner | Reveal a tile's value without attempting a cut. |

Equipment unlocks only after the corresponding wire number pair is fully cut.

---

## AI Opponent

The opponent AI uses a local probability engine — no API calls, no latency. It maintains a belief distribution over your rack using:
- The sorted-order constraint
- Frequency tracking (how many copies of each number remain)
- All revealed info tokens and cut history

### Difficulty Levels

| Level | Style | Target Win Rate |
|---|---|---|
| Easy | Makes occasional suboptimal guesses, delays equipment use | ~70% player wins |
| Medium | Solid probability-based play, good equipment timing | ~50% player wins |
| Hard | Optimal deduction, aggressive info exploitation, perfect equipment timing | ~30% player wins |

---

## AI Coach (GPT-4)

A collapsible sidebar gives you access to a GPT-4 powered coach during gameplay. It has full knowledge of the rules and the current game state.

### Quick Actions

- **Best Move** — Hints at the optimal action, then offers to reveal the full recommendation
- **Explain Last Turn** — Breaks down what the AI opponent just did and what it tells you
- **Any Tips?** — General strategic observations about the current board
- **Risk Check** — Select a tile, ask how risky a specific guess is

### Spoiler Protection

By default the coach gives strategic hints without spelling out the exact move. Hit **Show Me** to reveal the full recommendation.

### API Key

The coach requires your own OpenAI API key. It is stored in your browser's localStorage and sent only to OpenAI — never to any other server.

Configure it in **Settings → AI Coach → API Key**.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key (for the coach — optional, game is fully playable without it)

### Install & Run

```bash
git clone <this-repo>
cd bomb-busters
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## Missions

The game includes 66 missions modeled on the board game's progression:

| Tier | Missions | What Changes |
|---|---|---|
| Training | 1–8 | Mechanics introduced one at a time |
| Standard | 9–30 | Full ruleset, increasing rack size, fewer error margins |
| Advanced | 31–50 | Special rules per mission (cut order constraints, timed pressure, reorganization) |
| Expert | 51–66 | Multiple red wires, restricted equipment, tight detonation limits |

You can also create a **Custom Game** with any combination of tile counts, error limits, and equipment.

---

## Project Structure

```
src/
├── engine/        # Pure TypeScript game logic (no React)
│   ├── ai/        # Probability model + AI decision engine
│   └── missions/  # Mission configs
├── store/         # Zustand state management
├── coach/         # GPT-4 integration + caching
└── components/
    ├── game/      # Board, racks, tiles, tracker
    ├── coach/     # Sidebar, chat bubbles, quick actions
    └── screens/   # Menu, mission select, game over, settings
```

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full technical design.

---

## Tech Stack

- **React 18 + TypeScript** — UI
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **Vite** — Build tooling
- **Vitest** — Testing
- **OpenAI API (`gpt-4o`)** — AI coach
- **Vercel** — Deployment

---

## Development Status

- [ ] Phase 1: Core game engine + basic UI
- [ ] Phase 2: AI opponent (probability model + difficulty levels)
- [ ] Phase 3: Full game UI + animations
- [ ] Phase 4: GPT-4 coach integration
- [ ] Phase 5: 66 missions + progression + post-game review

---

## Attribution

This is a personal fan project. The original **Bomb Busters** board game was designed by **Hisashi Hayashi** and published by **Pegasus Spiele** (Spiel des Jahres 2025 winner). No official artwork is used. Support the designers — buy the real game.
