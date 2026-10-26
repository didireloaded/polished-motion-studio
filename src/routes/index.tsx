import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Heart, X, Bookmark, Undo2, SlidersHorizontal, MapPin, Sparkles, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { people, photo, towns, update, useStore, toggle, type Person } from "@/lib/namlink";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NamLink — Meet someone a little closer" },
      { name: "description", content: "Discover people across Namibia, one thoughtful profile at a time." },
      { property: "og:title", content: "NamLink — Meet someone a little closer" },
      { property: "og:description", content: "Discover people across Namibia, one thoughtful profile at a time." },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useStore();
  const [town, setTown] = useState<string>("All");
  const [filters, setFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deck = useMemo(
    () => people.filter((p) => !s.liked.includes(p.id) && !s.passed.includes(p.id) && (town === "All" || p.town === town)),
    [s.liked, s.passed, town],
  );
  const current = deck[0];
  const last = [...s.passed].pop();

  const decide = (p: Person, liked: boolean) => {
    setOpen(false);
    update((st) => liked
      ? { ...st, liked: [...st.liked, p.id], chats: st.chats[p.id] ? st.chats : { ...st.chats, [p.id]: [] } }
      : { ...st, passed: [...st.passed, p.id] });
    if (liked) { setToast(p.name); setTimeout(() => setToast(null), 1800); }
  };

  return (
    <main className="mx-auto min-h-screen max-w-md pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-display text-2xl font-extrabold">
          nam<span className="text-primary">link</span>
        </motion.div>
        <div className="flex gap-2">
          <IconBtn onClick={() => last && update((st) => ({ ...st, passed: st.passed.slice(0, -1) }))} disabled={!last} label="Undo pass"><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => setFilters((f) => !f)} label="Filters"><SlidersHorizontal className="h-4 w-4" /></IconBtn>
        </div>
      </header>

      <AnimatePresence>
        {filters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-4">
              {["All", ...towns].map((t, i) => (
                <motion.button key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setTown(t)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${town === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                  {t}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-4 mt-4 h-[68vh] min-h-[480px]">
        <AnimatePresence>
          {deck.slice(0, 3).reverse().map((p) => (
            <Card key={p.id} person={p} depth={deck.indexOf(p)} onDecide={decide} open={open && p === current} setOpen={setOpen} />
          ))}
        </AnimatePresence>
        {!current && <Empty onReset={() => { setTown("All"); update((st) => ({ ...st, passed: [] })); }} />}
      </div>

      {current && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-5 flex items-center justify-center gap-5">
          <RoundBtn size="md" onClick={() => decide(current, false)} label="Pass"><X className="h-6 w-6" /></RoundBtn>
          <RoundBtn size="lg" primary onClick={() => decide(current, true)} label="Like"><Heart className="h-7 w-7" fill="currentColor" /></RoundBtn>
          <RoundBtn size="md" onClick={() => update((st) => ({ ...st, saved: toggle(st.saved, current.id) }))} label="Save" active={s.saved.includes(current.id)}>
            <Bookmark className="h-5 w-5" fill={s.saved.includes(current.id) ? "currentColor" : "none"} />
          </RoundBtn>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, scale: 0.6, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="glass fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full border border-border px-5 py-3 text-sm shadow-float">
            <Sparkles className="mr-2 inline h-4 w-4 text-accent" />You liked {toast} — say hi in <Link to="/chats" className="font-semibold text-primary">Chats</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Card({ person: p, depth, onDecide, open, setOpen }: { person: Person; depth: number; onDecide: (p: Person, l: boolean) => void; open: boolean; setOpen: (b: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-14, 14]);
  const likeOp = useTransform(x, [30, 140], [0, 1]);
  const nopeOp = useTransform(x, [-140, -30], [1, 0]);
  const top = depth === 0;

  const onEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120 || info.velocity.x > 600) { animate(x, 600, { duration: 0.3 }); onDecide(p, true); }
    else if (info.offset.x < -120 || info.velocity.x < -600) { animate(x, -600, { duration: 0.3 }); onDecide(p, false); }
    else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  return (
    <motion.article
      className="absolute inset-0 overflow-hidden rounded-[2rem] bg-card shadow-float"
      style={{ x: top ? x : 0, rotate: top ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: depth > 1 ? 0.6 : 1 }}
      exit={{ x: x.get() >= 0 ? 500 : -500, opacity: 0, rotate: x.get() >= 0 ? 20 : -20, transition: { duration: 0.35 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      drag={top && !open ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onEnd}
    >
      <div className="absolute inset-0 overflow-hidden">
        <img src={photo(p)} alt={`${p.name}, illustrative profile`} draggable={false} className={`h-full w-full object-cover ${top ? "animate-drift" : ""}`} style={{ objectPosition: "center 30%" }} />
      </div>
      <div className="bg-scrim absolute inset-0" />
      {top && (
        <>
          <motion.div style={{ opacity: likeOp }} className="absolute left-6 top-8 -rotate-12 rounded-xl border-4 border-primary px-3 py-1 font-display text-3xl font-extrabold text-primary">LIKE</motion.div>
          <motion.div style={{ opacity: nopeOp }} className="absolute right-6 top-8 rotate-12 rounded-xl border-4 border-foreground px-3 py-1 font-display text-3xl font-extrabold text-foreground">PASS</motion.div>
        </>
      )}

      <motion.div layout className="absolute inset-x-0 bottom-0 p-6" transition={{ type: "spring", stiffness: 300, damping: 32 }}>
        <motion.div layout="position">
          <h2 className="text-4xl font-extrabold">{p.name} <span className="font-sans text-2xl font-normal text-muted-foreground">{p.age}</span></h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{p.town} · {p.job}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.tags.map((t, i) => (
              <motion.span key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="glass rounded-full px-3 py-1 text-xs">{t}</motion.span>
            ))}
          </div>
        </motion.div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="mt-4 text-[15px] leading-relaxed">{p.bio}</p>
              <div className="mt-4 rounded-2xl bg-accent p-4 text-accent-foreground">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{p.prompt}</p>
                <p className="mt-1 font-display text-lg font-bold leading-snug">{p.answer}</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Looking for: {p.intent}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {top && (
          <button onClick={() => setOpen(!open)} className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
            <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronUp className="h-4 w-4" /></motion.span>{open ? "Less" : "More about " + p.name}
          </button>
        )}
      </motion.div>
    </motion.article>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-border text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="mb-4 rounded-full bg-primary/15 p-5 text-primary"><Heart className="h-8 w-8" /></motion.div>
      <h2 className="text-2xl font-extrabold">You've seen everyone</h2>
      <p className="mt-2 max-w-60 text-sm text-muted-foreground">New people show up as they join. Bring back the ones you passed?</p>
      <button onClick={onReset} className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Start over</button>
    </motion.div>
  );
}

function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return <motion.button whileTap={{ scale: 0.85 }} aria-label={label} disabled={disabled} onClick={onClick} className="rounded-full border border-border bg-card p-2.5 text-foreground disabled:opacity-30">{children}</motion.button>;
}

function RoundBtn({ children, onClick, label, primary, size, active }: { children: React.ReactNode; onClick: () => void; label: string; primary?: boolean; size: "md" | "lg"; active?: boolean }) {
  return (
    <motion.button aria-label={label} onClick={onClick} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.85 }}
      className={`flex items-center justify-center rounded-full ${size === "lg" ? "h-[4.5rem] w-[4.5rem]" : "h-14 w-14"} ${primary ? "bg-primary text-primary-foreground shadow-glow" : `border border-border bg-card ${active ? "text-accent" : "text-foreground"}`}`}>
      {children}
    </motion.button>
  );
}
