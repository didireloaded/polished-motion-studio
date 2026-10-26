# NamLink — A little closer

A phone-friendly, private, full-stack **development preview** for a Namibia-focused dating product. This is a responsive web app, not a native iOS/Android binary or a launch-ready public dating service.

## Run locally

Node >=22.13, then `npm ci` and `npm run dev -- --port 49233`.
Local authentication: open `/signin-with-chatgpt?return_to=/` on the dev server. Hosted sign-in and owner-only access are provided by Sites. For phone testing use the hosted HTTPS URL; localhost on your phone points to the phone itself.

Database migrations are in `drizzle/`. Local preview requires the migration to be applied using the D1 command in the starter documentation. Hosted publishing applies migrations automatically. `.openai/hosting.json` declares the DB binding.

## Implemented

- Responsive editorial profile grid, accessible native dialogs and reduced-motion support.
- Town, age, intent, and interest filters; no swipe interface.
- Private profile editing with server-validated adult declaration and a Namibian town allowlist.
- Persistent likes, quiz answers, data saver, blocking, preview reporting, and sample conversation messages.
- Native share / clipboard date plan and a local safety checklist. No automated messages or live location tracking.
- ChatGPT account identity, authenticated account-scoped D1 persistence, no-store responses, same-origin write protection, bounded input, atomic version checks against concurrent writes, idempotent message IDs.
- Account data reset with confirmation.

## Preview boundaries

All eight profiles are fictional; photos are Unsplash stock. Two fixed sample connections demonstrate chat. Messages are private test records, not delivered to another member; no artificial replies are generated. Reports are stored privately and block the sample profile; there is no active moderation team.

The current private audience is the owner only. Do not open this to real users before implementing real member profiles, mutual matching, message delivery and notification policies, media upload/processing, robust age/region assurance, moderation/admin operations, abuse limits, retention/export/deletion policy, and operational monitoring. Adult/region declarations do not prove age or residence.

Not implemented: phone OTP, native apps, selfie verification, stories, voice/video, background location, crossed paths, end-to-end encryption, compatibility scoring, trusted-contact alerts. Browser screenshot blocking cannot be guaranteed. No paywalls.

## Structure

- `app/namlink.tsx`: responsive application UI and preview flows.
- `app/globals.css`: design tokens and responsive styling.
- `lib/model.ts`: fixtures, server action schema, pure state transitions.
- `app/api/state/route.ts`: authenticated read/write boundary and concurrency control.
- `db/schema.ts`, `drizzle/`: account data schema and migration.
- `tests/model.test.mjs`: behavioral invariants.
- `public/photos/`: regular and low-data versions of stock photography.

## Verification

`npx tsc --noEmit`

`node --experimental-strip-types --test tests/model.test.mjs`

Build via the Sites `build-site.mjs` helper. The deployment source and generated artifact must match the same pushed commit.

## Design sources

Primary: supplied images 3 and 7, dark editorial photography, strong hierarchy and compact image overlays. Secondary: image 9 for conversation structure and image 1 for profile questions. Navigation borrows frosted separation from image 2 without its blue palette. Black canvas, white text, sunset pink for actions, pale yellow for the single editorial note. No decorative gradient buttons. Gradients are limited to image legibility overlays.

Image source IDs are available in `ASSETS.md`. Fonts: DM Sans and Manrope, served by Google Fonts with system fallbacks. Images are served locally and do not contact Unsplash at runtime.
