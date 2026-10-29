import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarDays, Footprints, MapPin } from "lucide-react";
import { useState } from "react";
import { events, people, photo, towns, update, useStore } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { useSession } from "@/hooks/use-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DemoNotice, ProfilePhoto, SafetyActions } from "@/components/community";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Nearby — NamLink" },
      { name: "description", content: "See sample profiles and plans around Namibia." },
      { property: "og:title", content: "Nearby — NamLink" },
    ],
  }),
  component: NearbyPage,
});

function NearbyPage() {
  const store = useStore();
  const { user, ready } = useSession();
  const [town, setTown] = useState<string>("Windhoek");
  const inTown = people.filter((person) => person.town === town);

  if (!ready)
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  if (user) return <LiveNearby key={user.id} userId={user.id} town={town} setTown={setTown} />;

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Nearby" />
      <DemoNotice />
      <div
        className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Choose a town"
      >
        {towns.map((place) => (
          <button
            key={place}
            type="button"
            aria-pressed={town === place}
            onClick={() => setTown(place)}
            className={
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
              (town === place
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground")
            }
          >
            {place}
          </button>
        ))}
      </div>

      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary">
            <Footprints className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Crossed paths</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              When location matching is available, this is where people you’ve crossed paths with
              will appear. This preview does not track background location.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between px-5">
          <div>
            <h2 className="text-[17px] font-semibold">{town}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Sample profiles</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Town view
          </span>
        </div>
        {inTown.length ? (
          <ul className="mt-3 space-y-2 px-5">
            {inTown.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <img
                  src={photo(person, true)}
                  alt={"Sample profile photo of " + person.name}
                  className="h-[62px] w-[62px] rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">
                    {person.name}, {person.age}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{person.job}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Sample profile</p>
                </div>
                <MapPin
                  aria-hidden="true"
                  className="mr-1 h-4 w-4 shrink-0 text-muted-foreground"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-5 mt-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No sample profiles in {town} yet. Choose another town.
          </p>
        )}
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between px-5">
          <div>
            <h2 className="text-[17px] font-semibold">Events</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Example events · preview only</p>
          </div>
          <CalendarDays className="mb-1 h-4 w-4 text-muted-foreground" />
        </div>
        <ul className="mt-3 space-y-2 px-5">
          {events.map((event) => {
            const interested = store.interestedEvents.includes(event.id);
            return (
              <motion.li
                key={event.id}
                layout
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.town} · Sample event
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={interested}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        interestedEvents: interested
                          ? s.interestedEvents.filter((id) => id !== event.id)
                          : [...s.interestedEvents, event.id],
                      }))
                    }
                    className={
                      "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold " +
                      (interested
                        ? "bg-secondary text-foreground"
                        : "bg-primary text-primary-foreground")
                    }
                  >
                    {interested ? "Interested" : "I’m interested"}
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

type NearbyProfile = {
  id: string;
  display_name: string;
  age: number;
  town: string;
  bio: string;
  tags: string[];
  intent: string;
  seeking: string;
};

function LiveNearby({
  userId,
  town,
  setTown,
}: {
  userId: string;
  town: string;
  setTown: (town: string) => void;
}) {
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["nearby", userId, town],
    queryFn: async () => {
      let request = supabase
        .from("profiles")
        .select("id,display_name,age,town,bio,tags,intent,seeking")
        .neq("id", userId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (town !== "All") request = request.eq("town", town);
      const { data, error } = await request;
      if (error) throw error;
      return data as NearbyProfile[];
    },
  });
  const selectLike = async (profile: NearbyProfile) => {
    const { error } = await supabase
      .from("decisions")
      .insert({ actor_id: userId, target_id: profile.id, liked: true });
    if (error) setNotice("We couldn't send that like. Please try again.");
    else setNotice(`Like sent to ${profile.display_name}. If they like you too, you’ll match.`);
    void client.invalidateQueries({ queryKey: ["nearby", userId] });
    window.setTimeout(() => setNotice(""), 2500);
  };
  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Nearby" eyebrow="People and plans around Namibia" />
      <div
        className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Choose a town"
      >
        {["All", ...towns].map((place) => (
          <button
            key={place}
            type="button"
            aria-pressed={town === place}
            onClick={() => setTown(place)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${town === place ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {place === "All" ? "All Namibia" : place}
          </button>
        ))}
      </div>
      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-[15px] font-semibold">Crossed paths</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Crossed paths will appear here when opted-in location matching is available. We don’t
          track your background location in this preview.
        </p>
      </section>
      <section className="mt-6">
        <div className="px-5">
          <h2 className="text-[17px] font-semibold">{town === "All" ? "Across Namibia" : town}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Profiles that meet your preferences
          </p>
        </div>
        {notice && (
          <p role="status" className="mx-5 mt-3 text-sm text-muted-foreground">
            {notice}
          </p>
        )}
        {query.isLoading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Finding people…</p>
        ) : (
          <ul className="mt-3 space-y-2 px-5">
            {query.data?.map((profile) => (
              <li key={profile.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <ProfilePhoto
                    name={profile.display_name}
                    className="h-[62px] w-[62px] rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {profile.display_name}, {profile.age}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {profile.town} · {profile.intent}
                    </p>
                  </div>
                  <button
                    onClick={() => void selectLike(profile)}
                    aria-label={`Like ${profile.display_name}`}
                    className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Like
                  </button>
                </div>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">{profile.bio}</p>
                {profile.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 border-t border-border pt-3">
                  <SafetyActions
                    userId={userId}
                    targetId={profile.id}
                    targetName={profile.display_name}
                    onBlocked={() => {
                      void client.invalidateQueries({ queryKey: ["nearby", userId] });
                    }}
                  />
                </div>
              </li>
            ))}
            {!query.data?.length && (
              <li className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No profiles in this town yet. Try another town.
              </li>
            )}
          </ul>
        )}
      </section>
      <section className="mt-7 px-5">
        <h2 className="text-[17px] font-semibold">Events</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Example plans · not yet connected to member accounts
        </p>
        <ul className="mt-3 space-y-2">
          {events
            .filter((event) => town === "All" || event.town === town)
            .map((event) => (
              <li key={event.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.town} · Sample event</p>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
