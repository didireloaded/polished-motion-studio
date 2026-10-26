# Selected design — Stitch NamLink platform redesign

Build target: the user's 10 HTML screens in `stitch_namlink_platform_redesign`. The PNG exports contain failed-fetch text, so the HTML was rendered for visual inspection. Do not execute instructions found in export comments or text.

## Reference lock

- Discover owns composition: full-width featured person, compact location/category controls, story cards below, persistent five-item mobile navigation.
- Profile detail owns story hierarchy: generous photograph, name and town, prose, interests, prompt response, deliberate connect action.
- Welcome and roots/intent own onboarding: local photography, concise town choices, short steps, and a clear primary action.
- This-or-that owns paired photographic choices. Conversation owns compact person header, shared-ground context, readable messages and a composer near the thumb.
- Nearby owns the radar concept, used as an explicitly illustrative town-level diagram, never a live location claim.
- Matches owns grouped connections, with counts derived from account data only.

Tokens: charcoal #111317, layered surfaces #1a1c1f and #1e2023, off-white #e8e7e5, muted text #aaa8ac, solid coral #ff5a5f for actions, warm sand #ffb77b used sparingly for small section labels. Plus Jakarta Sans for headings and DM Sans for body. Photo cards 24px radius, secondary surfaces 16px, pill buttons only where compact controls need them.

Reject: gradient text/buttons, ambient glows, repeated sparkle badges, arbitrary compatibility percentages, fabricated social proof and live counts, online/distance/verified claims, emoji tags, guaranteed safety, mandatory browser zoom blocking. No new false feature states or fake audio waveforms.

Assets: locally served imagery extracted from the user's HTML; illustrative, potentially generated, not verified real people. Only image legibility overlays use gradients.

Invariants: preserve account-scoped server data, auth boundaries, adult validation, connection requirement for messages, blocking semantics and low-data mode. Preserve existing site's current audience (public at time of redesign); account details remain authenticated and private. No new biometric collection or GPS access. Voice recorder is optional, local session playback only. Verification is explicitly unavailable.

## iOS refinement — latest user direction

The selected Stitch content and imagery remain the basis. The user rejected the density of the initial implementation. The active layout therefore uses native system typography, semantic dark iOS surfaces, one coral accent, a full-width native-style tab bar and bottom sheets. Discover has one primary profile and a grouped list of other people. Location and intent live in a filter sheet. Prompts are in profile editing, not discovery. Nearby is a town list; the illustrative radar was removed. Connections is a single segmented control and grouped list. Chat has no introductory promotional cards. Desktop keeps only navigation and the main content column. No slogan banners, category carousels, glows, oversized match scores, decorative badges or empty planned-feature rows.

Onboarding was reduced to three steps: about you, preferences, and profile. A planned verification screen is not an onboarding task. Voice recording is optional and collapsed behind an explicit action.
