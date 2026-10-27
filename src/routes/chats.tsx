import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, MessagesSquare } from "lucide-react";
import { people, photo, update, useStore, timeAgo } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Chats — NamLink" },
      { name: "description", content: "Your conversations with the people you've liked." },
      { property: "og:title", content: "Chats — NamLink" },
      { property: "og:description", content: "Your conversations with the people you've liked." },
    ],
  }),
  component: Chats,
});

function Chats() {
  const s = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = people.filter((p) => s.liked.includes(p.id));
  const person = list.find((p) => p.id === openId);

  return (
    <main className="mx-auto max-w-md pb-28">
      <AnimatePresence mode="wait">
        {!person ? (
          <motion.div key="list" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <PageHeader eyebrow="Connections" title="Chats" />
            {list.length === 0 ? (
              <div className="mx-5 flex flex-col items-center rounded-3xl bg-card p-10 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="rounded-full bg-primary/15 p-4 text-primary"><MessagesSquare className="h-7 w-7" /></motion.div>
                <p className="mt-4 font-semibold">No chats yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Like someone on Home to start a conversation.</p>
                <Link to="/" className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Discover people</Link>
              </div>
            ) : (
              <>
                <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-4">
                  {list.map((p, i) => (
                    <motion.button key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: i * 0.06 }} onClick={() => setOpenId(p.id)} className="shrink-0 text-center">
                      <img src={photo(p, true)} alt="" className="h-16 w-16 rounded-full border-2 border-primary object-cover p-0.5" />
                      <p className="mt-1 text-xs">{p.name}</p>
                    </motion.button>
                  ))}
                </div>
                <ul className="space-y-1 px-3">
                  {list.map((p, i) => {
                    const last = s.chats[p.id]?.at(-1);
                    return (
                      <motion.li key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                        <button onClick={() => setOpenId(p.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-card">
                          <img src={photo(p, true)} alt="" className="h-12 w-12 rounded-full object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between"><p className="font-semibold">{p.name}</p>{last && <span className="text-xs text-muted-foreground">{timeAgo(last.at)}</span>}</div>
                            <p className="truncate text-sm text-muted-foreground">{last ? last.text : "You liked each other's vibe. Say hi 👋"}</p>
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </>
            )}
          </motion.div>
        ) : (
          <Thread key={person.id} id={person.id} onBack={() => setOpenId(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const s = useStore();
  const p = people.find((x) => x.id === id)!;
  const msgs = s.chats[id] ?? [];
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const send = () => {
    const t = text.trim(); if (!t) return;
    update((st) => ({ ...st, chats: { ...st.chats, [id]: [...(st.chats[id] ?? []), { id: crypto.randomUUID(), from: "me", text: t.slice(0, 1000), at: Date.now() }] } }));
    setText("");
  };
  const shared = p.tags.filter((t) => s.profile.tags.includes(t));
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="flex h-[calc(100vh-5rem)] flex-col">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <img src={photo(p, true)} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.town}</p></div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        <div className="mb-4 rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground">
          {shared.length ? <>You both like <span className="text-primary">{shared.join(", ")}</span></> : <>Ask about: <span className="text-primary">“{p.prompt}…”</span></>}
        </div>
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`} style={{ originX: m.from === "me" ? 1 : 0 }}>
              <p className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] ${m.from === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card"}`}>{m.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border px-4 py-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${p.name}…`} className="flex-1 rounded-full bg-card px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ring" />
        <motion.button whileTap={{ scale: 0.8, rotate: -15 }} disabled={!text.trim()} aria-label="Send" className="rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"><Send className="h-5 w-5" /></motion.button>
      </form>
    </motion.div>
  );
}
