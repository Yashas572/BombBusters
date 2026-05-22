# AI Opponent Bias Analysis

This is an honest audit of how the AI opponent actually plays vs. how it *should* play. Running ~1000 simulated games across difficulties and missions exposed five real biases — some are bugs, some are inherent to the algorithm, all are worth knowing about before tuning balance.

**Methodology:** [tests/analysis/biasAnalysis.test.ts](tests/analysis/biasAnalysis.test.ts) simulates 200 games per difficulty/mission combination using a greedy auto-player against the real AI. After every AI action it records: target position, declared value, success, and first-move tendencies. Reproduce with `npx vitest run tests/analysis/biasAnalysis.test.ts`.

---

## Findings at a glance

| Bias | Severity | Type |
|---|---|---|
| 1. First-move always targets position 0 | High | Implementation bug |
| 2. Low values declared 2–3× more than high values | Medium | Algorithmic side-effect |
| 3. Easy / Medium / Hard nearly identical in practice | High | Algorithmic side-effect |
| 4. Equipment never used by the AI in 200+ games | High | Missing logic (timing) |
| 5. Detonator-loss rate is ~95% in short missions | Medium | Player calibration, not AI |

---

## 1. First-move position bias — **100% target position 0**

**Observed:**

| Difficulty | First-move targets position 0 |
|---|---|
| Easy | 97.0% |
| Medium | **100.0%** |
| Hard | **100.0%** |

That's not a soft preference. On Medium and Hard, across 200 games each, the AI's *first* guess hit position 0 of the player's rack **every single time**.

**Root cause:** [src/engine/ai/probabilityModel.ts](src/engine/ai/probabilityModel.ts).

On turn 1, the only known information is the starting info token (typically at position 5). Sort-order constraints give *every* unknown position 0–4 the same value range and therefore identical probability distributions. `bestGuessCandidates` then sorts by probability — but since all candidates tie, JavaScript's stable sort preserves insertion order. The outer loop is positions, the inner loop is values; position 0 is iterated first, so position 0 always wins the tie.

```typescript
// bestGuessCandidates — current behavior
for (const pos of belief.positions) {           // iterates 0, 1, 2, ...
  for (const value of heldValues) { ... }       // ties broken by iteration order
}
candidates.sort((a, b) => b.probability - a.probability);  // stable sort = ties broken by insertion
```

A human opponent watching even 10 games would learn: "the AI always opens at my position 0." That's exploitable — defenders can mentally pre-bake a deduction trap there.

**Fix:** add a random tiebreaker when probabilities are equal, *or* break ties on a meaningful heuristic (e.g. position with the tightest bounds = highest info-value if correct). One line of code.

```typescript
candidates.sort((a, b) => {
  if (Math.abs(a.probability - b.probability) < 0.001) return rng.next() - 0.5;
  return b.probability - a.probability;
});
```

---

## 2. Low-value declaration bias

**Observed (Mission 1 Medium, all-blue):**

| Value declared | First-move % | Overall % |
|---|---|---|
| 1 | 26.6% | 15.0% |
| 2 | 16.6% | 11.9% |
| 3 | 15.6% | 15.0% |
| 4–6 | 8–11% each | 10–11% each |
| 7–8 | 4–5% | 6–7% |
| 9–12 | 0.5–5% | 2–4% |

Values 1–3 together account for **~58% of first-move declarations**. Values 10–12 account for **~3%**.

**Root cause:** Two compounding factors.

1. The AI's `heldValues` set is built from the AI's sorted rack and iterated in insertion order — lowest values come first.
2. When ties occur (very common on turn 1), the same insertion-order tiebreaker that picks position 0 also picks the *lowest value the AI holds*.

There's also a real reason low values can be more probable at low positions (a 1 has zero lower-bound constraint, a 12 has zero upper-bound), but the magnitude here is dominated by the tiebreaker artifact, not by genuine probabilistic reasoning.

**Why it matters:** an attentive player learns "AI opens with a 1, 2, or 3 — almost never a 9+" and can place their high tiles at low positions to bait wrong guesses.

**Fix:** same tiebreaker fix as #1. If the AI shuffles which value it declares when probabilities are equal, the distribution becomes a uniform sample of the AI's held values.

---

## 3. Difficulty barely affects play in short missions

**Observed — Mission 1, 200 games each:**

| Metric | Easy | Medium | Hard |
|---|---|---|---|
| Avg AI score | 1.53 | 1.57 | 1.57 |
| Avg AI accuracy | 12.2% | 13.9% | 13.9% |
| Detonation losses | 189 | 190 | 190 |
| First-move targets pos 0 | 97% | 100% | 100% |

Medium and Hard produce **literally identical** aggregate numbers. Easy moves the needle by 1–3% — within noise.

**Root cause:**

- **Easy's 25% randomization** triggers only when `ranked.length > 1`. When the model has one clear top candidate (very common), Easy plays optimally.
- **Hard's extras** are: aggressive solo-cut preemption (which Medium already does) and defensive Freeze (which never fires because Freeze is never unlocked in short games — see bias #4).

So Hard's "extras" require equipment, equipment requires depth, depth doesn't happen in Mission 1.

