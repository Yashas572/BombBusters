import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Rack } from '../game/Rack';
import { DetonationTracker } from '../game/DetonationTracker';
import { CutHistory } from '../game/CutHistory';
import { EquipmentPanel } from '../game/EquipmentPanel';
import { ActionPanel } from '../game/ActionPanel';
import { CoachSidebar } from '../coach/CoachSidebar';
import { RedWireFlash } from '../game/RedWireFlash';
import { TutorialOverlay } from '../game/TutorialOverlay';

export function GameScreen() {
  const gameState = useGameStore(s => s.gameState);
  const selectedTargetId = useGameStore(s => s.selectedTargetId);
  const highlightedTileIds = useGameStore(s => s.highlightedTileIds);
  const selectTarget = useGameStore(s => s.selectTarget);
  const exitToMenu = useGameStore(s => s.exitToMenu);
  const runAiTurn = useGameStore(s => s.runAiTurn);

  useEffect(() => {
    if (gameState?.phase === 'playing' && gameState.currentTurn === 'ai') {
      runAiTurn();
    }
  }, [gameState?.currentTurn, gameState?.phase, runAiTurn]);

  if (!gameState) return null;

  const turnLabel = gameState.currentTurn === 'player' ? 'YOUR TURN' : 'OPPONENT TURN';
  const turnColor = gameState.currentTurn === 'player' ? 'text-bomb-accent' : 'text-slate-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-bomb-bg to-slate-950 text-slate-100">
      <RedWireFlash />
      <TutorialOverlay />

      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={exitToMenu}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-bomb-accent transition"
          >
            <span>←</span> Main Menu
          </button>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-xs uppercase tracking-wider font-bold ${turnColor}`}>{turnLabel}</div>
              <div className="text-xs text-slate-500">Mission {gameState.missionId} · {gameState.difficulty}</div>
            </div>
            <div className="flex gap-4 items-center">
              <ScoreBlob label="YOU" score={gameState.playerScore} active={gameState.currentTurn === 'player'} accent />
              <ScoreBlob label="AI" score={gameState.aiScore} active={gameState.currentTurn === 'ai'} />
            </div>
          </div>
        </div>
      </header>

      {/* Main board grid */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-12 gap-6 max-w-[1800px] mx-auto">
          {/* Left rail: equipment + actions */}
          <aside className="col-span-12 lg:col-span-3 space-y-4" data-tutorial-zone="action-panel">
            <EquipmentPanel equipment={gameState.equipment} />
            <ActionPanel />
          </aside>

          {/* Center: board */}
          <main className="col-span-12 lg:col-span-6 space-y-4">
            <div data-tutorial-zone="ai-rack">
              <Rack
                rack={gameState.aiRack}
                hidden
                label="AI Opponent's Rack"
                selectedTargetId={selectedTargetId}
                highlightedTileIds={highlightedTileIds}
                onTileClick={id => selectTarget(selectedTargetId === id ? null : id)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-tutorial-zone="tracker">
                <DetonationTracker state={gameState} />
              </div>
              <div data-tutorial-zone="wire-status">
                <CutHistory state={gameState} />
              </div>
            </div>
            <div data-tutorial-zone="player-rack">
              <Rack
                rack={gameState.playerRack}
                hidden={false}
                label="Your Rack"
                selectedTargetId={null}
                highlightedTileIds={highlightedTileIds}
              />
            </div>
          </main>

          {/* Right rail: coach */}
          <aside className="col-span-12 lg:col-span-3" data-tutorial-zone="coach">
            <CoachSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ScoreBlob({ label, score, active, accent }: { label: string; score: number; active: boolean; accent?: boolean }) {
  const ring = active
    ? accent
      ? 'ring-2 ring-bomb-accent shadow-lg shadow-bomb-accent/30'
      : 'ring-2 ring-slate-500'
    : '';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 ${ring}`}>
      <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-xl font-black">{score}</span>
    </div>
  );
}
