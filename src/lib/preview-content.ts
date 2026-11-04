import type { Msg, Person, Post, State } from "./namlink";

export const PREVIEW_SEED_VERSION = 2;

const conversations: { personId: string; minutesAgo: number; lines: string[] }[] = [
  {
    personId: "p1",
    minutesAgo: 8,
    lines: [
      "That road trip prompt got me. Where would you go first?",
      "Spreetshoogte, with a stop for apple pie on the way.",
      "Now that's a properly thought-out answer.",
      "Important question: who gets to choose the music?",
      "We take turns. I can be fair about this.",
      "Coffee first, then we can negotiate the playlist?",
      "Saturday morning works for me. Around ten?",
    ],
  },
  {
    personId: "p6",
    minutesAgo: 24,
    lines: [
      "You had me at excellent road trip snacks.",
      "I take the snack situation very seriously.",
      "What's in the bag?",
      "Biltong, naartjies, and something chocolate that will definitely melt.",
      "A solid selection. Lagoon walk this weekend?",
      "I'd like that. Are you free on Sunday?",
    ],
  },
  {
    personId: "p9",
    minutesAgo: 58,
    lines: [
      "What's the best hike you've done lately?",
      "Avis Dam early on Saturday. The light was lovely.",
      "That's my usual spot too!",
      "Then we should stop narrowly missing each other.",
      "Agreed. Next Saturday, coffee afterwards?",
      "Yes please. I'll find somewhere with good pastries.",
    ],
  },
  {
    personId: "p11",
    minutesAgo: 180,
    lines: [
      "I have a confession. I still have a borrowed book from 2019.",
      "The first step is admitting it.",
      "Will your bookshop accept an apology on my behalf?",
      "Only if you bring coffee. What was the book?",
      "A very battered copy of The Alchemist.",
      "That's worth a conversation. Come past when you're at the coast.",
    ],
  },
  {
    personId: "p12",
    minutesAgo: 420,
    lines: [
      "Here's my long-drive pick: anything by Salif Keita.",
      "Good choice. That's going on the playlist.",
      "What are you adding?",
      "A bit of old-school kwaito for the last hour.",
      "I think we'll get along.",
    ],
  },
  {
    personId: "p14",
    minutesAgo: 960,
    lines: [
      "Extra lemon is the correct answer.",
      "Finally, someone understands.",
      "Do you have a favourite spot by the lagoon?",
      "There's a bench just past the jetty. Best around sunset.",
      "That sounds like an easy first plan.",
      "Let's do it when you're next in Walvis.",
    ],
  },
  {
    personId: "p17",
    minutesAgo: 1320,
    lines: [
      "How is the pottery going?",
      "My first mug holds about three sips. Progress.",
      "That's an espresso cup. Very intentional.",
      "I'm using that explanation from now on.",
      "I'd love to hear the cinnamon bun recommendations too.",
    ],
  },
  {
    personId: "p18",
    minutesAgo: 2760,
    lines: [
      "What are you fixing on the bicycle?",
      "Everything except the bell. The bell is perfect.",
      "At least your priorities are clear.",
      "Small wins. How has your week been?",
      "Busy, but I'm looking forward to the market on Saturday.",
      "I might head there too. Coffee if our paths cross?",
    ],
  },
];

