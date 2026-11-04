# Mutal product and design direction

## Product point of view

Mutal is a calm, photo-first dating app for people in Namibia. It should help members notice a person, understand their intentions, and choose a real next step. Measure the quality of a screen by how clearly it supports that decision, not by how many decorative elements it contains.

The visual reference is a polished native iPhone dating app, adapted to Mutal's own identity. Keep the existing five-tab navigation, white canvas, charcoal text, and red accent. Keep the current map and its behavior. AI supports matching and planning in the background; member-facing labels and copy do not advertise AI.

## Interface decisions

- Start from the actual screen task and its important content. Discovery prioritizes the person's photos and profile; Chats prioritizes matches and conversations; Nearby prioritizes the map and people or activities around it; Posts prioritizes readable member posts and private replies; You prioritizes profile completion and account controls.
- Use the approved palette and type scale in `src/styles.css`. Red marks meaningful actions or state. Do not add another palette, decorative gradient, glow, or texture without a product reason.
- Use solid surfaces. Reserve borders, shadows, and rounded corners for hierarchy and touch affordance; do not put every element in an elevated card or make every control a pill.
- Keep profile photography intentional. Preserve the subject and useful context; choose `object-fit` and positioning for the source image instead of accepting accidental crops. Use a gentle fade only where it improves text legibility or the transition into profile details.
- Let each screen's content set its composition. Avoid repeating a landing-page hero, identical feature-card grids, editorial oversizing, or a dashboard pattern where it does not fit the task.
- Use icons only when they clarify an action. Avoid decorative sparkles, emoji, generic AI marks, and labels that repeat the nearby heading.
- Write member copy in concrete, conversational language. Remove corporate filler, unsupported claims, and explanations that do not help the member decide or act.
- Animate a meaningful transition or state change in response to a member action. Keep motion short, avoid perpetual loops, and honor reduced-motion preferences.

## Product truth and interaction quality

- Never pass demo profiles, simulated activity, or local-only state off as live member data. Label previews clearly.
- Every control has a real action, a clear disabled state, or an honest unavailable state. Loading, empty, error, and success states explain what is happening and what the member can do next.
- Keep location, safety, matching, messaging, and privacy behavior aligned with backend authorization and the product's consent rules.
- Do not expose AI implementation details, invented social proof, fake attendance counts, or unsupported claims in member-facing copy.

## Mobile craft

- Design the phone layout first; reflow hierarchy and navigation intentionally on wider screens instead of merely stretching the phone view.
- Check narrow phone widths, safe areas, keyboard overlap, scroll behavior, and image aspect ratios in the actual preview.
- Keep primary touch targets at least 44 CSS pixels where practical. Provide visible focus, readable contrast, semantic labels, and reduced-motion support.
- Review each changed screen in realistic loading, empty, signed-out, signed-in, and error states when applicable.

## Code craft

- Put behavior in the component, hook, function, or server boundary that owns the invariant. Reuse existing patterns when they fit; avoid speculative wrappers and duplicate state.
- Name values and functions for the data and action they represent. Prefer explicit boundary validation and narrow types over broad casts or vague plumbing.
- Remove dead controls, placeholder handlers, redundant comments, and abstractions that do not reduce real complexity. Keep comments for intent, constraints, security, or non-obvious behavior.
- Make the smallest coherent change that satisfies the feature. Do not remove authorization, accessibility, error handling, or meaningful tests in the name of brevity.

## Review before shipping UI

- Can a member tell what this screen is for and what to do next?
- Does the layout use Mutal's identity and real product content rather than a generic generated template?
- Are repeated cards, badges, shadows, pills, gradients, icons, and animations each serving a clear purpose?
- Do images, navigation, and controls behave correctly on a phone and with assistive technology?
- Are all claims and visible activity real, or plainly identified as preview content?
