import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { people, photo, towns } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar — NamLink" },
      { name: "description", content: "Browse people town by town across Namibia. No GPS, ever." },
      { property: "og:title", content: "Radar — NamLink" },
      { property: "og:description", content: "Browse people town by town across Namibia. No GPS, ever." },
    ],
  }),
  component: RadarPage,
});

function RadarPage() {
  const [town, setTown] = useState<string>("Windhoek");
  const here = people.filter((p) => p.town === town);
  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader eyebrow="Town radar" title={town} />
      <div className="relative mx-auto aspect-square w-[82%]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-radar absolute inset-0 rounded-full border border-primary/50" style={{ animationDelay: `${i * 1.05}s` }} />
        ))}
        {[0.33, 0.66, 1].map((r) => (
          <span key={r} className="absolute rounded-full border border-border" style={{ inset: `${(1 - r) * 50}%` }} />
        ))}
        <motion.div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 75%, color-mix(in oklab, var(--primary) 35%, transparent))" }}
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-glow" />
        <AnimatePresence mode="popLayout">
          {here.map((p, i) => {
            const a = (i / Math.max(here.length, 1)) * Math.PI * 2 + 0.7;
            const r = 30 + (i % 2) * 10;
            return (
              <motion.img key={p.id + town} src={photo(p, true)} alt={p.name}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", delay: 0.1 + i * 0.12, stiffness: 300, damping: 18 }}
                className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary object-cover shadow-float"
                style={{ left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%` }} />
            );
          })}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustrative town view · no live location</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
        {towns.map((t) => (
          <button key={t} onClick={() => setTown(t)} className="relative shrink-0 rounded-full px-4 py-2 text-sm">
            {town === t && <motion.span layoutId="town" className="absolute inset-0 rounded-full bg-primary" />}
            <span className={`relative ${town === t ? "text-primary-foreground" : "text-muted-foreground"}`}>{t}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-3 px-5">
        <AnimatePresence mode="popLayout">
          {here.length === 0 && <motion.li key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">No one here yet. Try another town.</motion.li>}
          {here.map((p, i) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-2xl bg-card p-3">
              <img src={photo(p, true)} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div><p className="font-semibold">{p.name}, {p.age}</p><p className="text-sm text-muted-foreground">{p.job}</p></div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </main>
  );
}
