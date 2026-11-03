import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { Check, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { useState } from "react";
import {
  fallbackConversationOpener,
  MAX_OPENER_NOTE_LENGTH,
  OPENER_TONE_LABELS,
  OPENER_TONES,
  type DraftedOpener,
  type OpenerProfileInput,
  type OpenerTone,
} from "@/lib/conversation-opener";
import { draftConversationOpener } from "@/lib/conversation-opener.functions";
import { triggerHaptic } from "@/lib/icebreakers";

export function ConversationOpenerStudio({
  matchId,
  matchName,
  profile,
  live,
  onUseOpener,
  onClose,
}: {
  matchId: string;
  matchName: string;
  profile: OpenerProfileInput;
  live: boolean;
  onUseOpener: (openerText: string) => void;
  onClose: () => void;
}) {
  const runDraftServerFn = useServerFn(draftConversationOpener);
  const [tone, setTone] = useState<OpenerTone>("warm");
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<DraftedOpener | null>(null);

  const generate = async (selectedTone: OpenerTone = tone) => {
    setBusy(true);
    setNotice("");
    triggerHaptic("like");
    try {
      if (live) {
        const res = await runDraftServerFn({
          data: {
            matchId,
            tone: selectedTone,
            ...(customNote.trim() ? { customNote: customNote.trim() } : {}),
          },
        });
        setDraft(res.draft);
        if (res.notice) setNotice(res.notice);
      } else {
        setDraft(fallbackConversationOpener(profile, selectedTone, customNote));
        setNotice("Sample preview · Sign in to draft with live AI Gateway.");
      }
    } catch {
      setDraft(fallbackConversationOpener(profile, selectedTone, customNote));
      setNotice("Couldn't reach AI Gateway right now — showing a tailored profile starter.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      aria-label={`Draft a personalized opener for ${matchName}`}
      className="mx-4 mt-3 rounded-2xl border border-primary/25 bg-card p-3.5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            AI Opener Studio
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tailored to {matchName}’s profile ({profile.town}
            {profile.tags.length ? ` · ${profile.tags.slice(0, 3).join(", ")}` : ""})
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Opener Studio"
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tone selector */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-semibold text-foreground">Choose your tone</p>
        <div className="grid grid-cols-2 gap-1.5">
          {OPENER_TONES.map((t) => {
            const info = OPENER_TONE_LABELS[t];
            const active = tone === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTone(t);
                  if (draft) void generate(t);
                }}
                className={`rounded-xl border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40"
                }`}
              >
                <p className="text-xs font-semibold text-foreground">{info.label}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                  {info.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional detail/angle */}
      <div className="mt-2.5">
        <input
          value={customNote}
          maxLength={MAX_OPENER_NOTE_LENGTH}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder={`Optional detail to mention (e.g., ${profile.tags[0]?.toLowerCase() ?? "coffee"} in ${profile.town})…`}
          aria-label="Optional detail to mention in opener"
          className="h-9 w-full rounded-xl border border-border bg-white px-3 text-xs outline-none focus:border-primary"
        />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void generate(tone)}
        className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Drafting personalized opener…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {draft
              ? "Draft another opener"
              : `Draft ${OPENER_TONE_LABELS[tone].label.toLowerCase()} opener`}
          </>
        )}
      </button>

      {notice && <p className="mt-2 text-[11px] text-muted-foreground">{notice}</p>}

      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-3 rounded-xl border border-border bg-white p-3"
          >
            <p className="text-xs font-medium leading-5 text-foreground">“{draft.opener}”</p>
            {draft.whyItWorks && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                <strong className="font-semibold text-primary">Why it works:</strong>{" "}
                {draft.whyItWorks}
              </p>
            )}
            {draft.followUpTopic && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <strong className="font-semibold text-foreground">Next up:</strong>{" "}
                {draft.followUpTopic}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("send");
                onUseOpener(draft.opener);
              }}
              className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" />
              Use this opener in chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
