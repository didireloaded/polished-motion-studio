import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { NearbyFeatureShell } from "@/components/NearbyFeatureShell";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { speedDatingPrompts } from "@/lib/social-games";

export const Route = createFileRoute("/speed-dating")({
  head: () => ({ meta: [{ title: "Speed dating — Mutal" }] }),
  component: SpeedDatingPage,
});

function SpeedDatingPage() {
  const { user } = useSession();
  const [selected, setSelected] = useState(0);
  const prompt = speedDatingPrompts[selected]!;
  const matches = useQuery({
    queryKey: ["speed-dating-matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,user_a,user_b")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .limit(20);
      if (error) throw error;
      const partners = (data ?? []).map((match) => ({
        id: match.id,
        partnerId: match.user_a === user!.id ? match.user_b : match.user_a,
      }));
      if (!partners.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,display_name,town")
        .in(
          "id",
          partners.map((match) => match.partnerId),
        );
      if (profileError) throw profileError;
      const names = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return partners.flatMap((match) => {
        const profile = names.get(match.partnerId);
        return profile ? [{ id: match.id, name: profile.display_name, town: profile.town }] : [];
      });
    },
  });

  return (
    <NearbyFeatureShell title="Speed dating">
      <div className="px-5 pb-12 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          A guided conversation
        </p>
        <h2 className="mt-2 text-[25px] font-semibold leading-8 tracking-[-0.035em]">
          Get past “hey” sooner.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Choose one question, then send it to someone you have already matched with. Live timed
          rounds are not available yet.
        </p>

        <section className="mt-7" aria-label="Conversation questions">
          <h3 className="mb-3 text-[13px] font-semibold">Choose a question</h3>
          <div className="space-y-2">
            {speedDatingPrompts.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
                className={`w-full rounded-2xl border p-4 text-left transition-[border-color,transform,background-color] hover:-translate-y-0.5 active:scale-[0.99] ${selected === index ? "border-primary bg-primary/5" : "border-border bg-white"}`}
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.category}
                </span>
                <span className="mt-1 block text-[14px] font-medium leading-5">{item.prompt}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-border pt-6" aria-label="Choose a match">
          <h3 className="text-[15px] font-semibold">Send to a match</h3>
          {!user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in and match with someone to start a real conversation.
            </p>
          ) : matches.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading your matches…</p>
          ) : matches.isError ? (
            <p className="mt-2 text-sm text-primary">Your matches could not load. Try again.</p>
          ) : !matches.data?.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No matches yet. Your conversations will appear here.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-2xl border border-border">
              {matches.data.map((match) => (
                <Link
                  key={match.id}
                  to="/chats"
                  search={{ matchId: match.id, draft: prompt.prompt }}
                  className="flex min-h-14 items-center justify-between px-4 text-sm transition-colors hover:bg-secondary/50"
                >
                  <span>
                    <span className="font-semibold">{match.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{match.town}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </NearbyFeatureShell>
  );
}
