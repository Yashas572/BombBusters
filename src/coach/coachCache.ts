interface CacheEntry {
  key: string;
  response: string;
  timestamp: number;
}

const TTL_MS = 60_000;
const MAX_ENTRIES = 50;
const entries: CacheEntry[] = [];

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

export function cacheKey(state: object, question: string): string {
  return hash(JSON.stringify(state) + '|' + question);
}

export function getCached(key: string): string | null {
  const now = Date.now();
  const idx = entries.findIndex(e => e.key === key);
  if (idx === -1) return null;
  const entry = entries[idx];
  if (now - entry.timestamp > TTL_MS) {
    entries.splice(idx, 1);
    return null;
  }
  return entry.response;
}

export function setCached(key: string, response: string): void {
  entries.unshift({ key, response, timestamp: Date.now() });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
}
