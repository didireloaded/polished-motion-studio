import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Clock3,
  Dices,
  Heart,
  MessageCircle,
  Mic,
  Radio,
  Send,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SafetyActions } from "@/components/community";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/lib/icebreakers";
import { people, photo, type Person } from "@/lib/namlink";
import { fallbackRandomFridayPitch } from "@/lib/random-friday-pitch";
import { draftRandomFridayPitch } from "@/lib/random-friday-pitch.functions";
import { joinLiveQueueServerFn } from "@/lib/social-backend.functions";
import {
  applyTimeBoost,
  getRandomFridayState,
  INSTANT_CHEMISTRY_BONUS_SECONDS,
  MAX_REACTION_BOOSTS,
  RANDOM_FRIDAY_DURATION_SECONDS,
  randomFridayBinaryTapCards,
  randomFridayDicePrompts,
  randomFridayElevatorLines,
  randomFridayPartnerPrompts,
  REACTION_BOOST_SECONDS,
  shouldUnblurMysteryPhoto,
} from "@/lib/random-friday";
import { captureProductEvent } from "@/lib/telemetry";

type PitchMsg = {
  id: string;
  from: "me" | "partner" | "system";
  body: string;
  isVoice?: boolean;
};

const instantPartnerReplies = [
  "Okay, that’s a strong 30-second pitch! Swakopmund coffee or Windhoek sunset walk?",
  "Haha I respect the speed! I’m already holding down Stay.",
  "Best answer so far today — let’s definitely keep talking after the clock!",
];

