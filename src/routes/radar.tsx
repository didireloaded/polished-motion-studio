import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Navigation,
  Star,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { events, people, photo, towns, update, useStore } from "@/lib/namlink";
import { useSession } from "@/hooks/use-session";
import { type RecommendationResult } from "@/lib/recommend.functions";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto, SafetyActions } from "@/components/community";
import { VoiceIntroPlayer } from "@/components/voice-intro";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { BrandLogo } from "@/components/BrandLogo";
import { mapboxPublicToken, mapboxTileUrl } from "@/lib/mapbox";
import { captureProductEvent } from "@/lib/telemetry";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { triggerHaptic } from "@/lib/icebreakers";
import { ThisOrThatRapidRadar } from "@/components/SocialGames";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Nearby — Mutal" },
      { name: "description", content: "Explore people and local plans by town." },
      { property: "og:title", content: "Nearby — Mutal" },
    ],
  }),
  component: NearbyPage,
});

type NearbyProfile = {
  id: string;
  display_name: string;
  age: number;
  town: string;
  bio: string;
  tags: string[];
  intent: string;
  seeking: string;
  voice_intro_path: string | null;
  photo_paths?: string[];
};
type CommunityEvent = {
  id: string;
  title: string;
  town: string;
  venue_name: string;
  details: string;
  starts_at: string;
};
type EventInterest = { event_id: string; user_id: string; display_name: string };

const townCenters: Record<string, [number, number]> = {
  Windhoek: [-22.56, 17.08],
  Swakopmund: [-22.68, 14.53],
  "Walvis Bay": [-22.96, 14.5],
  Oshakati: [-17.78, 15.7],
  Otjiwarongo: [-20.46, 16.65],
  Rundu: [-17.91, 19.77],
};

const sampleProfiles: NearbyProfile[] = people.map((p) => ({
  id: p.id,
  display_name: p.name,
  age: p.age,
  town: p.town,
  bio: p.bio,
  tags: p.tags,
  intent: p.intent,
  seeking: p.answer,
  voice_intro_path: null,
  photo_paths: [],
}));

