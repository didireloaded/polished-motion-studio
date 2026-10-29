import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bookmark, ChevronUp, Heart, MapPin, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { people, photo, sampleChoices, towns, update, useStore, toggle, type Person } from "@/lib/namlink";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover — NamLink" },
      { name: "description", content: "Discover people across Namibia." },
      { property: "og:title", content: "Discover — NamLink" },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useStore();
  const [town, setTown] = useState("All");
  const [maxAge, setMaxAge] = useState(45);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<Person | null>(null);
  const [notice, setNotice] = useState("");
  const deck = useMemo(
    () => people.filter((p) =>
      !s.liked.includes(p.id) && !s.passed.includes(p.id) &&
      (town === "All" || p.town === town) && p.age <= maxAge,
    ),
    [s.liked, s.passed, town, maxAge],
  );
  const current = deck[0];
  const last = [...s.passed].pop();

  const decide = (p: Person, liked: boolean) => {
    update((st) => {
      if (!liked) return { ...st, passed: [...st.passed, p.id] };
      const matches = p.mutualInterest && !st.matches.includes(p.id) ? [...st.matches, p.id] : st.matches;
      return {
        ...st,
        liked: [...st.liked, p.id],
        matches,
        chats: matches.includes(p.id) && !st.chats[p.id] ? { ...st.chats, [p.id]: [] } : st.chats,
      };
    });
    const message = liked
      ? p.mutualInterest ? "A sample match with " + p.name + ". Open Chats to say hello." : "Like sent to " + p.name + ". If they like you too, you’ll match."
      : "You passed on " + p.name + ".";
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <main className="discover-shell mx-auto flex h-[calc(100svh-76px-env(safe-area-inset-bottom))] min-h-[560px] max-w-[440px] flex-col px-3 pt-2">
      <header className="flex h-12 shrink-0 items-center justify-between px-1">
        <Link to="/" aria-label="NamLink home" className="text-[21px] font-bold tracking-[-0.04em] text-foreground">NamLink</Link>
        <div className="flex items-center gap-2">
          {last && <IconButton label="Undo last pass" onClick={() => update((st) => ({ ...st, passed: st.passed.slice(0, -1) }))}><ArrowLeft className="h-4 w-4" /></IconButton>}
          <IconButton label="Open filters" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="h-[18px] w-[18px]" /></IconButton>
        </div>
      </header>

      <section aria-label="Discover sample profiles" className="relative mt-1 min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {deck.slice(0, 2).reverse().map((person) => (
            <ProfileCard key={person.id} person={person} depth={deck.indexOf(person)} onDetails={() => setDetail(person)} />
          ))}
        </AnimatePresence>
        {!current && <Empty onReset={() => { setTown("All"); setMaxAge(45); update((st) => ({ ...st, passed: [] })); }} />}
      </section>

      {current && (
        <div className="flex h-[76px] shrink-0 items-center justify-center gap-5">
          <RoundButton label={"Pass on " + current.name} onClick={() => decide(current, false)} tone="quiet"><X className="h-5 w-5" /></RoundButton>
          <RoundButton label={"Like " + current.name} onClick={() => decide(current, true)} tone="like"><Heart className="h-6 w-6" fill="currentColor" /></RoundButton>
          <RoundButton label={s.saved.includes(current.id) ? "Remove " + current.name + " from saved profiles" : "Save " + current.name} onClick={() => update((st) => ({ ...st, saved: toggle(st.saved, current.id) }))} tone="quiet">
            <Bookmark className="h-5 w-5" fill={s.saved.includes(current.id) ? "currentColor" : "none"} />
          </RoundButton>
        </div>
      )}

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="mx-auto max-h-[82svh] max-w-[440px] rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 pb-4 text-left">
            <div><DrawerTitle className="text-xl">Filters</DrawerTitle><DrawerDescription>Choose who appears in Discover.</DrawerDescription></div>
            <DrawerClose aria-label="Close filters" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted-foreground"><X className="h-4 w-4" /></DrawerClose>
          </DrawerHeader>
          <label className="text-sm font-semibold" htmlFor="town-filter">Town</label>
          <select id="town-filter" value={town} onChange={(e) => setTown(e.target.value)} className="input mt-2">
            <option value="All">All Namibia</option>
            {towns.map((place) => <option key={place}>{place}</option>)}
          </select>
          <div className="mt-6 flex items-center justify-between">
            <label htmlFor="age-filter" className="text-sm font-semibold">Maximum age</label>
            <span className="text-sm text-muted-foreground">18–{maxAge}</span>
          </div>
          <input id="age-filter" aria-label="Maximum age" type="range" min="18" max="45" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="mt-3 w-full accent-primary" />
          <button onClick={() => setFiltersOpen(false)} className="mt-6 h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Show profiles</button>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DrawerContent className="mx-auto max-h-[88svh] max-w-[440px] overflow-y-auto rounded-t-[26px] border-border bg-card px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {detail && <ProfileDetails person={detail} />}
        </DrawerContent>
      </Drawer>

      <AnimatePresence>
        {notice && (
          <motion.div role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(92vw,400px)] -translate-x-1/2 rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm shadow-float">
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ProfileCard({ person, depth, onDetails }: {
  person: Person; depth: number; onDetails: () => void;
}) {
  const top = depth === 0;
  return (
    <motion.article aria-label={"Sample profile, " + person.name + ", " + person.age + ", " + person.town}
      className="absolute inset-0 overflow-hidden rounded-[22px] bg-secondary text-white shadow-float"
      style={{ zIndex: 10 - depth }}
      initial={{ scale: 0.96, y: 12, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.025, y: depth * 10, opacity: depth ? 0.72 : 1 }}
      exit={{ y: -18, opacity: 0, scale: 0.97, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}>
      <img src={photo(person)} alt={"Sample profile photo of " + person.name} draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: person.photoPosition ?? "center 34%" }} />
      <div className="absolute inset-0 bg-scrim" aria-hidden="true" />
      {top && (
        <>
          <span className="absolute left-4 top-4 rounded-full bg-foreground/75 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">Sample profile</span>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-20">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[30px] font-bold leading-tight tracking-[-0.035em]">{person.name}<span className="ml-2 text-[23px] font-medium text-white/85">{person.age}</span></h1>
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white/90">
                  <MapPin className="h-4 w-4 shrink-0" />{person.town}<span aria-hidden="true">·</span><span className="truncate">{person.job}</span>
                </p>
              </div>
              <motion.button type="button" aria-label={"More about " + person.name} onClick={onDetails}
                whileTap={{ scale: 0.9 }} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-foreground/35 text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ChevronUp className="h-5 w-5" /></motion.span>
              </motion.button>
            </div>
          </div>
        </>
      )}
    </motion.article>
  );
}

