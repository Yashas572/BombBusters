import type { GameState } from '../engine/types';
import { buildCoachMessages, serializeGameState } from './coachPrompt';
import { cacheKey, getCached, setCached } from './coachCache';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 3000;

export interface CoachResponse {
  text: string;
  cached: boolean;
}

interface ProviderConfig {
  url: string;
  model: string;
  extraHeaders: Record<string, string>;
}

function detectProvider(apiKey: string): ProviderConfig {
  if (apiKey.startsWith('sk-or-')) {
    return {
      url: OPENROUTER_URL,
      model: 'openai/gpt-4o',
      extraHeaders: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Bomb Busters Digital Edition',
      },
    };
  }
  return {
    url: OPENAI_URL,
    model: 'gpt-4o',
    extraHeaders: {},
  };
}

export async function askCoach(state: GameState, question: string, apiKey: string): Promise<CoachResponse> {
  if (!apiKey) throw new Error('No API key configured. Set one in Settings or in .env.local.');

  const stateJson = serializeGameState(state);
  const key = cacheKey(stateJson, question);
  const cached = getCached(key);
  if (cached) return { text: cached, cached: true };

  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const provider = detectProvider(apiKey);
  const messages = buildCoachMessages(state, question);

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...provider.extraHeaders,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.4,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Coach API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  setCached(key, text);
  return { text, cached: false };
}
