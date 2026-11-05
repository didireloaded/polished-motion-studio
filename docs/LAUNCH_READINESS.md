# Mutal launch readiness — 4 November 2026

This is an evidence log for the current PWA. A local test does not prove the deployed service or a real two-member flow. The PWA should not invite real members until the open privacy, legal, safety, and delivery checks below are closed by an operator.

## Verified in the connected project

- PR #1 (Nearby and 650-character posts) is merged. The deployed `posts_body_check` allows 3–650 trimmed characters.
- All 23 existing `public` tables have RLS enabled. An anonymous scratch client using the publishable key returned zero rows (or permission denied) from each table. This proves anonymous isolation only; the PGlite tests in this branch exercise representative member, blocked, moderator, and match paths against the versioned SQL. A two-account check against the live backend remains pending.
- The `voice-intros`, `profile-photos`, and `verification-selfies` buckets are private. Current object policies scope writes to the owner's folder, voice reads to eligible members, and selfies to the owner/moderator. The new migration limits discovery to the profile's current cover photo and extra photos to mutual matches, with block and inactive checks.
- The client uses a publishable Supabase key. Server credentials are in server modules. Date ideas and Random Friday pitches use authenticated server functions. PostHog initializes only after explicit consent, with autocapture and session recording off; current named event calls contain no profile text, message body, or coordinates.
- Signed photo links last five minutes. A previously issued link remains usable until expiry after a block; storage policy changes cannot retract an existing bearer URL instantly. Voice links last one hour to avoid an idle player's link expiring. Reduce or refresh this if instant media revocation is required.
- Filters are applied to the server candidate query and recommendation eligibility; the fallback only ranks eligible candidates. The messaging UI has history pagination, pending/failed message states, Realtime cleanup, and a polling fallback when disconnected. The date-plan RPC checks version and the update trigger owns each member's confirmation.

## Before real members

1. **Live actor checks:** With two separate test accounts and one moderator, verify ownership and blocking for profiles, photos, voice, replies, reports, messages, matches, notifications, and date plans through the public API. Include a block during an open conversation and a stale plan edit on two devices. Do not run these tests against real member data.
2. **Legal and consent:** Supply approved, versioned Terms and Privacy Policy and a lawful consent record before claiming acceptance at signup. Define retention for photos, voice, selfies, reports, and deleted accounts, including export/deletion handling. Product analytics consent already has its own switch; location and notifications need their own permission explanations.
3. **Safety operations:** Name verification and report reviewers, response hours, escalation owner, appeal contact, and after-hours incident procedure. Review the reporting categories against the operating policy. Do not promise a review time until a staffed rota exists. Verify emergency and GBV support contacts with local sources before publishing them.
4. **Email and push:** Confirm the production transactional email provider, domain SPF/DKIM/DMARC, and sign-up/reset delivery on common inboxes. Confirm VAPID secrets and Web Push on an installed iOS and Android PWA. Until then, use the in-app notification inbox as the reliable channel and show push as unavailable where unsupported.
5. **Mapbox:** In the Mapbox account, verify the browser `pk.` token is restricted to production and preview origins, and test the usage/billing alert. The key's public prefix alone does not prove URL restriction.
6. **Media review:** Define an image moderation process and removal SLA before opening profile uploads broadly. Manual verification already has pending/approved/rejected states; do not infer verification from a photo upload.
7. **Device and accessibility:** Test a low-end Android, a narrow iPhone, and a notched phone with keyboard, weak connection, screen reader, larger text, and reduced motion. Confirm cover crops, permission-denied voice recording, and map behavior. Current source and local build checks are not device verification.
8. **PWA expectations:** A browser PWA cannot provide reliable closed-app background location; Crossed paths must stay unavailable without a native implementation and explicit consent. Offline likes, messages, and date-plan edits are not queued; preserve failure/retry states instead of claiming offline support.

## Product decisions recorded

- Five tabs: Home, Explore, Community, Chats, You. Keep the current interactive map and route URLs. Explore surfaces Events and Quick picks. Hide unfinished live pairing and background crossing entry points until real availability is proven.
- Cover photo is visible for discovery; extra photos require a mutual match. Verification status must come from a reviewed selfie, never from photo presence.
- Date suggestions are drafts. Each member chooses their own confirmation and a detail change clears both confirmations.
- Signed-out fictional content has one persistent preview notice per screen rather than a repeated badge on every item.

## Remaining product/operations work

- Make the date planner reachable from new matches and the chat header, then verify the two-account flow end to end.
- Complete event-to-date invitations, post-date follow-up, account export/deletion, plan sharing/check-ins, and a reliable support route after privacy and safety requirements are defined.
- Define event and notification taxonomies, quiet hours, time-to-first-confirmed-date metric, town density thresholds for live features, and a Windhoek-first launch plan. Do not show fabricated attendance or activity counts while building density.
- Create staging with separate credentials, test a restore, set monitors for app availability, database, curation, and moderation queue. The existing security monitor's static RLS and HTTP checks do not prove these live behaviors.

The [PR template](../.github/pull_request_template.md) records the checks needed for each future change.
