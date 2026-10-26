# NamLink screen sequence

The new portrait reference is the visual authority for Home. Keep one person in focus, a calm first viewport, a purple photographic atmosphere, and a white expandable profile sheet. Stitch content belongs at the depth where it helps the user decide, rather than on the first frame. Existing sample profiles remain clearly illustrative until the member system is real.

## Five destinations

1. **Home:** one profile, next/previous people, private save, like, pass with undo, filters, shared interests and expandable details. Existing account likes and blocks continue to apply. A profile can show a voice intro only when an actual recording is stored. Never show a fabricated compatibility percentage, distance, verification check, or online status.
2. **Radar:** privacy preserving map or town view, opt-in nearby discovery, crossed-path history, and a compact list of local events. An event detail should answer what, when, where, and who is interested. An invitation such as “Want to go together?” belongs with the event and still needs the other person to accept. The present Nearby tab is town browsing; it does not request GPS.
3. **Posts:** logged-in members can write a short post that appears without their public profile. A reply is private to its author and the poster; it is never a public comment. The poster can accept a reply, and that acceptance creates a connection and unlocks a private chat. The author’s identity must not be returned by public post APIs. Posting, replying, acceptance, and moderation need server-side ownership checks and abuse limits. Event invitations may be linked to an event but retain the same private-reply rule.
4. **Chats:** connection inbox, likes/matches, and messages. A mutual profile like or accepted post reply creates a connection. Only connected members can exchange messages. The present Chats and Connections tabs are sample flows; real delivery will require member identities, message persistence, and notification policy.
5. **You:** profile, photos, interests, prompts, voice intro, town and intention, privacy and data saver, verification status once an actual service exists, blocking/report history, and account controls.

## Build order

Home first, then Posts and its connection rule, Chats with real accepted connections, Radar and Events, then the full You/profile setup. Integrate each screen with the account data and test its primary path before moving to the next.

## Location rules

Background location requires a native mobile app, operating-system permission, explicit opt-in, a clear off switch, and retention rules. Nearby members and crossings should be calculated privately and shown at town or broad area level, never exact coordinates. If a phone is off, no new location samples exist; the app can present only a crossing recorded before shutdown and deliver its notification when service resumes. Until that capability exists, Radar must not claim live presence or real crossed paths.

## Reference decisions still open

The provided portrait screenshots show gold star, match percentage, online status, distance, gender, education, zodiac, blood type and Spotify guessing game. Gold star means private save in Home. Other reference fields should appear only when their data and meaning are defined; no invented values or fake integrations. The reference has four photo dots, while each current sample profile has one photo, so Home shows a person count. Photo pagination should replace that count when member uploads exist.