export function RandomFridayBanner({
  onOpen,
  compact = false,
}: {
  onOpen: () => void;
  compact?: boolean;
}) {
  const [windowState, setWindowState] = useState(() => getRandomFridayState());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWindowState(getRandomFridayState());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("like");
        onOpen();
      }}
      className={
        compact
          ? "mx-5 mb-2 flex w-[calc(100%-2.5rem)] items-center justify-between gap-2.5 rounded-2xl border border-primary/25 bg-gradient-to-r from-accent/80 via-white to-secondary/60 px-3.5 py-2.5 text-left shadow-2xs transition active:scale-[0.99]"
          : "mt-2 flex w-full items-center gap-3 border-t border-border py-3 text-left"
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
        <Zap className="h-4 w-4 fill-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          Random Friday · 30s Sprint
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
              windowState.isLiveWindow ? "bg-emerald-600 text-white" : "bg-primary/12 text-primary"
            }`}
          >
            Preview
          </span>
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {windowState.headline}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function RandomFridayModal({
  open,
  town,
  userId,
  onClose,
}: {
  open: boolean;
  town: string;
  userId?: string | null | undefined;
  onClose: () => void;
}) {
  const candidates = useMemo(() => {
    const local = people.filter((p) => town === "All" || p.town === town);
    return local.length > 0 ? local : people;
  }, [town]);

  const [partnerIndex, setPartnerIndex] = useState(0);
  const [phase, setPhase] = useState<"queue" | "round" | "matched" | "transition">("queue");
  const [secondsLeft, setSecondsLeft] = useState(RANDOM_FRIDAY_DURATION_SECONDS);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [messages, setMessages] = useState<PitchMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [streak, setStreak] = useState(1);

  // Adrenaline mechanics state
  const [chemistryBonusClaimed, setChemistryBonusClaimed] = useState(false);
  const [reactionBoostsUsed, setReactionBoostsUsed] = useState(0);
  const [boostToast, setBoostToast] = useState<string | null>(null);
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const [diceIdx, setDiceIdx] = useState(0);
  const [binaryPick, setBinaryPick] = useState<"left" | "right" | null>(null);
  const [recordingFlash, setRecordingFlash] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);

  const partner: Person = candidates[partnerIndex % candidates.length] ?? people[0]!;
  const partnerPrompt =
    randomFridayPartnerPrompts[partner.id] ??
    `30 seconds on the clock: convince me why ${partner.town} is the best place to spend this weekend!`;
  const binaryCard =
    randomFridayBinaryTapCards[partnerIndex % randomFridayBinaryTapCards.length] ??
    randomFridayBinaryTapCards[0]!;
  const myMessagesCount = messages.filter((m) => m.from === "me").length;
  const photoUnblurred = shouldUnblurMysteryPhoto(secondsLeft, myMessagesCount);

  const showBoostBanner = (label: string) => {
    setBoostToast(label);
    window.setTimeout(() => setBoostToast(null), 1900);
  };

  // Step 1 -> Step 2: Animated radar queue sweep before revealing partner
  useEffect(() => {
    if (!open) return;
    setPhase("queue");
    setSecondsLeft(RANDOM_FRIDAY_DURATION_SECONDS);
    setDraft("");
    setMessages([]);
    setChemistryBonusClaimed(false);
    setReactionBoostsUsed(0);
    setBinaryPick(null);
    setHoldProgress(0);
    setRecordingFlash(false);

    const timer = window.setTimeout(() => {
      triggerHaptic("like");
      setPhase("round");
      setMessages([
        {
          id: "intro",
          from: "partner",
          body: partnerPrompt,
        },
      ]);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [open, partnerIndex, partnerPrompt]);

  // Step 2: Dynamic countdown ring
  useEffect(() => {
    if (!open || phase !== "round") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          triggerHaptic("pass");
          setTransitionCountdown(3);
          setPhase("transition");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, phase]);

  // Step 3b: 3-second transition to next person on Pass or Timeout
  useEffect(() => {
    if (!open || phase !== "transition") return;
    const timer = window.setInterval(() => {
      setTransitionCountdown((c) => {
        if (c <= 1) {
          setPartnerIndex((idx) => idx + 1);
          return 3;
        }
        return c - 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [open, phase]);

  // Presence is used only to show other people viewing this sample round.
  useEffect(() => {
    if (!open) return;
    const channel = supabase.channel("random_friday:live", {
      config: { presence: { key: userId ?? "guest" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const livePeers = Object.keys(state).length;
        setOnlineCount(livePeers);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ joined_at: new Date().toISOString(), town });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, streak, town, userId]);

  useEffect(
    () => () => {
      if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
    },
    [],
  );

  if (!open) return null;

  const progress = Math.min(
    1,
    Math.max(0, (RANDOM_FRIDAY_DURATION_SECONDS - secondsLeft) / RANDOM_FRIDAY_DURATION_SECONDS),
  );
  const circumference = 2 * Math.PI * 18;

  const sendPitch = (e?: FormEvent, presetLine?: string, isVoiceClip = false) => {
    e?.preventDefault();
    const clean = (presetLine ?? draft).trim();
    if (!clean || phase !== "round") return;
    triggerHaptic("send");

    // Check Instant Chemistry Bonus (+15s if sent in the first 10 seconds of the round)
    if (!chemistryBonusClaimed && secondsLeft >= 20) {
      setChemistryBonusClaimed(true);
      setSecondsLeft((curr) => applyTimeBoost(curr, INSTANT_CHEMISTRY_BONUS_SECONDS));
      showBoostBanner(`+${INSTANT_CHEMISTRY_BONUS_SECONDS}s Instant Chemistry Bonus!`);
      triggerHaptic("match");
    }

    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}`, from: "me", body: clean, isVoice: isVoiceClip },
    ]);
    if (!presetLine) setDraft("");

    window.setTimeout(() => {
      const reply =
        instantPartnerReplies[(messages.length + partnerIndex) % instantPartnerReplies.length] ??
        instantPartnerReplies[0]!;
      setMessages((prev) => [
        ...prev,
        { id: `partner-${Date.now()}`, from: "partner", body: reply },
      ]);
    }, 650);
  };

  const triggerEmojiReaction = (emoji: string) => {
    triggerHaptic("like");
    setFloatingEmoji(emoji);
    window.setTimeout(() => setFloatingEmoji(null), 900);

    if (reactionBoostsUsed < MAX_REACTION_BOOSTS) {
      setReactionBoostsUsed((c) => c + 1);
      setSecondsLeft((curr) => applyTimeBoost(curr, REACTION_BOOST_SECONDS));
      showBoostBanner(`${emoji} +${REACTION_BOOST_SECONDS}s Banter Boost!`);
    }
  };

  const spinDicePrompt = () => {
    triggerHaptic("like");
    const prompt = randomFridayDicePrompts[diceIdx % randomFridayDicePrompts.length]!;
    setDiceIdx((c) => c + 1);
    setMessages((prev) => [
      ...prev,
      { id: `dice-${Date.now()}`, from: "system", body: `🎲 Wheel Prompt: "${prompt}"` },
    ]);
  };

  const triggerAudioFlash = () => {
    if (recordingFlash) return;
    triggerHaptic("like");
    setRecordingFlash(true);
    window.setTimeout(() => {
      setRecordingFlash(false);
      sendPitch(
        undefined,
        `🎙️ 7s Audio Flash: "Hey ${partner.name}! Planning a sunset road trip in ${partner.town} this weekend — tell me you’re in!"`,
        true,
      );
    }, 1100);
  };

  const handleStay = () => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
    showBoostBanner("Sample round only — live pairing is not available yet.");
  };

  const startHoldToStay = () => {
    if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
    triggerHaptic(15);
    holdTimerRef.current = window.setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + 25;
        triggerHaptic(12);
        if (next >= 100) {
          if (holdTimerRef.current) {
            window.clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          void handleStay();
          return 100;
        }
        return next;
      });
    }, 140);
  };

  const stopHoldToStay = () => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress((prev) => (prev >= 100 ? 100 : 0));
  };

  const handleSkip = () => {
    triggerHaptic("pass");
    void captureProductEvent("match_keep_swiping", { source: "random_friday" });
    setTransitionCountdown(3);
    setPhase("transition");
  };

  const generateAiLivePitch = async () => {
    triggerHaptic(10);
    if (userId) {
      try {
        const res = await draftRandomFridayPitch({
          data: {
            style: "playful",
            focusHint: `connecting with ${partner.name} in ${partner.town}`,
          },
        });
        setDraft(res.draft.pitch);
        showBoostBanner("✨ AI 30s Pitch ready!");
        return;
      } catch {
        // fallback below
      }
    }
    const fallback = fallbackRandomFridayPitch(
      {
        displayName: "You",
        age: 26,
        town: partner.town,
        intent: partner.intent,
        tags: partner.tags,
        bio: "",
        seeking: "",
      },
      "playful",
    );
    setDraft(fallback.pitch);
    showBoostBanner("✨ AI 30s Pitch ready!");
  };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Random Friday 30-Second Live Sprint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 px-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.92, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 25 }}
          className="relative flex max-h-[92svh] w-full max-w-[395px] flex-col overflow-hidden rounded-[26px] border border-white/20 bg-card shadow-float"
        >
          {/* Live Atmosphere Ticker (#5: Streak & Leaderboard) */}
          <div className="flex items-center justify-between bg-foreground px-4 py-1.5 text-[10px] font-medium text-white">
            <span className="inline-flex items-center gap-1 truncate">
              Sample round · no match will be created
            </span>
            <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-semibold text-emerald-300">
              ⚡ Streak: {streak}
            </span>
          </div>

          {/* Top bar with Dynamic Time-Booster Clock (#1) */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition ${
                  boostToast ? "ring-2 ring-emerald-500" : ""
                }`}
              >
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    className={
                      boostToast
                        ? "text-emerald-500"
                        : secondsLeft <= 8
                          ? "text-destructive"
                          : "text-primary"
                    }
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {phase === "round" ? `${secondsLeft}s` : "30s"}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">Random Friday</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Users className="h-2.5 w-2.5" />
                    {onlineCount} present · Preview
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {chemistryBonusClaimed
                    ? "+15s Chemistry Bonus unlocked!"
                    : "Reply in first 10s for +15s bonus"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Random Friday"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Time Booster Toast */}
          <AnimatePresence>
            {boostToast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-emerald-600 px-4 py-1 text-center text-[11px] font-semibold text-white"
              >
                {boostToast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Emoji Burst */}
          <AnimatePresence>
            {floatingEmoji && (
              <motion.div
                initial={{ opacity: 1, y: 20, scale: 0.7 }}
                animate={{ opacity: 0, y: -70, scale: 1.7 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute bottom-28 right-8 z-30 text-3xl"
              >
                {floatingEmoji}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 1: Animated Radar Queue Sweep */}
          {phase === "queue" && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <motion.span
                  animate={{ scale: [1, 1.85], opacity: [0.55, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-primary/30"
                />
                <motion.span
                  animate={{ scale: [1, 1.45], opacity: [0.65, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.35 }}
                  className="absolute inset-2 rounded-full bg-primary/40"
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
                  <Radio className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                Finding someone nearby…
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Loading a 30-second sample round in {town === "All" ? "Namibia" : town}.
              </p>
            </div>
          )}

          {/* Phase 2: 30-Second Live Pitch Round */}
          {phase === "round" && (
            <>
              {/* Partner header with #6 Mystery Blur Reveal */}
              <div className="flex items-center justify-between border-b border-border bg-accent/50 px-4 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-2xs">
                    <img
                      src={photo(partner, true)}
                      alt={partner.name}
                      className={`h-full w-full object-cover transition duration-500 ${
                        photoUnblurred ? "blur-0" : "scale-110 blur-[5px]"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">
                        {partner.name}, {partner.age} · {partner.town}
                      </p>
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-primary">
                        {photoUnblurred ? "Photo unblurred!" : "Send msg to unblur"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {partner.job} · {partner.tags.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-primary shadow-2xs">
                  <Clock3 className="h-3 w-3" />
                  {secondsLeft}s
                </span>
              </div>

              {/* #2 Binary "Agree or Fight" Quick Tap Card */}
              <div className="border-b border-border bg-white px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {binaryCard.prompt}
                  </span>
                  {binaryPick && (
                    <span className="text-[10px] font-semibold text-emerald-700">
                      Synced with {partner.name}!
                    </span>
                  )}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {(["left", "right"] as const).map((side) => {
                    const label = side === "left" ? binaryCard.left : binaryCard.right;
                    const active = binaryPick === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => {
                          triggerHaptic("like");
                          setBinaryPick(side);
                          if (!chemistryBonusClaimed) {
                            setSecondsLeft((c) => applyTimeBoost(c, 3));
                          }
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary/50 text-foreground hover:border-primary/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Round Messages */}
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-2.5">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.from === "system"
                        ? "justify-center"
                        : m.from === "me"
                          ? "justify-end"
                          : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-3 py-1.5 text-xs leading-5 ${
                        m.from === "system"
                          ? "bg-accent text-[11px] font-semibold text-primary"
                          : m.from === "me"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              {/* #1 Quick Emoji Reactions (+3s boost) & #4 7-Second Audio Flash & #2 Dice Spin */}
              <div className="border-t border-border bg-white px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {["🔥", "👏", "😂"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => triggerEmojiReaction(emoji)}
                        aria-label={`React with ${emoji} for +3s boost`}
                        className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs transition active:scale-90"
                      >
                        {emoji} +3s
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void generateAiLivePitch()}
                      aria-label="Write 30-second pitch with AI"
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary"
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Pitch
                    </button>
                    <button
                      type="button"
                      onClick={spinDicePrompt}
                      aria-label="Spin Icebreaker Wheel"
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary"
                    >
                      <Dices className="h-3 w-3" />
                      Spin 🎲
                    </button>
                    <button
                      type="button"
                      onClick={triggerAudioFlash}
                      disabled={recordingFlash}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                        recordingFlash
                          ? "animate-pulse bg-primary text-primary-foreground"
                          : "border border-border bg-secondary text-foreground"
                      }`}
                    >
                      <Mic className="h-3 w-3 text-primary" />
                      {recordingFlash ? "Recording 7s…" : "7s Voice"}
                    </button>
                  </div>
                </div>

                {/* One-tap 30s elevator lines */}
                <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  {randomFridayElevatorLines.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => sendPitch(undefined, line)}
                      className="shrink-0 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[10px] font-medium text-foreground hover:border-primary/40"
                    >
                      <Sparkles className="mr-1 inline h-2.5 w-2.5 text-primary" />
                      {line}
                    </button>
                  ))}
                </div>

                <form onSubmit={sendPitch} className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Pitch ${partner.name} before 0s…`}
                    className="h-9 flex-1 rounded-full border border-border bg-secondary px-3.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Send pitch"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>

                {/* #3 Decision Point: [ Pass ] or [ Hold to Stay ] Haptic Pressure Meter */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="h-10 rounded-full border border-border bg-secondary text-xs font-semibold text-foreground transition active:scale-[0.98]"
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    onMouseDown={startHoldToStay}
                    onMouseUp={stopHoldToStay}
                    onMouseLeave={stopHoldToStay}
                    onTouchStart={startHoldToStay}
                    onTouchEnd={stopHoldToStay}
                    onClick={() => void handleStay()}
                    className="relative inline-flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98]"
                  >
                    {holdProgress > 0 && (
                      <span
                        aria-hidden="true"
                        style={{ width: `${holdProgress}%` }}
                        className="absolute inset-y-0 left-0 bg-emerald-500/55 transition-all"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      {holdProgress > 0 ? `Holding Stay (${holdProgress}%)` : "Hold or Tap Stay"}
                    </span>
                  </button>
                </div>

                {userId && (
                  <div className="mt-2 border-t border-border/60 pt-1.5">
                    <SafetyActions
                      userId={userId}
                      targetId={partner.id}
                      targetName={partner.name}
                      onBlocked={handleSkip}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Phase 3a: Both Tapped "Stay" */}
          {phase === "matched" && (
            <div className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MessageCircle className="h-8 w-8" />
              </div>
              <div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Both Held Stay! · Streak #{streak}
                </span>
                <h3 className="mt-2 text-xl font-bold text-foreground">
                  It’s a Match! Keep chatting
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You and {partner.name} beat the 30-second clock. Your permanent chat is unlocked.
                </p>
              </div>
              <div className="space-y-2">
                <Link
                  to="/chats"
                  search={{ matchId: partner.id }}
                  onClick={() => {
                    void captureProductEvent("match_say_hello", { via: "random_friday" });
                    onClose();
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
                >
                  Say hello to {partner.name}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void captureProductEvent("match_keep_swiping", { source: "random_friday" });
                    setPartnerIndex((idx) => idx + 1);
                  }}
                  className="h-10 w-full rounded-full bg-secondary text-xs font-semibold text-foreground"
                >
                  Next 30s pairing
                </button>
              </div>
            </div>
          )}

          {/* Phase 3b: Moving to next person in 3... 2... 1... */}
          {phase === "transition" && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-bold tabular-nums text-primary">
                {transitionCountdown}
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Moving to next person in {transitionCountdown}…
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Zero awkwardness — lining up your next 30-second round.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
