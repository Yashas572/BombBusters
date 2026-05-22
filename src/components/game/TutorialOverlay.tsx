import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { TRAINING_MISSIONS } from '../../engine/missions/missions';

type Zone = 'ai-rack' | 'player-rack' | 'tracker' | 'action-panel' | 'wire-status' | 'coach';

interface TutorialStep {
  title: string;
  body: string;
  highlight?: Zone[];
  advanceOn: 'click' | 'guess-correct' | 'guess-wrong' | 'solo-cut';
  ctaLabel?: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Bomb Busters',
    body:
      "Two players, one bomb. Each of you has a rack of wires sorted from low to high. You can see your own values; your opponent's are hidden. Defuse the bomb before the detonation tracker hits zero — and don't cut a red wire.",
    advanceOn: 'click',
    ctaLabel: "Got it, let's play",
  },
  {
    title: 'Your rack & theirs',
    body:
      "Your six wires sit at the bottom. The AI's six are at the top, face-down with position numbers. Both racks are always sorted ascending — that's your biggest deduction lever.",
    highlight: ['player-rack', 'ai-rack'],
    advanceOn: 'click',
    ctaLabel: 'Next',
  },
  {
    title: 'The starting info tokens',
    body:
      "Notice the little 'i' badges on position 5 of both racks. That's an info token — a tile whose value is revealed to both players. You get one starting hint on each side.",
    highlight: ['ai-rack', 'player-rack'],
    advanceOn: 'click',
    ctaLabel: 'Next',
  },
  {
    title: 'Make your first cut',
    body:
      "Time to try a guess. You hold a 3 — and so does the AI, at position 2 on their rack. Click position 2 on the AI rack, click the 3 in your declared values, then hit CUT WIRE.",
    highlight: ['ai-rack', 'action-panel'],
    advanceOn: 'guess-correct',
  },
  {
    title: 'Nice — both 3s are gone',
    body:
      "Correct! Both matching tiles got cut and you scored a point. Now try a wrong guess to see what happens. Pick any other AI tile and declare it as a 5 (you also hold a 5). It probably won't match — that's the point.",
    highlight: ['ai-rack', 'action-panel'],
    advanceOn: 'guess-wrong',
  },
  {
    title: 'Detonator ticks, value revealed',
    body:
      "Wrong guesses cost you a segment on the detonation tracker — and the tile's true value is revealed as a new info token for both players. Every mistake is also a clue.",
    highlight: ['tracker'],
    advanceOn: 'click',
    ctaLabel: 'Next',
  },
  {
    title: 'The deduction lever',
    body:
      "Look at the Wire Status panel. Each number 1–12 has 4 copies in the pool. As copies get cut, possibilities shrink. The orange dot under a number means you still hold a copy of that value.",
    highlight: ['wire-status'],
    advanceOn: 'click',
    ctaLabel: 'Next',
  },
  {
    title: 'Want strategy help? Ask the coach',
    body:
      "The GPT-4 coach on the right watches your game. Click 'Best Move' for a hint, or ask anything in the chat. It won't cheat — it only sees what you see.",
    highlight: ['coach'],
    advanceOn: 'click',
    ctaLabel: 'Next',
  },
  {
    title: "You're ready",
    body:
      "That's the core loop: deduce from sort order, frequency, and revealed info; cut wires before the bomb blows. Mission 1 is a clean blue-only game — perfect for your first real run.",
    advanceOn: 'click',
    ctaLabel: 'Start Mission 1',
  },
];

export function TutorialOverlay() {
  const tutorialMode = useGameStore(s => s.tutorialMode);
  const tutorialStep = useGameStore(s => s.tutorialStep);
  const lastEvents = useGameStore(s => s.lastEvents);
  const advanceTutorialStep = useGameStore(s => s.advanceTutorialStep);
  const startMission = useGameStore(s => s.startMission);
  const exitTutorial = useGameStore(s => s.exitTutorial);

  const step = STEPS[tutorialStep];
  const isFinal = tutorialStep >= STEPS.length - 1;

  useEffect(() => {
    if (!tutorialMode || !step) return;
    if (step.advanceOn === 'guess-correct' && lastEvents.some(e => e.type === 'CUT_SUCCESS')) {
      const t = setTimeout(() => advanceTutorialStep(), 600);
      return () => clearTimeout(t);
    }
    if (step.advanceOn === 'guess-wrong' && lastEvents.some(e => e.type === 'GUESS_WRONG')) {
      const t = setTimeout(() => advanceTutorialStep(), 600);
      return () => clearTimeout(t);
    }
    if (step.advanceOn === 'solo-cut' && lastEvents.some(e => e.type === 'CUT_SUCCESS' && e.method === 'solo')) {
      const t = setTimeout(() => advanceTutorialStep(), 600);
      return () => clearTimeout(t);
    }
  }, [lastEvents, step, tutorialMode, advanceTutorialStep]);

  const highlightZones = useMemo<Zone[]>(() => {
    if (!tutorialMode || !step?.highlight) return [];
    return step.highlight;
  }, [tutorialMode, step]);

  useEffect(() => {
    const allZones = document.querySelectorAll<HTMLElement>('[data-tutorial-zone]');
    allZones.forEach(el => el.classList.remove('tutorial-spotlight'));
    if (!tutorialMode) return;
    for (const zone of highlightZones) {
      document
        .querySelectorAll<HTMLElement>(`[data-tutorial-zone="${zone}"]`)
        .forEach(el => el.classList.add('tutorial-spotlight'));
    }
    return () => {
      allZones.forEach(el => el.classList.remove('tutorial-spotlight'));
    };
  }, [tutorialMode, highlightZones]);

  if (!tutorialMode || !step) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(640px,90vw)] animate-fade-in">
      <div className="bg-gradient-to-br from-bomb-coach/95 to-emerald-900/95 backdrop-blur-md border border-bomb-coach/50 rounded-2xl shadow-2xl p-5 text-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-bomb-coach/40 flex items-center justify-center shrink-0 font-bold">
            {tutorialStep + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-white">{step.title}</h3>
              <span className="text-xs text-emerald-200/70 ml-3 shrink-0">{tutorialStep + 1} / {STEPS.length}</span>
            </div>
            <p className="text-sm text-emerald-50/90 leading-relaxed mb-3">{step.body}</p>
            <div className="flex items-center gap-2">
              {step.ctaLabel && (
                <button
                  onClick={() => {
                    if (isFinal) {
                      exitTutorial();
                      startMission(TRAINING_MISSIONS[0], 'easy');
                    } else {
                      advanceTutorialStep();
                    }
                  }}
                  className="px-4 py-2 bg-white text-emerald-900 font-bold rounded-lg hover:bg-emerald-100 transition text-sm"
                >
                  {step.ctaLabel}
                </button>
              )}
              {!step.ctaLabel && (
                <span className="text-xs text-emerald-200/70 italic">
                  {step.advanceOn === 'guess-correct' && 'Make the suggested cut to continue…'}
                  {step.advanceOn === 'guess-wrong' && 'Make the (intentionally wrong) guess to continue…'}
                  {step.advanceOn === 'solo-cut' && 'Take the solo cut to continue…'}
                </span>
              )}
              <button
                onClick={exitTutorial}
                className="ml-auto text-xs text-emerald-200/60 hover:text-white underline-offset-2 hover:underline"
              >
                Skip tutorial
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= tutorialStep ? 'bg-white' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
