import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Heart, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export function DatePlanScreen({ matchId }: { matchId?: string | undefined }) {
  const { user } = useSession();
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["date-plan-screen", user?.id, matchId],
    enabled: !!user && !!matchId,
    queryFn: async () => {
      const [{ data: match, error: matchError }, { data: plan, error: planError }] =
        await Promise.all([
          supabase.from("matches").select("user_a,user_b").eq("id", matchId!).maybeSingle(),
          supabase
            .from("date_plans")
            .select("activity,venue_name,town,scheduled_at,note,confirmed_a,confirmed_b,version")
            .eq("match_id", matchId!)
            .maybeSingle(),
        ]);
      if (matchError || planError) throw matchError ?? planError;
      if (!match) return null;
      const otherId = match.user_a === user!.id ? match.user_b : match.user_a;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", otherId)
        .maybeSingle();
      if (error) throw error;
      return { plan, match, name: profile?.display_name ?? "your match" };
    },
  });
  const plan = query.data?.plan;
  const name = query.data?.name ?? "your match";
  const amUserA = query.data?.match.user_a === user?.id;
  const myConfirmed = plan ? (amUserA ? plan.confirmed_a : plan.confirmed_b) : false;
  const theirConfirmed = plan ? (amUserA ? plan.confirmed_b : plan.confirmed_a) : false;
  const confirm = async () => {
    if (!user || !matchId || !plan || myConfirmed || busy) return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.rpc("update_date_plan", {
      p_match_id: matchId,
      p_expected_version: plan.version,
      p_activity: plan.activity,
      p_venue_name: plan.venue_name,
      p_town: plan.town,
      p_scheduled_at: plan.scheduled_at ?? "",
      p_note: plan.note,
      p_confirmed_a: amUserA ? true : plan.confirmed_a,
      p_confirmed_b: amUserA ? plan.confirmed_b : true,
    });
    setBusy(false);
    if (error) {
      setNotice(
        error.message.includes("PLAN_VERSION_CONFLICT")
          ? "Your match changed the plan. Review the latest details before confirming."
          : "We couldn't confirm the plan. Please try again.",
      );
    }
    await client.invalidateQueries({ queryKey: ["date-plan-screen", user.id, matchId] });
    await client.invalidateQueries({ queryKey: ["date-plan", matchId] });
  };
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-24">
      <header className="flex h-14 items-center gap-3 border-b border-border px-5">
        <Link to="/chats" search={{ matchId: undefined }} aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-sm font-semibold">Date plan</h1>
      </header>
      <div className="px-5 pt-5 text-center">
        <div className="flex items-center justify-center gap-3 text-primary">
          <Heart className="h-5 w-5 fill-primary" />
        </div>
        <p className="mt-3 text-sm font-semibold">You and {name}</p>
        <p className="text-xs text-muted-foreground">Planning something together</p>
      </div>
      {plan ? (
        <div className="mx-5 mt-6 rounded-[15px] border border-border bg-card p-4">
          <h2 className="text-[16px] font-semibold">{plan.activity}</h2>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4" />{" "}
            {[plan.venue_name, plan.town].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4" />{" "}
            {plan.scheduled_at
              ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(plan.scheduled_at))
              : "Time to be agreed"}
          </p>
          {plan.note && <p className="mt-3 text-xs leading-5">{plan.note}</p>}
          <p className="mt-4 text-xs text-primary">
            {plan.confirmed_a && plan.confirmed_b
              ? "Confirmed by both of you"
              : myConfirmed
                ? "You're in · waiting for your match"
                : theirConfirmed
                  ? `${name} is in · your turn to confirm`
                  : "Tentative plan · waiting for both of you"}
          </p>
        </div>
      ) : (
        <div className="mx-5 mt-8 rounded-[15px] bg-secondary p-5 text-center">
          <h2 className="text-sm font-semibold">No plan yet</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Suggest a simple first meeting from your chat.
          </p>
        </div>
      )}
      {user && !matchId && (
        <p className="px-5 pt-5 text-center text-xs text-muted-foreground">
          Open a match to view its date plan.
        </p>
      )}
      {query.isError && (
        <p role="alert" className="px-5 pt-5 text-center text-xs text-destructive">
          We couldn't load this plan. Please try again.
        </p>
      )}
      {notice && (
        <p role="alert" className="mx-5 mt-3 text-center text-xs text-destructive">
          {notice}
        </p>
      )}
      {user && plan && !myConfirmed && (
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className="mx-5 mt-6 flex h-11 w-[calc(100%-2.5rem)] items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Confirming…" : "I’m in"}
        </button>
      )}
      <Link
        to="/chats"
        search={{ matchId }}
        className="mx-5 mt-6 flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
      >
        Open chat to plan together
      </Link>
    </main>
  );
}

export default DatePlanScreen;
