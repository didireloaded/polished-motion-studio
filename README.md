# Mobile dating app preview

A white, photo-led dating app experience for members in Namibia. The five tabs are Home, Nearby, Posts, Chats, and You. Home uses a compact profile card with an expanding detail view; likes stay quiet until interest is mutual.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

`npm run build` creates a production build. `npm run lint` runs ESLint.

## App behavior

- Signed-in members use Lovable Cloud Supabase for accounts, profiles, recommendations, decisions, matches, chats, posts, blocks, and reports. Signed-out visitors see clearly labeled sample content saved locally.
- First sign-in leads to a short profile setup covering age, town, connection intent, a short description, and interests.
- Home recommendations are ranked server-side with eligibility checks and fallback ranking. A Like does not show a confirmation toast.
- Voice intros can be recorded for up to 30 seconds, played back, and saved to a private storage bucket. Storage rules allow the owner to manage a recording and eligible members to listen to active, unblocked profiles.
- Nearby uses Mapbox Light tiles when `VITE_MAPBOX_ACCESS_TOKEN` is configured, otherwise OpenStreetMap tiles. Pins remain town-level placements. The location button asks permission on tap and centers the map locally; it does not publish coordinates or track background movement.
- Signed-in members can see live event listings and register interest. Signed-out visitors see sample events. Event-to-date invitations are not implemented yet.
- A private notification inbox records matches, messages, and private post replies. It uses Realtime plus a polling fallback. The PWA service worker and private subscription table are ready for Web Push, but background delivery is not active until a sender and VAPID deployment secrets are configured.
- The database enforces a generous anti-spam limit on likes and serializes concurrent like and message inserts before checking their limits. Matching and chat rows reference real member profiles.
- Browser crash reporting uses Sentry when `VITE_SENTRY_DSN` is configured. Product events use PostHog when `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` are configured and the member opts in under Safety and privacy. Automatic capture and session recording are disabled.

## Deployment configuration

Set the public browser variables listed in `.env.example` in the Lovable project environment. `VITE_` values are embedded in browser assets. Never put private keys under a `VITE_` name or commit them. The PWA push private key is generated locally in `.vapid-keys.local` (ignored by Git) and must be stored in a server secret store when a push sender is deployed. The public half goes in `VITE_VAPID_PUBLIC_KEY` at that point. The app does not show device-alert registration until this public key is configured.

## Project structure

- `src/routes/`: app tabs and sign-in
- `src/components/voice-intro.tsx`: voice recording, private upload, and playback
- `src/components/TabBar.tsx`: shared bottom navigation and page heading
- `src/integrations/supabase/`: client, auth middleware, and generated database types
- `supabase/migrations/`: notification and push-subscription schema; the current Lovable Cloud database has already received this migration
- `src/lib/namlink.ts`: sample profiles, event previews, and signed-out demo state

The repository is connected to [Lovable](https://lovable.dev/projects/01804eef-1c82-496a-b1ef-dacee9edd43c). Commits pushed to `main` sync to its editor.
