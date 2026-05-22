import type { GameState } from '../../engine/types';
import { Tooltip } from '../ui/Tooltip';
import { clsx } from '../../lib/clsx';

interface Props {
  state: GameState;
}

const TOTAL_COPIES = 4;

export function CutHistory({ state }: Props) {
  const cutByValue: Record<number, number> = {};
  for (const t of state.playerRack.tiles) {
    if (t.cut && t.color === 'blue') {
      cutByValue[t.value] = (cutByValue[t.value] ?? 0) + 1;
    }
  }
  for (const t of state.aiRack.tiles) {
    if (t.cut && t.color === 'blue') {
      cutByValue[t.value] = (cutByValue[t.value] ?? 0) + 1;
    }
  }

  const holdsByValuePlayer: Set<number> = new Set(
    state.playerRack.tiles.filter(t => !t.cut && t.color === 'blue').map(t => t.value)
  );

  return (
    <div className="bg-gradient-to-b from-bomb-panel to-slate-900 rounded-xl p-4 shadow-xl border border-slate-700/50">
      <div className="text-sm uppercase tracking-wide text-slate-400 mb-3 flex justify-between items-center">
        <Tooltip
          position="bottom"
          content={
            <span>
              4 copies of each number 1–12 exist. Track which are cut to deduce what's still in play.
              Numbers you hold are marked with a dot below.
            </span>
          }
        >
          <span className="cursor-help underline decoration-dotted underline-offset-2">Wire Status</span>
        </Tooltip>
        <span className="text-xs text-slate-500">cut / 4</span>
      </div>

      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(v => {
          const cut = cutByValue[v] ?? 0;
          const fully = cut === TOTAL_COPIES;
          const holds = holdsByValuePlayer.has(v);
          return (
            <Tooltip
              key={v}
              position="top"
              width="narrow"
              content={
                <span>
                  <strong>{v}</strong>: {cut}/{TOTAL_COPIES} cut.
                  {holds && ' You hold a copy.'}
                  {fully && ' All copies are out of play.'}
                </span>
              }
            >
              <div
                className={clsx(
                  'rounded-md p-1.5 transition w-full',
                  fully ? 'bg-green-700/30 border border-green-700/50' : 'bg-slate-800/60 border border-slate-700/40',
                  holds && !fully && 'ring-1 ring-bomb-accent/60'
                )}
              >
                <div className={clsx('text-center font-bold text-sm', fully && 'line-through text-slate-500')}>{v}</div>
                <div className="flex gap-0.5 justify-center mt-1">
                  {Array.from({ length: TOTAL_COPIES }, (_, i) => (
                    <span
                      key={i}
                      className={clsx(
                        'w-1.5 h-3 rounded-sm transition',
                        i < cut ? 'bg-slate-700' : 'bg-wire-blue shadow-sm shadow-blue-500/40'
                      )}
                    />
                  ))}
                </div>
                {holds && (
                  <div className="text-center mt-0.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-bomb-accent" />
                  </div>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
