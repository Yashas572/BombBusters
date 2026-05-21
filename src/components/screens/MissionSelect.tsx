import { useGameStore } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { TRAINING_MISSIONS } from '../../engine/missions/missions';
import type { Difficulty, MissionConfig } from '../../engine/types';

export function MissionSelect() {
  const startMission = useGameStore(s => s.startMission);
  const setScreen = useGameStore(s => s.setScreen);
  const difficulty = useSettings(s => s.difficulty);
  const setDifficulty = useSettings(s => s.setDifficulty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-bomb-bg to-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => setScreen('menu')} className="text-sm text-slate-400 hover:text-bomb-accent transition">
            ← Main Menu
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Difficulty:</span>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 rounded text-sm capitalize font-semibold transition ${
                  difficulty === d
                    ? 'bg-bomb-accent text-white shadow-lg shadow-bomb-accent/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-bomb-accent mb-2">Select Mission</div>
          <h2 className="text-4xl font-black tracking-tight">Pick Your Mission</h2>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Each mission introduces one new mechanic. Start with Mission 1 if you've never played; experienced players can jump ahead.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRAINING_MISSIONS.map(m => (
            <MissionCard key={m.id} mission={m} onStart={() => startMission(m, difficulty)} />
          ))}
        </div>

        <div className="mt-12 text-center text-xs text-slate-500">
          Advanced missions (9–66) coming soon.
        </div>
      </div>
    </div>
  );
}

function MissionCard({ mission, onStart }: { mission: MissionConfig; onStart: () => void }) {
  const hasYellow = mission.yellowTileCount > 0;
  const hasRed = mission.redTileCount > 0;

  return (
    <button
      onClick={onStart}
      className="text-left bg-bomb-panel/60 backdrop-blur hover:bg-bomb-panel rounded-2xl p-5 border border-slate-700/50 hover:border-bomb-accent/50 transition group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl font-black text-slate-500 group-hover:text-bomb-accent transition">
          {String(mission.id).padStart(2, '0')}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: mission.tilesPerPlayer }, (_, i) => (
            <div
              key={i}
              className="w-1.5 h-3 rounded-sm bg-wire-blue/60"
              style={{ opacity: 0.4 + (i / mission.tilesPerPlayer) * 0.6 }}
            />
          ))}
        </div>
      </div>

      <div className="font-bold text-base mb-1">{mission.name.replace(/^Mission \d+: /, '')}</div>

      <div className="text-xs text-slate-400 mb-3">
        {mission.tilesPerPlayer} tiles · detonator {mission.detonationLimit}
      </div>

      <div className="flex flex-wrap gap-1 text-[10px]">
        <Pill color="blue">{mission.tilesPerPlayer * 2 - (mission.yellowTileCount + mission.redTileCount) * 2} blue</Pill>
        {hasYellow && <Pill color="yellow">{mission.yellowTileCount * 2} yellow</Pill>}
        {hasRed && <Pill color="red">{mission.redTileCount * 2} red</Pill>}
        {mission.equipmentPool.map(eq => (
          <Pill key={eq} color="slate">{eq.replace('_', ' ')}</Pill>
        ))}
      </div>
    </button>
  );
}

function Pill({ color, children }: { color: 'blue' | 'yellow' | 'red' | 'slate'; children: React.ReactNode }) {
  const bg = {
    blue: 'bg-wire-blue/20 text-blue-300 border-wire-blue/40',
    yellow: 'bg-wire-yellow/20 text-yellow-300 border-wire-yellow/40',
    red: 'bg-wire-red/20 text-red-300 border-wire-red/40',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600',
  }[color];
  return (
    <span className={`px-2 py-0.5 rounded border ${bg} uppercase tracking-wide`}>{children}</span>
  );
}
