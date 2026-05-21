import type { GameState } from '../../engine/types';

interface Props {
  state: GameState;
}

export function CutHistory({ state }: Props) {
  const valueStatus: Record<number, { copiesCut: number }> = {};
  for (const t of state.playerRack.tiles) {
    if (t.cut && t.color === 'blue') {
      valueStatus[t.value] = { copiesCut: (valueStatus[t.value]?.copiesCut ?? 0) + 1 };
    }
  }
  for (const t of state.aiRack.tiles) {
    if (t.cut && t.color === 'blue') {
      valueStatus[t.value] = { copiesCut: (valueStatus[t.value]?.copiesCut ?? 0) + 1 };
    }
  }

  return (
    <div className="bg-bomb-panel rounded-xl p-4 shadow-lg">
      <div className="text-sm uppercase tracking-wide text-slate-400 mb-2">Wire Status</div>
      <div className="grid grid-cols-12 gap-1 text-center">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(v => {
          const status = valueStatus[v];
          const fully = status?.copiesCut === 4;
          const partial = (status?.copiesCut ?? 0) > 0 && !fully;
          return (
            <div
              key={v}
              className={`rounded p-1 text-xs ${fully ? 'bg-green-700' : partial ? 'bg-yellow-700' : 'bg-slate-700'}`}
            >
              <div className="font-bold">{v}</div>
              <div className="text-[10px]">{status?.copiesCut ?? 0}/4</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-slate-400">
        Score — You: <span className="text-white font-bold">{state.playerScore}</span> · AI: <span className="text-white font-bold">{state.aiScore}</span>
      </div>
    </div>
  );
}
