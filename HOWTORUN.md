# How to Run Bomb Busters Digital Edition

Every way to run, test, build, and deploy this project. Skip to whatever you need.

---

## Quick Start (30 seconds)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. That's it. The AI coach won't work until you add an API key — see [Setting Up the AI Coach](#setting-up-the-ai-coach) below.

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 18+ (LTS recommended) | Runs Vite, the build tool |
| npm | Comes with Node | Installs dependencies |
| A modern browser | Chrome, Firefox, Safari, Edge | Renders the game |
| (Optional) OpenAI or OpenRouter API key | — | For the GPT-4 coach |

**Don't have Node?** Easiest install on macOS: download the `.pkg` from https://nodejs.org (LTS button), double-click, then **close and reopen your Terminal** before running anything else.

Verify your install:

```bash
node --version    # should print v18.x or higher
npm --version     # should print 9.x or higher
```

---

## Installing Dependencies

From the project root (`BombBusters/`):

```bash
npm install
```

This downloads everything into `node_modules/` (≈250 MB). You'll see some `npm audit` warnings — ignore them for a personal/local project. **Do not run `npm audit fix --force`** — it aggressively upgrades packages and frequently breaks the build.

If installation fails, delete `node_modules` and the lockfile and try again:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Running the Game

### Development mode (most common)

```bash
npm run dev
```

- Starts the Vite dev server on http://localhost:5173
- Hot module replacement: save a file, the browser updates instantly without losing state
- Source maps work in browser DevTools
- **Best for: playing the game, building features, debugging**

Press `Ctrl+C` in the Terminal to stop the server.

### Production preview (test the optimized build locally)

```bash
npm run build
npm run preview
```

- `build` compiles TypeScript and produces an optimized bundle in `dist/`
- `preview` serves that bundle on http://localhost:4173 — exactly what users would see if deployed
- **Best for: confirming the build works before deploying, checking bundle size, performance testing**

### Run on a specific port

If 5173 is busy:

```bash
npm run dev -- --port 3000
```

### Expose on your local network (other devices can connect)

```bash
npm run dev -- --host
```

This prints both `Local:` and `Network:` URLs. Connect a phone or tablet on the same Wi-Fi to the Network URL to test mobile.

---

## Setting Up the AI Coach

The coach uses an LLM (GPT-4o by default). You need an API key from one of:

- **OpenAI** — keys start with `sk-proj-` or `sk-`. Get one at https://platform.openai.com/api-keys
- **OpenRouter** — keys start with `sk-or-`. Get one at https://openrouter.ai/keys

The code auto-detects which provider based on the key prefix. No config change needed.

### Method 1 — `.env.local` file (recommended for development)

1. Open `.env.local` in the project root (already created)
2. Paste your key after the `=`:
   ```
   VITE_OPENAI_API_KEY=sk-or-v1-your-key-here
   ```
3. **Restart `npm run dev`** — Vite only reads env files at startup

### Method 2 — In-app Settings screen

1. Run `npm run dev` and open the app
2. Main menu → Settings → paste your key in the API Key field
3. Click out of the field to save
4. The key persists in your browser's localStorage; you only need to do this once per browser

If both are set, the Settings UI value takes precedence over `.env.local`.

### Disabling the coach

In Settings, uncheck "Enable coach sidebar in-game". The sidebar disappears and no API calls are made.

---

## Testing

### Run all tests once

```bash
npm run test:run
```

Should print `Tests 35 passed (35)` and finish in under 1 second.

### Watch mode (auto-rerun on file change)

```bash
npm run test
```

Vitest stays running and re-executes tests every time you save a file. Press `q` to quit.

### Engine-only tests (fastest signal when debugging deduction logic)

```bash
npm run test:engine
```

Runs only `tests/engine/*.test.ts`. Skips any UI/integration tests.

### Type-check without building

```bash
npm run lint
```

Runs `tsc --noEmit`. Catches type errors in seconds. Run this before committing any code change.

---

## Common Workflows

### "I just want to play the game"

```bash
npm install        # one time
npm run dev        # every time
```

Open http://localhost:5173.

### "I'm developing — what's the fastest feedback loop?"

Open three terminal tabs:

```bash
# Tab 1
npm run dev

# Tab 2
npm run test

# Tab 3 (whenever you finish a chunk)
npm run lint
```

