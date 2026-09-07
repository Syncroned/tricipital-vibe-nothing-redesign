# Tricipital Vibe Nothing Redesign

A full Tampermonkey userscript that replaces tricipital.com with a **Nothing-inspired UI** built on:

- **Vite 8**
- **React 19 + TypeScript**
- **Tailwind CSS 3** (prefixed `tw-`, preflight disabled to avoid clashing with the design system)
- **vite-plugin-monkey** for userscript bundling
- **Vibe-Nothing-UI-Design** loaded from CDN
- **Nothing fonts** from [xeji01/nothingfont](https://github.com/xeji01/nothingfont):
  - `Ndot57-Regular` for display / big text
  - `NType82-Regular` for body/UI
  - `NType82-Headline` for headings
  - `NType82Mono-Regular` for labels and data
- Accent color forced to **red** (`#ff0000`)

## Quick install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open `dist/tricipital-redesign.user.js` (or `../tricipital-redesign.user.js`) in a new tab.
3. Tampermonkey will detect it — click **Install**.
4. Visit `https://tricipital.com/` or `https://www.tricipital.com/`.

## Development

```bash
npm install
npm run dev      # dev server with /api and /assets proxy to www.tricipital.com
npm run build    # produces dist/tricipital-redesign.user.js
```

## Architecture

- `src/main.tsx` — loads the Nothing UI CSS and the Nothing fonts from jsDelivr, wipes the original page, and mounts the React app.
- `src/api.ts` — re-implements the original `api/index.php` client with CSRF handling.
- `src/hooks/useAppState.tsx` — global React context for auth, status, history, queue, leaderboard, progress, alerts.
- `src/components/` — redesigned views:
  - `RequestForm` — full submission form with difficulty/type pills, rules, custom questions, your submission, status tiles.
  - `HistoryView` — recently played levels table.
  - `QueueView` — subscriber-only live queue cards.
  - `LeaderboardView` — send-score leaderboard.
  - `ProgressView` — logged-in weight history.
  - `ModView` — admin password gate.
- `src/components/DotIcon.tsx` — 9×9 dot-matrix icons matching the Nothing glyph language.

## Extending

The API wrapper (`src/api.ts`) and the typed response models (`src/types.ts`) already expose the backend surface. Remaining features (predictions, orbs, RPS, transfer requests, milestones, bot config, chat games, widgets) can be added as new tabs + small components without touching the core.

## Why

This whole project was made because the old UI design was hot ass.

No shade tri, but you really needa lock ur claude slopbot in more wink wink ;)

## Notes

- The design system forbids mixing other CSS frameworks, so Tailwind is scoped with `tw-` prefix and its reset is disabled.
- Fonts and the Nothing stylesheet are served from `cdn.jsdelivr.net` for reliability.
- The userscript excludes `/api/*` and `/assets/*` paths so raw API/asset pages are not skinned.
