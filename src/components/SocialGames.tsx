import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Flame, Mic, Pause, Play, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { triggerHaptic } from "@/lib/icebreakers";
import {
  buildTwoTruthsReply,
  dailyHotTakePrompts,
  flagSwipePolls,
  thisOrThatQuestions,
  type ElevatorPitch,
  type EmojiStoryPuzzle,
  type FirstDateDilemma,
  type TwoTruthsGame,
} from "@/lib/social-games";

export function ElevatorPitchCard({
  personName,
  pitch,
  onSelectReaction,
}: {
  personName: string;
  pitch: ElevatorPitch;
  onSelectReaction: (reactionText: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(pitch.durationSeconds);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  useEffect(() => {
    setPlaying(false);
    setRemaining(pitch.durationSeconds);
    setSelectedReaction(null);
  }, [pitch.durationSeconds, pitch.pitchText]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setPlaying(false);
          return pitch.durationSeconds;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, pitch.durationSeconds]);

  const progress = (pitch.durationSeconds - remaining) / pitch.durationSeconds;
  const circumference = 2 * Math.PI * 18;

  return (
    <section
      aria-label={`30-second elevator pitch by ${personName}`}
      className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/65 via-white to-secondary/50 p-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Mic className="h-3 w-3" />
            30s Elevator Pitch
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("like");
            setPlaying((current) => !current);
          }}
          aria-label={playing ? "Pause 30-second pitch" : "Play 30-second pitch"}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition active:scale-95"
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="2.5"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>

      <p className="mt-2 text-xs font-semibold text-foreground">“{pitch.prompt}”</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{pitch.pitchText}</p>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex flex-1 items-end gap-1 h-4" aria-hidden="true">
          {[40, 75, 55, 95, 65, 85, 45, 90, 60, 80, 50, 70, 85, 55, 65, 45].map((height, idx) => (
            <motion.span
              key={idx}
              animate={
                playing
                  ? {
                      height: [
                        `${Math.max(25, height - 30)}%`,
                        `${height}%`,
                        `${Math.max(30, height - 20)}%`,
                      ],
                    }
                  : { height: `${Math.round(height * 0.45)}%` }
              }
              transition={
                playing
                  ? { duration: 0.65, repeat: Infinity, delay: idx * 0.04 }
                  : { duration: 0.2 }
              }
              className={`flex-1 rounded-full ${playing ? "bg-primary" : "bg-primary/35"}`}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-primary">
          0:{String(remaining).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-3 border-t border-border/60 pt-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tap a reaction to reply directly
        </p>
        <div className="flex flex-wrap gap-1.5">
          {pitch.reactions.map((reaction) => {
            const active = selectedReaction === reaction;
            return (
              <button
                key={reaction}
                type="button"
                onClick={() => {
                  triggerHaptic("send");
                  setSelectedReaction(reaction);
                  onSelectReaction(reaction);
                }}
                className={`rounded-full border px-2.5 py-1 text-left text-[11px] font-medium transition active:scale-[0.98] ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {reaction}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TwoTruthsCard({
  game,
  onSendReply,
}: {
  game: TwoTruthsGame;
  onSendReply: (replyDraft: string) => void;
}) {
  const [guessedIndex, setGuessedIndex] = useState<number | null>(null);

  useEffect(() => {
    setGuessedIndex(null);
  }, [game.personId]);

  const outcome = guessedIndex !== null ? buildTwoTruthsReply(game, guessedIndex) : null;

  return (
    <section
      aria-label={`Two truths and a lie with ${game.personName}`}
      className="mt-4 rounded-2xl border border-border bg-secondary/45 p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Two Truths & a Lie
        </span>
        <span className="text-[11px] text-muted-foreground">Tap to spot the lie</span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {game.items.map((item, index) => {
          const revealed = guessedIndex !== null;
          const isPicked = guessedIndex === index;
          let badgeClass = "border-border bg-white text-foreground hover:border-primary/40";
          if (revealed) {
            if (item.isLie) {
              badgeClass = "border-emerald-500/60 bg-emerald-50 text-emerald-950";
            } else if (isPicked) {
              badgeClass = "border-amber-500/50 bg-amber-50 text-amber-950";
            } else {
              badgeClass = "border-border/60 bg-white/70 text-muted-foreground";
            }
          }

          return (
            <button
              key={item.statement}
              type="button"
              disabled={revealed}
              onClick={() => {
                triggerHaptic(item.isLie ? "match" : "like");
                setGuessedIndex(index);
              }}
              className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs leading-4 transition ${badgeClass}`}
            >
              <span>
                <strong className="mr-1.5 font-semibold text-primary">#{index + 1}</strong>
                {item.statement}
              </span>
              {revealed && (
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  {item.isLie ? "The Lie" : "Truth"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {outcome && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-3 rounded-xl bg-white p-2.5 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {outcome.correct
                ? `Gotcha! You spotted ${game.personName}’s lie.`
                : `Close! #${game.items.findIndex((i) => i.isLie) + 1} was the lie.`}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{outcome.replyDraft}</p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("send");
                onSendReply(outcome.replyDraft);
              }}
              className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              Send “Gotcha!” reply in chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function ThisOrThatRapidRadar({
  answers,
  onAnswer,
  onClose,
}: {
  answers: Record<string, string>;
  onAnswer: (questionId: string, pick: "A" | "B") => void;
  onClose?: () => void;
}) {
  const answeredCount = thisOrThatQuestions.filter((q) => answers[q.id]).length;

  return (
    <section
      aria-label="This or That Rapid Radar"
      className="mx-5 mb-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-float"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Zap className="h-3.5 w-3.5" />
            This or That · Rapid Radar
          </span>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground">
            5 quick Namibian picks to unlock Vibe Alignment %
          </h2>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary">
          {answeredCount}/5
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {thisOrThatQuestions.map((q) => {
          const picked = answers[q.id];
          return (
            <div key={q.id} className="rounded-xl bg-secondary/50 p-2.5">
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{q.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["A", "B"] as const).map((side) => {
                  const option = side === "A" ? q.optionA : q.optionB;
                  const active = picked === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        triggerHaptic("like");
                        onAnswer(q.id, side);
                      }}
                      className={`rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98] ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-white text-foreground hover:border-primary/40"
                      }`}
                    >
                      <p className="text-xs font-semibold">{option.label}</p>
                      <p
                        className={`mt-0.5 text-[10px] leading-3.5 ${
                          active ? "text-primary-foreground/85" : "text-muted-foreground"
                        }`}
                      >
                        {option.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {onClose && (
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary" />
            Matches your picks against nearby members
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Done
          </button>
        </div>
      )}
    </section>
  );
}

export function FirstDateDilemmaCard({
  partnerName,
  dilemma,
  onUseReply,
}: {
  partnerName: string;
  dilemma: FirstDateDilemma;
  onUseReply: (replyText: string) => void;
}) {
  const [myPick, setMyPick] = useState<"A" | "B" | null>(null);

  const bothMatched = myPick !== null && myPick === dilemma.partnerPick;
  const chosenOption =
    myPick === "A" ? dilemma.optionA : myPick === "B" ? dilemma.optionB : undefined;
  const partnerOption = dilemma.partnerPick === "A" ? dilemma.optionA : dilemma.optionB;

  return (
    <section
      aria-label={`First Date Dilemma with ${partnerName}`}
      className="rounded-2xl border border-primary/20 bg-card p-3.5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          First Date Dilemma
        </span>
        <span className="text-[10px] text-muted-foreground">
          {myPick ? "Answers revealed!" : `Pick to see ${partnerName}’s choice`}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-foreground">{dilemma.prompt}</p>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {(["A", "B"] as const).map((side) => {
          const opt = side === "A" ? dilemma.optionA : dilemma.optionB;
          const isMine = myPick === side;
          const isTheirs = myPick !== null && dilemma.partnerPick === side;
          return (
            <button
              key={side}
              type="button"
              onClick={() => {
                triggerHaptic("match");
                setMyPick(side);
              }}
              className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                isMine
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-white text-foreground hover:border-primary/40"
              }`}
            >
              <div>
                <p className="text-xs font-semibold leading-4">{opt.label}</p>
                <p className="mt-1 text-[10px] leading-3.5 text-muted-foreground">
                  {opt.venueHint}
                </p>
              </div>
              {myPick && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {isMine && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
                      You
                    </span>
                  )}
                  {isTheirs && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-semibold text-white">
                      {partnerName}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {myPick && chosenOption && (
        <div className="mt-3 rounded-xl bg-secondary/50 p-2.5">
          <p className="text-xs font-medium text-foreground">
            {bothMatched
              ? `It’s a match! You both picked "${chosenOption.label}".`
              : `You picked "${chosenOption.label}" and ${partnerName} picked "${partnerOption.label}".`}
          </p>
          <button
            type="button"
            onClick={() => {
              const draft = bothMatched
                ? `We both picked "${chosenOption.label}" on the First Date Dilemma — should we make it happen this week?`
                : `Okay, since I picked "${chosenOption.label}" and you picked "${partnerOption.label}", which one are we doing first?`;
              onUseReply(draft);
            }}
            className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            Send this date idea to chat
          </button>
        </div>
      )}
    </section>
  );
}

export function EmojiStoryDecodeCard({
  partnerName,
  puzzle,
  onUseReply,
}: {
  partnerName: string;
  puzzle: EmojiStoryPuzzle;
  onUseReply: (replyText: string) => void;
}) {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const solved = pickedIndex === puzzle.correctIndex;

  return (
    <section
      aria-label={`Emoji story decode with ${partnerName}`}
      className="mt-2.5 rounded-2xl border border-border bg-secondary/45 p-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Emoji Story Decode
        </span>
        <span className="text-[10px] text-muted-foreground">Decode {partnerName}’s weekend</span>
      </div>
      <p className="mt-2 text-center text-2xl tracking-widest" aria-label="Emoji clues">
        {puzzle.emojis}
      </p>
      <div className="mt-2.5 space-y-1.5">
        {puzzle.options.map((opt, idx) => {
          const isPicked = pickedIndex === idx;
          const isRight = idx === puzzle.correctIndex;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                triggerHaptic(isRight ? "match" : "like");
                setPickedIndex(idx);
              }}
              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                isPicked
                  ? isRight
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-950"
                    : "border-amber-500 bg-amber-50 text-amber-950"
                  : "border-border bg-white text-foreground hover:border-primary/40"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {pickedIndex !== null && (
        <div className="mt-2.5 rounded-xl bg-white p-2.5">
          <p className="text-xs font-medium text-foreground">
            {solved ? `Nailed it! ${puzzle.explanation}` : `Not quite — try option #1!`}
          </p>
          {solved && (
            <button
              type="button"
              onClick={() =>
                onUseReply(
                  `I decoded your ${puzzle.emojis} story (${puzzle.options[puzzle.correctIndex]})! When’s the next trip?`,
                )
              }
              className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              Reply about their emoji story
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function HotTakeAndFlagPollHub({
  onAgreeWithTake,
}: {
  onAgreeWithTake: (quipText: string) => void;
}) {
  const [pollIndex, setPollIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, "green" | "red">>({});
  const poll = flagSwipePolls[pollIndex % flagSwipePolls.length]!;
  const myVote = votes[poll.id];
  const hotTake = dailyHotTakePrompts[0]!;

  return (
    <div className="mx-5 mt-3 space-y-3">
      {/* Red Flag / Green Flag Swipe Poll */}
      <section
        aria-label="Red Flag or Green Flag Swipe Poll"
        className="rounded-2xl border border-border bg-card p-3.5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Flame className="h-3 w-3" />
            Green Flag / Red Flag Poll
          </span>
          <button
            type="button"
            onClick={() => setPollIndex((i) => i + 1)}
            className="text-[11px] font-semibold text-primary"
          >
            Next poll ({(pollIndex % flagSwipePolls.length) + 1}/{flagSwipePolls.length})
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-foreground">“{poll.statement}”</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("like");
              setVotes((v) => ({ ...v, [poll.id]: "green" }));
            }}
            className={`h-9 rounded-full border text-xs font-semibold transition ${
              myVote === "green"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-emerald-600/40 bg-emerald-50 text-emerald-900"
            }`}
          >
            Green Flag
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("pass");
              setVotes((v) => ({ ...v, [poll.id]: "red" }));
            }}
            className={`h-9 rounded-full border text-xs font-semibold transition ${
              myVote === "red"
                ? "border-rose-600 bg-rose-600 text-white"
                : "border-rose-600/40 bg-rose-50 text-rose-900"
            }`}
          >
            Red Flag
          </button>
        </div>
        {myVote && (
          <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
            {myVote === "green" ? poll.greenFlagPct : 100 - poll.greenFlagPct}% of members in{" "}
            {poll.town} agree with your call.
          </p>
        )}
      </section>

      {/* Hot Take of the Day */}
      <section
        aria-label="Hot Take of the Day"
        className="rounded-2xl border border-primary/20 bg-accent/45 p-3.5"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Hot Take of the Day
        </span>
        <p className="mt-1 text-xs font-semibold text-foreground">{hotTake.prompt}</p>
        <div className="mt-2 space-y-2">
          {hotTake.sampleTakes.map((take) => (
            <div
              key={take.author}
              className="flex items-start justify-between gap-2 rounded-xl bg-white p-2.5"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground">
                  {take.author} ·{" "}
                  <span className="font-normal text-muted-foreground">{take.town}</span>
                </p>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">“{take.quip}”</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("like");
                  onAgreeWithTake(
                    `I agree with ${take.author.split(",")[0]}'s hot take: "${take.quip}"`,
                  );
                }}
                className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                I agree!
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
