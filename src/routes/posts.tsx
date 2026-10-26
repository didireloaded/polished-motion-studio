import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Send, MapPin, MessageCircle, Trash2 } from "lucide-react";
import { towns, update, useStore, timeAgo } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "Posts — NamLink" },
      { name: "description", content: "Anonymous posts and plans from people around Namibia." },
      { property: "og:title", content: "Posts — NamLink" },
      { property: "og:description", content: "Anonymous posts and plans from people around Namibia." },
    ],
  }),
  component: Posts,
});

function Posts() {
  const s = useStore();
  const [text, setText] = useState("");
  const [town, setTown] = useState<string>(s.profile.town);
  const submit = () => {
    const t = text.trim();
    if (t.length < 3) return;
    update((st) => ({ ...st, posts: [{ id: crypto.randomUUID(), text: t.slice(0, 280), town, at: Date.now(), replies: 0, mine: true }, ...st.posts] }));
    setText("");
  };
  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader eyebrow="Anonymous" title="Posts" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-5 rounded-3xl border border-border bg-card p-4 focus-within:border-primary/60">
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={280} rows={3} placeholder="Share a plan or an honest question…"
          className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center justify-between">
          <select value={town} onChange={(e) => setTown(e.target.value)} className="rounded-full bg-secondary px-3 py-1.5 text-xs outline-none">
            {towns.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{280 - text.length}</span>
            <motion.button whileTap={{ scale: 0.85 }} disabled={text.trim().length < 3} onClick={submit} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              <Send className="h-4 w-4" />Post
            </motion.button>
          </div>
        </div>
      </motion.div>
      <ul className="mt-5 space-y-3 px-5">
        <AnimatePresence initial={false}>
          {s.posts.map((p, i) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -80 }}
              transition={{ type: "spring", stiffness: 350, damping: 30, delay: Math.min(i, 6) * 0.03 }}
              className="rounded-3xl bg-card p-5">
              <p className="text-[15px] leading-relaxed">{p.text}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.town}</span>
                <span>{timeAgo(p.at)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{p.replies}</span>
                {p.mine && (
                  <button aria-label="Delete post" onClick={() => update((st) => ({ ...st, posts: st.posts.filter((x) => x.id !== p.id) }))} className="ml-auto hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </main>
  );
}
