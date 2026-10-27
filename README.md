# NamLink design preview

A light, photo-led mobile interface for a Namibia-focused dating app. The five tabs are Home, Nearby, Posts, Chats, and You. Nearby lets people browse by town; it does not track or reveal live location. Motion responds to navigation, town selection, cards, and messages, with reduced-motion support.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run `npm run build`, `npm test`, and `npx tsc --noEmit` before pushing.

## Preview boundary

This repository is the visual and interaction prototype from Lovable. The people and posts are fictional samples. Likes, posts, and sample chat messages are stored in the current browser with localStorage. There is no account sign-in, real member discovery, private reply delivery, or background GPS in this repository yet. The existing hosted NamLink development preview has separate server-backed community features.

The `sites-fullstack` branch preserves the source of that hosted development preview. It has a different runtime and is not automatically updated by changes to this branch.

The interface uses visible Like and Pass controls. The photo stack does not require a swipe gesture. The Nearby screen presents place and people, without a scanner or simulated distance.

## Source

- `src/routes/`: five tab screens
- `src/components/TabBar.tsx`: shared navigation and headings
- `src/styles.css`: warm light palette, typography, and motion styles
- `src/lib/namlink.ts`: sample people and browser preview state

This project remains connected to [Lovable](https://lovable.dev/projects/01804eef-1c82-496a-b1ef-dacee9edd43c); commits pushed to `main` sync back to its editor.
