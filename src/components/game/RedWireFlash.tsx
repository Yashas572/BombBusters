import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function RedWireFlash() {
  const lastEvents = useGameStore(s => s.lastEvents);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (lastEvents.some(e => e.type === 'RED_WIRE_TRIGGERED')) {
      setFlashing(true);
      const id = setTimeout(() => setFlashing(false), 800);
      return () => clearTimeout(id);
    }
  }, [lastEvents]);

  if (!flashing) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none animate-flash-red flex items-center justify-center">
      <div className="text-white text-7xl font-black tracking-widest drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        BOOM
      </div>
    </div>
  );
}