**Why it matters:** the difficulty selector is a UX promise the game doesn't keep. New players who pick Easy aren't getting a meaningfully easier opponent.

**Fix options:**
- **Easy:** widen the randomization (raise from 25% → 50%, and apply even to single-candidate situations by passing on the guess and using equipment / waiting). Also delay solo cuts on Easy (humans miss them).
- **Hard:** add hard-only behaviors that don't depend on equipment — e.g. metagame inference: track which values the player has declared (revealing they hold those values).

---

## 4. Equipment is never used by the AI

**Observed:** 0.00 equipment activations per game on Mission 3 (Double Detector available) across 200 games.

**Root cause:** Equipment unlocks when all 4 copies of the corresponding number have been cut. Mission 3 has 8 tiles per player = 16 tiles total. Average game length is 7 turns. The probability of all 4 copies of any single number being cut in 7 turns is low; the AI's equipment logic in [aiOpponent.ts](src/engine/ai/aiOpponent.ts) never gets a chance to run.

**Why it matters:** Hard difficulty's whole "perfect equipment timing" promise depends on equipment unlocking, which doesn't happen in practice in early missions.

**Fix:**
- Lower the unlock bar (3 of 4 copies cut, instead of all 4), at least for training missions.
- Or grant one piece of equipment unlocked at the start in early missions.
- Or extend missions so equipment is actually reachable.

---

## 5. ~95% detonator-loss rate

**Observed:**

| Mission | Outcome |
|---|---|
| Mission 1 (all blue) | 95% loss_detonation |
| Mission 3 (with equipment) | 98% loss_detonation |
| Mission 7 (red wires) | 69% loss_detonation, 31% loss_redwire |

Almost nobody wins. Both player and AI lose to the same bomb.

**Caveat — this isn't purely an AI bias.** The auto-player in the simulation is greedy and bad (always picks the first valid value, doesn't run the same probability model). It's deliberately weak to keep the test scenario simple. Real human play would be better.

But the AI also doesn't compensate. When the AI sees its partner-opponent burning the detonator, it doesn't get more cautious. The expected-value formula in `expectedValueOfGuess` does weight the detonator-remaining, but only when it's already at 1–2. By then, the bomb is usually one wrong guess from blowing.

**Why it matters:** if your goal is "fun back-and-forth games that sometimes end in defusal," current balance produces "everyone dies, mostly." Especially noticeable on Mission 1.

**Fix:**
- Increase the detonator weight earlier (start at detonator = 3, not 1)
- Or relax Mission 1's detonator limit from 5 to 7 to give learners room
- Or play a "cooperative variant" mode where both players' wrong guesses count separately

---

## 6. Mission 7 red-wire vulnerability — 31% instant loss

**Observed:** Mission 7 introduces 1 red wire per side. **31.5% of games end on a red-wire guess** (much worse than the 5% chance of randomly hitting any specific tile would suggest).

**Root cause:** The AI's `probabilityOfMatch` only considers blue tiles in its candidate pool. It treats red and yellow tiles as "wouldn't be possible to guess them since I don't hold their value." That's *true* — but red wires are still in positions that the AI considers as candidates for *blue* values, and the AI doesn't downweight those positions for danger.

Look at the expected-value formula:

```typescript
const redRisk = unknownTilesRemaining > 0 ? redWiresInPlay / unknownTilesRemaining : 0;
const failureCost = 1 + redRisk * 100;
```

This *should* deter risky guesses. But in early Mission 7, with many unknown tiles, `redRisk` is small (1/12 = 0.08 → `failureCost = 1 + 8 = 9`). Combined with high `successProbability` for a top candidate, the AI still guesses and frequently hits the red wire.

**Fix:** raise the multiplier from 100 to something like 500, or apply a hard cutoff: "never guess if red-wire probability at the target position is > 10%."

---

## Recommended fix order

If I had to ship balance changes tomorrow, I'd do them in this priority:

1. **Tiebreaker randomization** (5 min) — fixes biases #1 and #2 simultaneously, makes AI feel less robotic.
2. **Boost red-wire avoidance** (10 min) — Mission 7+ becomes playable instead of insta-death.
3. **Wider Easy randomization + delayed solo cuts** (30 min) — actually deliver on "Easy" being easier.
4. **Lower equipment unlock to 3-of-4 copies** (30 min) — equipment becomes a real part of training missions.
5. **Detonator weight earlier** (1 hr) — fewer mutual annihilations, more defusal endings.

These are 5 small commits that would substantially change how the game *feels* without touching the engine architecture.

---

## What this analysis does NOT cover

Things I'd want to investigate next but didn't have time for:

- **Adversarial play** — what happens when the test-player is actually a copy of the AI? Self-play tells us if the bot is meta-stable or has dominant strategies.
- **Coach quality** — does the GPT-4 coach actually give optimal advice? Can be measured by simulating games where the player follows the coach's `Move:` recommendations.
- **Information-token impact** — how much does the starting info token matter? Run with and without and compare.
- **Race-condition under freeze** — does Freeze actually save a wrong guess in practice? Currently it's just a flag flip.
- **End-game decision quality** — does the AI play differently when 1 detonator segment remains vs. 5? The expected-value formula says yes, but the data above shows the difficulty levels collapse to the same behavior in practice.
