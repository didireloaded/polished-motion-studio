import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronUp,
  Heart,
  Share2,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { people, photo, towns, update, useStore, type Person } from "@/lib/namlink";
import { useMyProfile, useSession } from "@/hooks/use-session";
import { getRecommendations, type RecommendationResult } from "@/lib/recommend.functions";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto, SafetyActions } from "@/components/community";
import { SampleVoiceIntro, VoiceIntroPlayer } from "@/components/voice-intro";
import { BrandLogo } from "@/components/BrandLogo";
import { captureProductEvent } from "@/lib/telemetry";
import type { CelebrationMatch } from "@/components/MatchCelebrationModal";
import { ElevatorPitchCard, TwoTruthsCard } from "@/components/SocialGames";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { triggerHaptic } from "@/lib/icebreakers";
import { sendMatchAlertEmail } from "@/lib/email.functions";
import {
  computeVibeAlignment,
  getElevatorPitchForPerson,
  getPersonThisOrThatAnswers,
  getTwoTruthsForPerson,
} from "@/lib/social-games";

const MatchCelebrationModal = lazy(() =>
  import("@/components/MatchCelebrationModal").then((m) => ({
    default: m.MatchCelebrationModal,
  })),
);
const RandomFridayModal = lazy(() =>
  import("@/components/RandomFridayModal").then((m) => ({
    default: m.RandomFridayModal,
  })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover — Mutal" },
      { name: "description", content: "Discover people across Namibia." },
      { property: "og:title", content: "Discover — Mutal" },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useStore();
  const { user, ready } = useSession();
  const myProfile = useMyProfile(user?.id);
  const queryClient = useQueryClient();
  const [town, setTown] = useState("All");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(45);
  const [intentFilter, setIntentFilter] = useState("Any intention");
  const recs = useQuery({
    queryKey: ["recommendations", user?.id, town, minAge, maxAge, intentFilter],
    enabled: !!user,
    queryFn: () => getRecommendations({ data: { town, minAge, maxAge, intent: intentFilter } }),
    staleTime: 5 * 60_000,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [randomFridayOpen, setRandomFridayOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [hiddenRecommendations, setHiddenRecommendations] = useState<string[]>([]);
  const [exitCue, setExitCue] = useState<{ id: string; direction: number } | null>(null);
  const [celebrationMatch, setCelebrationMatch] = useState<CelebrationMatch | null>(null);
  const sampleDeck = useMemo(
    () =>
      people.filter(
        (p) =>
          !s.liked.includes(p.id) &&
          !s.passed.includes(p.id) &&
          (town === "All" || p.town === town) &&
          p.age >= minAge &&
          (intentFilter === "Any intention" || p.intent === intentFilter) &&
          p.age <= maxAge,
      ),
    [s.liked, s.passed, town, minAge, maxAge, intentFilter],
  );
  const liveDeck: Person[] = (recs.data?.items ?? []).map((item) => ({
    id: item.profile.id,
    name: item.profile.display_name,
    age: item.profile.age,
    town: item.profile.town,
    job: item.profile.intent,
    photo: "",
    tags: item.profile.tags,
    prompt: "What they’re looking for",
    answer: item.profile.seeking || item.profile.intent,
    bio: item.profile.bio,
    intent: item.profile.intent,
    recommendationReason: item.reason,
    voiceIntroPath: item.profile.voice_intro_path ?? null,
    photoPaths: item.profile.photo_paths ?? [],
  }));
  const deck = user
    ? liveDeck.filter(
        (p) =>
          !hiddenRecommendations.includes(p.id) &&
          (town === "All" || p.town === town) &&
          p.age >= minAge &&
          (intentFilter === "Any intention" || p.intent === intentFilter) &&
          p.age <= maxAge,
      )
    : sampleDeck;
  const current = deck[0];
  const last = [...s.passed].pop();

  if (!ready) {
    return (
      <main className="discover-shell mx-auto flex h-[calc(100svh-60px-env(safe-area-inset-bottom))] min-h-[540px] max-w-[440px] flex-col px-2">
        <header className="flex h-[58px] shrink-0 items-center justify-between px-2">
          <BrandLogo />
          <span className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
        </header>
        <section aria-label="Loading discovery" className="relative min-h-0 flex-1">
          <ProfileCardSkeleton />
        </section>
      </main>
    );
  }

  const decide = async (p: Person, liked: boolean) => {
    triggerHaptic(liked ? 18 : 10);
    if (user) {
      setExitCue({ id: p.id, direction: liked ? 1 : -1 });
      setHiddenRecommendations((current) => [...current, p.id]);
      const { error } = await supabase
        .from("decisions")
        .insert({ actor_id: user.id, target_id: p.id, liked });
      if (error) {
        setHiddenRecommendations((current) => current.filter((id) => id !== p.id));
        setExitCue(null);
        setNotice(
          error.code === "23505"
            ? "You’ve already responded to this profile."
            : error.code === "P0001"
              ? "Please take a short break before liking more profiles."
              : "We couldn't save your response. Please try again.",
        );
        window.setTimeout(() => setNotice(""), 2600);
        return false;
      }
      queryClient.setQueryData<RecommendationResult>(
        ["recommendations", user.id, town, minAge, maxAge, intentFilter],
        (current) =>
          current
            ? { ...current, items: current.items.filter((item) => item.profile.id !== p.id) }
            : current,
      );
      if (deck.every((candidate) => candidate.id === p.id)) {
        void queryClient.invalidateQueries({ queryKey: ["recommendations", user.id] });
      }
      if (!liked) {
        setNotice(`Passed on ${p.name}.`);
        window.setTimeout(() => setNotice(""), 1500);
      }
      if (liked) {
        void captureProductEvent("like_sent");
        const [a, b] = user.id < p.id ? [user.id, p.id] : [p.id, user.id];
        const { data: matchRow } = await supabase
          .from("matches")
          .select("id")
          .eq("user_a", a)
          .eq("user_b", b)
          .maybeSingle();
        if (matchRow?.id) {
          triggerHaptic([30, 50, 40]);
          void captureProductEvent("match_created");
          void queryClient.invalidateQueries({ queryKey: ["matches", user.id] });
          void queryClient.invalidateQueries({
            queryKey: ["unread-notifications-count", user.id],
          });
          void sendMatchAlertEmail({
            data: { matchId: matchRow.id, partnerName: p.name },
          }).catch(() => undefined);
          setCelebrationMatch({
            matchId: matchRow.id,
            partnerId: p.id,
            partnerName: p.name,
            partnerTown: p.town,
            partnerTags: p.tags,
            partnerIntent: p.intent,
            ...(p.photoPaths?.[0] ? { partnerPhotoPath: p.photoPaths[0] } : {}),
            myName: myProfile.data?.display_name ?? "You",
            ...(myProfile.data?.photo_paths?.[0]
              ? { myPhotoPath: myProfile.data.photo_paths[0] }
              : {}),
          });
        }
      }
      return true;
    }

    const isMutual = liked && !!p.mutualInterest;
    update((st) => {
      if (!liked) return { ...st, passed: [...st.passed, p.id] };
      const matches =
        p.mutualInterest && !st.matches.includes(p.id) ? [...st.matches, p.id] : st.matches;
      return {
        ...st,
        liked: [...st.liked, p.id],
        matches,
        chats: matches.includes(p.id) && !st.chats[p.id] ? { ...st.chats, [p.id]: [] } : st.chats,
      };
    });
    if (isMutual) {
      triggerHaptic([30, 50, 40]);
      void captureProductEvent("match_created", { mode: "demo" });
      setCelebrationMatch({
        partnerId: p.id,
        partnerName: p.name,
        partnerTown: p.town,
        partnerTags: p.tags,
        partnerIntent: p.intent,
        partnerPhotoSrc: photo(p),
        myName: s.profile.name || "Alex",
        myPhotoSrc: "/design/lead-man.jpg",
      });
    } else if (!liked) {
      setNotice("Passed.");
      window.setTimeout(() => setNotice(""), 1500);
    }
    return true;
  };

  return (
    <main className="discover-shell mx-auto flex h-[calc(100svh-60px-env(safe-area-inset-bottom))] min-h-[540px] max-w-[440px] flex-col px-2">
      <header className="flex h-[58px] shrink-0 items-center justify-between px-2">
        <Link to="/" aria-label="Mutal home">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-2">
          {isFeatureEnabled("randomFriday") && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("like");
                setRandomFridayOpen(true);
              }}
              aria-label="Open Random Friday 30-second live sprint"
              className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-2.5 text-[11px] font-semibold text-primary transition active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Random Friday
            </button>
          )}
          {last && (
            <IconButton
              label="Undo last pass"
              onClick={() => update((st) => ({ ...st, passed: st.passed.slice(0, -1) }))}
            >
              <ArrowLeft className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Open filters" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </header>
      {user && recs.data?.notice && (
        <p role="status" className="px-2 pb-2 text-center text-xs text-muted-foreground">
          {recs.data.notice}
        </p>
      )}
      {user && !recs.data?.items.length && recs.data && (
        <p className="px-4 pb-2 text-center text-xs text-muted-foreground">
          {recs.data.notice ?? "No more compatible profiles right now."}
        </p>
      )}

      <section aria-label="Discover profiles" className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {deck
            .slice(0, 2)
            .reverse()
            .map((person) => (
              <ProfileCard
                key={person.id}
                person={person}
                depth={deck.indexOf(person)}
                expanded={expandedId === person.id}
                onDetails={() => setExpandedId(expandedId === person.id ? null : person.id)}
                userId={user?.id}
                recommendationReason={
                  (person as Person & { recommendationReason?: string }).recommendationReason
                }
                onDecide={(liked) => decide(person, liked)}
                exitDirection={exitCue?.id === person.id ? exitCue.direction : 0}
                onBlocked={() => {
                  void queryClient.invalidateQueries({ queryKey: ["recommendations", user?.id] });
                }}
              />
            ))}
        </AnimatePresence>
        {recs.isFetching && user && deck.length === 0 && <ProfileCardSkeleton />}
        {!current && !recs.isFetching && (
          <Empty
            needsProfile={!!user && recs.data?.notice === "Create your profile first."}
            canRewind={!user && s.passed.length > 0}
            onRewind={() => {
              update((st) => ({ ...st, passed: st.passed.slice(0, -1) }));
              setNotice("Brought back your last pass.");
              window.setTimeout(() => setNotice(""), 1800);
            }}
            onInvite={async () => {
              const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
              try {
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({
                    title: "Mutal — Namibia",
                    text: "Meet people worth knowing in Namibia on Mutal.",
                    url: shareUrl,
                  });
                  return;
                }
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  await navigator.clipboard.writeText(shareUrl);
                  setNotice("Invite link copied to clipboard.");
                  window.setTimeout(() => setNotice(""), 2200);
                }
              } catch {
                // User cancelled share sheet
              }
            }}
            onReset={async () => {
              if (user && recs.data?.notice === "Create your profile first.") {
                await queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
                return;
              }
              setTown("All");
              setMinAge(18);
              setMaxAge(99);
              setIntentFilter("Any intention");
              if (user) {
                const { error } = await supabase
                  .from("profiles")
                  .update({ pref_town: null, pref_min_age: 18, pref_max_age: 99 })
                  .eq("id", user.id);
                setNotice(
                  error
                    ? "We couldn't broaden your preferences. Please try again."
                    : "Search widened to all towns and ages 18–99.",
                );
                void queryClient.invalidateQueries({ queryKey: ["recommendations", user.id] });
              } else {
                update((st) => ({ ...st, passed: [] }));
                setNotice("Showing sample profiles from all towns.");
              }
              window.setTimeout(() => setNotice(""), 2200);
            }}
          />
        )}
        {current && !recs.isLoading && expandedId !== current.id && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-8">
            <RoundButton
              label={"Pass on " + current.name}
              onClick={() => decide(current, false)}
              tone="quiet"
            >
              <X className="h-6 w-6" />
            </RoundButton>
            <RoundButton
              label={"Like " + current.name}
              onClick={() => decide(current, true)}
              tone="like"
            >
              <Heart className="h-6 w-6" fill="currentColor" />
            </RoundButton>
          </div>
        )}
      </section>
      {recs.isFetching && user && deck.length === 0 && (
        <div
          aria-hidden="true"
          className="flex h-[76px] shrink-0 items-center justify-center gap-5"
        >
          <span className="h-14 w-14 animate-pulse rounded-full bg-secondary" />
          <span className="h-[68px] w-[68px] animate-pulse rounded-full bg-secondary" />
          <span className="h-14 w-14 animate-pulse rounded-full bg-secondary" />
        </div>
      )}

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="mx-auto max-h-[82svh] max-w-[440px] rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 pb-4 text-left">
            <div>
              <DrawerTitle className="text-xl">Filters</DrawerTitle>
              <DrawerDescription>Choose who you would like to meet.</DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Close filters"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>
          <label className="text-sm font-semibold" htmlFor="town-filter">
            Town
          </label>
          <select
            id="town-filter"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary"
          >
            <option value="All">All Namibia</option>
            {towns.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
          <div className="mt-6 flex items-center justify-between">
            <label htmlFor="age-filter" className="text-sm font-semibold">
              Age range
            </label>
            <span className="text-sm text-muted-foreground">
              {minAge}–{maxAge}
            </span>
          </div>
          <input
            aria-label="Minimum age"
            type="range"
            min="18"
            max={maxAge}
            value={minAge}
            onChange={(e) => setMinAge(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
          />
          <input
            id="age-filter"
            aria-label="Maximum age"
            type="range"
            min="18"
            max="99"
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            className="mt-1 w-full accent-primary"
          />
          <label className="mt-5 block text-sm font-semibold" htmlFor="intent-filter">
            Connection intent
          </label>
          <select
            id="intent-filter"
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary"
          >
            <option>Any intention</option>
            <option>A relationship</option>
            <option>Something casual</option>
            <option>Friends first</option>
            <option>Still figuring it out</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setTown("All");
              setMinAge(18);
              setMaxAge(99);
              setIntentFilter("Any intention");
            }}
            className="mt-5 text-sm font-medium text-primary"
          >
            Clear filters
          </button>
          <button
            onClick={() => setFiltersOpen(false)}
            className="mt-5 h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            Apply filters
          </button>
        </DrawerContent>
      </Drawer>

      {celebrationMatch && (
        <Suspense fallback={null}>
          <MatchCelebrationModal
            match={celebrationMatch}
            onClose={() => setCelebrationMatch(null)}
          />
        </Suspense>
      )}
      {randomFridayOpen && (
        <Suspense fallback={null}>
          <RandomFridayModal
            open={randomFridayOpen}
            town={town}
            userId={user?.id}
            onClose={() => setRandomFridayOpen(false)}
          />
        </Suspense>
      )}

      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(92vw,400px)] -translate-x-1/2 rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm shadow-float"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ProfileCard({
  person,
  depth,
  expanded,
  onDetails,
  userId,
  recommendationReason,
  onDecide,
  exitDirection,
  onBlocked,
}: {
  person: Person;
  depth: number;
  expanded: boolean;
  onDetails: () => void;
  userId?: string | undefined;
  recommendationReason?: string | undefined;
  onDecide: (liked: boolean) => Promise<boolean>;
  exitDirection: number;
  onBlocked?: (() => void) | undefined;
}) {
  const top = depth === 0;
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => setPhotoIdx(0), [person.id]);

  const livePaths = person.photoPaths ?? [];
  const sampleGallery =
    person.gallery && person.gallery.length > 0
      ? person.gallery
      : person.photo
        ? [photo(person)]
        : [];
  const totalPhotos = userId ? Math.max(1, livePaths.length) : Math.max(1, sampleGallery.length);
  const activeIdx = Math.min(photoIdx, totalPhotos - 1);
  const currentSampleSrc = !userId ? sampleGallery[activeIdx] : undefined;
  const currentLivePath = userId ? livePaths[activeIdx] : undefined;
  const store = useStore();
  const alignment = useMemo(
    () => computeVibeAlignment(store.profile.choices, getPersonThisOrThatAnswers(person)),
    [store.profile.choices, person],
  );
  const elevatorPitch = useMemo(() => getElevatorPitchForPerson(person), [person]);
  const twoTruthsGame = useMemo(() => getTwoTruthsForPerson(person), [person]);

  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-240, 0, 240], [-9, 0, 9]);
  const likeOpacity = useTransform(dragX, [14, 105], [0, 1]);
  const likeScale = useTransform(dragX, [14, 120], [0.84, 1.06]);
  const passOpacity = useTransform(dragX, [-105, -14], [1, 0]);
  const passScale = useTransform(dragX, [-120, -14], [1.06, 0.84]);

  return (
    <motion.article
      aria-label={
        (userId ? "Profile, " : "Sample profile, ") +
        person.name +
        ", " +
        person.age +
        ", " +
        person.town
      }
      className="absolute inset-0 flex touch-pan-y flex-col overflow-hidden rounded-[14px] bg-card text-white shadow-float"
      style={{ zIndex: 10 - depth, x: dragX, rotate }}
      drag={top && !expanded ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.72}
      dragMomentum={false}
      onDragEnd={async (_, info) => {
        const direction = info.offset.x > 0 ? 1 : -1;
        const crossedThreshold = Math.abs(info.offset.x) > window.innerWidth * 0.24;
        const flicked = Math.abs(info.velocity.x) > 700;
        if (top && !expanded && (crossedThreshold || flicked)) {
          await onDecide(direction > 0);
        }
      }}
      initial={{ scale: 0.96, y: 12, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.025, y: depth * 10, opacity: depth ? 0.72 : 1 }}
      exit={{
        x: exitDirection * 520,
        rotate: exitDirection * 8,
        opacity: 0,
        transition: { duration: 0.28 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <motion.div
        layout
        className="relative w-full shrink-0 overflow-hidden bg-foreground"
        animate={{ height: expanded ? "40%" : "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <ProfilePhoto
          name={person.name}
          src={currentSampleSrc}
          path={currentLivePath}
          className={`absolute inset-0 h-full w-full select-none ${currentLivePath ? "object-contain" : "object-cover"}`}
        />
        <div className="bg-scrim absolute inset-0" aria-hidden="true" />

        {totalPhotos > 1 && !expanded && (
          <>
            <div
              aria-label={`Photo ${activeIdx + 1} of ${totalPhotos}`}
              className="pointer-events-none absolute inset-x-4 top-2.5 z-20 flex gap-1.5"
            >
              {Array.from({ length: totalPhotos }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${idx === activeIdx ? "bg-white" : "bg-white/35"}`}
                />
              ))}
            </div>
            {top && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(8);
                    setPhotoIdx((i) => (i > 0 ? i - 1 : totalPhotos - 1));
                  }}
                  className="absolute inset-y-0 left-0 z-10 w-1/3 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(8);
                    setPhotoIdx((i) => (i + 1) % totalPhotos);
                  }}
                  className="absolute inset-y-0 right-0 z-10 w-1/3 focus:outline-none"
                />
              </>
            )}
          </>
        )}

        {top && !expanded && (
          <>
            <motion.span
              style={{ opacity: likeOpacity, scale: likeScale }}
              className="pointer-events-none absolute left-5 top-8 z-20 -rotate-12 rounded-xl border-2 border-emerald-300/90 bg-emerald-950/45 px-3.5 py-1 text-lg font-extrabold tracking-wider text-emerald-100 backdrop-blur-sm"
              aria-hidden="true"
            >
              CONNECT
            </motion.span>
            <motion.span
              style={{ opacity: passOpacity, scale: passScale }}
              className="pointer-events-none absolute right-5 top-8 z-20 rotate-12 rounded-xl border-2 border-white/80 bg-foreground/60 px-3.5 py-1 text-lg font-extrabold tracking-wider text-white backdrop-blur-sm"
              aria-hidden="true"
            >
              PASS
            </motion.span>
          </>
        )}
        {top && !userId && !expanded && (
          <span
            className={`absolute left-4 z-20 rounded-full bg-foreground/75 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm ${totalPhotos > 1 ? "top-6" : "top-4"}`}
          >
            Sample profile
          </span>
        )}
        {expanded && (
          <button
            type="button"
            onClick={onDetails}
            aria-label="Back to photo"
            className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[92px] z-20 px-5 pt-16">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[26px] font-bold leading-tight tracking-[-0.035em]">
                    {person.name}
                    <span className="ml-2 text-[21px] font-medium text-white/85">{person.age}</span>
                  </h1>
                  {(person.verified || (person.photoPaths?.length ?? 0) > 0) && (
                    <span
                      title="Verified member"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-white/95">{person.town}</p>
                <p className="mt-0.5 truncate text-[12px] text-white/85">{person.job}</p>
              </div>
              <motion.button
                type="button"
                aria-label={expanded ? "Hide profile details" : "Show profile details"}
                aria-expanded={expanded}
                onClick={onDetails}
                whileTap={{ scale: 0.9 }}
                className="pointer-events-auto mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-foreground/35 text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <motion.span
                  animate={{ rotate: expanded ? 180 : 0, y: expanded ? 0 : [0, -2, 0] }}
                  transition={{
                    duration: expanded ? 0.2 : 1.8,
                    repeat: expanded ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <ChevronUp className="h-5 w-5" />
                </motion.span>
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
      <AnimatePresence initial={false}>
        {top && expanded && (
          <motion.div
            key="profile-details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 pt-4 text-foreground"
          >
            <div className="space-y-3">
              <div>
                <h2 className="text-[18px] font-bold leading-tight">
                  {person.name} <span className="font-normal">{person.age}</span>
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {person.job} · {person.town}
                </p>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold">About me</h3>
                <p className="mt-1 text-[12px] leading-[18px]">{person.bio}</p>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold">Looking for</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-primary">
                    ♥ {person.intent}
                  </span>
                  <span className="inline-flex rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Vibe Alignment: {alignment.percentage}%
                  </span>
                </div>
              </div>
              {person.voiceIntroPath && <VoiceIntroPlayer path={person.voiceIntroPath} />}
              {!userId && <SampleVoiceIntro />}
              <ElevatorPitchCard
                personName={person.name}
                pitch={elevatorPitch}
                onSelectReaction={(reactionText) => {
                  update((st) => ({
                    ...st,
                    chats: {
                      ...st.chats,
                      [person.id]: [
                        ...(st.chats[person.id] ?? []),
                        { from: "me", text: reactionText, at: Date.now(), id: crypto.randomUUID() },
                      ],
                    },
                  }));
                  void onDecide(true);
                }}
              />
              <TwoTruthsCard
                game={twoTruthsGame}
                onSendReply={(replyDraft) => {
                  update((st) => ({
                    ...st,
                    chats: {
                      ...st.chats,
                      [person.id]: [
                        ...(st.chats[person.id] ?? []),
                        { from: "me", text: replyDraft, at: Date.now(), id: crypto.randomUUID() },
                      ],
                    },
                  }));
                  void onDecide(true);
                }}
              />
              {person.photoPaths && person.photoPaths.length > 1 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {person.photoPaths.slice(1).map((path) => (
                    <ProfilePhoto
                      key={path}
                      name={person.name}
                      path={path}
                      className="h-24 w-20 shrink-0 rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              {recommendationReason && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                  You may connect over {recommendationReason}
                </p>
              )}
              <div>
                <h3 className="text-[12px] font-semibold">My answer</h3>
                <p className="mt-1 text-[11px] font-medium">{person.prompt}</p>
                <p className="text-[12px] leading-5 text-muted-foreground">{person.answer}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {person.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {userId && (
                <SafetyActions
                  userId={userId}
                  targetId={person.id}
                  targetName={person.name}
                  onBlocked={onBlocked}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {top && expanded && (
        <motion.button
          type="button"
          aria-label={`Like ${person.name}`}
          onClick={() => void onDecide(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-float"
        >
          <Heart className="h-6 w-6 fill-current" />
        </motion.button>
      )}
    </motion.article>
  );
}

function ProfileCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profiles"
      className="absolute inset-0 animate-pulse overflow-hidden rounded-[22px] border border-border bg-secondary"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/35" />
      <div className="absolute inset-x-5 bottom-5 space-y-3">
        <div className="h-7 w-44 rounded-full bg-background/45" />
        <div className="h-4 w-36 rounded-full bg-background/35" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-background/35" />
          <div className="h-6 w-16 rounded-full bg-background/35" />
        </div>
      </div>
    </div>
  );
}

function Empty({
  onReset,
  onInvite,
  onRewind,
  canRewind = false,
  needsProfile = false,
}: {
  onReset: () => void | Promise<void>;
  onInvite?: () => void | Promise<void>;
  onRewind?: () => void;
  canRewind?: boolean;
  needsProfile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[22px] border border-border bg-card px-7 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Heart className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        {needsProfile ? "A few details first" : "You’ve seen everyone nearby for now"}
      </h2>
      <p className="mt-2 max-w-[270px] text-sm leading-5 text-muted-foreground">
        {needsProfile
          ? "Finish your 3-step profile setup so we can introduce you to people who fit what you value."
          : "Expand to all of Namibia to discover more members, or invite a friend to Mutal."}
      </p>
      {needsProfile ? (
        <Link
          to="/you"
          className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-float"
        >
          Complete profile setup
        </Link>
      ) : (
        <div className="mt-5 flex w-full max-w-[240px] flex-col gap-2">
          <button
            type="button"
            onClick={() => void onReset()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-float"
          >
            Expand to all of Namibia
          </button>
          {canRewind && onRewind && (
            <button
              type="button"
              onClick={onRewind}
              className="rounded-full border border-border bg-secondary/60 px-5 py-2 text-xs font-semibold text-foreground"
            >
              Second glance · rewind last pass
            </button>
          )}
          {onInvite && (
            <button
              type="button"
              onClick={() => void onInvite()}
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary"
            >
              <Share2 className="h-3.5 w-3.5" /> Invite someone to Mutal
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
    </button>
  );
}

function RoundButton({
  children,
  label,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: "quiet" | "like";
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={
        tone === "like"
          ? "pointer-events-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          : "pointer-events-auto flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-foreground shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      }
    >
      {children}
    </motion.button>
  );
}