function ProfileDetails({ person }: { person: Person }) {
  const answer = sampleChoices[person.id];
  return (
    <div className="pb-2">
      <DrawerHeader className="flex flex-row items-start justify-between px-0 pb-4 text-left">
        <div><p className="text-xs font-medium text-muted-foreground">Sample profile · {person.town}</p>
          <DrawerTitle className="mt-1 text-[26px] font-bold tracking-tight">{person.name}, {person.age}</DrawerTitle>
          <DrawerDescription className="mt-1">{person.job}</DrawerDescription></div>
        <DrawerClose aria-label="Close profile details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted-foreground"><X className="h-4 w-4" /></DrawerClose>
      </DrawerHeader>
      <div className="space-y-5">
        <section><h3 className="text-sm font-semibold">A little about {person.name}</h3><p className="mt-2 text-[15px] leading-6 text-muted-foreground">{person.bio}</p></section>
        <section className="rounded-2xl bg-secondary p-4"><p className="text-xs font-semibold text-muted-foreground">{person.prompt}</p><p className="mt-2 text-[16px] font-medium leading-6">{person.answer}</p></section>
        <section><h3 className="text-sm font-semibold">Looking for</h3><p className="mt-1 text-sm text-muted-foreground">{person.intent}</p></section>
        {answer && <section><h3 className="text-sm font-semibold">This or that</h3><div className="mt-2 rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{answer.prompt}</p><p className="mt-1 text-sm font-medium">{answer.answer}</p></div></section>}
        <section><h3 className="text-sm font-semibold">Interests</h3><div className="mt-2 flex flex-wrap gap-2">{person.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{tag}</span>)}</div></section>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">Illustrative profile details for this preview.</p>
      </div>
    </div>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[22px] border border-border bg-card px-7 text-center">
      <Heart className="h-8 w-8 text-primary" />
      <h2 className="mt-4 text-xl font-semibold">You’re all caught up</h2>
      <p className="mt-2 max-w-[260px] text-sm leading-5 text-muted-foreground">Try a wider age range or another town to see more sample profiles.</p>
      <button onClick={onReset} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Reset filters</button>
    </div>
  );
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</button>;
}

function RoundButton({ children, label, onClick, tone }: { children: React.ReactNode; label: string; onClick: () => void; tone: "quiet" | "like" }) {
  return (
    <motion.button type="button" aria-label={label} onClick={onClick} whileTap={{ scale: 0.9 }}
      className={tone === "like"
        ? "flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        : "flex h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"}>
      {children}
    </motion.button>
  );
}
