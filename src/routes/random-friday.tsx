import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { NearbyFeatureShell } from "@/components/NearbyFeatureShell";
import { randomFridayDicePrompts } from "@/lib/random-friday";
import { triggerHaptic } from "@/lib/icebreakers";

export const Route = createFileRoute("/random-friday")({
  head: () => ({ meta: [{ title: "Random Friday — Mutal" }] }),
  component: RandomFridayPage,
});

const DURATION = 30;
const CIRCUMFERENCE = 2 * Math.PI * 48;

function RandomFridayPage() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const nextPrompt = () => {
    setRunning(false);
    setSeconds(DURATION);
    setPromptIndex((index) => (index + 1) % randomFridayDicePrompts.length);
    triggerHaptic(8);
  };

  return (
    <NearbyFeatureShell title="Random Friday">
      <div className="px-5 pb-12 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          30-second introductions
        </p>
        <h2 className="mt-2 text-[25px] font-semibold leading-8 tracking-[-0.035em]">
          A quick hello, in your own words.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Pick a prompt and practise a short introduction. Live pairing is not available yet.
        </p>

        <section
          className="mt-7 rounded-[20px] border border-border bg-white p-5"
          aria-label="Introduction practice"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Prompt {promptIndex + 1} of {randomFridayDicePrompts.length}
            </span>
            <span>Practice round</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={promptIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-6 min-h-20 text-[19px] font-semibold leading-7"
            >
              {randomFridayDicePrompts[promptIndex]}
            </motion.p>
          </AnimatePresence>
          <div className="mt-5 flex items-center justify-center">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-secondary"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - seconds / DURATION)}
                  className="text-primary transition-[stroke-dashoffset] duration-500"
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums"
                aria-live="off"
              >
                {seconds}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setRunning((value) => !value);
              if (seconds === 0) {
                setSeconds(DURATION);
                setRunning(true);
              }
            }}
            className="mt-6 h-12 w-full rounded-full bg-primary text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {seconds === 0
              ? "Try again"
              : running
                ? "Pause timer"
                : seconds < DURATION
                  ? "Resume timer"
                  : "Start 30 seconds"}
          </button>
          <button
            type="button"
            onClick={nextPrompt}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" /> Another prompt
          </button>
        </section>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          This practice stays on your device. No recording or message is sent.
        </p>
      </div>
    </NearbyFeatureShell>
  );
}
