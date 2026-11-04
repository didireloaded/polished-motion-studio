import { useSyncExternalStore } from "react";
import { additionalPreviewPeople } from "./preview-profiles";
import { createPreviewContent, PREVIEW_SEED_VERSION } from "./preview-content";

export const towns = [
  "Windhoek",
  "Swakopmund",
  "Walvis Bay",
  "Oshakati",
  "Otjiwarongo",
  "Rundu",
] as const;
export const interests = [
  "Coffee",
  "Road trips",
  "Live music",
  "Hiking",
  "Art & design",
  "Food",
  "Beach days",
  "Photography",
  "Amapiano",
  "Camping",
];
export const sampleChoices: Record<string, { prompt: string; answer: string }> = {
  p1: { prompt: "A free Saturday", answer: "A road trip" },
  p2: { prompt: "A free Saturday", answer: "A slow morning" },
  p3: { prompt: "An evening out", answer: "Live music" },
  p4: { prompt: "An evening out", answer: "Dinner for two" },
  p5: { prompt: "A free Saturday", answer: "A slow morning" },
  p6: { prompt: "My coffee order", answer: "Iced coffee" },
  p7: { prompt: "A free Saturday", answer: "A road trip" },
  p8: { prompt: "My coffee order", answer: "Flat white" },
};

export type Person = {
  id: string;
  name: string;
  age: number;
  town: string;
  job: string;
  photo: string;
  designPhoto?: string;
  gallery?: string[];
  verified?: boolean;
  tags: string[];
  prompt: string;
  answer: string;
  bio: string;
  intent: string;
  mutualInterest?: boolean;
  photoPosition?: string;
  recommendationReason?: string;
  voiceIntroPath?: string | null;
  photoPaths?: string[];
};

