import { clsx } from '../../lib/clsx';

interface Props {
  role: 'user' | 'coach';
  text: string;
}

interface ParsedSegment {
  kind: 'hint' | 'move' | 'text';
  content: string;
}

function parseCoachText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const hintMatch = line.match(/^\s*Hint:\s*(.*)$/i);
    const moveMatch = line.match(/^\s*Move:\s*(.*)$/i);
    if (hintMatch) {
      segments.push({ kind: 'hint', content: hintMatch[1] });
    } else if (moveMatch) {
      segments.push({ kind: 'move', content: moveMatch[1] });
    } else if (line.trim()) {
      segments.push({ kind: 'text', content: line });
    }
  }
  return segments.length > 0 ? segments : [{ kind: 'text', content: text }];
}

export function CoachMessage({ role, text }: Props) {
  if (role === 'user') {
    return (
      <div className="rounded-lg p-2 text-sm bg-slate-700 ml-4 animate-fade-in">
        {text}
      </div>
    );
  }

  const segments = parseCoachText(text);

  return (
    <div className="mr-4 space-y-1 animate-fade-in">
      {segments.map((seg, i) => {
        if (seg.kind === 'hint') {
          return (
            <div key={i} className="rounded-lg p-2 text-sm border border-yellow-500/40 bg-yellow-500/10 text-yellow-100">
              <div className="text-[10px] uppercase tracking-wider text-yellow-400 mb-0.5">Hint</div>
              {seg.content}
            </div>
          );
        }
        if (seg.kind === 'move') {
          return (
            <div key={i} className="rounded-lg p-2 text-sm border border-bomb-accent/60 bg-bomb-accent/10 text-orange-100">
              <div className="text-[10px] uppercase tracking-wider text-bomb-accent mb-0.5 font-bold">Recommended Move</div>
              {seg.content}
            </div>
          );
        }
        return (
          <div key={i} className={clsx(
            'rounded-lg p-2 text-sm bg-bomb-coach/15 border border-bomb-coach/40',
            'text-slate-200 whitespace-pre-wrap'
          )}>
            {seg.content}
          </div>
        );
      })}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center mr-4 px-2 py-2">
      <span className="w-2 h-2 bg-bomb-coach rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-bomb-coach rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-bomb-coach rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      <span className="text-xs text-slate-500 ml-2 italic">coach is thinking</span>
    </div>
  );
}
