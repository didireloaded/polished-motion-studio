import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto } from "@/components/community";
import { MAX_VALUES_LENGTH } from "@/lib/match-values";
import { rankMatchesByValues, type ValuesRankingResult } from "@/lib/match-values.functions";

export const Route = createFileRoute("/match-values")({
  head: () => ({
    meta: [
      { title: "What you value — Mutal" },
      {
        name: "description",
        content:
          "Describe what matters to you and see your matches ranked with personal explanations.",
      },
      { property: "og:title", content: "What you value — Mutal" },
      {
        property: "og:description",
        content: "See which of your Mutal matches fit what you value most.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MatchValues,
});

const IDEAS = [
  "Kindness",
  "Faith",
  "Loves the outdoors",
  "Wants family",
  "Ambitious",
  "Good humour",
];

function MatchValues() {
  const { user, ready } = useSession();
  const rank = useServerFn(rankMatchesByValues);
  const [values, setValues] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ValuesRankingResult | null>(null);

  const saved = useQuery({
    queryKey: ["match-values", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("match_values")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.match_values ?? "";
    },
  });
  useEffect(() => {
    if (saved.data && !values) setValues(saved.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const submit = async () => {
    if (busy || values.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      setResult(await rank({ data: { values: values.trim() } }));
    } catch {
      setError("Couldn't rank your matches right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const addIdea = (idea: string) =>
    setValues((v) =>
      (v.toLowerCase().includes(idea.toLowerCase()) ? v : v ? `${v}, ${idea}` : idea).slice(
        0,
        MAX_VALUES_LENGTH,
      ),
    );

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-32 pt-6">
      <Link
        to="/chats"
        search={{ matchId: undefined }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Chats
      </Link>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 font-display text-3xl font-semibold"
      >
        What do you value?
      </motion.h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe what matters most in a partner. We'll rank your matches and explain why.
      </p>

      {ready && !user ? (
        <div className="mt-8 rounded-3xl bg-card p-6 text-center shadow-sm">
          <p className="font-semibold">Sign in to rank your matches</p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <textarea
            value={values}
            onChange={(e) => setValues(e.target.value.slice(0, MAX_VALUES_LENGTH))}
            rows={4}
            placeholder="e.g. Someone kind and family-minded who enjoys weekends outdoors and takes faith seriously."
            className="input mt-5 w-full resize-none"
            aria-label="What you value in a match"
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {values.length}/{MAX_VALUES_LENGTH}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => addIdea(idea)}
                className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-muted"
              >
                + {idea}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={busy || values.trim().length < 3}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Ranking your matches…" : "Rank my matches"}
          </button>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {result && (
            <div className="mt-8">
              {result.notice && (
                <p className="mb-3 rounded-2xl bg-muted px-4 py-2 text-xs text-muted-foreground">
                  {result.notice}
                </p>
              )}
              {result.items.length === 0 ? (
                <div className="rounded-3xl bg-card p-6 text-center text-sm shadow-sm">
                  You don't have any matches yet.{" "}
                  <Link to="/" className="font-semibold text-primary">
                    Discover people
                  </Link>
                </div>
              ) : (
                <ol className="space-y-3">
                  <AnimatePresence>
                    {result.items.map((item, i) => (
                      <motion.li
                        key={item.matchId}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex gap-3 rounded-3xl bg-card p-3 shadow-sm"
                      >
                        <ProfilePhoto
                          name={item.profile.display_name}
                          path={item.profile.photo_paths[0]}
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-semibold">
                              {i + 1}. {item.profile.display_name}, {item.profile.age}
                            </p>
                            <span className="shrink-0 text-xs font-semibold text-primary">
                              {item.score}% fit
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ delay: 0.2 + i * 0.06, duration: 0.6 }}
                            />
                          </div>
                          {item.reason && (
                            <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                          )}
                          <Link
                            to="/chats"
                            search={{ matchId: item.matchId }}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Message
                          </Link>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
