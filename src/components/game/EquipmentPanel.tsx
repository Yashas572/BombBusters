import type { EquipmentCard } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { Tooltip } from '../ui/Tooltip';

const EQUIPMENT_LABELS: Record<EquipmentCard['name'], string> = {
  double_detector: 'Double Detector',
  freeze: 'Freeze',
  scanner: 'Scanner',
};

const EQUIPMENT_DESCRIPTIONS: Record<EquipmentCard['name'], string> = {
  double_detector: 'Point to 2 tiles; if either matches, it counts',
  freeze: 'Pause the detonation tracker for one wrong guess',
  scanner: 'Reveal a tile without attempting a cut',
};

export function EquipmentPanel({ equipment }: { equipment: EquipmentCard[] }) {
  const useEquipment = useGameStore(s => s.useEquipment);
  const selectedTargetId = useGameStore(s => s.selectedTargetId);

  if (equipment.length === 0) {
    return (
      <div className="bg-bomb-panel rounded-xl p-4 shadow-lg">
        <div className="text-sm uppercase tracking-wide text-slate-400 mb-2">Equipment</div>
        <div className="text-slate-500 italic text-sm">None in this mission</div>
      </div>
    );
  }

  return (
    <div className="bg-bomb-panel rounded-xl p-4 shadow-lg space-y-2">
      <div className="text-sm uppercase tracking-wide text-slate-400">Equipment</div>
      {equipment.map(card => {
        const disabled = !card.unlocked || card.used;
        const statusTooltip = card.used
          ? 'This equipment has been used in this game.'
          : card.unlocked
          ? 'Available to activate on your turn.'
          : `Unlocks when all four copies of ${card.unlockPair} have been cut from both racks.`;
        return (
          <div key={card.name} className={`rounded p-2 ${disabled ? 'bg-slate-800/50' : 'bg-slate-700'}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold">{EQUIPMENT_LABELS[card.name]}</div>
              <Tooltip position="left" content={<span>{statusTooltip}</span>}>
                <div className="text-xs cursor-help underline decoration-dotted underline-offset-2">
                  {card.used ? 'Used' : card.unlocked ? 'Ready' : `Locked (cut ${card.unlockPair}s)`}
                </div>
              </Tooltip>
            </div>
            <div className="text-xs text-slate-400">{EQUIPMENT_DESCRIPTIONS[card.name]}</div>
            {!disabled && card.name === 'freeze' && (
              <button
                className="mt-1 text-xs bg-bomb-accent px-2 py-1 rounded hover:opacity-80"
                onClick={() => useEquipment({ type: 'USE_EQUIPMENT_FREEZE', actor: 'player' })}
              >
                Activate
              </button>
            )}
            {!disabled && card.name === 'scanner' && selectedTargetId && (
              <button
                className="mt-1 text-xs bg-bomb-accent px-2 py-1 rounded hover:opacity-80"
                onClick={() =>
                  useEquipment({
                    type: 'USE_EQUIPMENT_SCANNER',
                    actor: 'player',
                    targetTileId: selectedTargetId,
                  })
                }
              >
                Scan selected tile
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
