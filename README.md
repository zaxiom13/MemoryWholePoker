## MemoryWhole

A React + TypeScript + Vite app for memorization practice. Create decks of cards (quotes, poetry, speeches), then type them from memory. The app times your runs and records best times per card and per deck. Optional assistance modes help you practice:

- Ghost Text: faintly show the next few characters after a brief pause
- See Full Text: display the entire reference text
- Autocorrect: be lenient on case and auto-insert punctuation

## Quick start

Prerequisites: Node 20+ and npm (or your preferred package manager).

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Using the app

- Create a deck and add cards, or click "Load Default Decks" on the Decks page to seed demo content.
- Open a card or a deck and click "Study" to choose assistance options.
- Type the content exactly; only correct characters are accepted. Your best times are saved locally and visible via the trophy icon.

## Optional: Gemini integration

This project can generate cards with Google Gemini via `@google/genai`. Provide an API key in one of two ways (prefer .env):

1) Create a `.env` file in the project root:

```
VITE_GEMINI_API_KEY=your_key_here
```

2) Or copy `src/AI_KEY.template.ts` to `src/AI_KEY.ts` and replace the placeholder with your key.

Security note: `src/AI_KEY.ts` is ignored by git (see `.gitignore`). Keep keys out of version control and prefer environment variables for production. If a key file is ever committed by mistake, remove it from the remote history and rotate the key immediately.

## Scripts

- dev: start Vite in development
- build: type-check and build
- preview: preview the production build
- lint: run ESLint

## Tech stack

- React 19, TypeScript, Vite 7
- React Router for navigation
- Tailwind CSS and small UI primitives
- Local storage for app state (decks, cards, records)

## Project structure (selected)

- `src/pages/DeckList.tsx`: manage decks, seed defaults, view best times
- `src/pages/StudySetup.tsx`: choose assistance options
- `src/pages/StudySession.tsx`: typing experience, timer, best-time recording
- `src/contexts/DataContext.tsx`: app state, CRUD, records
- `src/lib/gemini.ts`: Gemini card generation helpers

## License

MIT
