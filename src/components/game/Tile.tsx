import { useEffect, useRef, useState } from 'react';
import type { Tile as TileType } from '../../engine/types';
import { clsx } from '../../lib/clsx';
import { Tooltip } from '../ui/Tooltip';

interface Props {
  tile: TileType;
  hidden?: boolean;
  position?: number;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

export function Tile({ tile, hidden, position, selected, highlighted, onClick }: Props) {
  const wasCutRef = useRef(tile.cut);
  const wasRevealedRef = useRef(tile.revealed);
  const [justCut, setJustCut] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  useEffect(() => {
    if (!wasCutRef.current && tile.cut) {
      setJustCut(true);
      const id = setTimeout(() => setJustCut(false), 400);
      wasCutRef.current = true;
      return () => clearTimeout(id);
    }
    wasCutRef.current = tile.cut;
  }, [tile.cut]);

  useEffect(() => {
    if (!wasRevealedRef.current && tile.revealed && !tile.cut) {
      setJustRevealed(true);
      const id = setTimeout(() => setJustRevealed(false), 450);
      wasRevealedRef.current = true;
      return () => clearTimeout(id);
    }
    wasRevealedRef.current = tile.revealed;
  }, [tile.revealed, tile.cut]);

  const showValue = !hidden || tile.revealed;
  const colorClass = tile.color === 'blue'
    ? 'bg-wire-blue'
    : tile.color === 'yellow'
    ? 'bg-wire-yellow text-slate-900'
    : 'bg-wire-red';

  const animationClass = tile.cut
    ? 'animate-tile-cut'
    : justRevealed
    ? 'animate-tile-reveal'
    : '';

  return (
    <button
      onClick={onClick}
      disabled={tile.cut || !onClick}
      className={clsx(
        'relative w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center font-bold text-2xl shrink-0',
        'transition-transform duration-150',
        showValue ? colorClass : 'bg-slate-700',
        selected && 'ring-4 ring-bomb-accent scale-105',
        highlighted && 'ring-4 ring-bomb-coach animate-pulse',
        !tile.cut && onClick && 'hover:scale-105 cursor-pointer',
        'border-slate-900/50 shadow-lg shadow-black/30',
        animationClass,
        justCut && 'ring-4 ring-bomb-accent'
      )}
    >
      {showValue ? (
        <span className="drop-shadow-md">{tile.value}</span>
      ) : (
        <>
          <span className="text-slate-400 text-xs absolute top-1 left-1">{position !== undefined ? position + 1 : ''}</span>
          <span className="text-slate-500">?</span>
        </>
      )}
      {tile.revealed && hidden && !tile.cut && (
        <span className="absolute -top-2 -right-2">
          <Tooltip
            position="top"
            content={<span>Info token: this tile's value was revealed by an earlier wrong guess. Both players see it.</span>}
          >
            <span className="bg-bomb-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-md font-bold cursor-help">i</span>
          </Tooltip>
        </span>
      )}
    </button>
  );
}
