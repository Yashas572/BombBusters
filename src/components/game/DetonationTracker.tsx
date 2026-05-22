import { useEffect, useState } from 'react';
import type { GameState } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { clsx } from '../../lib/clsx';
import { Tooltip } from '../ui/Tooltip';

interface Props {
  state: GameState;
}

export function DetonationTracker({ state }: Props) {
  const lastEvents = useGameStore(s => s.lastEvents);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (lastEvents.some(e => e.type === 'DETONATION_ADVANCED')) {
      setShake(true);
      const id = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(id);
    }
  }, [lastEvents]);

  const { current, max } = state.detonationTracker;
  const segments = Array.from({ length: max }, (_, i) => i < current);
  const danger = current <= 1;

  return (
    <div className={clsx(
      'bg-gradient-to-b from-bomb-panel to-slate-900 rounded-xl p-4 shadow-xl border',
      danger ? 'border-wire-red/60 animate-pulse-slow' : 'border-slate-700/50',
      shake && 'animate-shake'
    )}>
      <div className="text-sm uppercase tracking-wide text-slate-400 mb-2 flex justify-between">
        <Tooltip
          position="bottom"
          content={
            <span>
              Each wrong guess uses one segment. If all are spent, the bomb explodes and both players lose. Drops to red below 2.
            </span>
          }
        >
          <span className="cursor-help underline decoration-dotted underline-offset-2">Detonation Tracker</span>
        </Tooltip>
        <span className={clsx('font-bold', danger && 'text-wire-red')}>{current}/{max}</span>
      </div>
      <div className="flex gap-2 items-center">
        {segments.map((alive, i) => (
          <div
            key={i}
            className={clsx(
              'w-8 h-8 rounded-full border-2 transition-all duration-300',
              alive
                ? 'bg-wire-red border-wire-red shadow-lg shadow-red-500/50'
                : 'border-slate-700 bg-slate-800'
            )}
          />
        ))}
      </div>
      {state.freezeActive && (
        <div className="mt-2 text-xs text-cyan-400 animate-fade-in">
          Freeze active — next wrong guess won't advance the tracker
        </div>
      )}
    </div>
  );
}
