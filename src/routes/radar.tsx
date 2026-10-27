import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { people, photo, towns } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Nearby — NamLink" },
      { name: "description", content: "Discover people by town across Namibia." },
      { property: "og:title", content: "Nearby — NamLink" },
    ],
  }),
  component: NearbyPage,
});

const scenes: Record<(typeof towns)[number], string> = {
  Windhoek: "/editorial/dunes.jpg",
  Swakopmund: "/editorial/coast.jpg",
  "Walvis Bay": "/editorial/coast.jpg",
  Oshakati: "/editorial/road.jpg",
  Otjiwarongo: "/editorial/dunes.jpg",
  Rundu: "/editorial/road.jpg",
};

function NearbyPage() {
  const [town, setTown] = useState<(typeof towns)[number]>("Windhoek");
  const here = people.filter((person) => person.town === town);

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader eyebrow="Around Namibia" title="Nearby." />

      <section aria-label={`Discover ${town}`} className="relative mx-5 h-64 overflow-hidden rounded-[1.75rem] bg-secondary shadow-float">
        <AnimatePresence mode="wait">
          <motion.img
            key={town}
            src={scenes[town]}
            alt=""
            initial={{ opacity: 0, scale: 1.07 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="bg-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <motion.span key={`${town}-label`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
            <MapPin className="h-3.5 w-3.5" /> Town view
          </motion.span>
          <motion.h2 key={town} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="mt-2 font-display text-4xl font-extrabold leading-none">
            {town}
          </motion.h2>
          <p className="mt-2 text-sm text-white/85">{here.length} sample {here.length === 1 ? "profile" : "profiles"} to discover</p>
        </div>
      </section>

      <div className="mt-7 px-5">
        <h2 className="font-display text-lg font-bold">Explore by town</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose a place to see who is there.</p>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Choose a town">
        {towns.map((place) => (
          <motion.button
            key={place}
            type="button"
            aria-pressed={town === place}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTown(place)}
            className={`relative shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${town === place ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}
          >
            {place}
          </motion.button>
        ))}
      </div>

      <div className="mt-7 flex items-end justify-between px-5">
        <div>
          <h2 className="font-display text-xl font-bold">People in {town}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Browse by town · no live location</p>
        </div>
        <span className="text-xs font-medium text-primary">{here.length} nearby</span>
      </div>
      <ul className="mt-4 space-y-3 px-5">
        <AnimatePresence mode="popLayout">
          {here.length === 0 && <motion.li key="none" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No sample profiles in this town yet. Try another place.</motion.li>}
          {here.map((person, index) => (
            <motion.li key={person.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ delay: index * 0.06, duration: 0.32 }} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <img src={photo(person, true)} alt="" className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{person.name}, {person.age}</p>
                <p className="truncate text-sm text-muted-foreground">{person.job}</p>
              </div>
              <MapPin aria-hidden="true" className="mr-1 h-4 w-4 text-primary" />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <Link to="/posts" className="mx-5 mt-6 flex items-center justify-between rounded-2xl bg-accent px-5 py-4 text-accent-foreground transition-transform hover:-translate-y-0.5">
        <span><strong className="block text-sm">Looking for a plan?</strong><small className="mt-0.5 block text-xs opacity-75">See what people are talking about in Posts.</small></span>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
