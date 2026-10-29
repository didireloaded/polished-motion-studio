import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarDays, Footprints, MapPin, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { events, people, photo, towns, update, useStore } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { useSession } from "@/hooks/use-session";
import { type RecommendationResult } from "@/lib/recommend.functions";
import { supabase } from "@/integrations/supabase/client";
import { DemoNotice, ProfilePhoto, SafetyActions } from "@/components/community";
import { VoiceIntroPlayer } from "@/components/voice-intro";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Nearby — NamLink" },
      { name: "description", content: "Explore people and local plans by town." },
      { property: "og:title", content: "Nearby — NamLink" },
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

function NearbyPage() {
  const store = useStore();
  const { user, ready } = useSession();
  const [town, setTown] = useState("All");
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
  const visibleProfiles = profiles.filter((p) => town === "All" || p.town === town);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        towns.map((place) => [place, profiles.filter((p) => p.town === place).length]),
      ),
    [profiles],
  );

  if (!ready)
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );

  const like = async (profile: NearbyProfile) => {
    if (user) {
      const { error } = await supabase
        .from("decisions")
        .insert({ actor_id: user.id, target_id: profile.id, liked: true });
      if (error && error.code !== "23505")
        setNotice("We couldn't send that like. Please try again.");
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
  };

  const visibleEvents = user
    ? (communityEventsQuery.data ?? [])
        .filter((event) => town === "All" || event.town === town)
        .map((event) => ({ ...event, sample: false }))
    : events
        .filter((event) => town === "All" || event.town === town)
        .map((event) => ({ ...event, venue_name: "", details: "", starts_at: "", sample: true }));
  const eventInterests = eventInterestQuery.data ?? [];

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Nearby" eyebrow="Find people and plans by town" />
      {!user && <DemoNotice />}
      <div
        className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Choose a town"
      >
        {["All", ...towns].map((place) => (
          <button
            key={place}
            type="button"
            aria-pressed={town === place}
            onClick={() => setTown(place)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${town === place ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
          >
            {place === "All" ? "All towns" : place}
          </button>
        ))}
      </div>
      <section className="mx-5 mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">People around you</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Shown by town area, never live location
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {visibleProfiles.length}
          </span>
        </div>
        <TownMap town={town} setTown={setTown} counts={counts} />
        <div className="flex items-center justify-between px-4 py-2.5 text-[10px] text-muted-foreground">
          <span>Tap a marker to browse that town</span>
          <span>Approximate areas</span>
        </div>
      </section>
      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-secondary p-2.5 text-primary">
            <Footprints className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Crossed paths</h2>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              Location feature not active
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This preview only uses the town you choose. It doesn’t record routes or infer that you
          passed someone. Real crossed-path alerts need explicit opt-in and native
          background-location support.
        </p>
      </section>
      <section className="mt-6">
        <div className="flex items-end justify-between px-5">
          <div>
            <h2 className="text-[17px] font-semibold">
              {town === "All" ? "People across towns" : `People in ${town}`}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Browse a profile, then choose to connect
            </p>
          </div>
          <MapPin className="mb-1 h-4 w-4 text-muted-foreground" />
        </div>
        {notice && (
          <p role="status" className="mx-5 mt-2 text-xs text-muted-foreground">
            {notice}
          </p>
        )}
        {user && query.isLoading ? (
          <p className="px-5 py-5 text-sm text-muted-foreground">Finding people…</p>
        ) : (
          <ul className="mt-3 space-y-2 px-5">
            {visibleProfiles.map((profile) => (
              <motion.li
                key={profile.id}
                layout
                className="rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  {!user && (
                    <img
                      src={photo(
                        people.find((p) => p.id === profile.id)!,
                        true,
                      )}
                      alt=""
                      className="h-[58px] w-[58px] rounded-xl object-cover"
                    />
                  )}
                  {user && (
                    <ProfilePhoto
                      name={profile.display_name}
                      path={profile.photo_paths?.[0]}
                      className="h-[58px] w-[58px] rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {profile.display_name}, {profile.age}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {profile.town} · {profile.intent}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void like(profile)}
                    className="rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Like
                  </button>
                </div>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">{profile.bio}</p>
                {profile.voice_intro_path && (
                  <div className="mt-3">
                    <VoiceIntroPlayer path={profile.voice_intro_path} />
                  </div>
                )}
                {profile.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {user && (
                  <div className="mt-3 border-t border-border pt-3">
                    <SafetyActions
                      userId={user.id}
                      targetId={profile.id}
                      targetName={profile.display_name}
                      onBlocked={() =>
                        void client.invalidateQueries({ queryKey: ["nearby", user.id] })
                      }
                    />
                  </div>
                )}
              </motion.li>
            ))}
            {!visibleProfiles.length && (
              <li className="rounded-2xl border border-border bg-card p-4 text-sm leading-5 text-muted-foreground">
                No profiles in this area yet. Try another town or choose All towns.
              </li>
            )}
          </ul>
        )}
      </section>
      <section className="mt-7 px-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-semibold">Events</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Local ideas to make an easy first plan
            </p>
          </div>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </div>
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
              const attendees = eventInterests.filter((interest) => interest.event_id === event.id);
              const interested = user
                ? attendees.some((interest) => interest.user_id === user.id)
                : store.interestedEvents.includes(event.id);
              return (
                <li key={event.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.town}
                        {event.sample ? " · Sample idea" : ` · ${event.venue_name}`}
                      </p>
                      {!event.sample && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(event.starts_at))}
                        </p>
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
                      className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${interested ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"}`}
                    >
                      {interested ? "Interested" : "I’m interested"}
                    </button>
                  </div>
                  {event.details && (
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{event.details}</p>
                  )}
                  {!event.sample && attendees.length > 0 && (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      Interested: {attendees.map((attendee) => attendee.display_name).join(", ")}
                    </p>
                  )}
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
    </main>
  );
}

function TownMap({
  town,
  setTown,
  counts,
}: {
  town: string;
  setTown: (town: string) => void;
  counts: Record<string, number>;
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
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 4,
        maxZoom: 10,
        maxBounds: [
          [-35, 10],
          [-14, 27],
        ],
        maxBoundsViscosity: 0.85,
      }).setView([-21.8, 17.2], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
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
      for (const place of towns) {
        const center = townCenters[place];
        if (!center) continue;
        const active = town === place;
        const count = counts[place] ?? 0;
        const icon = L.divIcon({
          className: "town-map-marker",
          html: `<span class="town-pin ${active ? "town-pin-active" : ""}" aria-hidden="true"><span>${count}</span></span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const marker = L.marker(center, {
          icon,
          keyboard: true,
          title: `${place}: ${count} profiles`,
        }).addTo(markers);
        marker.on("click", () => {
          setTown(place);
          instance.flyTo(center, 7, { duration: 0.45 });
        });
      }
      if (town === "All") instance.setView([-21.8, 17.2], 5);
      else if (townCenters[town]) instance.setView(townCenters[town], 7);
    });
  }, [town, counts, setTown, mapReady]);
  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of Namibia showing profiles by town"
      className="namibia-map h-[300px] w-full bg-secondary"
    />
  );
}