### "I want to share this build with someone"

```bash
npm run build
```

Then either:
- Zip the `dist/` folder and send it (they need to serve it via any static server)
- Deploy `dist/` to Vercel, Netlify, or GitHub Pages (drag-and-drop works on all three)

### "I want to deploy to Vercel"

```bash
# One-time setup
npm install -g vercel
vercel login

# From the project root
vercel
```

Vercel auto-detects Vite. Accept the defaults. You'll get a URL like `bomb-busters-xyz.vercel.app`.

**Important:** if you deploy publicly, **do not** put your API key in `.env.local` for that deploy — it gets bundled into the public JS. Instead, leave the env var empty and have users enter their own keys via the Settings UI. Or build a small backend proxy that holds the key server-side.

---

## Troubleshooting

### `npm: command not found`

Node isn't installed, or you didn't reopen your Terminal after installing it. See [Prerequisites](#prerequisites).

### Port 5173 already in use

Another Vite project is running. Either stop it (`Ctrl+C` in its terminal), or pick a new port: `npm run dev -- --port 3000`.

### Coach shows "Failed to fetch"

Your API key is missing, invalid, or the key type doesn't match what the code expects. Open browser DevTools → Network tab → click the failed request → check the response body. Common causes:

- Key has expired or been rotated — get a new one
- You pasted an OpenRouter key but the env var is empty (or vice versa) — see [Setting Up the AI Coach](#setting-up-the-ai-coach)
- You set the env var but didn't restart `npm run dev`
- You're rate-limited (the coach is throttled to 1 request per 3 seconds locally; the API itself may also rate-limit you)

### Browser shows a white screen

Open DevTools (Cmd+Opt+I on Mac, F12 on Windows) and check the Console tab for red errors. Most common:

- A new dependency wasn't installed — re-run `npm install`
- Something in `.env.local` has invalid syntax — keys must be `KEY=value`, no spaces, no quotes

### Tests fail after pulling new code

```bash
rm -rf node_modules package-lock.json
npm install
npm run test:run
```

If still failing, the changes have a real bug — open the failing test file and read the assertion.

### Production build fails but dev server works

Vite's dev mode is more forgiving than production. Common causes:

- A TypeScript error you ignored in dev — run `npm run lint` to surface it
- An import path with wrong casing (Mac is case-insensitive in dev but production is strict)

### "Cannot find module 'X'"

The dependency isn't installed. Run `npm install` again. If you just added a new dependency, run `npm install <package-name>` first.

---

## All npm Scripts Reference

| Script | What it does |
|---|---|
| `npm install` | Download all dependencies into `node_modules/` |
| `npm run dev` | Start Vite dev server on port 5173 with hot reload |
| `npm run build` | Type-check + produce optimized production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally on port 4173 |
| `npm run test` | Run Vitest in watch mode (re-runs on file change) |
| `npm run test:run` | Run all tests once and exit |
| `npm run test:engine` | Run only engine tests once and exit |
| `npm run lint` | TypeScript-only check, no output emitted (`tsc --noEmit`) |

---

## Project Structure Reference

```
BombBusters/
├── src/
│   ├── engine/          Pure TS game logic (no React, no browser deps)
│   ├── store/           Zustand state management
│   ├── coach/           OpenAI/OpenRouter coach integration
│   ├── components/      React components
│   └── lib/             Tiny utilities (clsx)
├── tests/
│   └── engine/          All 35 tests live here
├── public/              Static assets (unused for now)
├── dist/                Production build output (created by npm run build)
├── node_modules/        Dependencies (created by npm install)
├── .env.local           Your API key (gitignored)
├── .env.example         Template for .env.local
├── package.json         Dependencies + scripts
├── vite.config.ts       Vite + Vitest config
├── tsconfig.json        TypeScript config
├── tailwind.config.js   Tailwind CSS config
├── IMPLEMENTATION_PLAN.md
├── README.md
└── HOWTORUN.md          ← you are here
```

---

## What to Do First

If this is your first time touching the project:

```bash
npm install
npm run test:run    # confirms the engine works (35 tests should pass)
npm run dev         # open http://localhost:5173, play Mission 1
```

That's the whole gold path. Everything else in this doc is for when something specific goes wrong or you want to do more than just play.
