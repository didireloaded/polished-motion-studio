import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Camera,
  Check,
  Heart,
  Mic,
  MessagesSquare,
  RotateCcw,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { interests, people, photo, towns, update, useStore, toggle } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { Link } from "@tanstack/react-router";
import { useSession, useMyProfile } from "@/hooks/use-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DemoNotice, ProfilePhoto } from "@/components/community";
import { VoiceIntroRecorder } from "@/components/voice-intro";

const choices = [
  { id: "weekend", prompt: "A free Saturday", options: ["A road trip", "A slow morning"] },
  { id: "evening", prompt: "An evening out", options: ["Live music", "Dinner for two"] },
  { id: "coffee", prompt: "My coffee order", options: ["Flat white", "Iced coffee"] },
];

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [
      { title: "You — NamLink" },
      { name: "description", content: "Edit your NamLink profile and stories." },
      { property: "og:title", content: "You — NamLink" },
    ],
  }),
  component: You,
});

function You() {
  const s = useStore();
  const { user, ready } = useSession();
  const liveProfile = useMyProfile(user?.id);
  const [f, setF] = useState(s.profile);
  const [saved, setSaved] = useState(false);
  const [adult, setAdult] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recorderStream = useRef<MediaStream | null>(null);
  const savedAudio = useRef<string | null>(null);
  const savedSelfie = useRef<string | null>(null);
  useEffect(() => setF(s.profile), [s.profile]);
  useEffect(
    () => () => {
      recorder.current?.stop();
      recorderStream.current?.getTracks().forEach((track) => track.stop());
      if (savedAudio.current) URL.revokeObjectURL(savedAudio.current);
      if (savedSelfie.current) URL.revokeObjectURL(savedSelfie.current);
    },
    [],
  );

  const valid = f.name.trim().length >= 2 && f.age >= 18 && f.age <= 99 && adult;
  const save = () => {
    if (!valid) return;
    update((st) => ({ ...st, profile: { ...f, name: f.name.trim(), bio: f.bio.slice(0, 500) } }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  const savedPeople = people.filter((p) => s.saved.includes(p.id));

  const beginRecording = async () => {
    setVoiceError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Voice recording is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStream.current = stream;
      const instance = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      instance.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderStream.current = null;
        if (chunks.length) {
          const url = URL.createObjectURL(
            new Blob(chunks, { type: instance.mimeType || "audio/webm" }),
          );
          if (savedAudio.current) URL.revokeObjectURL(savedAudio.current);
          savedAudio.current = url;
          setAudioUrl(url);
        }
        setRecording(false);
      };
      recorder.current = instance;
      instance.start();
      setRecording(true);
    } catch {
      setVoiceError("Microphone access was unavailable. Check browser permission and try again.");
    }
  };

  const captureSelfie = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (savedSelfie.current) URL.revokeObjectURL(savedSelfie.current);
    savedSelfie.current = url;
    setSelfieUrl(url);
  };

  const stats = [
    { icon: Heart, number: s.liked.length, label: "Likes sent" },
    { icon: Bookmark, number: s.saved.length, label: "Saved" },
    { icon: MessagesSquare, number: s.matches.length, label: "Connections" },
  ];

  if (!ready)
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">
        Loading your account…
      </main>
    );
  if (user)
    return (
      <LiveProfile
        key={user.id}
        userId={user.id}
        profile={liveProfile.data ?? null}
        loading={liveProfile.isLoading}
      />
    );

  return (
    <main className="mx-auto max-w-md pb-28">
      <DemoNotice />
      <PageHeader title={s.profile.name ? s.profile.name : "You"} />
      <div className="grid grid-cols-3 gap-2 px-5">
        {stats.map(({ icon: Icon, number, label }) => (
          <div key={label} className="rounded-2xl border border-border bg-card px-3 py-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-lg font-semibold tabular-nums">{number}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {savedPeople.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-[15px] font-semibold">Saved profiles</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {savedPeople.map((person) => (
              <div
                key={person.id}
                className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl"
              >
                <img
                  src={photo(person, true)}
                  alt={"Sample profile photo of " + person.name}
                  className="h-full w-full object-cover"
                />
                <div className="bg-scrim absolute inset-0" />
                <p className="absolute bottom-2 left-2 text-sm font-semibold text-white">
                  {person.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-5 mt-5 space-y-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-[16px] font-semibold">Your profile</h2>
        <Field label="First name">
          <input
            value={f.name}
            maxLength={40}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input
              type="number"
              min={18}
              max={99}
              value={f.age}
              onChange={(e) => setF({ ...f, age: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Town">
            <select
              value={f.town}
              onChange={(e) => setF({ ...f, town: e.target.value })}
              className="input"
            >
              {towns.map((place) => (
                <option key={place}>{place}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Looking for">
          <div className="flex gap-2">
            {["A relationship", "Open to exploring"].map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => setF({ ...f, intent })}
                className={
                  "flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium " +
                  (f.intent === intent
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground")
                }
              >
                {intent}
              </button>
            ))}
          </div>
        </Field>
        <Field label="About you">
          <textarea
            rows={3}
            maxLength={500}
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            className="input resize-none"
          />
        </Field>
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">
            {interests.map((tag) => {
              const selected = f.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setF({ ...f, tags: toggle(f.tags, tag) })}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground")
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={adult}
            onChange={(e) => setAdult(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          I confirm I’m 18 or older
        </label>
        <button
          type="button"
          disabled={!valid}
          onClick={save}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-45"
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Saved
              </motion.span>
            ) : (
              <motion.span key="save">Save profile</motion.span>
            )}
          </AnimatePresence>
        </button>
      </section>

      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold">This or that</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A few quick answers help people get to know you.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {choices.map((choice) => (
            <fieldset key={choice.id}>
              <legend className="mb-2 text-sm font-medium">{choice.prompt}</legend>
              <div className="grid grid-cols-2 gap-2">
                {choice.options.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={f.choices[choice.id] === answer}
                    onClick={() => setF({ ...f, choices: { ...f.choices, [choice.id]: answer } })}
                    className={
                      "rounded-xl border px-2 py-2.5 text-xs font-medium " +
                      (f.choices[choice.id] === answer
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Save your profile to keep these answers.
        </p>
      </section>

      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">Voice intro</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add a short hello to your profile.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={beginRecording}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              <Mic className="h-4 w-4" />
              {audioUrl ? "Record again" : "Record intro"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => recorder.current?.stop()}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"
            >
              <Square className="h-4 w-4" />
              Stop recording
            </button>
          )}
          {audioUrl && (
            <button
              type="button"
              onClick={() => {
                if (savedAudio.current) URL.revokeObjectURL(savedAudio.current);
                savedAudio.current = null;
                setAudioUrl(null);
              }}
              className="rounded-xl border border-border px-3 text-sm"
            >
              Remove
            </button>
          )}
        </div>
        {recording && (
          <p role="status" className="mt-2 text-xs text-primary">
            Recording. Select Stop recording when you’re done.
          </p>
        )}
        {voiceError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {voiceError}
          </p>
        )}
        {audioUrl && (
          <audio controls src={audioUrl} className="mt-3 w-full" aria-label="Preview voice intro" />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Audio stays on this device in this preview; it is not uploaded.
        </p>
      </section>

      <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-secondary p-2.5 text-primary">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">Selfie check</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Your status: Not verified</p>
          </div>
        </div>
        <label
          htmlFor="selfie-capture"
          className="mt-4 flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border text-sm font-semibold"
        >
          Take a selfie
        </label>
        <input
          id="selfie-capture"
          className="sr-only"
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => captureSelfie(e.target.files?.[0])}
        />
        {selfieUrl && (
          <img
            src={selfieUrl}
            alt="Selfie preview captured on this device"
            className="mt-3 max-h-64 w-full rounded-xl object-cover"
          />
        )}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          This preview cannot verify identity or upload a selfie. A real verification check needs a
          secure review service.
        </p>
      </section>

      <button
        type="button"
        onClick={() => {
          if (confirm("Reset likes, passes, saves, matches and chats?"))
            update((st) => ({ ...st, liked: [], passed: [], saved: [], matches: [], chats: {} }));
        }}
        className="mx-auto mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
      >
        <RotateCcw className="h-4 w-4" />
        Reset my activity
      </button>
    </main>
  );
}

function LiveProfile({
  userId,
  profile,
  loading,
}: {
  userId: string;
  profile: {
    display_name: string;
    age: number;
    town: string;
    bio: string;
    tags: string[];
    intent: string;
    seeking: string;
    pref_min_age: number | null;
    pref_max_age: number | null;
    pref_town: string | null;
    voice_intro_path: string | null;
    photo_paths: string[];
  } | null;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const roles = useQuery({
    queryKey: ["my-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map(({ role }) => role);
    },
  });
  const [name, setName] = useState(profile?.display_name ?? "");
  const [age, setAge] = useState(profile?.age ?? 18);
  const [town, setTown] = useState(profile?.town ?? "Windhoek");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [tags, setTags] = useState(profile?.tags ?? []);
  const [intent, setIntent] = useState(profile?.intent ?? "A relationship");
  const [seeking, setSeeking] = useState(profile?.seeking ?? "");
  const [minAge, setMinAge] = useState(profile?.pref_min_age ?? 18);
  const [maxAge, setMaxAge] = useState(profile?.pref_max_age ?? 99);
  const [prefTown, setPrefTown] = useState(profile?.pref_town ?? "");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [photosBusy, setPhotosBusy] = useState(false);
  const [photosNotice, setPhotosNotice] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setAge(profile.age);
    setTown(profile.town);
    setBio(profile.bio);
    setTags(profile.tags ?? []);
    setIntent(profile.intent);
    setSeeking(profile.seeking);
    setMinAge(profile.pref_min_age ?? 18);
    setMaxAge(profile.pref_max_age ?? 99);
    setPrefTown(profile.pref_town ?? "");
  }, [profile]);

  const save = async () => {
    const currentProfile = profile;
    if (name.trim().length < 2 || age < 18 || age > 99 || !town || !adult || minAge > maxAge)
      return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: name.trim(),
      age,
      town,
      bio: bio.trim().slice(0, 500),
      tags: tags.slice(0, 10),
      intent,
      seeking: seeking.trim().slice(0, 400),
      pref_min_age: minAge,
      pref_max_age: maxAge,
      pref_town: prefTown || null,
      voice_intro_path: currentProfile?.voice_intro_path ?? null,
      photo_paths: currentProfile?.photo_paths ?? [],
    });
    setBusy(false);
    if (error) {
      setNotice("We couldn't save your profile. Please check your connection and try again.");
      return;
    }
    setNotice("Profile saved. Your preferences will shape your recommendations.");
  };

  const refreshPhotoConsumers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] }),
      queryClient.invalidateQueries({ queryKey: ["recommendations", userId] }),
      queryClient.invalidateQueries({ queryKey: ["nearby", userId] }),
      queryClient.invalidateQueries({ queryKey: ["matches", userId] }),
    ]);
  };

  const uploadPhotos = async (selected: FileList | null) => {
    if (!selected || !profile) return;
    const files = Array.from(selected);
    const remaining = 6 - (profile.photo_paths?.length ?? 0);
    if (!files.length) return;
    if (files.length > remaining) {
      setPhotosNotice(`You can add ${remaining} more photo${remaining === 1 ? "" : "s"}.`);
      return;
    }
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setPhotosNotice("Choose JPEG, PNG or WebP photos up to 5 MB each.");
      return;
    }
    setPhotosBusy(true);
    setPhotosNotice("");
    const uploaded: string[] = [];
    for (const file of files) {
      const extension =
        file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        if (uploaded.length) await supabase.storage.from("profile-photos").remove(uploaded);
        setPhotosBusy(false);
        setPhotosNotice("A photo couldn't be uploaded. Please check the file and try again.");
        return;
      }
      uploaded.push(path);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ photo_paths: [...(profile.photo_paths ?? []), ...uploaded] })
      .eq("id", userId);
    if (error) {
      await supabase.storage.from("profile-photos").remove(uploaded);
      setPhotosBusy(false);
      setPhotosNotice("Your photos uploaded but couldn't be added to your profile. Try again.");
      return;
    }
    setPhotosBusy(false);
    setPhotosNotice("Photos added to your profile.");
    await refreshPhotoConsumers();
  };

  const removePhoto = async (path: string) => {
    if (!profile || photosBusy) return;
    setPhotosBusy(true);
    setPhotosNotice("");
    const { error } = await supabase
      .from("profiles")
      .update({ photo_paths: profile.photo_paths.filter((photoPath) => photoPath !== path) })
      .eq("id", userId);
    if (error) {
      setPhotosBusy(false);
      setPhotosNotice("We couldn't remove this photo from your profile.");
      return;
    }
    const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([path]);
    setPhotosBusy(false);
    setPhotosNotice(
      cleanupError ? "Photo removed. Storage cleanup will retry later." : "Photo removed.",
    );
    await refreshPhotoConsumers();
  };

  if (!loading && !profile)
    return (
      <FirstRunOnboarding
        userId={userId}
        onComplete={() => void queryClient.invalidateQueries({ queryKey: ["my-profile", userId] })}
      />
    );

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader
        title={name ? `Hi, ${name}` : "Your profile"}
        eyebrow={
          profile ? "Your profile and preferences" : "A few details before we find people for you"
        }
      />
      {loading ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Loading your profile…</p>
      ) : (
        <>
          {!profile && (
            <p className="mx-5 mb-4 rounded-xl bg-secondary px-4 py-3 text-sm leading-5 text-muted-foreground">
              Complete your profile to appear in discovery. Only members who meet your preferences
              will be recommended.
            </p>
          )}
          {profile && <VoiceIntroRecorder userId={userId} initialPath={profile.voice_intro_path} />}
          {profile && (
            <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Your photos</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Up to six clear photos · JPEG, PNG or WebP · 5 MB each
                  </p>
                </div>
                <Camera className="h-4 w-4 text-primary" />
              </div>
              {!!profile.photo_paths?.length && (
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                  {profile.photo_paths.map((path) => (
                    <div key={path} className="relative shrink-0">
                      <ProfilePhoto
                        name={profile.display_name}
                        path={path}
                        className="h-24 w-20 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void removePhoto(path)}
                        disabled={photosBusy}
                        aria-label="Remove profile photo"
                        className="absolute right-1 top-1 rounded-full bg-foreground/75 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(profile.photo_paths?.length ?? 0) < 6 && (
                <label className="mt-3 inline-flex h-10 cursor-pointer items-center rounded-full bg-secondary px-4 text-sm font-semibold">
                  {photosBusy ? "Saving photos…" : "Choose photos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={photosBusy}
                    onChange={(event) => {
                      void uploadPhotos(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
              {photosNotice && (
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {photosNotice}
                </p>
              )}
            </section>
          )}
          <section className="mx-5 space-y-4 rounded-2xl border border-border bg-card p-4">
            <Field label="First name">
              <input
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                className="input"
                autoComplete="given-name"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Town">
                <select value={town} onChange={(e) => setTown(e.target.value)} className="input">
                  {towns.map((place) => (
                    <option key={place}>{place}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="What kind of connection are you looking for?">
              <textarea
                rows={3}
                maxLength={400}
                value={seeking}
                onChange={(e) => setSeeking(e.target.value)}
                className="input resize-none"
                placeholder="Tell us what matters to you in a connection…"
              />
            </Field>
            <Field label="Relationship intent">
              <select value={intent} onChange={(e) => setIntent(e.target.value)} className="input">
                <option>A relationship</option>
                <option>Something casual</option>
                <option>Friends first</option>
                <option>Still figuring it out</option>
              </select>
            </Field>
            <Field label="About you">
              <textarea
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input resize-none"
              />
            </Field>
            <Field label="Interests">
              <div className="flex flex-wrap gap-2">
                {interests.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setTags(
                          selected ? tags.filter((t) => t !== tag) : [...tags, tag].slice(0, 10),
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>
          </section>
          <section className="mx-5 mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Who you’d like to meet</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum age">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={minAge}
                  onChange={(e) => setMinAge(Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Maximum age">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Town preference">
              <select
                value={prefTown}
                onChange={(e) => setPrefTown(e.target.value)}
                className="input"
              >
                <option value="">Any town</option>
                {towns.map((place) => (
                  <option key={place}>{place}</option>
                ))}
              </select>
            </Field>
          </section>
          {roles.data?.some((role) => role === "moderator" || role === "admin") && (
            <Link
              to="/moderation"
              className="mx-5 mt-4 inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-semibold"
            >
              Review member reports
            </Link>
          )}
          <label className="mx-5 mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            I confirm I’m at least 18
          </label>
          {notice && (
            <p role="status" className="mx-5 mt-3 text-sm text-muted-foreground">
              {notice}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !adult || name.trim().length < 2 || minAge > maxAge}
            onClick={() => void save()}
            className="mx-5 mt-4 flex h-11 w-[calc(100%-2.5rem)] items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-45"
          >
            {busy ? "Saving…" : profile ? "Save profile" : "Create profile"}
          </button>
          <p className="mx-5 mt-3 text-xs text-muted-foreground">
            Your description and interests are used to rank compatible profiles. Your email and
            account ID are never shown on your profile.
          </p>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          void supabase.auth.signOut();
        }}
        className="mx-5 mt-8 text-sm font-medium text-muted-foreground"
      >
        Sign out
      </button>
    </main>
  );
}

function FirstRunOnboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [town, setTown] = useState("Windhoek");
  const [intent, setIntent] = useState("A relationship");
  const [seeking, setSeeking] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const createProfile = async () => {
    if (!adult || name.trim().length < 2 || age < 18 || age > 99 || !seeking.trim()) return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: name.trim(),
      age,
      town,
      intent,
      seeking: seeking.trim().slice(0, 400),
      bio: bio.trim().slice(0, 500),
      tags: tags.slice(0, 10),
    });
    setBusy(false);
    if (error) {
      setNotice("We couldn't save your profile. Check your connection and try again.");
      return;
    }
    onComplete();
  };

  const titles = [
    "A more intentional way to meet",
    "A little about you",
    "What are you looking for?",
    "Make it yours",
  ];
  const next = () => setStep((value) => Math.min(3, value + 1));

  return (
    <main className="mx-auto max-w-md px-5 pb-28 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-muted-foreground">
          Back to Discover
        </Link>
        {step > 0 && <span className="text-xs font-medium text-muted-foreground">{step} of 3</span>}
      </div>
      <div className="mb-6 flex gap-1.5" aria-label={`Onboarding step ${step + 1} of 4`}>
        {titles.map((_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{titles[step]}</h1>
      {step === 0 && (
        <>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A few thoughtful introductions, guided by what matters to you. No endless deck and no
            paywall on basic connections.
          </p>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card px-4">
            <div className="py-3">
              <p className="text-sm font-semibold">Start with shared intentions</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tell us what kind of connection feels right for you.
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm font-semibold">Respond to something real</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A prompt, a story or a voice intro gives you a better first hello.
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm font-semibold">Chat opens when interest is mutual</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A like stays private until you both choose to connect.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={next}
            className="mt-6 h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            Set up my profile
          </button>
        </>
      )}
      {step === 1 && (
        <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Keep it simple. Your exact date of birth and home address are never shown.
          </p>
          <Field label="First name">
            <input
              autoComplete="given-name"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              className="input"
              placeholder="What should people call you?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(event) => setAge(Number(event.target.value))}
                className="input"
              />
            </Field>
            <Field label="Town">
              <select
                value={town}
                onChange={(event) => setTown(event.target.value)}
                className="input"
              >
                {towns.map((place) => (
                  <option key={place}>{place}</option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={adult}
              onChange={(event) => setAdult(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            I confirm I’m at least 18
          </label>
          <button
            type="button"
            disabled={name.trim().length < 2 || age < 18 || age > 99 || !adult}
            onClick={next}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            Continue
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-4">
          <Field label="What feels right right now?">
            <div className="space-y-2">
              {["A relationship", "Something casual", "Friends first", "Still figuring it out"].map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={intent === option}
                    onClick={() => setIntent(option)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm ${intent === option ? "border-primary bg-primary/5 font-semibold" : "border-border"}`}
                  >
                    {option}
                    {intent === option && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ),
              )}
            </div>
          </Field>
          <Field label="What matters to you in a connection?">
            <textarea
              rows={4}
              maxLength={400}
              value={seeking}
              onChange={(event) => setSeeking(event.target.value)}
              className="input resize-none"
              placeholder="Values, pace, lifestyle, or the kind of relationship you hope to build…"
            />
          </Field>
          <button
            type="button"
            disabled={!seeking.trim()}
            onClick={next}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            Continue
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-4">
          <Field label="A little about you">
            <textarea
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="input resize-none"
              placeholder="What would you like someone to know?"
            />
          </Field>
          <Field label="Pick a few interests">
            <div className="flex flex-wrap gap-2">
              {interests.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setTags(
                        selected
                          ? tags.filter((item) => item !== tag)
                          : [...tags, tag].slice(0, 10),
                      )
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-medium ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Field>
          {notice && (
            <p role="alert" className="text-sm text-destructive">
              {notice}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createProfile()}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            {busy ? "Creating profile…" : "Create my profile"}
          </button>
          <p className="text-center text-[11px] leading-4 text-muted-foreground">
            You can add photos and a voice intro, and change your preferences, anytime.
          </p>
        </div>
      )}
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((value) => value - 1)}
          className="mt-4 w-full py-2 text-sm font-medium text-muted-foreground"
        >
          Back
        </button>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
