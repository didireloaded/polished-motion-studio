import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Bookmark, ChevronUp, Heart, MapPin, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { people, photo, towns, update, useStore, toggle, type Person } from "@/lib/namlink";
import { useSession } from "@/hooks/use-session";
import { getRecommendations } from "@/lib/recommend.functions";
import { supabase } from "@/integrations/supabase/client";
import { DemoNotice, ProfilePhoto, SafetyActions } from "@/components/community";
import { VoiceIntroPlayer } from "@/components/voice-intro";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover — NamLink" },
      { name: "description", content: "Discover people across Namibia." },
      { property: "og:title", content: "Discover — NamLink" },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useStore();
  const { user, ready } = useSession();
  const queryClient = useQueryClient();
  const recs = useQuery({
    queryKey: ["recommendations", user?.id],
    enabled: !!user,
    queryFn: () => getRecommendations(),
  });
  const [town, setTown] = useState("All");
  const [maxAge, setMaxAge] = useState(45);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const sampleDeck = useMemo(
    () =>
      people.filter(
        (p) =>
          !s.liked.includes(p.id) &&
          !s.passed.includes(p.id) &&
          (town === "All" || p.town === town) &&
          p.age <= maxAge,
      ),
    [s.liked, s.passed, town, maxAge],
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
    voiceIntroPath: item.profile.voice_intro_path,
  }));
  const deck = user
    ? liveDeck.filter((p) => (town === "All" || p.town === town) && p.age <= maxAge)
    : sampleDeck;
  const current = deck[0];
  const last = [...s.passed].pop();

  if (!ready) {
    return (
      <main className="mx-auto flex h-[calc(100svh-76px-env(safe-area-inset-bottom))] min-h-[560px] max-w-[440px] items-center justify-center px-3">
        <p role="status" className="text-sm text-muted-foreground">
          Loading your discovery…
        </p>
      </main>
    );
  }

  const decide = async (p: Person, liked: boolean) => {
    if (user) {
      const { error } = await supabase
        .from("decisions")
        .insert({ actor_id: user.id, target_id: p.id, liked });
      if (error) {
        setNotice(
          error.code === "23505"
            ? "You’ve already responded to this profile."
            : "We couldn't save your response. Please try again.",
        );
        window.setTimeout(() => setNotice(""), 2600);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: ["recommendations", user.id] });
      if (!liked) {
        setNotice(`Passed on ${p.name}.`);
        window.setTimeout(() => setNotice(""), 1500);
      }
      return true;
    }
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
    if (!liked) {
      setNotice("Passed.");
      window.setTimeout(() => setNotice(""), 1500);
    }
    return true;
  };

  return (
    <main className="discover-shell mx-auto flex h-[calc(100svh-76px-env(safe-area-inset-bottom))] min-h-[560px] max-w-[440px] flex-col px-3 pt-2">
      <header className="flex h-12 shrink-0 items-center justify-between px-1">
        <Link
          to="/"
          aria-label="NamLink home"
          className="text-[21px] font-bold tracking-[-0.04em] text-foreground"
        >
          NamLink
        </Link>
        <div className="flex items-center gap-2">
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
      {!user && <DemoNotice />}
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

      <section aria-label="Discover sample profiles" className="relative mt-1 min-h-0 flex-1">
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
                onBlocked={() => {
                  void queryClient.invalidateQueries({ queryKey: ["recommendations", user?.id] });
                }}
              />
            ))}
        </AnimatePresence>
        {recs.isLoading && user && <ProfileCardSkeleton />}
        {!current && !recs.isLoading && (
          <Empty
            needsProfile={!!user && recs.data?.notice === "Create your profile first."}
            onReset={async () => {
              if (user && recs.data?.notice === "Create your profile first.") {
                await queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
                return;
              }
              setTown("All");
              setMaxAge(99);
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
      </section>

      {current && !recs.isLoading && (
        <div className="flex h-[76px] shrink-0 items-center justify-center gap-5">
          <RoundButton
            label={"Pass on " + current.name}
            onClick={() => decide(current, false)}
            tone="quiet"
          >
            <X className="h-5 w-5" />
          </RoundButton>
          <RoundButton
            label={"Like " + current.name}
            onClick={() => decide(current, true)}
            tone="like"
          >
            <Heart className="h-6 w-6" fill="currentColor" />
          </RoundButton>
          <RoundButton
            label={
              s.saved.includes(current.id)
                ? "Remove " + current.name + " from saved profiles"
                : "Save " + current.name
            }
            onClick={() => update((st) => ({ ...st, saved: toggle(st.saved, current.id) }))}
            tone="quiet"
          >
            <Bookmark
              className="h-5 w-5"
              fill={s.saved.includes(current.id) ? "currentColor" : "none"}
            />
          </RoundButton>
        </div>
      )}
      {recs.isLoading && user && (
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
              <DrawerDescription>Choose who appears in Discover.</DrawerDescription>
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
            className="input mt-2"
          >
            <option value="All">All Namibia</option>
            {towns.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
          <div className="mt-6 flex items-center justify-between">
            <label htmlFor="age-filter" className="text-sm font-semibold">
              Maximum age
            </label>
            <span className="text-sm text-muted-foreground">18–{maxAge}</span>
          </div>
          <input
            id="age-filter"
            aria-label="Maximum age"
            type="range"
            min="18"
            max="45"
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
          />
          <button
            onClick={() => setFiltersOpen(false)}
            className="mt-6 h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Show profiles
          </button>
        </DrawerContent>
      </Drawer>

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
  onBlocked,
}: {
  person: Person;
  depth: number;
  expanded: boolean;
  onDetails: () => void;
  userId?: string | undefined;
  recommendationReason?: string | undefined;
  onDecide: (liked: boolean) => Promise<boolean>;
  onBlocked?: (() => void) | undefined;
}) {
  const top = depth === 0;
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-240, 0, 240], [-8, 0, 8]);
  const likeOpacity = useTransform(dragX, [0, 100], [0, 1]);
  const passOpacity = useTransform(dragX, [-100, 0], [1, 0]);
  const [exitDirection, setExitDirection] = useState(0);
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
      className="absolute inset-0 flex touch-pan-y flex-col overflow-hidden rounded-[22px] bg-card text-white shadow-float"
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
          setExitDirection(direction);
          if (!(await onDecide(direction > 0))) setExitDirection(0);
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
        className="relative w-full shrink-0 overflow-hidden"
        animate={{ height: expanded ? "48%" : "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <ProfilePhoto
          name={person.name}
          src={person.photo ? photo(person) : undefined}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
        <div className="bg-scrim absolute inset-0" aria-hidden="true" />
        {top && !expanded && (
          <>
            <motion.span
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-7 -rotate-12 rounded-lg border-2 border-white px-3 py-1 text-xl font-extrabold tracking-wider text-white"
              aria-hidden="true"
            >
              LIKE
            </motion.span>
            <motion.span
              style={{ opacity: passOpacity }}
              className="absolute right-5 top-7 rotate-12 rounded-lg border-2 border-white px-3 py-1 text-xl font-extrabold tracking-wider text-white"
              aria-hidden="true"
            >
              PASS
            </motion.span>
          </>
        )}
        {top && !userId && (
          <span className="absolute left-4 top-4 rounded-full bg-foreground/75 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
            Sample profile
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-16">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[27px] font-bold leading-tight tracking-[-0.035em]">
                {person.name}
                <span className="ml-2 text-[21px] font-medium text-white/85">{person.age}</span>
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/90">
                <MapPin className="h-4 w-4 shrink-0" />
                {person.town}
                <span aria-hidden="true">·</span>
                <span className="truncate">{person.job}</span>
              </p>
            </div>
            <motion.button
              type="button"
              aria-label={expanded ? "Hide profile details" : "Show profile details"}
              aria-expanded={expanded}
              onClick={onDetails}
              whileTap={{ scale: 0.9 }}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-foreground/35 text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
          {!expanded && person.tags.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {person.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {top && expanded && (
          <motion.div
            key="profile-details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-foreground"
          >
            <div className="space-y-3">
              <p className="text-[13px] leading-5 text-muted-foreground">{person.bio}</p>
              {person.voiceIntroPath && <VoiceIntroPlayer path={person.voiceIntroPath} />}
              {recommendationReason && (
                <p className="rounded-xl bg-accent/50 p-3 text-xs leading-5">
                  <span className="font-semibold">Why you two: </span>
                  {recommendationReason}
                </p>
              )}
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">{person.prompt}</p>
                <p className="mt-1 text-[14px] font-medium leading-5">{person.answer}</p>
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
  needsProfile = false,
}: {
  onReset: () => void | Promise<void>;
  needsProfile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[22px] border border-border bg-card px-7 text-center">
      <Heart className="h-8 w-8 text-primary" />
      <h2 className="mt-4 text-xl font-semibold">
        {needsProfile ? "A few details first" : "You’re all caught up"}
      </h2>
      <p className="mt-2 max-w-[260px] text-sm leading-5 text-muted-foreground">
        {needsProfile
          ? "Finish your profile so we can find introductions that fit what you’re looking for."
          : "Open up your age and town preferences to meet people a little further afield."}
      </p>
      {needsProfile ? (
        <Link
          to="/you"
          className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Set up profile
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void onReset()}
          className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Try more towns
        </button>
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
          ? "flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          : "flex h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      }
    >
      {children}
    </motion.button>
  );
}
