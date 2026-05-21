import { useGameStore } from '../../store/gameStore';

export function GameOver() {
  const gameState = useGameStore(s => s.gameState);
  const exitToMenu = useGameStore(s => s.exitToMenu);

  if (!gameState) return null;

  const outcomeLabel: Record<NonNullable<typeof gameState.outcome>, string> = {
    win_player: 'Bomb defused. You out-cut the AI.',
    win_ai: 'Bomb defused. The AI scored more cuts.',
    win_draw: 'Bomb defused. Tied on cuts.',
    loss_detonation: 'BOOM! The detonation tracker ran out.',
    loss_redwire: 'BOOM! A red wire was cut.',
  };

  const isWin = gameState.outcome === 'win_player';
  const subtitleColor = isWin ? 'text-green-400' : 'text-red-400';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bomb-bg">
      <div className="bg-bomb-panel rounded-2xl p-8 max-w-md text-center space-y-4">
        <h1 className={`text-4xl font-bold ${subtitleColor}`}>
          {isWin ? 'Victory' : 'Game Over'}
        </h1>
        <p className="text-slate-300">{gameState.outcome ? outcomeLabel[gameState.outcome] : ''}</p>
        <div className="grid grid-cols-2 gap-4 text-center my-6">
          <div>
            <div className="text-xs uppercase text-slate-400">You</div>
            <div className="text-3xl font-bold">{gameState.playerScore}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">AI</div>
            <div className="text-3xl font-bold">{gameState.aiScore}</div>
          </div>
        </div>
        <button
          onClick={exitToMenu}
          className="w-full bg-bomb-accent hover:opacity-80 text-white font-bold py-3 rounded-xl"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
