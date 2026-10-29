import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarDays, Footprints, MapPin } from "lucide-react";
import { useState } from "react";
import { events, people, photo, towns, update, useStore } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

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
  const [town, setTown] = useState<(typeof towns)[number]>("Windhoek");
  const inTown = people.filter((person) => person.town === town);

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Nearby" />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2" role="group" aria-label="Choose a town">
        {towns.map((place) => (
          <button key={place} type="button" aria-pressed={town === place} onClick={() => setTown(place)}
            className={"shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
              (town === place ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}>
            {place}
          </button>
        ))}
      </div>

      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary"><Footprints className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Crossed paths</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">When location matching is available, this is where people you’ve crossed paths with will appear. This preview does not track background location.</p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between px-5">
          <div><h2 className="text-[17px] font-semibold">{town}</h2><p className="mt-0.5 text-xs text-muted-foreground">Sample profiles</p></div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Town view</span>
        </div>
        {inTown.length ? (
          <ul className="mt-3 space-y-2 px-5">
            {inTown.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <img src={photo(person, true)} alt={"Sample profile photo of " + person.name} className="h-[62px] w-[62px] rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{person.name}, {person.age}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{person.job}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Sample profile</p>
                </div>
                <MapPin aria-hidden="true" className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-5 mt-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">No sample profiles in {town} yet. Choose another town.</p>
        )}
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between px-5">
          <div><h2 className="text-[17px] font-semibold">Events</h2><p className="mt-0.5 text-xs text-muted-foreground">Example events · preview only</p></div>
          <CalendarDays className="mb-1 h-4 w-4 text-muted-foreground" />
        </div>
        <ul className="mt-3 space-y-2 px-5">
          {events.map((event) => {
            const interested = store.interestedEvents.includes(event.id);
            return (
              <motion.li key={event.id} layout className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[15px] font-semibold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.town} · Sample event</p></div>
                  <button type="button" aria-pressed={interested} onClick={() => update((s) => ({
                    ...s, interestedEvents: interested ? s.interestedEvents.filter((id) => id !== event.id) : [...s.interestedEvents, event.id],
                  }))} className={"shrink-0 rounded-xl px-3 py-2 text-xs font-semibold " + (interested ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground")}>
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
