import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { people, photo, update, useStore, type Person } from "@/lib/namlink";
import { SampleVoiceIntro } from "@/components/voice-intro";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export const Route = createFileRoute("/crossed-paths")({
  head: () => ({ meta: [{ title: "Crossed paths — Mutal" }] }),
  component: CrossedPaths,
});

type CrossingEntry = {
  id: string;
  displayName: string;
  age: number;
  place: string;
  when: string;
  avatar: string;
  person: Person;
  highlighted?: boolean;
};

const crossings: CrossingEntry[] = [
  {
    id: "cp-1",
    displayName: "Nadia",
    age: 26,
    place: "Near Grove Mall",
    when: "2 hrs ago",
    avatar: "/editorial/amara-small.jpg",
    person: people[2]!,
    highlighted: true,
  },
  {
    id: "cp-2",
    displayName: "Daniel",
    age: 28,
    place: "Near Maerua Mall",
    when: "5 hrs ago",
    avatar: photo(people[5]!, true),
    person: people[5]!,
  },
  {
    id: "cp-3",
    displayName: "Selma",
    age: 27,
    place: "Near Wernhil",
    when: "1 day ago",
    avatar: "/editorial/selma-small.jpg",
    person: people[4]!,
  },
  {
    id: "cp-4",
    displayName: "Jason",
    age: 30,
    place: "Near Joe’s Beerhouse",
    when: "1 day ago",
    avatar: "/editorial/johannes-small.jpg",
    person: people[3]!,
  },
  {
    id: "cp-5",
    displayName: "Leandra",
    age: 26,
    place: "Near Avani Hotel",
    when: "2 days ago",
    avatar: photo(people[0]!, true),
    person: people[0]!,
  },
  {
    id: "cp-6",
    displayName: "Tiana",
    age: 25,
    place: "Near Windhoek Gym",
    when: "2 days ago",
    avatar: "/editorial/leah-small.jpg",
    person: people[1]!,
  },
  {
    id: "cp-7",
    displayName: "Ruben",
    age: 29,
    place: "Near Fabric Lounge",
    when: "3 days ago",
    avatar: "/editorial/michael-small.jpg",
    person: people[7]!,
  },
  {
    id: "cp-8",
    displayName: "Mila",
    age: 27,
    place: "Near Independence Ave",
    when: "3 days ago",
    avatar: "/editorial/tuli-small.jpg",
    person: people[6]!,
  },
];

function CrossedPaths() {
  const { user } = useSession();
  const store = useStore();
  const [selected, setSelected] = useState<CrossingEntry | null>(null);
  const likeSelected = () => {
    if (!selected) return;
    const person = selected.person;
    update((current) => {
      if (current.liked.includes(person.id)) return current;
      const matched = !!person.mutualInterest;
      return {
        ...current,
        liked: [...current.liked, person.id],
        matches: matched ? [...current.matches, person.id] : current.matches,
        chats:
          matched && !current.chats[person.id]
            ? { ...current.chats, [person.id]: [] }
            : current.chats,
      };
    });
  };
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-24">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/radar" aria-label="Back to Nearby">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-[15px] font-semibold">Crossed paths</h1>
      </header>
      <p className="px-5 py-2 text-[13px] leading-5 text-muted-foreground">
        People you’ve recently crossed paths with in Windhoek. Locations are approximate.
      </p>
      {user && (
        <p className="px-5 pb-2 text-[11px] text-muted-foreground">
          Sample crossings preview · live background location is opt-in only.
        </p>
      )}
      <ul className="divide-y divide-border px-5">
        {crossings.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="flex w-full items-center gap-3 py-3 text-left"
              aria-label={`View ${item.displayName}'s profile`}
            >
              <img
                src={item.avatar}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {item.displayName} {item.age}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.place} · {item.when}
                </p>
              </div>
              {item.highlighted ? (
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="mx-auto max-w-md rounded-t-[24px] bg-white pb-8">
          {selected && (
            <>
              <img
                src={photo(selected.person)}
                alt={`${selected.displayName}'s profile`}
                className="h-52 w-full bg-foreground object-contain"
              />
              <div className="px-5">
                <DrawerHeader className="px-0 text-left">
                  <DrawerTitle>
                    {selected.displayName}, {selected.age}
                  </DrawerTitle>
                </DrawerHeader>
                <p className="text-xs text-muted-foreground">
                  {selected.place} · {selected.when}
                </p>
                <p className="mt-3 text-sm leading-6">{selected.person.bio}</p>
                <p className="mt-3 text-xs font-semibold">Looking for</p>
                <p className="mt-1 text-sm text-primary">{selected.person.intent}</p>
                <SampleVoiceIntro />
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={likeSelected}
                    disabled={store.liked.includes(selected.person.id)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Heart className="h-4 w-4" />{" "}
                    {store.liked.includes(selected.person.id)
                      ? "Liked"
                      : `Like ${selected.displayName}`}
                  </button>
                  {store.matches.includes(selected.person.id) && (
                    <Link
                      to="/chats"
                      search={{ matchId: selected.person.id }}
                      className="flex h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 text-sm font-semibold text-primary"
                    >
                      <MessageCircle className="h-4 w-4" /> Chat
                    </Link>
                  )}
                </div>
                {!store.matches.includes(selected.person.id) && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Chat opens when you both choose to connect.
                  </p>
                )}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