export function NearbyPage({ page = "nearby" }: { page?: "nearby" | "events" }) {
  const store = useStore();
  const { user, ready } = useSession();
  const [town, setTown] = useState("Windhoek");
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const panel = page;
  const [sheetOpen, setSheetOpen] = useState(false);
  const openTown = useCallback((selectedTown: string) => {
    setTown(selectedTown);
    setSheetOpen(true);
  }, []);
  const [selectedProfile, setSelectedProfile] = useState<NearbyProfile | null>(null);
  const [notice, setNotice] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventTown, setEventTown] = useState("Windhoek");
  const [eventDate, setEventDate] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [eventBusy, setEventBusy] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["nearby", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data, error }, { data: decisions, error: decisionsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,age,town,bio,tags,intent,seeking,voice_intro_path,photo_paths")
          .neq("id", user!.id)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("decisions").select("target_id").eq("actor_id", user!.id),
      ]);
      if (error) throw error;
      if (decisionsError) throw decisionsError;
      const alreadySeen = new Set((decisions ?? []).map((decision) => decision.target_id));
      return (data as NearbyProfile[]).filter((profile) => !alreadySeen.has(profile.id));
    },
  });
  const rolesQuery = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((row) => row.role);
    },
  });
  const canManageEvents = rolesQuery.data?.some((role) => role === "moderator" || role === "admin");
  const communityEventsQuery = useQuery({
    queryKey: ["community-events"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("id,title,town,venue_name,details,starts_at")
        .eq("active", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data as CommunityEvent[];
    },
  });
  const communityEventIds = communityEventsQuery.data?.map((event) => event.id) ?? [];
  const eventInterestQuery = useQuery({
    queryKey: ["event-interests", user?.id, communityEventIds],
    enabled: !!user && communityEventIds.length > 0,
    queryFn: async () => {
      const { data: rsvps, error } = await supabase
        .from("event_rsvps")
        .select("event_id,user_id")
        .in("event_id", communityEventIds);
      if (error) throw error;
      const userIds = [...new Set((rsvps ?? []).map((rsvp) => rsvp.user_id))];
      if (!userIds.length) return [] as EventInterest[];
      const { data: memberProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", userIds);
      if (profilesError) throw profilesError;
      const names = new Map(
        (memberProfiles ?? []).map((profile) => [profile.id, profile.display_name]),
      );
      return (rsvps ?? []).flatMap((rsvp) => {
        const displayName = names.get(rsvp.user_id);
        return displayName ? [{ ...rsvp, display_name: displayName }] : [];
      });
    },
  });
  const profiles = useMemo(
    () =>
      user
        ? (query.data ?? [])
        : sampleProfiles.filter((profile) => !store.liked.includes(profile.id)),
    [user, query.data, store.liked],
  );
  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => town === "All" || profile.town === town),
    [profiles, town],
  );

  if (!ready)
    return (
      <main className="mx-auto max-w-md pb-24" aria-busy="true">
        <header className="flex h-[58px] items-center justify-between px-5">
          <BrandLogo />
        </header>
        <p className="sr-only">Loading…</p>
        <div className="h-[318px] w-full animate-pulse bg-secondary" />
        <div className="mt-4 flex gap-3 overflow-hidden px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 w-28 shrink-0 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </main>
    );

  const like = async (profile: NearbyProfile) => {
    triggerHaptic("like");
    if (user) {
      const { error } = await supabase
        .from("decisions")
        .insert({ actor_id: user.id, target_id: profile.id, liked: true });
      if (error && error.code !== "23505")
        setNotice(
          error.code === "P0001"
            ? "Please take a short break before liking more profiles."
            : "We couldn't send that like. Please try again.",
        );
      else {
        setNotice("");
        void client.invalidateQueries({ queryKey: ["nearby", user.id] });
        client.setQueryData<RecommendationResult>(["recommendations", user.id], (current) =>
          current
            ? { ...current, items: current.items.filter((item) => item.profile.id !== profile.id) }
            : current,
        );
      }
    } else {
      update((value) =>
        value.liked.includes(profile.id)
          ? value
          : { ...value, liked: [...value.liked, profile.id] },
      );
      setNotice("Sample like saved on this device.");
      window.setTimeout(() => setNotice(""), 1600);
    }
  };

  const createCommunityEvent = async () => {
    if (!user || !eventTitle.trim() || !eventVenue.trim() || !eventDate) return;
    setEventBusy(true);
    const { error } = await supabase.from("community_events").insert({
      title: eventTitle.trim(),
      town: eventTown,
      venue_name: eventVenue.trim(),
      details: eventDetails.trim(),
      starts_at: new Date(eventDate).toISOString(),
      created_by: user.id,
    });
    setEventBusy(false);
    if (error) {
      setNotice("We couldn't add this event. Please try again.");
      return;
    }
    setEventTitle("");
    setEventVenue("");
    setEventDate("");
    setEventDetails("");
    setNotice("Event published.");
    void client.invalidateQueries({ queryKey: ["community-events"] });
  };

  const toggleEventInterest = async (eventId: string, interested: boolean) => {
    if (!user) return;
    const result = interested
      ? await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id)
      : await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: user.id });
    if (result.error) {
      setNotice("We couldn't update your event interest. Please try again.");
      return;
    }
    void client.invalidateQueries({ queryKey: ["event-interests", user.id] });
    if (!interested) void captureProductEvent("event_interest");
  };

  const visibleEvents = user
    ? (communityEventsQuery.data ?? []).map((event) => ({ ...event, sample: false }))
    : events.map((event) => ({
        ...event,
        venue_name: "",
        details: "",
        starts_at: "",
        sample: true,
      }));
  const eventInterests = eventInterestQuery.data ?? [];

  return (
    <main className={`mx-auto max-w-md bg-white ${panel === "nearby" ? "pb-0" : "pb-24"}`}>
      <header className="flex h-[58px] items-center justify-between px-5">
        {panel === "nearby" ? (
          <BrandLogo />
        ) : (
          <Link to="/radar" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[15px] font-semibold">Nearby</span>
          </Link>
        )}
        <Link
          to={panel === "events" ? "/radar" : "/events"}
          aria-label={panel === "events" ? "Show map" : "Show events"}
          className="flex h-9 w-9 items-center justify-center text-primary"
        >
          {panel === "events" ? (
            <MapPin className="h-5 w-5" />
          ) : (
            <CalendarDays className="h-5 w-5" />
          )}
        </Link>
      </header>
      {panel === "nearby" && (
        <>
          {notice && (
            <p role="status" className="px-5 pb-2 text-xs text-muted-foreground">
              {notice}
            </p>
          )}
          <div className="relative h-[calc(100svh-118px)] min-h-[500px] overflow-hidden">
            <TownMap
              town={town}
              profiles={visibleProfiles}
              demo={!user}
              myLocation={myLocation}
              onSelectTown={openTown}
            />
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) {
                  setNotice("Location is unavailable on this device.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  ({ coords }) => {
                    setMyLocation([coords.latitude, coords.longitude]);
                    setNotice("Map centered on your location. Your position is not shared.");
                  },
                  () => setNotice("Location permission was not granted."),
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
                );
              }}
              className="absolute right-4 top-3.5 z-[400] flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground shadow-float transition-transform hover:scale-105 active:scale-95"
              aria-label="Center map on my location"
            >
              <Navigation className="h-4 w-4 fill-current" />
            </button>
            <motion.section
              initial={false}
              animate={{ height: sheetOpen ? "min(76svh, 700px)" : 82 }}
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
              className="absolute inset-x-0 bottom-0 z-[500] overflow-hidden rounded-t-[22px] border-t border-border bg-white shadow-float"
              aria-label="Nearby options"
            >
              <button
                type="button"
                onClick={() => setSheetOpen((open) => !open)}
                aria-expanded={sheetOpen}
                aria-controls="nearby-sheet-content"
                className="flex h-[82px] w-full flex-col items-center justify-start px-5 pt-3 text-left transition-colors hover:bg-secondary/35 active:bg-secondary/60"
              >
                <span className="mb-3 h-1 w-9 rounded-full bg-border" />
                <span className="flex w-full items-center justify-between">
                  <span>
                    <span className="block text-[15px] font-semibold">Explore nearby</span>
                    <span className="block text-[11px] text-muted-foreground">
                      People, crossed paths, games and events
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${sheetOpen ? "rotate-0" : "rotate-180"}`}
                  />
                </span>
              </button>
              <div
                id="nearby-sheet-content"
                className="h-[calc(100%-82px)] overflow-y-auto px-5 pb-6"
                inert={!sheetOpen}
              >
                <div className="flex items-center justify-between">
                  <h1 className="text-[16px] font-semibold">People by town</h1>
                  <label className="relative inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                    <select
                      aria-label="Map town"
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      className="appearance-none bg-transparent pr-4 text-right text-[12px] font-medium text-muted-foreground outline-none"
                    >
                      <option value="Windhoek">Windhoek</option>
                      {towns
                        .filter((place) => place !== "Windhoek")
                        .map((place) => (
                          <option key={place} value={place}>
                            {place}
                          </option>
                        ))}
                      <option value="All">All Namibia</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {user
                    ? "Map markers show towns, not anyone's exact location."
                    : "Sample profiles by town. Map markers are not live locations."}
                </p>
                <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
                  {visibleProfiles.slice(0, 12).map((profile) => {
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedProfile(profile)}
                        className="w-[80px] shrink-0 text-left"
                      >
                        <div className="relative">
                          {!user ? (
                            <img loading="lazy" decoding="async"
                              src={photo(
                                people.find((p) => p.id === profile.id) ?? people[0]!,
                                true,
                              )}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-[84px] w-[80px] rounded-[14px] object-cover"
                            />
                          ) : (
                            <ProfilePhoto
                              name={profile.display_name}
                              path={profile.photo_paths?.[0]}
                              className="h-[84px] w-[80px] rounded-[14px] object-cover"
                            />
                          )}
                        </div>
                        <p className="mt-1.5 truncate text-[12px] font-semibold">
                          {profile.display_name} {profile.age}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{profile.town}</p>
                      </button>
                    );
                  })}
                  {!visibleProfiles.length && (
                    <p className="py-5 text-xs text-muted-foreground">
                      No members here yet. Try another town.
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-border pt-3.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold">Crossed paths</h2>
                    <Link
                      to="/crossed-paths"
                      className="text-[12px] font-semibold text-primary hover:underline"
                    >
                      See all
                    </Link>
                  </div>
                  <Link
                    to="/crossed-paths"
                    className="mt-2.5 flex items-center gap-3 rounded-2xl bg-secondary/45 p-3 transition-colors hover:bg-secondary"
                  >
                    {!user && (
                      <img
                        src="/editorial/amara-small.jpg"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-foreground">
                        {user ? "No crossings recorded" : "Nadia, 26 · Sample"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {user
                          ? "Crossed paths needs opt-in location to become available."
                          : "Example of how a crossing could appear"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </div>

                <div className="mt-3 border-t border-border">
                  {(
                    [
                      {
                        to: "/random-friday",
                        title: "Random Friday",
                        detail: "A 30-second introduction",
                        icon: Heart,
                        enabled: isFeatureEnabled("randomFriday"),
                      },
                      {
                        to: "/speed-dating",
                        title: "Speed dating",
                        detail: "Questions for an existing match",
                        icon: Clock3,
                        enabled: isFeatureEnabled("speedDatingMixer"),
                      },
                      {
                        to: "/this-or-that",
                        title: "This or That",
                        detail: "Five quick picks that say something about you",
                        icon: Star,
                        enabled: true,
                      },
                      {
                        to: "/events",
                        title: "Events",
                        detail: "Find a plan worth leaving home for",
                        icon: CalendarDays,
                        enabled: true,
                      },
                    ] as const
                  )
                    .filter((item) => item.enabled)
                    .map(({ to, title, detail, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => triggerHaptic(8)}
                        className="group flex min-h-16 items-center gap-3 border-b border-border py-3 transition-colors hover:bg-secondary/35 active:bg-secondary/60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-transform group-hover:scale-105 group-active:scale-95">
                          <Icon className="h-[17px] w-[17px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold">{title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {detail}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ))}
                </div>
              </div>
            </motion.section>
          </div>
        </>
      )}
      {panel === "events" && (
        <>
          <div className="px-5 pb-2">
            <h1 className="text-[20px] font-semibold">Events</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Meet people through shared interests
            </p>
          </div>
          {notice && (
            <p role="status" className="px-5 py-2 text-xs text-muted-foreground">
              {notice}
            </p>
          )}
          <section className="mt-2 px-5">
            {canManageEvents && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void createCommunityEvent();
                }}
                className="mt-3 space-y-2 rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-sm font-semibold">Publish a local event</p>
                <input
                  required
                  maxLength={100}
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Event name"
                  className="input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={eventTown}
                    onChange={(event) => setEventTown(event.target.value)}
                    className="input min-w-0"
                  >
                    {towns.map((place) => (
                      <option key={place}>{place}</option>
                    ))}
                  </select>
                  <input
                    required
                    type="datetime-local"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    className="input min-w-0 px-2 text-xs"
                  />
                </div>
                <input
                  required
                  maxLength={120}
                  value={eventVenue}
                  onChange={(event) => setEventVenue(event.target.value)}
                  placeholder="Public venue"
                  className="input"
                />
                <textarea
                  maxLength={500}
                  rows={2}
                  value={eventDetails}
                  onChange={(event) => setEventDetails(event.target.value)}
                  placeholder="A few details"
                  className="input resize-none"
                />
                <button
                  type="submit"
                  disabled={eventBusy}
                  className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {eventBusy ? "Publishing…" : "Publish event"}
                </button>
              </form>
            )}
            <ul className="mt-3 space-y-2">
              {user && communityEventsQuery.isLoading ? (
                <li className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Loading local events…
                </li>
              ) : (
                visibleEvents.map((event) => {
                  const attendees = eventInterests.filter(
                    (interest) => interest.event_id === event.id,
                  );
                  const interested = user
                    ? attendees.some((interest) => interest.user_id === user.id)
                    : store.interestedEvents.includes(event.id);
                  return (
                    <li
                      key={event.id}
                      className="overflow-hidden rounded-[15px] border border-border bg-card shadow-float"
                    >
                      {event.sample ? (
                        <img loading="lazy" decoding="async"
                          src={events.find((item) => item.id === event.id)?.image}
                          alt=""
                          className="h-[135px] w-full object-cover"
                        />
                      ) : (
                        <div className="relative">
                          <img loading="lazy" decoding="async"
                            src={
                              event.town === "Swakopmund" || event.town === "Walvis Bay"
                                ? "/design/event-beach.jpg"
                                : "/design/event-rooftop.jpg"
                            }
                            alt="Illustrative scenery for the event town"
                            className="h-[135px] w-full object-cover"
                          />
                          <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] text-foreground">
                            Illustrative photo
                          </span>
                        </div>
                      )}
                      <div className="px-3 pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{event.title}</p>
                          {event.sample && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              Sample event
                            </span>
                          )}
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {event.sample
                            ? events.find((item) => item.id === event.id)?.when
                            : new Intl.DateTimeFormat(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(event.starts_at))}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.sample
                            ? events.find((item) => item.id === event.id)?.venue
                            : event.venue_name}{" "}
                          · {event.town}
                        </p>
                      </div>
                      {event.details && (
                        <p className="px-3 pt-2 text-xs leading-5 text-muted-foreground">
                          {event.details}
                        </p>
                      )}
                      <div className="flex items-center gap-2 px-3 pt-3">
                        {event.sample ? (
                          <span className="text-[11px] text-muted-foreground">
                            Preview a shared plan
                          </span>
                        ) : attendees.length > 0 ? (
                          <>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary">
                              <Users className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {attendees.map((attendee) => attendee.display_name).join(", ")}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Be the first to show interest
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-pressed={interested}
                        onClick={() =>
                          user
                            ? void toggleEventInterest(event.id, interested)
                            : update((s) => ({
                                ...s,
                                interestedEvents: interested
                                  ? s.interestedEvents.filter((id) => id !== event.id)
                                  : [...s.interestedEvents, event.id],
                              }))
                        }
                        className={`mx-3 mb-3 mt-3 flex h-9 w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-full text-xs font-semibold ${interested ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"}`}
                      >
                        <Star className="h-3.5 w-3.5" />
                        {interested ? "Interested" : "I’m interested"}
                      </button>
                    </li>
                  );
                })
              )}
              {user && !communityEventsQuery.isLoading && visibleEvents.length === 0 && (
                <li className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  No upcoming events have been posted for this area yet.
                </li>
              )}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {user
                ? "Your interest is visible to members who can also see your profile. Choose public places and meet safely."
                : "Sample interests are saved on this device in the preview."}
            </p>
          </section>
        </>
      )}
      <Drawer open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DrawerContent className="mx-auto max-w-md rounded-t-[24px] bg-white px-5 pb-8">
          {selectedProfile && (
            <>
              <ProfilePhoto
                name={selectedProfile.display_name}
                src={
                  !user
                    ? photo(people.find((person) => person.id === selectedProfile.id)!)
                    : undefined
                }
                path={selectedProfile.photo_paths?.[0]}
                className="h-44 w-full rounded-xl object-cover"
              />
              <DrawerHeader className="px-0 text-left">
                <DrawerTitle>
                  {selectedProfile.display_name}, {selectedProfile.age}
                </DrawerTitle>
              </DrawerHeader>
              <p className="text-xs text-muted-foreground">
                {selectedProfile.town} · {selectedProfile.intent}
              </p>
              <p className="mt-3 text-sm leading-6">{selectedProfile.bio}</p>
              {selectedProfile.seeking && (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Looking for {selectedProfile.seeking}
                </p>
              )}
              {selectedProfile.voice_intro_path && (
                <div className="mt-3">
                  <VoiceIntroPlayer path={selectedProfile.voice_intro_path} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedProfile.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-accent px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  void like(selectedProfile);
                  setSelectedProfile(null);
                }}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-white"
              >
                <Heart className="h-4 w-4 fill-current" /> Like {selectedProfile.display_name}
              </button>
              {user && (
                <div className="mt-4">
                  <SafetyActions
                    userId={user.id}
                    targetId={selectedProfile.id}
                    targetName={selectedProfile.display_name}
                    onBlocked={() => {
                      setSelectedProfile(null);
                      void client.invalidateQueries({ queryKey: ["nearby", user.id] });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function TownMap({
  town,
  profiles,
  demo,
  myLocation,
  onSelectTown,
}: {
  town: string;
  profiles: NearbyProfile[];
  demo: boolean;
  myLocation: [number, number] | null;
  onSelectTown: (town: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const map = useRef<import("leaflet").Map | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !container.current || map.current) return;
      const instance = L.map(container.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        minZoom: 4,
        maxZoom: 15,
        maxBounds: [
          [-35, 10],
          [-14, 27],
        ],
        maxBoundsViscosity: 0.85,
      }).setView(townCenters["Windhoek"]!, 10);
      L.tileLayer(mapboxTileUrl, {
        maxZoom: 19,
        attribution: mapboxPublicToken
          ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      layer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setMapReady(true);
      window.setTimeout(() => instance.invalidateSize(), 100);
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    void import("leaflet").then((L) => {
      const instance = map.current;
      const markers = layer.current;
      if (!instance || !markers) return;
      markers.clearLayers();
      const counts = new Map<string, number>();
      profiles.forEach((profile) => {
        counts.set(profile.town, (counts.get(profile.town) ?? 0) + 1);
      });
      counts.forEach((count, place) => {
        const center = townCenters[place];
        if (!center) return;
        const markerContent = document.createElement("div");
        markerContent.className = "town-map-marker-content";
        const label = document.createElement("span");
        label.textContent = place;
        const total = document.createElement("strong");
        total.textContent = String(count);
        markerContent.append(total, label);
        const icon = L.divIcon({
          className: "town-map-marker",
          html: markerContent,
          iconSize: [88, 54],
          iconAnchor: [44, 27],
        });
        L.marker(center, {
          icon,
          keyboard: true,
          title: `${count} ${demo ? "sample " : ""}${count === 1 ? "profile" : "profiles"} in ${place} · town-level placement`,
        })
          .addTo(markers)
          .on("click", () => onSelectTown(place));
      });
      if (town === "All") instance.setView([-21.8, 17.2], 5);
      else if (townCenters[town]) instance.setView(townCenters[town], 10);
    });
  }, [town, profiles, demo, onSelectTown, mapReady]);
  useEffect(() => {
    if (!map.current || !myLocation) return;
    map.current.setView(myLocation, 13);
  }, [myLocation]);
  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of Namibia showing profiles by town"
      className="namibia-map h-full w-full bg-secondary"
    />
  );
}
