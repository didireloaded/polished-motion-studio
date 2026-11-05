import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { NearbyFeatureShell } from "@/components/NearbyFeatureShell";
import { ProfilePhoto } from "@/components/community";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/lib/icebreakers";
import {
  getMyDailyQuickPickServerFn,
  getSharedDailyPickCandidatesServerFn,
  saveDailyQuickPickServerFn,
} from "@/lib/social-backend.functions";
import { getDailyThisOrThatQuestion } from "@/lib/social-games";

export const Route = createFileRoute("/this-or-that")({
  head: () => ({ meta: [{ title: "Quick pick — Mutal" }] }),
  component: ThisOrThatPage,
});

function ThisOrThatPage() {
  const { user } = useSession();
  const navigate = useNavigate({ from: "/this-or-that" });
  const question = getDailyThisOrThatQuestion();
  const [choice, setChoice] = useState<"A" | "B" | null>(null);
  const [candidates, setCandidates] = useState<
    Awaited<ReturnType<typeof getSharedDailyPickCandidatesServerFn>>
  >([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [pendingLike, setPendingLike] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [matchedId, setMatchedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getMyDailyQuickPickServerFn()
      .then((saved) => {
        if (active) setChoice(saved?.question_id === question.id ? saved.choice : null);
      })
      .catch(() => {
        if (active) setNotice("Your pick could not load. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, question.id]);

  useEffect(() => {
    let active = true;
    if (!user || !choice) {
      setCandidates([]);
      return;
    }
    setCandidatesLoading(true);
    void getSharedDailyPickCandidatesServerFn({ data: { questionId: question.id } })
      .then((rows) => {
        if (active) setCandidates(rows);
      })
      .catch(() => {
        if (active) setNotice("Shared picks could not load. Try again in a moment.");
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, choice, question.id]);

  const choose = async (nextChoice: "A" | "B") => {
    if (!user || saving) return;
    setSaving(true);
    setNotice("");
    try {
      if (user) {
        await saveDailyQuickPickServerFn({ data: { questionId: question.id, choice: nextChoice } });
      }
      setChoice(nextChoice);
      triggerHaptic("like");
    } catch {
      setNotice("Your pick did not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const likeCandidate = async (candidateId: string) => {
    if (!user || pendingLike) return;
    setPendingLike(candidateId);
    setNotice("");
    const { error } = await supabase
      .from("decisions")
      .insert({ actor_id: user.id, target_id: candidateId, liked: true });
    if (error) {
      setNotice("Your like could not be sent. Please try again.");
      setPendingLike(null);
      return;
    }
    setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(user_a.eq.${user.id},user_b.eq.${candidateId}),and(user_a.eq.${candidateId},user_b.eq.${user.id})`,
      )
      .maybeSingle();
    if (match) {
      setMatchedId(match.id);
      setNotice("You both chose to connect. Your chat is ready.");
    } else {
      setNotice("Like sent. If they choose to connect too, a chat will open.");
    }
    setPendingLike(null);
  };

  const options = [question.optionA, question.optionB] as const;

  return (
    <NearbyFeatureShell title="This or That">
      <div className="px-5 pb-12 pt-8">
        <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.02em]">
          One small choice. A shared starting point.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The prompt changes each day in Namibia. Only people who choose the same answer appear
          here; a chat starts only after you both like each other.
        </p>
        {notice && (
          <p role="status" className="mt-4 text-sm text-primary">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading today’s pick…</p>
        ) : !choice ? (
          <section className="mt-8" aria-label={question.title}>
            <p className="text-xs font-medium text-muted-foreground">{question.title}</p>
            <div className="mt-3 space-y-3">
              {options.map((option, optionIndex) => {
                const value = optionIndex === 0 ? "A" : "B";
                return (
                  <button
                    key={option.label}
                    type="button"
                    disabled={saving}
                    onClick={() => void choose(value)}
                    className="flex min-h-20 w-full items-center justify-between border-b border-border bg-white py-4 text-left transition-colors hover:border-primary disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-[15px] font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.subtitle}
                      </span>
                    </span>
                    <span className="ml-4 text-xs font-medium text-muted-foreground">Choose</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8" aria-label="Your daily pick">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <span className="mt-0.5 text-primary">
                <Check className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{question.title} · your choice</p>
                <h3 className="mt-1 text-lg font-semibold">
                  {choice === "A" ? question.optionA.label : question.optionB.label}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your answer is private. You’ll only see people who picked the same side.
                </p>
              </div>
            </div>
            {!user ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Create an account to find people who made the same pick.
              </p>
            ) : candidatesLoading ? (
              <p className="mt-5 text-sm text-muted-foreground">Finding shared picks…</p>
            ) : candidates.length ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">People who chose the same side</h3>
                <ul className="mt-3 divide-y divide-border">
                  {candidates.map((candidate) => (
                    <li key={candidate.id} className="flex items-center gap-3 py-4">
                      <ProfilePhoto
                        name={candidate.display_name}
                        path={candidate.photo_paths?.[0]}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {candidate.display_name}, {candidate.age}
                        </p>
                        <p className="text-xs text-muted-foreground">{candidate.town}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!!pendingLike}
                        onClick={() => void likeCandidate(candidate.id)}
                        className="inline-flex h-10 items-center gap-1.5 border border-border px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        <Heart className="h-3.5 w-3.5" />{" "}
                        {pendingLike === candidate.id ? "Sending…" : "Like"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-5 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
                No shared picks are available right now. Check again later; your answer stays
                private.
              </p>
            )}
            {matchedId && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/chats", search: { matchId: matchedId } })}
                className="mt-5 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white"
              >
                Open your chat
              </button>
            )}
          </section>
        )}
      </div>
    </NearbyFeatureShell>
  );
}