const postTexts = [
  "Anyone up for a sunrise at Dune 7? Coffee is on me. An early start is better with company.",
  "Looking for a gallery buddy for First Friday. We can compare wildly different interpretations over dinner afterwards.",
  "What's your favourite kapana spot in town? Taking recommendations very seriously this week.",
  "A first date doesn't need to be a big production. A walk, two coffees, and a conversation you don't want to end.",
  "Spent the afternoon making a bowl that leans slightly to the left. Calling it character. What have you tried for the first time lately?",
  "The coast is doing that thing where the fog clears just before sunset. This is your reminder to take the long way home.",
  "If we go camping, I'm cooking breakfast. You can be in charge of getting the kettle on before I wake up.",
  "Made enough bread for six people and there are only two of us at home. This keeps happening.",
  "Someone asked me my perfect Sunday and I realised it's mostly a list of things I want to eat.",
  "Trading one good song for one good song. Mine is the one you put on when you're finally out of town and the road opens up.",
  "I think seeing how someone treats the waiter tells you more than a carefully written bio ever could.",
  "Any runners here who are actually happy to go slowly? I'm more interested in the coffee stop than my pace.",
  "My dog has decided the beach belongs to him. Happy to introduce you to the unofficial mayor of Swakopmund.",
  "The best part of a road trip is the stop you didn't plan. Unless it's a flat tyre. Then the best part is whoever packed snacks.",
  "Trying a new recipe on Saturday. The plan is dinner for friends. The backup plan is takeaway and pretending that was the plan.",
  "A proper question: which Namibian place would you visit again tomorrow if you had the whole day free?",
  "I like people who can change their mind when they learn something new. About important things. And pizza toppings.",
  "Found a little second-hand bookshop and lost two hours. Tell me about the last place that made you forget to check the time.",
  "Looking for someone who will appreciate a quiet evening as much as a weekend away. We don't have to fill every silence.",
  "Weekend plan: hike, shower, nap, braai. Possibly in that order. Looking for a good trail recommendation near Windhoek.",
  "My favourite green flag is someone making a plan and actually following through. Very underrated.",
  "The riverside is beautiful this evening. Took my camera out and came home with thirty pictures of the same bird.",
  "A coffee date that accidentally turns into lunch is usually a good sign, right?",
  "I will happily let you be the DJ. But I do reserve the right to sing along badly.",
];

export function createPreviewContent(
  people: Person[],
  now: number,
): Pick<
  State,
  | "matches"
  | "chats"
  | "posts"
  | "postReplies"
  | "liked"
  | "saved"
  | "likedPosts"
  | "savedPosts"
  | "interestedEvents"
> {
  const chats: Record<string, Msg[]> = {};
  for (const conversation of conversations) {
    chats[conversation.personId] = conversation.lines.map((text, index) => ({
      id: `seed-${conversation.personId}-${index}`,
      from: index % 2 === 0 ? "them" : "me",
      text,
      at: now - (conversation.minutesAgo + (conversation.lines.length - 1 - index) * 6) * 60_000,
    }));
  }
  const authors = [people[5]!, people[2]!, people[4]!, ...people];
  const posts: Post[] = postTexts.map((text, index) => {
    const author = authors[index % authors.length]!;
    return {
      id: `seed-post-${index + 1}`,
      authorName: author.name,
      town: author.town,
      text,
      at: now - (index * 75 + 18) * 60_000,
      replies: 0,
      sample: true,
    };
  });
  posts.unshift({
    id: "seed-post-mine",
    authorName: "Alex",
    town: "Windhoek",
    mine: true,
    sample: true,
    text: "Saturday morning market, then coffee? I'd love to hear about a book, song, or place you've been enjoying lately.",
    at: now - 2 * 3_600_000,
    replies: 3,
  });
  const matches = [...conversations.map(({ personId }) => personId), "p3", "p13", "p19", "p20"];
  return {
    matches,
    chats,
    posts,
    liked: matches,
    saved: ["p4", "p7"],
    likedPosts: ["seed-post-2", "seed-post-7"],
    savedPosts: ["seed-post-4"],
    interestedEvents: ["e1"],
    postReplies: {
      "seed-post-mine": [
        {
          id: "seed-reply-1",
          postId: "seed-post-mine",
          from: "member",
          personId: "p9",
          text: "I'm in. There's a pastry stall I keep meaning to try. Shall we meet near the entrance?",
          at: now - 80 * 60_000,
          sample: true,
        },
        {
          id: "seed-reply-2",
          postId: "seed-post-mine",
          from: "member",
          personId: "p10",
          text: "That sounds like my kind of Saturday. I've just finished a book I'd happily lend you.",
          at: now - 45 * 60_000,
          sample: true,
        },
        {
          id: "seed-reply-3",
          postId: "seed-post-mine",
          from: "member",
          personId: "p17",
          text: "Coffee and book recommendations? I could be persuaded. What time were you thinking?",
          at: now - 12 * 60_000,
          sample: true,
        },
      ],
      "seed-post-2": [
        {
          id: "seed-reply-sent",
          postId: "seed-post-2",
          from: "me",
          personId: "self",
          text: "I'd enjoy that. Which gallery are you starting with?",
          at: now - 30 * 60_000,
          sample: true,
        },
      ],
    },
  };
}
