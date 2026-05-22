import { useGameStore } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import type { Difficulty } from '../../engine/types';

export function MainMenu() {
  const setScreen = useGameStore(s => s.setScreen);
  const startTutorial = useGameStore(s => s.startTutorial);
  const difficulty = useSettings(s => s.difficulty);
  const setDifficulty = useSettings(s => s.setDifficulty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-bomb-bg to-slate-950 text-slate-100">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bomb-accent/10 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-wire-red/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-bomb-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-8 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-bomb-accent mb-4 animate-fade-in">
            <span className="w-8 h-px bg-bomb-accent" />
            Digital Edition
            <span className="w-8 h-px bg-bomb-accent" />
          </div>
          <h1 className="text-7xl md:text-8xl font-black tracking-tight bg-gradient-to-br from-bomb-accent via-orange-400 to-wire-red bg-clip-text text-transparent drop-shadow-2xl mb-4">
            BOMB BUSTERS
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-2">
            A cooperative deduction game by Hisashi Hayashi, reimagined as a 1v1 duel against a probability-driven AI.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            Cut wires in ascending order. Beat the AI to the right answer. Don't blow up.
          </p>

          {/* Primary action */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Difficulty:</span>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold capitalize transition ${
                    difficulty === d
                      ? 'bg-bomb-accent text-white shadow-lg shadow-bomb-accent/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => setScreen('missionSelect')}
              className="group relative px-12 py-4 rounded-xl bg-gradient-to-r from-bomb-accent to-wire-red text-white font-black text-xl tracking-wide shadow-2xl shadow-bomb-accent/30 hover:scale-105 hover:shadow-bomb-accent/50 transition-all"
            >
              <span className="relative z-10">START NEW GAME</span>
              <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition" />
            </button>

            <div className="flex gap-4 items-center text-sm">
              <button
                onClick={startTutorial}
                className="text-bomb-coach hover:text-emerald-300 transition underline-offset-4 hover:underline font-semibold"
              >
                ▶ Play Tutorial (first time? start here)
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => setScreen('settings')}
                className="text-slate-400 hover:text-bomb-accent transition underline-offset-4 hover:underline"
              >
                Settings & API Key
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Rules section */}
      <section className="max-w-6xl mx-auto px-8 py-12">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-bomb-coach mb-2">How To Play</div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100">Three things to know</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RuleCard
            number="01"
            title="Cut Wires by Guessing"
            body="Each player has tiles sorted ascending. Point at an opponent's tile, declare a value you also hold. Right = both tiles cut + 1 point. Wrong = detonator advances and the tile's value is revealed."
            color="blue"
          />
          <RuleCard
            number="02"
            title="Deduce, Don't Gamble"
            body="There are 4 copies of each number 1–12. Position 3 can't be higher than position 4. Use sorted order + frequency counting + every revealed info token to narrow possibilities."
            color="yellow"
          />
          <RuleCard
            number="03"
            title="Survive the Bomb"
            body="Detonator hits zero = both lose. Guess a red wire = instant loss. Defuse all wires = whoever made more cuts wins. Risk vs. reward — every guess matters."
            color="red"
          />
        </div>
      </section>

      {/* Mechanics preview */}
      <section className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-bomb-panel/60 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
            <div className="text-xs uppercase tracking-wider text-bomb-accent mb-3">Special Actions</div>
            <div className="space-y-3">
              <Mechanic
                title="Solo Cut"
                desc="If you hold both remaining copies of a value (opponent cut the other two), reveal them for free — no risk, no guess."
              />
              <Mechanic
                title="Double Detector"
                desc="Point to two tiles. If either matches your declared value, it counts as a successful cut."
              />
              <Mechanic
                title="Freeze"
                desc="Pause the detonation tracker for one wrong guess — save it for a high-risk play."
              />
            </div>
          </div>

          <div className="bg-bomb-panel/60 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
            <div className="text-xs uppercase tracking-wider text-bomb-coach mb-3">Tile Types</div>
            <div className="space-y-3">
              <TilePreview color="blue" label="Blue Wire" desc="Integer 1–12, four copies each. Standard wires." />
              <TilePreview color="yellow" label="Yellow Wire" desc="Decimal values that slot between integers — adds uncertainty." />
              <TilePreview color="red" label="Red Wire" desc="Guess wrong on one of these and the bomb explodes. Instant loss." />
            </div>
          </div>
        </div>
      </section>

      {/* AI Coach pitch */}
      <section className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-gradient-to-br from-bomb-coach/15 to-bomb-coach/5 rounded-2xl p-8 border border-bomb-coach/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-bomb-coach/30 flex items-center justify-center text-2xl shrink-0">
              <span className="text-bomb-coach font-black">AI</span>
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-bomb-coach mb-1">GPT-4 Coach</div>
              <h3 className="text-xl font-bold mb-2">Stuck? Ask the coach.</h3>
              <p className="text-slate-300 text-sm mb-3">
                A GPT-4 powered side panel watches your game in real time. Ask for the best move, an explanation of the AI's last play, or general strategy tips. The coach uses pure deduction logic — no peeking at hidden tiles.
              </p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">Best Move</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">Explain Last Turn</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">Risk Check</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-8 py-8 text-center text-xs text-slate-500 border-t border-slate-800">
        Inspired by <span className="text-slate-400">Bomb Busters</span> by Hisashi Hayashi · Pegasus Spiele (Spiel des Jahres 2025). A personal fan project. No official artwork used.
      </footer>
    </div>
  );
}

function RuleCard({ number, title, body, color }: { number: string; title: string; body: string; color: 'blue' | 'yellow' | 'red' }) {
  const ringColor = {
    blue: 'border-wire-blue/40 bg-wire-blue/5',
    yellow: 'border-wire-yellow/40 bg-wire-yellow/5',
    red: 'border-wire-red/40 bg-wire-red/5',
  }[color];

  const textColor = {
    blue: 'text-wire-blue',
    yellow: 'text-wire-yellow',
    red: 'text-wire-red',
  }[color];

  return (
    <div className={`rounded-2xl p-6 border ${ringColor} backdrop-blur transition hover:scale-[1.02]`}>
      <div className={`text-5xl font-black ${textColor} mb-3 opacity-60`}>{number}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Mechanic({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-l-2 border-bomb-accent/50 pl-3">
      <div className="font-bold text-slate-100 text-sm">{title}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </div>
  );
}

function TilePreview({ color, label, desc }: { color: 'blue' | 'yellow' | 'red'; label: string; desc: string }) {
  const bg = {
    blue: 'bg-wire-blue',
    yellow: 'bg-wire-yellow text-slate-900',
    red: 'bg-wire-red',
  }[color];

  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-14 rounded-md ${bg} flex items-center justify-center font-black shadow-md shrink-0`}>
        7
      </div>
      <div>
        <div className="font-bold text-slate-100 text-sm">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
    </div>
  );
}