export const people: Person[] = [
  {
    id: "p1",
    name: "Leandra",
    age: 26,
    town: "Windhoek",
    job: "Marketing Executive",
    photo: "ndapewa",
    designPhoto: "/design/lead-woman.jpg",
    gallery: ["/design/lead-woman.jpg", "/editorial/ndapewa.jpg", "/design/event-rooftop.jpg"],
    verified: true,
    photoPosition: "68% 34%",
    tags: ["Art & design", "Coffee", "Road trips"],
    prompt: "The way to my heart is",
    answer: "A good playlist, an open road, and no particular rush to get home.",
    bio: "Building things during the week. Finding a little space to breathe on the weekends. Usually the one stopping for a photo.",
    intent: "A relationship",
    mutualInterest: true,
  },
  {
    id: "p2",
    name: "Leah",
    age: 25,
    town: "Swakopmund",
    job: "Creative with a coastal soul",
    photo: "leah",
    gallery: ["/editorial/leah.jpg", "/design/event-beach.jpg"],
    verified: true,
    photoPosition: "35% 34%",
    tags: ["Beach days", "Photography", "Coffee"],
    prompt: "My perfect Sunday",
    answer: "A slow coffee, salty air, and a walk that turns into an entire afternoon.",
    bio: "Coast girl. Film photos, second-hand bookshops, and cooking for people I like. Tell me your favourite spot by the sea.",
    intent: "A relationship",
    mutualInterest: true,
  },
  {
    id: "p3",
    name: "Amara",
    age: 27,
    town: "Windhoek",
    job: "Designer. Occasionally a DJ.",
    photo: "amara",
    gallery: ["/editorial/amara.jpg", "/design/event-rooftop.jpg"],
    verified: true,
    tags: ["Live music", "Art & design", "Amapiano"],
    prompt: "We’ll get along if",
    answer: "You have a song for every mood and you’re not afraid of the dance floor.",
    bio: "A little city energy, a little desert quiet. Making room for someone who is curious about both.",
    intent: "Open to exploring",
  },
  {
    id: "p4",
    name: "Johannes",
    age: 29,
    town: "Windhoek",
    job: "Engineer, amateur braai master",
    photo: "johannes",
    gallery: ["/editorial/johannes.jpg", "/editorial/dunes.jpg"],
    verified: true,
    tags: ["Hiking", "Camping", "Food"],
    prompt: "A small hill I’ll die on",
    answer: "The best conversations happen around a fire. I’ll bring the wood.",
    bio: "Prefer early starts and the scenic route. Looking for a real connection and someone to split the last piece of garlic bread with.",
    intent: "A relationship",
  },
  {
    id: "p5",
    name: "Selma",
    age: 24,
    town: "Oshakati",
    job: "Teacher & a very good listener",
    photo: "selma",
    gallery: ["/editorial/selma.jpg", "/design/auth-landscape.jpg"],
    tags: ["Food", "Road trips", "Live music"],
    prompt: "Something I’d love to learn",
    answer: "How to grow a garden that actually survives my travel plans.",
    bio: "Big family, small circle. Good food and honest conversations are my kind of evening.",
    intent: "A relationship",
  },
  {
    id: "p6",
    name: "Daniel",
    age: 28,
    town: "Walvis Bay",
    job: "Ocean air, every day",
    photo: "daniel",
    designPhoto: "/design/lead-man.jpg",
    gallery: ["/design/lead-man.jpg", "/editorial/daniel.jpg", "/editorial/dunes.jpg"],
    verified: true,
    tags: ["Beach days", "Coffee", "Photography"],
    prompt: "Let’s make a plan to",
    answer:
      "Watch the flamingos, find the best fish and chips, and miss the sunset by five minutes.",
    bio: "Marine life enthusiast. A terrible singer with excellent road trip snacks. Looking for someone who laughs easily.",
    intent: "Open to exploring",
    mutualInterest: true,
  },
  {
    id: "p7",
    name: "Tuli",
    age: 26,
    town: "Otjiwarongo",
    job: "Conservationist & trail seeker",
    photo: "tuli",
    gallery: ["/editorial/tuli.jpg", "/design/auth-landscape.jpg"],
    photoPosition: "26% 34%",
    tags: ["Hiking", "Camping", "Photography"],
    prompt: "My happy place",
    answer: "Somewhere with no signal, a big sky, and the kettle just starting to boil.",
    bio: "Working to protect the wild places I love. Usually outdoors. Always happy to talk about birds.",
    intent: "A relationship",
  },
  {
    id: "p8",
    name: "Michael",
    age: 30,
    town: "Rundu",
    job: "Chef, collecting little adventures",
    photo: "michael",
    gallery: ["/editorial/michael.jpg", "/design/event-rooftop.jpg"],
    verified: true,
    tags: ["Food", "Road trips", "Art & design"],
    prompt: "I’ll cook you",
    answer: "Something that takes all afternoon, with a story for every ingredient.",
    bio: "Back home after a few years away. Rediscovering all my favourite corners of Namibia.",
    intent: "A relationship",
  },
  ...additionalPreviewPeople,
];

export const photo = (p: Person, small = false) =>
  p.designPhoto ?? `/editorial/${p.photo}${small ? "-small" : ""}.jpg`;

