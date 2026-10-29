import { useSyncExternalStore } from "react";

export const towns = ["Windhoek", "Swakopmund", "Walvis Bay", "Oshakati", "Otjiwarongo", "Rundu"] as const;
export const interests = ["Coffee", "Road trips", "Live music", "Hiking", "Art & design", "Food", "Beach days", "Photography", "Amapiano", "Camping"];
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
  id: string; name: string; age: number; town: string; job: string; photo: string;
  tags: string[]; prompt: string; answer: string; bio: string; intent: string; mutualInterest?: boolean; photoPosition?: string;
};

export const people: Person[] = [
  { id: "p1", name: "Ndapewa", age: 26, town: "Windhoek", job: "Architect & weekend explorer", photo: "ndapewa", photoPosition: "68% 34%", tags: ["Art & design", "Coffee", "Road trips"], prompt: "The way to my heart is", answer: "A good playlist, an open road, and no particular rush to get home.", bio: "Building things during the week. Finding a little space to breathe on the weekends. Usually the one stopping for a photo.", intent: "A relationship", mutualInterest: true },
  { id: "p2", name: "Leah", age: 25, town: "Swakopmund", job: "Creative with a coastal soul", photo: "leah", photoPosition: "35% 34%", tags: ["Beach days", "Photography", "Coffee"], prompt: "My perfect Sunday", answer: "A slow coffee, salty air, and a walk that turns into an entire afternoon.", bio: "Coast girl. Film photos, second-hand bookshops, and cooking for people I like. Tell me your favourite spot by the sea.", intent: "A relationship" },
  { id: "p3", name: "Amara", age: 27, town: "Windhoek", job: "Designer. Occasionally a DJ.", photo: "amara", tags: ["Live music", "Art & design", "Amapiano"], prompt: "We’ll get along if", answer: "You have a song for every mood and you’re not afraid of the dance floor.", bio: "A little city energy, a little desert quiet. Making room for someone who is curious about both.", intent: "Open to exploring" },
  { id: "p4", name: "Johannes", age: 29, town: "Windhoek", job: "Engineer, amateur braai master", photo: "johannes", tags: ["Hiking", "Camping", "Food"], prompt: "A small hill I’ll die on", answer: "The best conversations happen around a fire. I’ll bring the wood.", bio: "Prefer early starts and the scenic route. Looking for a real connection and someone to split the last piece of garlic bread with.", intent: "A relationship" },
  { id: "p5", name: "Selma", age: 24, town: "Oshakati", job: "Teacher & a very good listener", photo: "selma", tags: ["Food", "Road trips", "Live music"], prompt: "Something I’d love to learn", answer: "How to grow a garden that actually survives my travel plans.", bio: "Big family, small circle. Good food and honest conversations are my kind of evening.", intent: "A relationship" },
  { id: "p6", name: "Daniel", age: 28, town: "Walvis Bay", job: "Ocean air, every day", photo: "daniel", tags: ["Beach days", "Coffee", "Photography"], prompt: "Let’s make a plan to", answer: "Watch the flamingos, find the best fish and chips, and miss the sunset by five minutes.", bio: "Marine life enthusiast. A terrible singer with excellent road trip snacks. Looking for someone who laughs easily.", intent: "Open to exploring" },
  { id: "p7", name: "Tuli", age: 26, town: "Otjiwarongo", job: "Conservationist & trail seeker", photo: "tuli", photoPosition: "26% 34%", tags: ["Hiking", "Camping", "Photography"], prompt: "My happy place", answer: "Somewhere with no signal, a big sky, and the kettle just starting to boil.", bio: "Working to protect the wild places I love. Usually outdoors. Always happy to talk about birds.", intent: "A relationship" },
  { id: "p8", name: "Michael", age: 30, town: "Rundu", job: "Chef, collecting little adventures", photo: "michael", tags: ["Food", "Road trips", "Art & design"], prompt: "I’ll cook you", answer: "Something that takes all afternoon, with a story for every ingredient.", bio: "Back home after a few years away. Rediscovering all my favourite corners of Namibia.", intent: "A relationship" },
];

export const photo = (p: Person, small = false) => `/editorial/${p.photo}${small ? "-small" : ""}.jpg`;

export type Msg = { id: string; from: "me" | "them"; text: string; at: number };
export type Post = { id: string; text: string; town: string; at: number; replies: number; mine?: boolean; sample?: boolean };
export type PrivateReply = { id: string; postId: string; from: "me" | "member"; personId?: string; text: string; at: number; sample?: boolean };
export const events = [
  { id: "e1", title: "Coffee and a coastal walk", town: "Swakopmund", sample: true },
  { id: "e2", title: "First Friday gallery visit", town: "Windhoek", sample: true },
  { id: "e3", title: "Sunrise at Dune 7", town: "Walvis Bay", sample: true },
];
export type State = {
  liked: string[]; passed: string[]; saved: string[]; matches: string[];
  chats: Record<string, Msg[]>;
  posts: Post[];
  postReplies: Record<string, PrivateReply[]>;
  interestedEvents: string[];
  profile: { name: string; age: number; town: string; bio: string; tags: string[]; intent: string; choices: Record<string, string> };
};

const initial: State = {
  liked: [], passed: [], saved: [], matches: [], chats: {}, postReplies: {}, interestedEvents: [],
  posts: [
    { id: "s1", text: "Anyone up for a sunrise at Dune 7? Coffee is on me.", town: "Walvis Bay", at: Date.now() - 36e5 * 3, replies: 0, sample: true },
    { id: "s2", text: "Looking for a gallery buddy for First Friday.", town: "Windhoek", at: Date.now() - 36e5 * 9, replies: 0, sample: true },
    { id: "s3", text: "What’s your favourite kapana spot in town?", town: "Oshakati", at: Date.now() - 36e5 * 26, replies: 0, sample: true },
  ],
  profile: { name: "", age: 25, town: "Windhoek", bio: "", tags: [], intent: "A relationship", choices: {} },
};

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
      state = {
        ...initial,
        ...saved,
        matches: saved.matches ?? [],
        postReplies: saved.postReplies ?? {},
        interestedEvents: saved.interestedEvents ?? [],
        profile: { ...initial.profile, ...saved.profile, choices: saved.profile?.choices ?? {} },
      };
    }
  } catch { /* ignore invalid local demo data */ }
}

export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export function useStore() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); load(); cb(); return () => subs.delete(cb); },
    () => { load(); return state; },
    () => initial,
  );
}

export const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 24) return `${h}h`; return `${Math.round(h / 24)}d`;
}
