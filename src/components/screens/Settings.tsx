import { useState } from 'react';
import { useSettings } from '../../store/settingsStore';
import { useGameStore } from '../../store/gameStore';
import type { Difficulty } from '../../engine/types';

export function Settings() {
  const setScreen = useGameStore(s => s.setScreen);
  const difficulty = useSettings(s => s.difficulty);
  const setDifficulty = useSettings(s => s.setDifficulty);
  const openAiApiKey = useSettings(s => s.openAiApiKey);
  const setApiKey = useSettings(s => s.setApiKey);
  const coachEnabled = useSettings(s => s.coachEnabled);
  const setCoachEnabled = useSettings(s => s.setCoachEnabled);

  const [keyDraft, setKeyDraft] = useState(openAiApiKey);

  return (
    <div className="min-h-screen bg-bomb-bg p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('menu')} className="text-sm text-slate-400 hover:text-white mb-4">
          ← Main Menu
        </button>
        <h2 className="text-3xl font-bold mb-6">Settings</h2>

        <section className="bg-bomb-panel rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-3">Gameplay</h3>
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Default Difficulty</div>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 rounded text-sm capitalize ${
                    difficulty === d ? 'bg-bomb-accent text-white' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-bomb-panel rounded-xl p-6">
          <h3 className="text-lg font-bold mb-3">AI Coach</h3>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={coachEnabled}
              onChange={e => setCoachEnabled(e.target.checked)}
              className="accent-bomb-accent"
            />
            <span className="text-sm">Enable coach sidebar in-game</span>
          </label>
          <div className="mb-2">
            <label className="block text-sm text-slate-400 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onBlur={() => setApiKey(keyDraft)}
              placeholder="sk-..."
              className="w-full bg-slate-800 text-white px-3 py-2 rounded font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Stored in your browser's localStorage. Sent only to OpenAI — never to any other server.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
