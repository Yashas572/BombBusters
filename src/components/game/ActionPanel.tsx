import { useGameStore } from '../../store/gameStore';
import { hasGuaranteedSoloCut } from '../../engine/rules';

export function ActionPanel() {
  const gameState = useGameStore(s => s.gameState);
  const selectedTargetId = useGameStore(s => s.selectedTargetId);
  const selectedDeclaredValue = useGameStore(s => s.selectedDeclaredValue);
  const selectDeclaredValue = useGameStore(s => s.selectDeclaredValue);
  const submitGuess = useGameStore(s => s.submitGuess);
  const submitSoloCut = useGameStore(s => s.submitSoloCut);
  const aiThinking = useGameStore(s => s.aiThinking);

  if (!gameState) return null;
  const isPlayerTurn = gameState.currentTurn === 'player' && gameState.phase === 'playing';
  const heldValues = Array.from(new Set(gameState.playerRack.tiles.filter(t => !t.cut).map(t => t.value))).sort((a, b) => a - b);

  const soloCut = hasGuaranteedSoloCut(gameState, 'player');

  return (
    <div className="bg-bomb-panel rounded-xl p-4 shadow-lg">
      <div className="text-sm uppercase tracking-wide text-slate-400 mb-2">
        {aiThinking ? 'AI is thinking...' : isPlayerTurn ? 'Your turn' : 'Opponent turn'}
      </div>

      {soloCut && isPlayerTurn && (
        <div className="mb-3 p-2 bg-green-900/30 border border-green-700 rounded">
          <div className="text-sm text-green-300 mb-1">Solo cut available for value {soloCut.value}!</div>
          <button
            className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm font-bold"
            onClick={() => submitSoloCut([soloCut.tiles[0].id, soloCut.tiles[1].id])}
          >
            Take solo cut
          </button>
          <div className="text-xs text-yellow-300 mt-1">⚠ Skip and lose a point.</div>
        </div>
      )}

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-1">Selected target</div>
        <div className="text-sm">{selectedTargetId ? `Tile selected on AI rack` : 'Click a tile on the AI rack'}</div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-1">Declare value (must hold)</div>
        <div className="flex gap-1 flex-wrap">
          {heldValues.map(v => (
            <button
              key={v}
              onClick={() => selectDeclaredValue(v)}
              className={`w-10 h-10 rounded font-bold ${
                selectedDeclaredValue === v ? 'bg-bomb-accent text-white' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!isPlayerTurn || !selectedTargetId || selectedDeclaredValue === null || aiThinking}
        className="w-full bg-wire-red hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-2 rounded font-bold uppercase tracking-wide"
        onClick={submitGuess}
      >
        Cut Wire
      </button>
    </div>
  );
}
