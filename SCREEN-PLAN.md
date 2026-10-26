# NamLink screen sequence

The new portrait reference is the visual authority for Home. Keep one person in focus, a calm first viewport, a purple photographic atmosphere, and a white expandable profile sheet. Stitch content belongs at the depth where it helps the user decide, rather than on the first frame. Existing sample profiles remain clearly illustrative until the member system is real.

## Five destinations

1. **Home:** one profile, next/previous people, private save, like, pass with undo, filters, shared interests and expandable details. Existing account likes and blocks continue to apply. A profile can show a voice intro only when an actual recording is stored. Never show a fabricated compatibility percentage, distance, verification check, or online status.
2. **Radar:** implemented as illustrative town browsing, list view, and member-created event invitations. It does not request GPS. Crossed-path history remains a native-app concept requiring explicit location permission.
3. **Posts:** implemented anonymous member posts and event invitations, private replies, acceptance, reporting, and basic server-side abuse limits. The public API does not return a poster account ID.
4. **Chats:** implemented persistent messages between members connected through an accepted post reply. Saved profiles and sample chats are separate preview areas. Mutual profile likes and push notifications remain future work.
5. **You:** implemented profile editing, town and intention, interests, prompts, data saver, and blocked-member management. Voice recording plays locally for the session only; photo uploads and verification remain future work.

## Build order

The five-tab development preview is implemented. Next work should focus on real member discovery, native location and media capabilities, notifications, moderation operations, and launch readiness.

## Location rules

Background location requires a native mobile app, operating-system permission, explicit opt-in, a clear off switch, and retention rules. Nearby members and crossings should be calculated privately and shown at town or broad area level, never exact coordinates. If a phone is off, no new location samples exist; the app can present only a crossing recorded before shutdown and deliver its notification when service resumes. Until that capability exists, Radar must not claim live presence or real crossed paths.

## Reference decisions still open

The provided portrait screenshots show gold star, match percentage, online status, distance, gender, education, zodiac, blood type and Spotify guessing game. Gold star means private save in Home. Other reference fields should appear only when their data and meaning are defined; no invented values or fake integrations. The reference has four photo dots, while each current sample profile has one photo, so Home shows a person count. Photo pagination should replace that count when member uploads exist.
