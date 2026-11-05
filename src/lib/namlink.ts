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

export type Person = {
  id: string;
  name: string;
  age: number;
  town: string;
  job: string;
  tags: string[];
  prompt: string;
  answer: string;
  bio: string;
  intent: string;
  recommendationReason?: string;
  voiceIntroPath?: string | null;
  photoPaths?: string[];
};

export function timeAgo(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
