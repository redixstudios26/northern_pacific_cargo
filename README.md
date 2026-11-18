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

## Supabase setup

The project includes browser and server Supabase clients in `src/lib/supabase/`. The dashboard supports email magic-link sign-in and a testable flight-plan workflow. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Never put a Supabase secret or service role key in a `NEXT_PUBLIC_` variable.

Apply `supabase/migrations/202611170001_npc_flight_plans.sql` to create the private `npc_flight_plans` table and row-level security policies. In Supabase Auth URL Configuration, add `http://localhost:3000` to the redirect URL allow list. Then run `npm run dev`, sign in with an email address, and use **Plan a flight** to save a draft. The test account receives a magic link; flight plans are only visible to the user who created them.

The `.env.local` file is ignored by Git and must not be committed. Only the browser-safe publishable key belongs in the `NEXT_PUBLIC_` variable.

## Starter workspace data

Before signing in, the displayed aircraft profile and flight board are explicitly illustrative local starter records. They are not live flight, weather, dispatch, cargo or accounting data. After signing in, flight plans come from Supabase; the aircraft profile remains a starter example. Financial information is intentionally absent.

The initial aircraft profile is the Cessna 208B Grand Caravan (tail number C-FNPC shown as an editable example). The home base is Stewart, British Columbia (CZST). Airport map art and the displayed weather line are decorative setup UI, not an operational map or live weather feed.

## Commands

- `npm run dev` — start the local development server
- `npm run build` — create a production build
- `npm start` — serve the production build
