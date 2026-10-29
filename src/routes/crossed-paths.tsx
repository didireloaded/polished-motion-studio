import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Heart, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { people, photo, update, useStore, type Person } from "@/lib/namlink";
import { SampleVoiceIntro } from "@/components/voice-intro";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export const Route = createFileRoute("/crossed-paths")({
  head: () => ({ meta: [{ title: "Crossed paths — Mutal" }] }),
  component: CrossedPaths,
});

const samplePlaces: Record<string, string> = {
  Windhoek: "Grove Mall",
  Swakopmund: "Long Beach",
  "Walvis Bay": "Dune 7",
  Oshakati: "Oshakati town centre",
  Otjiwarongo: "central Otjiwarongo",
  Rundu: "central Rundu",
};

function CrossedPaths() {
  const { user } = useSession();
  const store = useStore();
  const [selected, setSelected] = useState<Person | null>(null);
  const likeSelected = () => {
    if (!selected) return;
    update((current) => {
      if (current.liked.includes(selected.id)) return current;
      const matched = !!selected.mutualInterest;
      return {
        ...current,
        liked: [...current.liked, selected.id],
        matches: matched ? [...current.matches, selected.id] : current.matches,
        chats:
          matched && !current.chats[selected.id]
            ? { ...current.chats, [selected.id]: [] }
            : current.chats,
      };
    });
  };
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-8">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/radar" aria-label="Back to Nearby">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-[15px] font-semibold">Crossed paths</h1>
      </header>
      {user ? (
        <div className="px-5 pt-8 text-center">
          <MapPin className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Coming to Nearby</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Crossed paths will require your permission and will show approximate areas only.
            Location tracking is not active yet.
          </p>
          <Link
            to="/radar"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Explore nearby
          </Link>
        </div>
      ) : (
        <>
          <p className="px-5 py-3 text-[13px] leading-5">
            A preview of how recent crossings could appear. These are sample profiles and places.
          </p>
          <ul className="divide-y divide-border px-5">
            {people.slice(0, 6).map((person, index) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setSelected(person)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                  aria-label={`View ${person.name}'s sample profile`}
                >
                  <img
                    src={photo(person, true)}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {person.name} {person.age}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sample · near {samplePlaces[person.town] ?? person.town} · {index + 2} hrs ago
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="mx-auto max-w-md rounded-t-[24px] bg-white pb-8">
          {selected && (
            <>
              <img
                src={photo(selected)}
                alt={`${selected.name}'s sample profile`}
                className="h-52 w-full bg-foreground object-contain"
              />
              <div className="px-5">
                <DrawerHeader className="px-0 text-left">
                  <DrawerTitle>
                    {selected.name}, {selected.age}
                  </DrawerTitle>
                </DrawerHeader>
                <p className="text-xs text-muted-foreground">
                  {selected.town} · {selected.job} · Sample profile
                </p>
                <p className="mt-3 text-sm leading-6">{selected.bio}</p>
                <p className="mt-3 text-xs font-semibold">Looking for</p>
                <p className="mt-1 text-sm text-primary">{selected.intent}</p>
                <SampleVoiceIntro />
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={likeSelected}
                    disabled={store.liked.includes(selected.id)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Heart className="h-4 w-4" />{" "}
                    {store.liked.includes(selected.id) ? "Liked" : `Like ${selected.name}`}
                  </button>
                  {store.matches.includes(selected.id) && (
                    <Link
                      to="/chats"
                      search={{ matchId: undefined }}
                      className="flex h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 text-sm font-semibold text-primary"
                    >
                      <MessageCircle className="h-4 w-4" /> Chat
                    </Link>
                  )}
                </div>
                {!store.matches.includes(selected.id) && (
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
