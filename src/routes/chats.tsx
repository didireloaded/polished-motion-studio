import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  MessagesSquare,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { people, photo, update, useStore, timeAgo } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { captureProductEvent } from "@/lib/telemetry";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfilePhoto, SafetyActions } from "@/components/community";
import { suggestDatePlan } from "@/lib/date-suggestion.functions";
import { generateIcebreakers, localDateSpots, triggerHaptic } from "@/lib/icebreakers";
import { TwoTruthsCard } from "@/components/SocialGames";
import { getTwoTruthsForPerson } from "@/lib/social-games";
import { ConversationOpenerStudio } from "@/components/ConversationOpenerStudio";

export const Route = createFileRoute("/chats")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { matchId: string | undefined; draft?: string | undefined } => ({
    matchId: typeof search["matchId"] === "string" ? search["matchId"] : undefined,
    ...(typeof search["draft"] === "string" ? { draft: search["draft"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Chats — Mutal" },
      { name: "description", content: "Your conversations with the people you've liked." },
      { property: "og:title", content: "Chats — Mutal" },
      { property: "og:description", content: "Your conversations with the people you've liked." },
    ],
  }),
  component: Chats,
});

function Chats() {
  const s = useStore();
  const { user, ready } = useSession();
  const { matchId, draft } = Route.useSearch();
  const [openId, setOpenId] = useState<string | null>(matchId ?? null);
  useEffect(() => {
    if (matchId) setOpenId(matchId);
  }, [matchId]);
  const matches = people.filter((p) => s.matches.includes(p.id));
  const list = matches.length ? matches : [people[0]!, people[5]!, people[1]!, people[2]!];
  const person = list.find((p) => p.id === openId) ?? people.find((p) => p.id === openId);

  if (!ready)
    return (
      <main className="mx-auto max-w-md pb-28">
        <PageHeader title="Mutal" />
        <ChatsListSkeleton />
      </main>
    );
  if (user)
    return (
      <LiveChats
        key={user.id}
        userId={user.id}
        {...(matchId ? { initialMatchId: matchId } : {})}
        {...(draft ? { initialDraft: draft } : {})}
      />
    );

  return (
    <main className="mx-auto max-w-md pb-28">
      <AnimatePresence mode="wait">
        {!person ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <PageHeader title="Mutal" />
            {list.length === 0 ? (
              <div className="mx-5 flex flex-col items-center rounded-3xl bg-card p-10 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="rounded-full bg-primary/15 p-4 text-primary"
                >
                  <MessagesSquare className="h-7 w-7" />
                </motion.div>
                <p className="mt-4 font-semibold">No chats yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chats appear after you both choose to connect.
                </p>
                <Link
                  to="/"
                  className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Discover people
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 pb-2">
                  <h2 className="text-sm font-semibold">
                    {matches.length ? "New matches" : "Sample matches"}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">Demo mode</span>
                </div>
                <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-4">
                  {list.map((p, i) => (
                    <motion.button
                      key={p.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: i * 0.06 }}
                      onClick={() => setOpenId(p.id)}
                      className="shrink-0 text-center"
                    >
                      <img
                        src={photo(p, true)}
                        alt=""
                        className="h-16 w-16 rounded-full border-2 border-primary object-cover p-0.5"
                      />
                      <p className="mt-1 text-xs">{p.name}</p>
                    </motion.button>
                  ))}
                </div>
                <h2 className="px-5 pb-1 text-sm font-semibold">
                  {matches.length ? "Messages" : "Sample messages"}
                </h2>
                <ul className="divide-y divide-border px-3">
                  {list.map((p, i) => {
                    const last = s.chats[p.id]?.at(-1);
                    return (
                      <motion.li
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                      >
                        <button
                          onClick={() => setOpenId(p.id)}
                          className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-card"
                        >
                          <img
                            src={photo(p, true)}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between">
                              <p className="font-semibold">{p.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {last
                                  ? timeAgo(last.at)
                                  : ["10:24", "09:18", "Yesterday", "Yesterday"][i % 4]}
                              </span>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {last
                                ? last.text
                                : matches.length
                                  ? "You both chose to connect. Say hello."
                                  : (sampleChatPreviews[p.name] ?? "Tap to preview a conversation")}
                            </p>
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </>
            )}
          </motion.div>
        ) : (
          <Thread
            key={person.id}
            id={person.id}
            {...(draft ? { initialDraft: draft } : {})}
            onBack={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

type MatchRow = { id: string; user_a: string; user_b: string; created_at: string };

const sampleChatPreviews: Record<string, string> = {
  Leandra: "Hey! That sounds amazing 😊",
  Daniel: "Are you free this weekend?",
  Leah: "That place looks great!",
  Amara: "Let's do it! Can't wait 🌅",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type PendingMessage = {
  id: string;
  body: string;
  created_at: string;
  status: "sending" | "failed";
};
type ChatProfile = {
  id: string;
  display_name: string;
  age: number;
  town: string;
  bio: string;
  tags: string[];
  intent: string;
  seeking: string;
  photo_paths: string[];
};

function LiveChats({
  userId,
  initialMatchId,
  initialDraft,
}: {
  userId: string;
  initialMatchId?: string;
  initialDraft?: string;
}) {
  const client = useQueryClient();
  const [openMatchId, setOpenMatchId] = useState<string | null>(initialMatchId ?? null);
  useEffect(() => {
    if (initialMatchId) setOpenMatchId(initialMatchId);
  }, [initialMatchId]);
  const [listRealtimeConnected, setListRealtimeConnected] = useState(false);
  const matchesQuery = useQuery({
    queryKey: ["matches", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,user_a,user_b,created_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const matches = data as MatchRow[];
      const counterpartIds = matches.map((m) => (m.user_a === userId ? m.user_b : m.user_a));
      if (!counterpartIds.length)
        return { matches, profiles: [] as ChatProfile[], messages: [] as MessageRow[] };
      const [profiles, messages] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,age,town,bio,tags,intent,seeking,photo_paths")
          .in("id", counterpartIds),
        supabase
          .from("messages")
          .select("id,match_id,sender_id,body,created_at")
          .in(
            "match_id",
            matches.map((m) => m.id),
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (profiles.error) throw profiles.error;
      if (messages.error) throw messages.error;
      return {
        matches,
        profiles: profiles.data as ChatProfile[],
        messages: messages.data as MessageRow[],
      };
    },
    refetchInterval: listRealtimeConnected ? false : 30000,
  });
  useEffect(() => {
    const channel = supabase
      .channel(`chat-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => void client.invalidateQueries({ queryKey: ["matches", userId] }),
      )
      .subscribe((status) => setListRealtimeConnected(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, userId]);
  const data = matchesQuery.data;
  const openMatch = data?.matches.find((match) => match.id === openMatchId);
  const otherId = openMatch
    ? openMatch.user_a === userId
      ? openMatch.user_b
      : openMatch.user_a
    : null;
  const person = data?.profiles.find((profile) => profile.id === otherId) ?? null;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["matches", userId] });
  };

  return (
    <main className="mx-auto max-w-md pb-28">
      {!openMatch ? (
        <>
          <PageHeader title="Mutal" />
          {matchesQuery.isLoading ? (
            <ChatsListSkeleton />
          ) : !data?.matches.length ? (
            <div className="mx-5 flex flex-col items-center rounded-3xl bg-card p-10 text-center">
              <div className="rounded-full bg-primary/15 p-4 text-primary">
                <MessagesSquare className="h-7 w-7" />
              </div>
              <p className="mt-4 font-semibold">No matches yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Chats open when both people choose to connect.
              </p>
              <Link
                to="/"
                className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Discover people
              </Link>
            </div>
          ) : (
            <>
              <Link
                to="/match-values"
                className="mx-5 mb-4 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm transition-transform active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="flex-1">
                  <span className="block font-semibold">Who fits you best?</span>
                  <span className="text-muted-foreground">
                    Tell us what you value and we'll rank your matches.
                  </span>
                </span>
              </Link>
              <div className="flex items-center justify-between px-5 pb-2">
                <h2 className="text-sm font-semibold">New matches</h2>
                <span className="text-xs text-muted-foreground">
                  {data.matches.length} total · scroll to see all
                </span>
              </div>
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-4">
                {data.matches.map((match) => {
                  const id = match.user_a === userId ? match.user_b : match.user_a;
                  const p = data.profiles.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <button
                      key={match.id}
                      onClick={() => setOpenMatchId(match.id)}
                      className="shrink-0 text-center"
                    >
                      <ProfilePhoto
                        name={p.display_name}
                        path={p.photo_paths?.[0]}
                        className="h-16 w-16 rounded-full border-2 border-primary object-cover p-0.5"
                      />
                      <p className="mt-1 text-xs">{p.display_name}</p>
                    </button>
                  );
                })}
              </div>
              <h2 className="px-5 pb-1 text-sm font-semibold">Messages</h2>
              <ul className="divide-y divide-border px-3">
                {data.matches.map((match) => {
                  const id = match.user_a === userId ? match.user_b : match.user_a;
                  const p = data.profiles.find((x) => x.id === id);
                  if (!p) return null;
                  const last = data.messages.find((m) => m.match_id === match.id);
                  return (
                    <li key={match.id}>
                      <button
                        onClick={() => setOpenMatchId(match.id)}
                        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-card"
                      >
                        <ProfilePhoto
                          name={p.display_name}
                          path={p.photo_paths?.[0]}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{p.display_name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {last?.body ?? "You both chose to connect. Say hello."}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      ) : person && openMatch ? (
        <LiveThread
          key={openMatch.id}
          userId={userId}
          match={openMatch}
          person={person}
          {...(initialDraft ? { initialDraft } : {})}
          onBack={() => setOpenMatchId(null)}
          onBlocked={() => {
            setOpenMatchId(null);
            refresh();
          }}
        />
      ) : (
        <div className="p-5">
          <button onClick={() => setOpenMatchId(null)} className="text-sm text-primary">
            Back to chats
          </button>
          <p className="mt-3 text-sm text-muted-foreground">
            This conversation is no longer available.
          </p>
        </div>
      )}
    </main>
  );
}

function LiveThread({
  userId,
  match,
  person,
  initialDraft,
  onBack,
  onBlocked,
}: {
  userId: string;
  match: MatchRow;
  person: ChatProfile;
  initialDraft?: string;
  onBack: () => void;
  onBlocked: () => void;
}) {
  const client = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialDraft ?? "");
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showOpenerStudio, setShowOpenerStudio] = useState(false);
  const [older, setOlder] = useState<MessageRow[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState("");
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planNotice, setPlanNotice] = useState("");
  const [basePlanVersion, setBasePlanVersion] = useState<number | null>(null);
  const [activity, setActivity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [town, setTown] = useState(person.town);
  const [scheduledAt, setScheduledAt] = useState("");
  const [planNote, setPlanNote] = useState("");
  const [dateInterests, setDateInterests] = useState("");
  const [datePreferences, setDatePreferences] = useState("");
  const [suggestingDate, setSuggestingDate] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState("");
  const [threadRealtimeConnected, setThreadRealtimeConnected] = useState(false);

  const icebreakers = generateIcebreakers({
    name: person.display_name,
    town: person.town,
    tags: person.tags,
    intent: person.intent,
    bio: person.bio,
  });
  const curatedSpots = localDateSpots[town] ?? localDateSpots["Windhoek"] ?? [];

  const datePlanQuery = useQuery({
    queryKey: ["date-plan", match.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("date_plans")
        .select(
          "match_id,proposed_by,activity,venue_name,town,scheduled_at,note,confirmed_a,confirmed_b,created_at,updated_at,version,updated_by",
        )
        .eq("match_id", match.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const messageQuery = useQuery({
    queryKey: ["messages", match.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,match_id,sender_id,body,created_at")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as MessageRow[];
      setHasOlder(rows.length === 50);
      return rows;
    },
    refetchInterval: threadRealtimeConnected ? false : 12000,
  });
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${match.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${match.id}` },
        () => {
          void client.invalidateQueries({ queryKey: ["messages", match.id] });
          void client.invalidateQueries({ queryKey: ["matches", userId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "date_plans", filter: `match_id=eq.${match.id}` },
        () => void client.invalidateQueries({ queryKey: ["date-plan", match.id] }),
      )
      .subscribe((status) => setThreadRealtimeConnected(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, match.id, userId]);

  const allMessages = [...older, ...(messageQuery.data ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const sendBody = async (bodyText: string, existingTempId?: string) => {
    const body = bodyText.trim();
    if (!body || body.length > 1000) return;
    setNotice("");
    triggerHaptic(10);
    const tempId = existingTempId ?? `temp-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();
    const isFirstMessage = allMessages.length === 0;

    setPending((prev) =>
      existingTempId
        ? prev.map((m) => (m.id === existingTempId ? { ...m, status: "sending" } : m))
        : [...prev, { id: tempId, body, created_at: nowIso, status: "sending" }],
    );
    if (!existingTempId) {
      setText("");
      setShowPrompts(false);
    }

    const { error } = await supabase
      .from("messages")
      .insert({ match_id: match.id, sender_id: userId, body });
    if (error) {
      setPending((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      setNotice(
        error.code === "P0001"
          ? "Please wait a moment before sending another message."
          : "Message couldn't be delivered. Tap retry on the bubble.",
      );
      return;
    }
    if (isFirstMessage) void captureProductEvent("first_message_sent");
    await client.invalidateQueries({ queryKey: ["messages", match.id] });
    setPending((prev) => prev.filter((m) => m.id !== tempId));
    void client.invalidateQueries({ queryKey: ["matches", userId] });
  };

  const loadOlder = async () => {
    const oldest = [...older, ...(messageQuery.data ?? [])].reduce<MessageRow | null>(
      (current, message) =>
        !current || message.created_at < current.created_at ? message : current,
      null,
    );
    if (!oldest || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id,match_id,sender_id,body,created_at")
        .eq("match_id", match.id)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as MessageRow[];
      setOlder((current) => [...current, ...rows]);
      setHasOlder(rows.length === 50);
    } catch {
      setNotice("We couldn't load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  };
  const shared = person.tags ?? [];
  const datePlan = datePlanQuery.data;
  const amUserA = userId === match.user_a;
  const myConfirmed = datePlan ? (amUserA ? datePlan.confirmed_a : datePlan.confirmed_b) : false;
  const theirConfirmed = datePlan ? (amUserA ? datePlan.confirmed_b : datePlan.confirmed_a) : false;
  const fillPlanForm = (plan: NonNullable<typeof datePlanQuery.data>) => {
    setActivity(plan.activity);
    setVenueName(plan.venue_name);
    setTown(plan.town);
    setScheduledAt(plan.scheduled_at ? toDateTimeLocal(plan.scheduled_at) : "");
    setPlanNote(plan.note);
    setBasePlanVersion(plan.version);
  };
  const reloadPlanAfterConflict = async () => {
    await client.invalidateQueries({ queryKey: ["date-plan", match.id] });
    const latest = client.getQueryData<NonNullable<typeof datePlanQuery.data>>([
      "date-plan",
      match.id,
    ]);
    if (latest) fillPlanForm(latest);
    setPlanNotice(
      "Your match changed the plan. The latest version is loaded; review it before saving.",
    );
  };
  const editPlan = () => {
    if (datePlan) {
      fillPlanForm(datePlan);
    } else {
      setBasePlanVersion(null);
      setActivity("");
      setVenueName("");
      setTown(person.town);
      setScheduledAt("");
      setPlanNote("");
    }
    setPlanNotice("");
    setPlanFormOpen(true);
  };
  const suggestDate = async () => {
    if (suggestingDate || !town.trim() || !dateInterests.trim() || !datePreferences.trim()) return;
    setSuggestingDate(true);
    setPlanNotice("");
    setSuggestionReason("");
    try {
      const suggestion = await suggestDatePlan({
        data: {
          matchId: match.id,
          town: town.trim(),
          sharedInterests: dateInterests.trim(),
          preferences: datePreferences.trim(),
        },
      });
      setActivity(suggestion.activity);
      setPlanNote(suggestion.note);
      setVenueName("");
      setSuggestionReason(suggestion.reason);
    } catch {
      setPlanNotice("We couldn't suggest a date right now. You can still make a plan together.");
    } finally {
      setSuggestingDate(false);
    }
  };
  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlanNotice("");
    const details = {
      activity: activity.trim(),
      venue_name: venueName.trim(),
      town: town.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      note: planNote.trim(),
    };
    if (datePlan && basePlanVersion !== null) {
      const { error } = await supabase.rpc("update_date_plan", {
        p_match_id: match.id,
        p_expected_version: basePlanVersion,
        p_activity: details.activity,
        p_venue_name: details.venue_name,
        p_town: details.town,
        p_scheduled_at: details.scheduled_at ?? "",
        p_note: details.note,
        p_confirmed_a: datePlan.confirmed_a,
        p_confirmed_b: datePlan.confirmed_b,
      });
      if (error?.message.includes("PLAN_VERSION_CONFLICT")) {
        await reloadPlanAfterConflict();
        return;
      }
      if (error) {
        setPlanNotice("We couldn't save this plan. Refresh and try again.");
        return;
      }
    } else if (!datePlan) {
      const { error } = await supabase
        .from("date_plans")
        .insert({ ...details, match_id: match.id, proposed_by: userId });
      if (error) {
        setPlanNotice(
          error.code === "23505"
            ? "A date plan was created on the other device. Refresh and review it."
            : "We couldn't save this plan. Refresh and try again.",
        );
        void client.invalidateQueries({ queryKey: ["date-plan", match.id] });
        return;
      }
    } else {
      setPlanNotice("We couldn't save this plan. Refresh and try again.");
      return;
    }
    setPlanFormOpen(false);
    await client.invalidateQueries({ queryKey: ["date-plan", match.id] });
  };
  const confirmPlan = async () => {
    if (!datePlan) return;
    setPlanNotice("");
    const { error } = await supabase.rpc("update_date_plan", {
      p_match_id: match.id,
      p_expected_version: datePlan.version,
      p_activity: datePlan.activity,
      p_venue_name: datePlan.venue_name,
      p_town: datePlan.town,
      p_scheduled_at: datePlan.scheduled_at ?? "",
      p_note: datePlan.note,
      p_confirmed_a: amUserA ? !myConfirmed : datePlan.confirmed_a,
      p_confirmed_b: amUserA ? datePlan.confirmed_b : !myConfirmed,
    });
    if (error) {
      if (error.message.includes("PLAN_VERSION_CONFLICT")) {
        await reloadPlanAfterConflict();
        return;
      }
      setPlanNotice("We couldn't update your response. Please try again.");
      return;
    }
    await client.invalidateQueries({ queryKey: ["date-plan", match.id] });
    if (!myConfirmed && theirConfirmed) void captureProductEvent("date_confirmed");
  };

  const showIcebreakers =
    (!messageQuery.isLoading && allMessages.length === 0 && pending.length === 0) || showPrompts;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-[calc(100svh-5rem)] flex-col"
    >
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full p-1.5 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ProfilePhoto
          name={person.display_name}
          path={person.photo_paths?.[0]}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{person.display_name}</p>
          <p className="text-xs text-muted-foreground">{person.town}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowOpenerStudio((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary"
        >
          <Wand2 className="h-3 w-3" /> AI Opener
        </button>
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary"
        >
          <Sparkles className="h-3 w-3" /> Icebreakers
        </button>
      </header>
      <AnimatePresence>
        {showOpenerStudio && (
          <ConversationOpenerStudio
            matchId={match.id}
            matchName={person.display_name}
            profile={{
              town: person.town ?? "Windhoek",
              intent: person.intent ?? "A relationship",
              tags: person.tags ?? [],
              bio: person.bio ?? "",
              seeking: "",
            }}
            live={true}
            onUseOpener={(openerText) => {
              setText(openerText);
              setShowOpenerStudio(false);
              inputRef.current?.focus();
            }}
            onClose={() => setShowOpenerStudio(false)}
          />
        )}
      </AnimatePresence>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
        {hasOlder && (
          <button
            onClick={() => void loadOlder()}
            disabled={loadingOlder}
            className="mx-auto block text-xs font-medium text-primary"
          >
            {loadingOlder ? "Loading earlier messages…" : "Load earlier messages"}
          </button>
        )}
        <div className="mb-4 rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground">
          {shared.length ? (
            <>
              You both enjoy <span className="text-primary">{shared.slice(0, 3).join(", ")}</span>
            </>
          ) : (
            <>You both chose to connect.</>
          )}
        </div>
        <section
          aria-label="Date plan"
          className="mb-5 rounded-2xl border border-border bg-background p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Make a plan</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A simple plan, agreed on by both of you.
              </p>
            </div>
            <button
              onClick={editPlan}
              disabled={datePlanQuery.isLoading || datePlanQuery.isError}
              className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold"
            >
              {datePlan ? "Edit" : "Suggest"}
            </button>
          </div>
          <Link
            to="/date-plan"
            search={{ matchId: match.id }}
            className="mt-2 inline-block text-xs font-semibold text-primary"
          >
            View date plan
          </Link>
          {datePlan && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="font-medium">
                {datePlan.activity}
                {datePlan.venue_name ? ` · ${datePlan.venue_name}` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {datePlan.town}
                {datePlan.scheduled_at && (
                  <>
                    <span>·</span>
                    <CalendarDays className="h-4 w-4" />
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(datePlan.scheduled_at))}
                  </>
                )}
              </p>
              {datePlan.note && (
                <p className="mt-2 text-sm text-muted-foreground">{datePlan.note}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void confirmPlan()}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${myConfirmed ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {myConfirmed && <Check className="h-4 w-4" />}
                  {myConfirmed ? "You're in" : "I'm in"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {theirConfirmed ? "They’re in too" : "Waiting for their reply"}
                </span>
              </div>
            </div>
          )}
          {planFormOpen && (
            <form
              onSubmit={(event) => void savePlan(event)}
              className="mt-4 space-y-3 border-t border-border pt-4"
            >
              {curatedSpots.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    Local date spots in {town}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {curatedSpots.map((spot) => (
                      <button
                        key={spot.venue}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setActivity(spot.activity);
                          setVenueName(spot.venue);
                        }}
                        className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        {spot.venue}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
                <p className="text-sm font-semibold">Find a date idea</p>
                <p className="text-xs text-muted-foreground">
                  Share only what you both feel comfortable sharing. Your idea stays a draft until
                  you save it.
                </p>
                <label className="block text-xs font-medium" htmlFor="date-town">
                  Town
                </label>
                <input
                  id="date-town"
                  required
                  minLength={2}
                  maxLength={80}
                  value={town}
                  onChange={(event) => setTown(event.target.value)}
                  placeholder="Town"
                  className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <label className="block text-xs font-medium" htmlFor="date-interests">
                  Shared interests
                </label>
                <input
                  id="date-interests"
                  maxLength={200}
                  value={dateInterests}
                  onChange={(event) => setDateInterests(event.target.value)}
                  placeholder="Music, markets, long walks…"
                  className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <label className="block text-xs font-medium" htmlFor="date-preferences">
                  Date preferences
                </label>
                <textarea
                  id="date-preferences"
                  maxLength={300}
                  value={datePreferences}
                  onChange={(event) => setDatePreferences(event.target.value)}
                  placeholder="Quiet, outdoors, low budget, afternoon…"
                  rows={2}
                  className="w-full resize-none rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void suggestDate()}
                  disabled={
                    suggestingDate ||
                    town.trim().length < 2 ||
                    dateInterests.trim().length < 2 ||
                    datePreferences.trim().length < 2
                  }
                  className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
                >
                  {suggestingDate ? "Finding an idea…" : "Suggest an idea"}
                </button>
                {suggestionReason && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {suggestionReason} Review the details below before saving.
                  </p>
                )}
              </div>
              <input
                required
                minLength={2}
                maxLength={80}
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                placeholder="What would you like to do?"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                maxLength={120}
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                placeholder="Venue (optional)"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="min-w-0 rounded-xl bg-secondary px-2 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <textarea
                maxLength={300}
                value={planNote}
                onChange={(event) => setPlanNote(event.target.value)}
                placeholder="Add a note (optional)"
                rows={2}
                className="w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Choose a public place. Both confirmations reset if the plan changes.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlanFormOpen(false)}
                  className="rounded-full px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Save plan
                </button>
              </div>
            </form>
          )}
          {(planNotice || datePlanQuery.isError) && (
            <p role="status" className="mt-3 text-xs text-destructive">
              {planNotice || "Date planning is temporarily unavailable."}
            </p>
          )}
        </section>
        {messageQuery.isLoading ? (
          <MessagesSkeleton />
        ) : (
          <>
            {allMessages.map((message, index) => {
              const mine = message.sender_id === userId;
              const prev = index > 0 ? allMessages[index - 1] : undefined;
              const grouped =
                !!prev &&
                prev.sender_id === message.sender_id &&
                Math.abs(
                  new Date(message.created_at).getTime() - new Date(prev.created_at).getTime(),
                ) < 120_000;
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}
                >
                  <div
                    className={`flex max-w-[78%] items-end gap-1.5 rounded-3xl px-4 py-2.5 text-[15px] ${
                      mine
                        ? `${grouped ? "rounded-tr-lg" : ""} rounded-br-md bg-primary text-primary-foreground`
                        : `${grouped ? "rounded-tl-lg" : ""} rounded-bl-md bg-card`
                    }`}
                  >
                    <span>{message.body}</span>
                    {mine && (
                      <Check aria-label="Sent" className="mb-0.5 h-3.5 w-3.5 shrink-0 opacity-85" />
                    )}
                  </div>
                </div>
              );
            })}
            {pending.map((item) => (
              <div key={item.id} className="mt-1.5 flex justify-end">
                <div
                  className={`flex max-w-[78%] items-center gap-2 rounded-3xl rounded-br-md px-4 py-2.5 text-[15px] ${
                    item.status === "failed"
                      ? "border border-destructive/40 bg-destructive/10 text-foreground"
                      : "bg-primary/85 text-primary-foreground"
                  }`}
                >
                  <span>{item.body}</span>
                  {item.status === "sending" ? (
                    <Clock3
                      aria-label="Sending"
                      className="h-3.5 w-3.5 shrink-0 animate-pulse opacity-80"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendBody(item.body, item.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white"
                    >
                      <AlertCircle className="h-3 w-3" /> Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        {notice && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            {notice}
          </p>
        )}
      </div>

      {showIcebreakers && (
        <div className="border-t border-border bg-secondary/40 px-4 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Tap an icebreaker to start talking
            </span>
            {allMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPrompts(false)}
                className="text-[11px] text-muted-foreground"
              >
                Hide
              </button>
            )}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {icebreakers.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setText(prompt);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-2xl border border-border bg-card px-3 py-1.5 text-left text-xs text-foreground shadow-2xs transition-colors hover:border-primary/50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border px-4 py-2">
        <SafetyActions
          userId={userId}
          targetId={person.id}
          targetName={person.display_name}
          onBlocked={onBlocked}
        />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendBody(text);
        }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <input
          ref={inputRef}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${person.display_name}…`}
          className="min-w-0 flex-1 rounded-full bg-card px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ring"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={!text.trim()}
          aria-label="Send"
          className="rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </form>
    </motion.div>
  );
}

function Thread({
  id,
  initialDraft,
  onBack,
}: {
  id: string;
  initialDraft?: string;
  onBack: () => void;
}) {
  const s = useStore();
  const p = people.find((x) => x.id === id)!;
  const msgs = s.chats[id]?.length
    ? s.chats[id]
    : !s.matches.includes(id)
      ? [
          { id: "preview-1", from: "them" as const, text: "Hey! How's your week going?", at: 0 },
          {
            id: "preview-2",
            from: "me" as const,
            text: "Good! Thinking of a beach day this weekend. Want to join?",
            at: 0,
          },
          {
            id: "preview-3",
            from: "them" as const,
            text: "That sounds lovely. Let's make a plan.",
            at: 0,
          },
        ]
      : [];
  const [text, setText] = useState(initialDraft ?? "");
  const [showTwoTruths, setShowTwoTruths] = useState(false);
  const [showOpenerStudio, setShowOpenerStudio] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const twoTruthsGame = getTwoTruthsForPerson(p);
  const icebreakers = generateIcebreakers({
    name: p.name,
    town: p.town,
    tags: p.tags,
    intent: p.intent,
    bio: p.bio,
    prompt: p.prompt,
    answer: p.answer,
  });
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    triggerHaptic(10);
    update((st) => ({
      ...st,
      chats: {
        ...st.chats,
        [id]: [
          ...(st.chats[id] ?? []),
          { id: crypto.randomUUID(), from: "me", text: t.slice(0, 1000), at: Date.now() },
        ],
      },
    }));
    setText("");
  };
  const shared = p.tags.filter((t) => s.profile.tags.includes(t));
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex h-[calc(100vh-5rem)] flex-col"
    >
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full p-1.5 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <img src={photo(p, true)} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.town}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowOpenerStudio((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Wand2 className="h-3.5 w-3.5" />
          AI Opener
        </button>
        <button
          type="button"
          onClick={() => setShowTwoTruths((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />2 Truths
        </button>
      </header>
      <AnimatePresence>
        {showOpenerStudio && (
          <ConversationOpenerStudio
            matchId={p.id}
            matchName={p.name}
            profile={{
              town: p.town,
              intent: p.intent,
              tags: p.tags,
              bio: p.bio,
              seeking: p.answer,
            }}
            live={false}
            onUseOpener={(openerText) => {
              setText(openerText);
              setShowOpenerStudio(false);
              inputRef.current?.focus();
            }}
            onClose={() => setShowOpenerStudio(false)}
          />
        )}
      </AnimatePresence>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {showTwoTruths && (
          <div className="mb-3">
            <TwoTruthsCard
              game={twoTruthsGame}
              onSendReply={(replyDraft) => {
                setText(replyDraft);
                setShowTwoTruths(false);
                inputRef.current?.focus();
              }}
            />
          </div>
        )}
        {!s.matches.includes(id) && (
          <Link
            to="/date-plan"
            search={{ matchId: undefined }}
            className="block rounded-xl border border-border bg-white p-3 text-center text-xs font-semibold text-primary"
          >
            View a sample date plan
          </Link>
        )}
        <div className="mb-4 rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground">
          {shared.length ? (
            <>
              You both like <span className="text-primary">{shared.join(", ")}</span>
            </>
          ) : (
            <>
              Ask about: <span className="text-primary">“{p.prompt}…”</span>
            </>
          )}
        </div>
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              style={{ originX: m.from === "me" ? 1 : 0 }}
            >
              <div
                className={`flex max-w-[78%] items-end gap-1.5 rounded-3xl px-4 py-2.5 text-[15px] ${m.from === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card"}`}
              >
                <span>{m.text}</span>
                {m.from === "me" && <Check className="mb-0.5 h-3.5 w-3.5 shrink-0 opacity-85" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={end} />
      </div>
      {msgs.length === 0 && (
        <div className="border-t border-border bg-secondary/40 px-4 py-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Tap an icebreaker to start talking
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {icebreakers.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setText(prompt);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-2xl border border-border bg-card px-3 py-1.5 text-left text-xs text-foreground shadow-2xs transition-colors hover:border-primary/50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${p.name}…`}
          className="flex-1 rounded-full bg-card px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ring"
        />
        <motion.button
          whileTap={{ scale: 0.8, rotate: -15 }}
          disabled={!text.trim()}
          aria-label="Send"
          className="rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </form>
    </motion.div>
  );
}

function ChatsListSkeleton() {
  return (
    <div role="status" aria-label="Loading conversations" className="space-y-5 px-5 pt-2">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="h-16 w-16 animate-pulse rounded-full bg-secondary" />
            <span className="h-3 w-12 animate-pulse rounded-full bg-secondary" />
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
            <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1 space-y-2">
              <span className="block h-3.5 w-28 animate-pulse rounded-full bg-secondary" />
              <span className="block h-3 w-48 animate-pulse rounded-full bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div role="status" aria-label="Loading messages" className="space-y-2.5 py-2">
      <div className="flex justify-start">
        <span className="h-10 w-48 animate-pulse rounded-3xl rounded-bl-md bg-secondary" />
      </div>
      <div className="flex justify-end">
        <span className="h-10 w-56 animate-pulse rounded-3xl rounded-br-md bg-primary/20" />
      </div>
      <div className="flex justify-start">
        <span className="h-10 w-40 animate-pulse rounded-3xl rounded-bl-md bg-secondary" />
      </div>
    </div>
  );
}
