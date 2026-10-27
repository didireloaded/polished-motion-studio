import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Heart, Bookmark, MessagesSquare, RotateCcw } from "lucide-react";
import { interests, people, photo, towns, update, useStore, toggle } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [
      { title: "Your profile — NamLink" },
      { name: "description", content: "Shape how you show up on NamLink." },
      { property: "og:title", content: "Your profile — NamLink" },
      { property: "og:description", content: "Shape how you show up on NamLink." },
    ],
  }),
  component: You,
});

function You() {
  const s = useStore();
  const [f, setF] = useState(s.profile);
  const [saved, setSaved] = useState(false);
  const [adult, setAdult] = useState(false);
  useEffect(() => setF(s.profile), [s.profile]);
  const valid = f.name.trim().length >= 2 && f.age >= 18 && f.age <= 99 && adult;
  const save = () => { if (!valid) return; update((st) => ({ ...st, profile: { ...f, name: f.name.trim(), bio: f.bio.slice(0, 500) } })); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const savedPeople = people.filter((p) => s.saved.includes(p.id));

  const stats = [
    { icon: Heart, n: s.liked.length, l: "Liked" },
    { icon: Bookmark, n: s.saved.length, l: "Saved" },
    { icon: MessagesSquare, n: Object.values(s.chats).filter((m) => m.length).length, l: "Chatting" },
  ];

  return (
    <main className="mx-auto max-w-md pb-32">
      <PageHeader eyebrow="Profile" title={s.profile.name ? `Hi, ${s.profile.name}` : "You"} />
      <div className="grid grid-cols-3 gap-3 px-5">
        {stats.map(({ icon: I, n, l }, i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="rounded-2xl bg-card p-4">
            <I className="h-4 w-4 text-primary" />
            <motion.p key={n} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="mt-2 font-display text-2xl font-extrabold">{n}</motion.p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </motion.div>
        ))}
      </div>

      {savedPeople.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Saved</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {savedPeople.map((p) => (
              <motion.div key={p.id} whileHover={{ y: -4 }} className="relative h-40 w-28 shrink-0 overflow-hidden rounded-2xl">
                <img src={photo(p, true)} alt="" className="h-full w-full object-cover" />
                <div className="bg-scrim absolute inset-0" />
                <p className="absolute bottom-2 left-2 text-sm font-semibold text-white">{p.name}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mx-5 mt-6 space-y-4 rounded-3xl bg-card p-5">
        <Field label="First name"><input value={f.name} maxLength={40} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><input type="number" min={18} max={99} value={f.age} onChange={(e) => setF({ ...f, age: Number(e.target.value) })} className="input" /></Field>
          <Field label="Town"><select value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} className="input">{towns.map((t) => <option key={t}>{t}</option>)}</select></Field>
        </div>
        <Field label="Looking for">
          <div className="flex gap-2">{["A relationship", "Open to exploring"].map((i) => (
            <button key={i} onClick={() => setF({ ...f, intent: i })} className={`flex-1 rounded-xl border py-2 text-sm transition-colors ${f.intent === i ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{i}</button>
          ))}</div>
        </Field>
        <Field label="About you"><textarea rows={3} maxLength={500} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className="input resize-none" /></Field>
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">{interests.map((t) => {
            const on = f.tags.includes(t);
            return (
              <motion.button key={t} whileTap={{ scale: 0.9 }} onClick={() => setF({ ...f, tags: toggle(f.tags, t) })}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{t}</motion.button>
            );
          })}</div>
        </Field>
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="h-4 w-4 accent-primary" />I confirm I'm 18 or older
        </label>
        <motion.button whileTap={{ scale: 0.96 }} disabled={!valid} onClick={save} className="relative flex w-full items-center justify-center overflow-hidden rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none">
          <AnimatePresence mode="wait">
            {saved ? <motion.span key="ok" initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: -20 }} className="flex items-center gap-2"><Check className="h-5 w-5" />Saved</motion.span>
              : <motion.span key="s" initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: -20 }}>Save profile</motion.span>}
          </AnimatePresence>
        </motion.button>
      </motion.section>

      <button onClick={() => { if (confirm("Reset likes, passes, saves and chats?")) update((st) => ({ ...st, liked: [], passed: [], saved: [], chats: {} })); }}
        className="mx-auto mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"><RotateCcw className="h-4 w-4" />Reset my activity</button>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>{children}</div>;
}
