# NamLink — A little closer

A phone-friendly, full-stack **development preview** for a Namibia-focused dating product. This is a responsive web app, not a native iOS/Android binary or a launch-ready public dating service.

## Run locally

Node >=22.13, then `npm ci` and `npm run dev -- --port 49233`.
Local authentication: open `/signin-with-chatgpt?return_to=/` on the dev server. Hosted sign-in is provided by Sites. Existing public site access is preserved; account data requires authentication. For phone testing use the hosted HTTPS URL; localhost on your phone points to the phone itself.

Database migrations are in `drizzle/`. Local preview requires the migration to be applied using the D1 command in the starter documentation. Hosted publishing applies migrations automatically. `.openai/hosting.json` declares the DB binding.

## Implemented

The five tabs are Home, Radar, Posts, Chats, and You. Home presents one photo-led sample profile at a time with private save, pass/undo, like, filters, and expandable details.


- Responsive editorial profile grid, accessible native dialogs and reduced-motion support.
- Town, age, intent, and interest filters; no swipe interface.
- Private profile editing with server-validated adult declaration and a Namibian town allowlist.
- Persistent likes, quiz answers, data saver, blocking, preview reporting, and sample conversation messages.
- Native share / clipboard date plan and a local safety checklist. No automated messages or live location tracking.
- ChatGPT account identity, authenticated account-scoped D1 persistence, no-store responses, same-origin write protection, bounded input, atomic version checks against concurrent writes, idempotent message IDs.
- Account data reset with confirmation.
- Radar offers town browsing, an illustrative view or list of sample profiles, and real member-created event invitations. It does not use GPS.
- Posts let signed-in adult members publish anonymously, receive private replies, and accept a reply to create a connection. Accepted connections can exchange persistent messages in Chats. Member blocking and reporting are available.

## Preview boundaries

All eight Home/Radar profiles are fictional; their imagery is illustrative artwork from the selected Stitch designs. The sample chats are private test records, not delivered to another member. Real member chat is confined to accepted post replies. No artificial replies are generated. Reports are stored, but there is no active moderation team. The profile reset clears profile and sample data; community posts and real conversations remain.

The site allows public preview browsing; authenticated account data is isolated by user. Community posting and messaging work, but this is still a development preview. Launch needs real member profiles in discovery, mutual profile matching, notifications, media upload/processing, robust age/region assurance, moderation/admin operations, stronger concurrency-safe abuse controls, full account export/deletion, and operational monitoring. Adult/region declarations do not prove age or residence.

An optional browser voice recorder supports local, session-only playback; it does not upload or save audio.

Not implemented: phone OTP, native apps, selfie verification, stories, voice/video delivery, background location, crossed paths, end-to-end encryption, compatibility scoring, trusted-contact alerts. Browser screenshot blocking cannot be guaranteed. No paywalls.

## Structure

- `app/namlink.tsx`: responsive application UI and preview flows.
- `app/globals.css`: design tokens and responsive styling.
- `lib/model.ts`: fixtures, server action schema, pure state transitions.
- `app/api/state/route.ts`: authenticated read/write boundary and concurrency control.
- `db/schema.ts`, `drizzle/`: account data schema and migration.
- `tests/model.test.mjs`: behavioral invariants.
- `public/editorial/`: locally served images from the selected Stitch design, plus low-data portraits.
- `app/redesign.tsx`: selected discovery, nearby, connection and onboarding flows.
- `DESIGN.md`: reference lock and explicit anti-slop decisions.
- `ASSETS-REDESIGN.json`: source URLs for the supplied design assets.

## Verification

`npx tsc --noEmit`

`node --experimental-strip-types --test tests/*.test.mjs`

Build via the Sites `build-site.mjs` helper. The deployment source and generated artifact must match the same pushed commit.

## Original design sources

Primary: supplied images 3 and 7, dark editorial photography, strong hierarchy and compact image overlays. Secondary: image 9 for conversation structure and image 1 for profile questions. Navigation borrows frosted separation from image 2 without its blue palette. Black canvas, white text, sunset pink for actions, pale yellow for the single editorial note. No decorative gradient buttons. Gradients are limited to image legibility overlays.

Image source IDs are available in `ASSETS.md`. Fonts: DM Sans and Plus Jakarta Sans, served by Google Fonts with system fallbacks. Images are served locally and do not contact Unsplash at runtime.

## Selected Stitch redesign

The October redesign uses the supplied HTML as the visual source of truth. Gradient buttons, fake compatibility percentages, online statuses, precise distances, verification badges and invented activity counts were removed. The final iOS refinement retains the supplied photography and profile stories, with system typography, grouped lists, bottom sheets and a standard tab bar. Discovery banners, the radar, category chips and promotional sidebars were removed. Photo prompts live in profile editing. Native zoom remains enabled. Verification remains unimplemented; there is no biometric collection or verification step in the UI.
