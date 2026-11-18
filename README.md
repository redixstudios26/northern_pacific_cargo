# Northern Pacific Cargo

A Next.js and TypeScript foundation for a regional cargo airline operations workspace.

## Getting started

Requirements: Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Supabase credentials are optional while exploring the starter workspace. Copy your project URL and anon key into `.env.local` to enable the provided browser and server clients.

## Supabase preparation

The project includes `@supabase/ssr` browser and server client helpers in `src/lib/supabase/`. They return `null` when credentials are not configured so the setup dashboard can run without a Supabase project. No credentials or service role key are committed. Before production use, add Supabase Auth flows, route protection/session refresh middleware, and database migrations with row-level security policies for each operational table.

## Starter workspace data

The displayed aircraft profile and flight board are explicitly illustrative local starter records. They are not live flight, weather, dispatch, cargo or accounting data. Flight drafts added in the interface remain in browser memory and are not transmitted or persisted. Financial information is intentionally absent.

The initial aircraft profile is the Cessna 208B Grand Caravan (tail number C-FNPC shown as an editable example). The home base is Stewart, British Columbia (CZST). Airport map art and the displayed weather line are decorative setup UI, not an operational map or live weather feed.

## Commands

- `npm run dev` — start the local development server
- `npm run build` — create a production build
- `npm start` — serve the production build
