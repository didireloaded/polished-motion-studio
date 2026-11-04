import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NearbyFeatureShell } from "@/components/NearbyFeatureShell";
import { DemoNotice } from "@/components/community";
import { useMyProfile, useSession } from "@/hooks/use-session";
import { triggerHaptic } from "@/lib/icebreakers";
import { interests, people, towns, useStore } from "@/lib/namlink";
import { randomFridayDicePrompts } from "@/lib/random-friday";
import {
  fallbackRandomFridayPitch,
  formatShareablePitchCard,
  MAX_PITCH_CUSTOM_NOTE_LENGTH,
  PITCH_STYLE_LABELS,
  PITCH_STYLES,
  type DraftedRandomFridayPitch,
  type PitchProfileInput,
  type PitchStyle,
} from "@/lib/random-friday-pitch";
import { draftRandomFridayPitch } from "@/lib/random-friday-pitch.functions";

export const Route = createFileRoute("/random-friday")({
  head: () => ({ meta: [{ title: "Random Friday — Mutal" }] }),
  component: RandomFridayPage,
});

const DURATION = 30;

function RandomFridayPage() {
  const store = useStore();
  const { user } = useSession();
  const myProfile = useMyProfile(user?.id);

  const [promptIndex, setPromptIndex] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [running, setRunning] = useState(false);

  const defaultProfile = useMemo<PitchProfileInput>(() => {
    if (myProfile.data) {
      return {
        displayName: myProfile.data.display_name || "Alex",
        age: myProfile.data.age || 26,
        town: myProfile.data.town || "Windhoek",
        intent: myProfile.data.intent || "A relationship",
        tags: myProfile.data.tags?.length ? myProfile.data.tags : ["Coffee", "Road trips"],
        bio: myProfile.data.bio || "",
        seeking: myProfile.data.seeking || "",
      };
    }
    if (store.profile.name.trim()) {
      return {
        displayName: store.profile.name,
        age: store.profile.age || 25,
        town: store.profile.town || "Windhoek",
        intent: store.profile.intent || "A relationship",
        tags: store.profile.tags.length ? store.profile.tags : ["Coffee", "Road trips"],
        bio: store.profile.bio || "",
        seeking: "",
      };
    }
    const sample = people[0]!;
    return {
      displayName: sample.name,
      age: sample.age,
      town: sample.town,
      intent: sample.intent,
      tags: sample.tags,
      bio: sample.bio,
      seeking: sample.answer,
    };
  }, [myProfile.data, store.profile]);

  const [displayName, setDisplayName] = useState(defaultProfile.displayName);
  const [age, setAge] = useState(defaultProfile.age);
  const [town, setTown] = useState(defaultProfile.town);
  const [intent, setIntent] = useState(defaultProfile.intent);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultProfile.tags);
  const [bio, setBio] = useState(defaultProfile.bio);
  const [style, setStyle] = useState<PitchStyle>("warm");
  const [focusHint, setFocusHint] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pitchResult, setPitchResult] = useState<{
    source: "ai" | "fallback";
    notice?: string;
    draft: DraftedRandomFridayPitch;
  } | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");
  const draftRequest = useRef(0);
  useEffect(() => {
    draftRequest.current += 1;
    setPitchResult(null);
    setShareFeedback("");
  }, [displayName, age, town, intent, selectedTags, bio, style, focusHint]);

  useEffect(() => {
    setDisplayName(defaultProfile.displayName);
    setAge(defaultProfile.age);
    setTown(defaultProfile.town);
    setIntent(defaultProfile.intent);
    setSelectedTags(defaultProfile.tags);
    setBio(defaultProfile.bio);
  }, [defaultProfile]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const currentProfileInput: PitchProfileInput = {
    displayName: displayName.trim() || "Alex",
    age: Number(age) || 25,
    town: town || "Windhoek",
    intent: intent || "A relationship",
    tags: selectedTags,
    bio: bio.trim(),
    seeking: defaultProfile.seeking,
  };

  const generatePitch = async () => {
    triggerHaptic(10);
    const request = ++draftRequest.current;
    setGenerating(true);
    setShareFeedback("");
    try {
      if (user) {
        const res = await draftRandomFridayPitch({
          data: {
            style,
            ...(focusHint.trim() ? { focusHint: focusHint.trim() } : {}),
            profileOverride: currentProfileInput,
          },
        });
        if (request === draftRequest.current) setPitchResult(res);
      } else {
        const draft = fallbackRandomFridayPitch(
          currentProfileInput,
          style,
          focusHint.trim() || undefined,
        );
        if (request === draftRequest.current)
          setPitchResult({
            source: "fallback",
            notice: "Preview introduction · sign in to tailor one from your profile.",
            draft,
          });
      }
      setRunning(false);
      setSeconds(DURATION);
    } catch {
      const draft = fallbackRandomFridayPitch(
        currentProfileInput,
        style,
        focusHint.trim() || undefined,
      );
      if (request === draftRequest.current)
        setPitchResult({
          source: "fallback",
          notice: "A starting point from your profile. Review it before sharing.",
          draft,
        });
    } finally {
      setGenerating(false);
    }
  };

  const shareProfileAndPitch = async (action: "share" | "copy" = "share") => {
    if (!pitchResult) return;
    const cardText = formatShareablePitchCard(currentProfileInput, pitchResult.draft);
    if (action === "share" && navigator.share) {
      try {
        await navigator.share({
          title: `${currentProfileInput.displayName}'s Random Friday introduction — Mutal`,
          text: cardText,
        });
        setShareFeedback("Profile card shared.");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(cardText);
      setShareFeedback("Profile card copied.");
    } catch {
      setShareFeedback(
        "Sharing is unavailable here. You can select and copy the introduction below.",
      );
    }
  };

  const nextPrompt = () => {
    setRunning(false);
    setSeconds(DURATION);
    setPromptIndex((index) => (index + 1) % randomFridayDicePrompts.length);
    triggerHaptic(8);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag].slice(0, 6),
    );
  };

  return (
    <NearbyFeatureShell title="Random Friday">
      {!user && <DemoNotice />}
      <div className="px-5 pb-12 pt-8">
        <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.02em]">
          A quick hello, in your own words.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Turn your profile into a short introduction. Review the words, practise at your own pace,
          then share your profile card when it feels like you.
        </p>

        <section
          className="mt-6 rounded-xl border border-border bg-white p-5"
          aria-label="Your introduction"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-[16px] font-semibold">Profile details</h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile((v) => !v)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {editingProfile ? "Done" : "Edit profile"}
            </button>
          </div>

          <div className="mt-4 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-semibold text-foreground">
                {currentProfileInput.displayName}, {currentProfileInput.age} ·{" "}
                {currentProfileInput.town}
              </p>
              <span className="text-muted-foreground">· {currentProfileInput.intent}</span>
            </div>
            {currentProfileInput.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentProfileInput.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-b border-border pb-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {currentProfileInput.bio && (
              <p className="mt-2 line-clamp-2 text-muted-foreground">{currentProfileInput.bio}</p>
            )}
          </div>

          {editingProfile && (
            <div className="mt-3 space-y-3 rounded-2xl border border-border p-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold" htmlFor="pitch-name">
                    First name
                  </label>
                  <input
                    id="pitch-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    className="input mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold" htmlFor="pitch-town">
                    Town
                  </label>
                  <select
                    id="pitch-town"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    className="input mt-1 text-xs"
                  >
                    {towns.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold" htmlFor="pitch-intent">
                  Looking for
                </label>
                <select
                  id="pitch-intent"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="input mt-1 text-xs"
                >
                  <option>A relationship</option>
                  <option>Something casual</option>
                  <option>Friends first</option>
                  <option>Open to exploring</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] font-semibold">Interests (up to 6)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {interests.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold" htmlFor="pitch-bio">
                  About you
                </label>
                <textarea
                  id="pitch-bio"
                  rows={2}
                  maxLength={320}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A quick line about your week or favourite weekend plans"
                  className="input mt-1 resize-none text-xs"
                />
              </div>
            </div>
          )}

          {/* Pitch Style Selector */}
          <div className="mt-4">
            <p className="text-xs font-semibold">Choose your pitch vibe</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PITCH_STYLES.map((option) => {
                const active = style === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStyle(option)}
                    className={`rounded-2xl border p-2.5 text-left transition-colors ${
                      active
                        ? "border-primary bg-accent/60 text-foreground"
                        : "border-border bg-white text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-xs font-semibold">{PITCH_STYLE_LABELS[option].label}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                      {PITCH_STYLE_LABELS[option].hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="pitch-focus-hint" className="text-xs font-semibold">
              Optional weekend highlight
            </label>
            <input
              id="pitch-focus-hint"
              value={focusHint}
              maxLength={MAX_PITCH_CUSTOM_NOTE_LENGTH}
              onChange={(e) => setFocusHint(e.target.value)}
              placeholder="e.g. Swakopmund road trips, rooftop jazz, or Sunday braai"
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={() => void generatePitch()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-white shadow-float transition active:scale-[0.98] disabled:opacity-50"
            >
              {generating ? "Writing your 30s pitch…" : "Draft my introduction"}
            </button>
            <button
              type="button"
              onClick={() => void shareProfileAndPitch()}
              disabled={!pitchResult || generating}
              aria-label="Share dating profile and introduction"
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" />
              Share
            </button>
          </div>

          {shareFeedback && (
            <p role="status" className="mt-2.5 flex items-center gap-1.5 text-xs text-primary">
              {shareFeedback}
            </p>
          )}

          {pitchResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 border-l-2 border-primary bg-accent/25 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-primary">
                  {pitchResult.draft.headline}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
                  ~{pitchResult.draft.estimatedSeconds}s spoken pace
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-foreground">
                “{pitchResult.draft.pitch}”
              </p>
              <p className="mt-2 text-xs font-medium text-primary">
                Closing hook: {pitchResult.draft.closingHook}
              </p>
              {pitchResult.notice && (
                <p className="mt-2 text-[11px] text-muted-foreground">{pitchResult.notice}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSeconds(DURATION);
                    setRunning(true);
                    triggerHaptic(12);
                  }}
                  className="flex h-9 flex-1 items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-white"
                >
                  Practise with 30s timer
                </button>
                <button
                  type="button"
                  onClick={() => void shareProfileAndPitch("copy")}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-semibold text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy pitch card
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* 30-Second Countdown Practice Timer */}
        <section
          className="mt-6 rounded-[20px] border border-border bg-white p-5"
          aria-label="Introduction practice"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {pitchResult
                ? "Practising your introduction"
                : `Prompt ${promptIndex + 1} of ${randomFridayDicePrompts.length}`}
            </span>
            <span>30-second round</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={pitchResult ? pitchResult.draft.pitch : promptIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-5 min-h-20 text-[17px] font-semibold leading-7"
            >
              {randomFridayDicePrompts[promptIndex]}
            </motion.p>
          </AnimatePresence>
          <div className="mt-5" aria-label={`${seconds} seconds remaining`}>
            <div className="flex items-baseline gap-1">
              <span className="text-[30px] font-semibold tabular-nums">{seconds}</span>
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${(seconds / DURATION) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setRunning((value) => !value);
              if (seconds === 0) {
                setSeconds(DURATION);
                setRunning(true);
              }
            }}
            className="mt-6 h-12 w-full rounded-full bg-primary text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {seconds === 0
              ? "Try again"
              : running
                ? "Pause timer"
                : seconds < DURATION
                  ? "Resume timer"
                  : "Start 30 seconds"}
          </button>
          <button
            type="button"
            onClick={nextPrompt}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" /> Another prompt
          </button>
        </section>
      </div>
    </NearbyFeatureShell>
  );
}
