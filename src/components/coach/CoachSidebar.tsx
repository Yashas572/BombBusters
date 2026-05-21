import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { askCoach } from '../../coach/coachApi';
import { parseTilePositionsFromResponse } from '../../coach/coachPrompt';
import { CoachMessage, TypingIndicator } from './CoachMessage';

interface ChatMessage {
  role: 'user' | 'coach';
  text: string;
}

const QUICK_ACTIONS: Array<{ label: string; question: string }> = [
  { label: 'Best Move', question: 'Give me a strategic hint about the best move I could make right now.' },
  { label: 'Explain Last Turn', question: 'What did the AI opponent likely just deduce, and what does it tell me about their rack?' },
  { label: 'Any Tips?', question: 'What general strategic observations can you make about the current board state?' },
];

function lastMessageNeedsReveal(messages: ChatMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'coach') continue;
    const hasHint = /(^|\n)\s*Hint:/i.test(m.text);
    const hasMove = /(^|\n)\s*Move:/i.test(m.text);
    return hasHint && !hasMove;
  }
  return false;
}

export function CoachSidebar() {
  const gameState = useGameStore(s => s.gameState);
  const highlightTiles = useGameStore(s => s.highlightTiles);
  const clearHighlights = useGameStore(s => s.clearHighlights);
  const coachEnabled = useSettings(s => s.coachEnabled);
  const settingsKey = useSettings(s => s.openAiApiKey);
  const apiKey = settingsKey || (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coachEnabled || !gameState) return null;

  async function send(question: string) {
    if (!gameState || loading) return;
    if (!apiKey) {
      setError('No API key configured. Add one in Settings.');
      return;
    }
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const { text } = await askCoach(gameState, question, apiKey);
      setMessages(prev => [...prev, { role: 'coach', text }]);
      if (gameState) {
        const positions = parseTilePositionsFromResponse(text);
        const activeAi = gameState.aiRack.tiles.filter(t => !t.cut);
        const tileIds = positions.map(p => activeAi[p]?.id).filter((id): id is string => !!id);
        if (tileIds.length > 0) {
          highlightTiles(tileIds);
          setTimeout(() => clearHighlights(), 6000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-bomb-panel rounded-xl p-4 shadow-lg flex flex-col h-full max-h-[80vh]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm uppercase tracking-wide text-bomb-coach">Coach</div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.label}
            onClick={() => send(qa.question)}
            disabled={loading}
            className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 px-2 py-1 rounded"
          >
            {qa.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            Ask the coach anything about the current board state. Strategic hints, rule clarifications, move recommendations.
          </div>
        )}
        {messages.map((msg, i) => (
          <CoachMessage key={i} role={msg.role} text={msg.text} />
        ))}
        {!loading && lastMessageNeedsReveal(messages) && (
          <button
            onClick={() => send('Yes, show me the specific move — give me the position and the exact value to declare.')}
            className="mr-4 text-xs bg-bomb-accent/20 hover:bg-bomb-accent/40 border border-bomb-accent/60 text-orange-200 px-3 py-2 rounded-lg w-full transition animate-fade-in font-semibold"
          >
            Show Me the Move →
          </button>
        )}
        {loading && <TypingIndicator />}
        {error && <div className="text-xs text-red-400 animate-fade-in">{error}</div>}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Ask the coach..."
          disabled={loading}
          className="flex-1 bg-slate-800 text-white px-3 py-2 rounded text-sm"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="bg-bomb-coach hover:opacity-80 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
