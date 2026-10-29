import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Heart, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { DemoNotice } from "@/components/community";

export const Route = createFileRoute("/date-plan")({
  validateSearch: (search: Record<string, unknown>) => ({
    matchId: typeof search["matchId"] === "string" ? search["matchId"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Date plan — NamLink" }] }),
  component: DatePlan,
});

function DatePlan() {
  const { user } = useSession();
  const { matchId } = Route.useSearch();
  const query = useQuery({
    queryKey: ["date-plan-screen", user?.id, matchId],
    enabled: !!user && !!matchId,
    queryFn: async () => {
      const [{ data: match, error: matchError }, { data: plan, error: planError }] =
        await Promise.all([
          supabase.from("matches").select("user_a,user_b").eq("id", matchId!).maybeSingle(),
          supabase
            .from("date_plans")
            .select("activity,venue_name,town,scheduled_at,note,confirmed_a,confirmed_b")
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
      return { plan, name: profile?.display_name ?? "your match" };
    },
  });
  const sample = !user;
  const plan = query.data?.plan;
  const name = sample ? "Tobias" : (query.data?.name ?? "your match");
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-24">
      <header className="flex h-14 items-center gap-3 border-b border-border px-5">
        <Link to="/chats" search={{ matchId: undefined }} aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-sm font-semibold">Date plan</h1>
      </header>
      {sample && <DemoNotice />}
      <div className="px-5 pt-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <img
            src="/design/lead-woman.jpg"
            alt="Sample member"
            className="h-14 w-14 rounded-full object-cover"
          />
          <Heart className="h-5 w-5 fill-primary text-primary" />
          <img
            src="/design/lead-man.jpg"
            alt="Sample member"
            className="h-14 w-14 rounded-full object-cover"
          />
        </div>
        <p className="mt-3 text-sm font-semibold">You and {name}</p>
        <p className="text-xs text-muted-foreground">Planning something together</p>
      </div>
      {sample || plan ? (
        <div className="mx-5 mt-6 overflow-hidden rounded-[15px] border border-border shadow-float">
          <img
            src="/design/event-rooftop.jpg"
            alt="A rooftop venue at sunset"
            className="h-[155px] w-full object-cover"
          />
          <div className="p-4">
            <h2 className="text-[16px] font-semibold">
              {sample ? "Drinks at The Stellenbosch" : plan!.activity}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4" />{" "}
              {sample
                ? "Windhoek, Khomas"
                : [plan!.venue_name, plan!.town].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />{" "}
              {sample
                ? "Sample · Saturday at 18:00"
                : plan!.scheduled_at
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(plan!.scheduled_at))
                  : "Time to be agreed"}
            </p>
            {plan?.note && <p className="mt-3 text-xs leading-5">{plan.note}</p>}
            <p className="mt-4 text-xs text-primary">
              {sample
                ? "Sample plan"
                : plan!.confirmed_a && plan!.confirmed_b
                  ? "Confirmed by both of you"
                  : "Waiting for both members to confirm"}
            </p>
          </div>
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
      <Link
        to="/chats"
        search={{ matchId }}
        className="mx-5 mt-6 flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
      >
        {sample ? "Explore chats" : "Open chat to plan together"}
      </Link>
    </main>
  );
}