export type Msg = { id: string; from: "me" | "them"; text: string; at: number };
export type Post = {
  id: string;
  authorName: string;
  text: string;
  town: string;
  at: number;
  replies: number;
  mine?: boolean;
  sample?: boolean;
};
export type PrivateReply = {
  id: string;
  postId: string;
  from: "me" | "member";
  personId?: string;
  text: string;
  at: number;
  sample?: boolean;
};
export const events = [
  {
    id: "e1",
    title: "Sunset Social",
    town: "Windhoek",
    sample: true,
    venue: "The Stellenbosch Wine Bar",
    image: "/design/event-rooftop.jpg",
    when: "Friday · 18:30",
    interestedCount: 12,
    extraCount: 8,
  },
  {
    id: "e2",
    title: "Beach Day Hangout",
    town: "Swakopmund",
    sample: true,
    venue: "Long Beach",
    image: "/design/event-beach.jpg",
    when: "Saturday · 14:00",
    interestedCount: 28,
    extraCount: 24,
  },
  {
    id: "e3",
    title: "Sunrise at Dune 7",
    town: "Walvis Bay",
    sample: true,
    venue: "Dune 7",
    image: "/editorial/dunes.jpg",
    when: "Sunday · 06:00",
    interestedCount: 16,
    extraCount: 12,
  },
  {
    id: "e4",
    title: "Coffee & the Morning Market",
    town: "Windhoek",
    sample: true,
    venue: "Green Market",
    image: "/editorial/coffee.jpg",
    when: "Saturday · 09:00",
    interestedCount: 0,
    extraCount: 0,
  },
  {
    id: "e5",
    title: "An Evening of Live Music",
    town: "Oshakati",
    sample: true,
    venue: "Town centre",
    image: "/design/event-rooftop.jpg",
    when: "Friday · 19:00",
    interestedCount: 0,
    extraCount: 0,
  },
  {
    id: "e6",
    title: "Riverside Picnic",
    town: "Rundu",
    sample: true,
    venue: "Kavango riverfront",
    image: "/design/auth-landscape.jpg",
    when: "Sunday · 15:00",
    interestedCount: 0,
    extraCount: 0,
  },
];
export type State = {
  previewSeedVersion: number;
  liked: string[];
  passed: string[];
  saved: string[];
  matches: string[];
  chats: Record<string, Msg[]>;
  posts: Post[];
  postReplies: Record<string, PrivateReply[]>;
  interestedEvents: string[];
  likedPosts: string[];
  savedPosts: string[];
  profile: {
    name: string;
    age: number;
    town: string;
    bio: string;
    tags: string[];
    intent: string;
    choices: Record<string, string>;
  };
};

const initial: State = {
  ...createPreviewContent(people, Date.now()),
  previewSeedVersion: PREVIEW_SEED_VERSION,
  passed: [],
  profile: {
    name: "Alex",
    age: 27,
    town: "Windhoek",
    bio: "Coffee walks, a good book, and a road trip when the weekend allows. Looking for someone curious and kind.",
    tags: ["Coffee", "Road trips", "Hiking"],
    intent: "A relationship",
    choices: {},
  },
};

export function restorePreviewState(saved: Partial<State>): State {
  const restored: State = {
    ...initial,
    ...saved,
    profile: { ...initial.profile, ...saved.profile, choices: saved.profile?.choices ?? {} },
  };
  if ((saved.previewSeedVersion ?? 0) < PREVIEW_SEED_VERSION) {
    const retainedPosts = (saved.posts ?? []).filter(
      (post) => !["s1", "s2", "s3"].includes(post.id),
    );
    const postIds = new Set(retainedPosts.map((post) => post.id));
    restored.posts = [
      ...retainedPosts,
      ...initial.posts.filter((post) => !postIds.has(post.id)),
    ].sort((a, b) => b.at - a.at);
    const seededMatches = initial.matches.filter((id) => !saved.passed?.includes(id));
    restored.matches = Array.from(new Set([...seededMatches, ...(saved.matches ?? [])]));
    restored.liked = Array.from(new Set([...seededMatches, ...(saved.liked ?? [])]));
    restored.chats = {
      ...Object.fromEntries(
        Object.entries(initial.chats).filter(([id]) => seededMatches.includes(id)),
      ),
      ...saved.chats,
    };
    restored.postReplies = { ...initial.postReplies, ...saved.postReplies };
    restored.previewSeedVersion = PREVIEW_SEED_VERSION;
    if (!saved.profile?.name.trim())
      restored.profile = { ...initial.profile, ...restored.profile, name: initial.profile.name };
    restored.posts = restored.posts.map((post) =>
      post.id === "seed-post-mine" ? { ...post, authorName: restored.profile.name } : post,
    );
  }
  return restored;
}

const KEY = "namlink-state-v1";
let state: State = initial;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      state = restorePreviewState(saved);
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    /* ignore invalid local demo data */
  }
}

export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

export function useStore() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      load();
      cb();
      return () => subs.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => initial,
  );
}

export const toggle = (arr: string[], id: string) =>
  arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
