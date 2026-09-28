## MemoryWholed

A poker-night memorization game. Build decks of things you want to know by heart (quotes, poems, speeches, facts), type them from memory, and get dealt a poker hand for how cleanly you did it. Better hands win more chips; play daily to keep a streak.

Runs on **Cloudflare Workers**: the React app is served as static assets and a tiny Worker (`worker/index.ts`) proxies AI deck generation to Gemini, so the API key never reaches the browser.

## How it plays

- **Type from memory.** Correct letters lock in; a wrong letter shows in red until you delete it. The caret always stays at the end, so there's nothing to fight with on a phone.
- **House rules** (per run, remembered for next time):
  - *Show ahead*: None · Blanks (word shapes) · Initials (first letter of each word) · Full text
  - *Ghost text*: pause and the next word fades in
  - *Lenient typing*: ignore capitals/accents, punctuation types itself (on by default on phones)
  - *Shuffle* for whole-deck runs
- **Hints**: 💡 button or <kbd>Tab</kbd> fills in the next word.
- **Scoring**: accuracy and hints decide your hand (High Card → Royal Flush). Helpers cap the best hand you can reach instead of reducing your score. Personal bests earn bonus chips.

Keyboard robustness: input goes through a pure engine (`src/lib/studyInput.ts`) that re-aligns whatever the text field contains against the target. That makes it work the same for desktop typing, mobile IME composition (Gboard), autocomplete/autocorrect replacements, swipe typing and iOS smart punctuation (curly quotes/dashes are accepted). Enter and space are interchangeable for line breaks.

Data lives in `localStorage` only. Export/import a JSON backup from the ⓘ page.

## Development

Requires Node 20+.

```bash
npm install
cp .dev.vars.example .dev.vars   # optional: add GEMINI_API_KEY for AI features
npm run dev                      # Vite + the Worker running locally in workerd
```

```bash
npm test         # unit tests (engine, scoring, storage, worker)
npm run lint
npm run build    # typecheck + production build (client + worker)
npm run preview  # build and serve the production bundle locally
```

## Deploying to workers.dev

One-time setup:

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY    # optional, enables AI generation
npm run deploy
```

Wrangler prints the URL, e.g. `https://memorywholed.<your-subdomain>.workers.dev`. The Worker name comes from `wrangler.jsonc`.

**Automatic deploys:** `.github/workflows/ci.yml` lints, tests and builds every push/PR, and deploys `main` once you add two repository secrets: `CLOUDFLARE_API_TOKEN` (a token with the *Edit Cloudflare Workers* template) and `CLOUDFLARE_ACCOUNT_ID`. Alternatively connect the repo in the Cloudflare dashboard (Workers → Create → Import a repository) with build command `npm run build` and deploy command `npx wrangler deploy`.

Configuration (`wrangler.jsonc`):

- `assets.not_found_handling: single-page-application` serves `index.html` for client routes; only `/api/*` runs the Worker.
- `ratelimits` throttles `/api/generate` to 12 requests/minute per IP so a public URL can't drain your Gemini quota.
- `vars.GEMINI_MODEL` picks the model; `GEMINI_API_KEY` is a secret.

Moving off Netlify: nothing else is needed. Remove the old site in the Netlify dashboard once the workers.dev URL is live (the previous `VITE_GEMINI_API_KEY` build variable is no longer used; rotate that key, since it was bundled into the public JS).

## Project layout

- `worker/` Cloudflare Worker: `/api/health`, `/api/generate` (Gemini proxy), tolerant JSON parsing
- `src/lib/studyInput.ts` typing engine (pure, heavily tested)
- `src/lib/scoring.ts` hands, chips, WPM/accuracy
- `src/lib/storage.ts` validated/migrated localStorage state, import/export
- `src/pages/StudySession.tsx` the typing experience
- `src/contexts/DataContext.tsx` decks, cards, records, profile, undo

## License

MIT
