import type { Rack as RackType } from '../../engine/types';
import { Tile } from './Tile';

interface Props {
  rack: RackType;
  hidden: boolean;
  label: string;
  selectedTargetId: string | null;
  highlightedTileIds: string[];
  onTileClick?: (tileId: string) => void;
}

export function Rack({ rack, hidden, label, selectedTargetId, highlightedTileIds, onTileClick }: Props) {
  let activeIdx = 0;
  const activeCount = rack.tiles.filter(t => !t.cut).length;

  return (
    <div className="bg-gradient-to-b from-bomb-panel to-slate-900 rounded-xl p-4 shadow-xl border border-slate-700/50">
      <div className="text-sm uppercase tracking-wide text-slate-400 mb-2 flex justify-between">
        <span>{label}</span>
        <span className="text-xs text-slate-500">{activeCount} wires</span>
      </div>
      <div className="flex gap-2 flex-wrap items-center min-h-[6rem]">
        {rack.tiles.map(tile => {
          const position = tile.cut ? undefined : activeIdx++;
          return (
            <Tile
              key={tile.id}
              tile={tile}
              hidden={hidden}
              position={position}
              selected={selectedTargetId === tile.id}
              highlighted={highlightedTileIds.includes(tile.id)}
              onClick={onTileClick && !tile.cut ? () => onTileClick(tile.id) : undefined}
            />
          );
        })}
        {activeCount === 0 && <span className="text-slate-500 italic">No active wires</span>}
      </div>
    </div>
  );
}
