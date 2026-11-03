import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Heart, MessageCircle, Send, Sparkles, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/lib/icebreakers";
import { people, photo, update, type Person } from "@/lib/namlink";
import { speedDatingPrompts } from "@/lib/social-games";

type MixerChatMsg = {
  id: string;
  from: "me" | "partner";
  body: string;
  at: string;
};

const partnerReplies = [
  "Honestly, beach weekend in Swakopmund every time — mist + fresh brötchen is unbeatable.",
  "Okay that’s a strong take! Have you tried Slowtown’s flat white before a road trip?",
  "Haha fair! If we’re driving to the coast, I’m claiming playlist duty for the first hour.",
];

export function SpeedDatingRoom({
  open,
  town,
  userId,
  onClose,
}: {
  open: boolean;
  town: string;
  userId?: string | null;
  onClose: () => void;
}) {
  const candidates = useMemo(() => {
    const local = people.filter((p) => town === "All" || p.town === town);
    return local.length > 0 ? local : people;
  }, [town]);

  const [partnerIndex, setPartnerIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [phase, setPhase] = useState<"chatting" | "decision" | "matched">("chatting");
  const [messages, setMessages] = useState<MixerChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [onlineCount, setOnlineCount] = useState(6);

  const partner: Person = candidates[partnerIndex % candidates.length] ?? people[0]!;
  const currentPrompt = speedDatingPrompts[promptIndex % speedDatingPrompts.length]!;

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(180);
    setPhase("chatting");
    setDraft("");
    setMessages([
      {
        id: "opening",
        from: "partner",
        body: `Hey! Glad we got paired in the ${partner.town} mixer. What’s your pick on this prompt?`,
        at: "Just now",
      },
    ]);
  }, [open, partnerIndex, partner.town]);

  useEffect(() => {
    if (!open || phase !== "chatting") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          triggerHaptic("match");
          setPhase("decision");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, phase]);

  // Connect to Supabase Realtime Presence channel for live room count
  useEffect(() => {
    if (!open) return;
    const channel = supabase.channel(`mutal:speed-mixer:${town}`, {
      config: { presence: { key: userId ?? "guest" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const livePeers = Object.keys(state).length;
        setOnlineCount(Math.max(4, livePeers + 4));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ joined_at: new Date().toISOString(), town });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, town, userId]);

  if (!open) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = (180 - secondsLeft) / 180;
  const circumference = 2 * Math.PI * 16;

  const sendMessage = (e?: FormEvent, presetText?: string) => {
    e?.preventDefault();
    const clean = (presetText ?? draft).trim();
    if (!clean || phase !== "chatting") return;
    triggerHaptic("send");
    const myMsg: MixerChatMsg = {
      id: `me-${Date.now()}`,
      from: "me",
      body: clean,
      at: "Just now",
    };
    setMessages((current) => [...current, myMsg]);
    if (!presetText) setDraft("");

    window.setTimeout(() => {
      const replyBody =
        partnerReplies[(messages.length + partnerIndex) % partnerReplies.length] ??
        partnerReplies[0]!;
      setMessages((current) => [
        ...current,
        {
          id: `partner-${Date.now()}`,
          from: "partner",
          body: replyBody,
          at: "Just now",
        },
      ]);
    }, 950);
  };

  const handleDecision = async (keepTalking: boolean) => {
    if (!keepTalking) {
      triggerHaptic("pass");
      setPartnerIndex((current) => current + 1);
      setPromptIndex((current) => current + 1);
      return;
    }

    triggerHaptic("match");
    // Unlock in demo store & record decision if signed in
    update((st) => ({
      ...st,
      liked: st.liked.includes(partner.id) ? st.liked : [...st.liked, partner.id],
      matches: st.matches.includes(partner.id) ? st.matches : [...st.matches, partner.id],
      chats: {
        ...st.chats,
        [partner.id]: [
          ...(st.chats[partner.id] ?? []),
          {
            from: "them",
            text: `Loved our 3-minute mixer round about ${partner.town}! Let’s keep talking.`,
            at: "Just now",
          },
        ],
      },
    }));

    if (userId) {
      await supabase
        .from("decisions")
        .insert({ actor_id: userId, target_id: partner.id, liked: true })
        .then(() => undefined);
    }

    setPhase("matched");
  };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Speed Dating Live Lounge"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75 px-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="relative flex max-h-[90svh] w-full max-w-[390px] flex-col overflow-hidden rounded-[26px] border border-white/20 bg-card shadow-float"
        >
          {/* Header with 3:00 countdown ring */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    className="text-primary"
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round"
                  />
                </svg>
                <Clock3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {mins}:{String(secs).padStart(2, "0")} left
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Users className="h-2.5 w-2.5" />
                    {onlineCount} live
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paired with {partner.name}, {partner.age} · {partner.town}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Leave Speed Dating Lounge"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Shared Icebreaker Card */}
          <div className="border-b border-border bg-accent/55 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                {currentPrompt.category} · Shared Icebreaker
              </span>
              <button
                type="button"
                onClick={() => setPromptIndex((c) => c + 1)}
                className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                Next prompt
              </button>
            </div>
            <p className="mt-1 text-xs font-medium leading-4 text-foreground">
              {currentPrompt.prompt}
            </p>
          </div>

          {/* Partner header strip */}
          <div className="flex items-center justify-between border-b border-border/60 bg-white px-4 py-2">
            <div className="flex items-center gap-2.5">
              <img
                src={photo(partner, true)}
                alt={partner.name}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {partner.name} · {partner.role}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {partner.tags.slice(0, 3).join(" · ")}
                </p>
              </div>
            </div>
            {phase === "chatting" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("match");
                  setPhase("decision");
                }}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary"
              >
                Decide now
              </button>
            )}
          </div>

          {/* Body: either live 3-minute chat, 3:00 binary decision, or mutual unlock */}
          {phase === "chatting" && (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-5 ${
                        m.from === "me"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border bg-white px-3 py-2.5">
                <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    "Swakopmund beach weekend, easily!",
                    "Bush lodge under the stars 100%",
                    "Slowtown coffee first, then we decide",
                  ].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => sendMessage(undefined, quick)}
                      className="shrink-0 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Reply to ${partner.name}…`}
                    className="h-10 flex-1 rounded-full border border-border bg-secondary px-3.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Send speed dating message"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          )}

          {phase === "decision" && (
            <div className="space-y-4 p-5 text-center">
              <img
                src={photo(partner, true)}
                alt={partner.name}
                className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-primary/20"
              />
              <div>
                <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  3:00 Round Complete
                </span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  Keep talking with {partner.name}?
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  If both of you tap Keep Talking, your match unlocks permanently in Chats.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleDecision(false)}
                  className="h-11 rounded-full border border-border bg-secondary text-xs font-semibold text-foreground"
                >
                  Pass · Next round
                </button>
                <button
                  type="button"
                  onClick={() => void handleDecision(true)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Keep Talking
                </button>
              </div>
            </div>
          )}

          {phase === "matched" && (
            <div className="space-y-4 p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Mutual spark with {partner.name}!
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {partner.name} also tapped Keep Talking. Your full chat thread is now unlocked.
                </p>
              </div>
              <div className="space-y-2">
                <Link
                  to="/chats"
                  search={{ matchId: partner.id }}
                  onClick={onClose}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  Open Chat with {partner.name}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerIndex((c) => c + 1);
                    setPromptIndex((c) => c + 1);
                  }}
                  className="h-10 w-full rounded-full bg-secondary text-xs font-semibold text-foreground"
                >
                  Meet one more person in Mixer
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
