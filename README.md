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
- Nearby uses OpenStreetMap tiles and town-level profile pins. It does not request precise location or track background movement. Crossed-path alerts are not implemented in this web app; they require a separate, explicit location opt-in and native background-location support.
- Event listings are preview content. Interest is saved locally in this preview and is not shared with other members.

## Project structure

- `src/routes/`: app tabs and sign-in
- `src/components/voice-intro.tsx`: voice recording, private upload, and playback
- `src/components/TabBar.tsx`: shared bottom navigation and page heading
- `src/integrations/supabase/`: client, auth middleware, and generated database types
- `drizzle/migrations/`: database schema changes, including the private voice-intro bucket and policies
- `src/lib/namlink.ts`: sample profiles, event previews, and signed-out demo state

The repository is connected to [Lovable](https://lovable.dev/projects/01804eef-1c82-496a-b1ef-dacee9edd43c). Commits pushed to `main` sync to its editor.
