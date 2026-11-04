import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { NearbyFeatureShell } from "@/components/NearbyFeatureShell";
import { useSession } from "@/hooks/use-session";
import { triggerHaptic } from "@/lib/icebreakers";
import {
  getMyThisOrThatAnswersServerFn,
  saveThisOrThatAnswerServerFn,
} from "@/lib/social-backend.functions";
import { thisOrThatQuestions } from "@/lib/social-games";

export const Route = createFileRoute("/this-or-that")({
  head: () => ({ meta: [{ title: "This or That — Mutal" }] }),
  component: ThisOrThatPage,
});

function ThisOrThatPage() {
  const { user } = useSession();
  const [answers, setAnswers] = useState<Record<string, "A" | "B">>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const question = thisOrThatQuestions[index];

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getMyThisOrThatAnswersServerFn()
      .then((saved) => {
        if (!active) return;
        setAnswers(saved);
        const next = thisOrThatQuestions.findIndex((item) => !saved[item.id]);
        setIndex(next < 0 ? thisOrThatQuestions.length : next);
      })
      .catch(() => {
        if (active) setNotice("Your answers could not load. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const choose = async (choice: "A" | "B") => {
    if (!question || saving) return;
    setSaving(true);
    setNotice("");
    if (!user) return;
    try {
      await saveThisOrThatAnswerServerFn({ data: { questionId: question.id, choice } });
    } catch {
      setNotice("Your answer did not save. Please try again.");
      setSaving(false);
      return;
    }
    triggerHaptic("like");
    setAnswers((current) => ({ ...current, [question.id]: choice }));
    setIndex((current) => current + 1);
    setSaving(false);
  };

  return (
    <NearbyFeatureShell title="This or That">
      <div className="px-5 pb-12 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          Five quick picks
        </p>
        <h2 className="mt-2 text-[20px] font-semibold leading-7 tracking-[-0.02em]">
          Small choices. Better conversations.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Choose what feels like you. You can change your picks any time.
        </p>
        {notice && (
          <p role="status" className="mt-4 text-sm text-primary">
            {notice}
          </p>
        )}
        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading your picks…</p>
        ) : question ? (
          <section
            className="mt-8"
            aria-label={`Question ${index + 1} of ${thisOrThatQuestions.length}`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {index + 1} of {thisOrThatQuestions.length}
              </span>
              <span>{Math.round((index / thisOrThatQuestions.length) * 100)}% complete</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${(index / thisOrThatQuestions.length) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="mt-10 text-[19px] font-semibold">{question.title}</h3>
                <div className="mt-5 space-y-3">
                  {([question.optionA, question.optionB] as const).map((option, optionIndex) => (
                    <button
                      key={option.label}
                      type="button"
                      disabled={saving}
                      onClick={() => void choose(optionIndex === 0 ? "A" : "B")}
                      className="flex min-h-20 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 text-left transition-[border-color,transform,background-color] hover:-translate-y-0.5 hover:border-primary active:scale-[0.99] disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-[15px] font-semibold">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.subtitle}
                        </span>
                      </span>
                      <span className="h-5 w-5 shrink-0 rounded-full border border-border" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-border p-5" aria-label="Your picks">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-[18px] font-semibold">Your picks are saved</h3>
            <ul className="mt-5 divide-y divide-border">
              {thisOrThatQuestions.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="text-muted-foreground">{item.title}</span>
                  <span className="text-right font-medium">
                    {answers[item.id] === "A" ? item.optionA.label : item.optionB.label}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setIndex(0)}
              className="mt-4 h-11 w-full rounded-full border border-border text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Change my picks
            </button>
          </section>
        )}
      </div>
    </NearbyFeatureShell>
  );
}
