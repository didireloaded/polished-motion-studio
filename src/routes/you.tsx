import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Bell,
  BadgeCheck,
  Camera,
  Check,
  Heart,
  Mic,
  MessagesSquare,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Square,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { interests, towns } from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { Link } from "@tanstack/react-router";
import { useSession, useMyProfile } from "@/hooks/use-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto } from "@/components/community";
import { VoiceIntroPlayer, VoiceIntroRecorder } from "@/components/voice-intro";
import { namibianPrompts, triggerHaptic } from "@/lib/icebreakers";
import { sendWelcomeEmail } from "@/lib/email.functions";
import { captureProductEvent } from "@/lib/telemetry";
import { compressProfilePhoto, extensionForMimeType } from "@/lib/photo-compression";
import { DeleteAccount } from "@/components/DeleteAccount";

const choices = [
  { id: "weekend", prompt: "A free Saturday", options: ["A road trip", "A slow morning"] },
  { id: "evening", prompt: "An evening out", options: ["Live music", "Dinner for two"] },
  { id: "coffee", prompt: "My coffee order", options: ["Flat white", "Iced coffee"] },
];

function AccountMenuRow({
  label,
  detail,
  icon: Icon,
  to,
  onClick,
}: {
  label: string;
  detail: string;
  icon: typeof Bell;
  to?: "/notifications" | "/verification" | "/safety";
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{label}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{detail}</span>
      </span>
      <span className="text-xl text-muted-foreground">›</span>
    </>
  );
  const className =
    "flex min-h-[68px] w-full items-center gap-3 rounded-[18px] border border-border bg-white px-3.5 text-left";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [
      { title: "You — Mutal" },
      { name: "description", content: "Edit your Mutal profile and stories." },
      { property: "og:title", content: "You — Mutal" },
    ],
  }),
  component: You,
});

function You() {
  const { user, ready } = useSession();
  const profile = useMyProfile(user?.id);
  if (!ready || !user) {
    return (
      <main className="mx-auto max-w-md pb-28">
        <PageHeader title="You" />
        <YouProfileSkeleton label="Loading your account…" />
      </main>
    );
  }
  return (
    <>
      <LiveProfile
        key={user.id}
        userId={user.id}
        profile={profile.data ?? null}
        loading={profile.isLoading}
      />
      <DeleteAccount userId={user.id} />
    </>
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
  const verification = useQuery({
    queryKey: ["selfie-verification", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("selfie_verifications")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
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
  const [editing, setEditing] = useState(false);

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
    for (const rawFile of files) {
      const file = await compressProfilePhoto(rawFile);
      const extension = extensionForMimeType(file.type);
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
    <main className="mx-auto max-w-md pb-6">
      <PageHeader title="You" />
      {loading ? (
        <YouProfileSkeleton label="Loading your profile…" />
      ) : (
        <>
          {profile && !editing && (
            <>
              <section className="mx-4 mt-4 rounded-[22px] border border-border bg-white px-5 py-5 text-center">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit profile"
                  className="relative mx-auto block"
                >
                  {profile.photo_paths?.[0] ? (
                    <ProfilePhoto
                      name={profile.display_name}
                      path={profile.photo_paths[0]}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-[42px] font-semibold text-white">
                      {profile.display_name.slice(0, 1)}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-foreground p-1.5 text-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                </button>
                <h2 className="mt-3 text-[22px] font-semibold">{profile.display_name}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {profile.town} · {profile.age} · {profile.intent}
                </p>
                {verification.data?.status === "approved" && (
                  <p className="mt-2 text-xs font-medium text-primary">Selfie verified</p>
                )}
              </section>
              <div className="mx-4 mt-5 space-y-2.5">
                <AccountMenuRow
                  label="Notifications"
                  detail="Your latest alerts"
                  icon={Bell}
                  to="/notifications"
                />
                <AccountMenuRow
                  label="Saved"
                  detail="Posts and profiles you keep"
                  icon={Bookmark}
                  onClick={() => setEditing(true)}
                />
                <AccountMenuRow
                  label="Photo verification"
                  detail="Submit a private selfie for review"
                  icon={BadgeCheck}
                  to="/verification"
                />
                <AccountMenuRow
                  label="Safety & privacy"
                  detail="What protects you"
                  icon={ShieldCheck}
                  to="/safety"
                />
                <AccountMenuRow
                  label="Edit profile"
                  detail="Photos, bio, interests, voice intro"
                  icon={UserRound}
                  onClick={() => setEditing(true)}
                />
              </div>
            </>
          )}
          {profile && editing && (
            <div className="mx-5 mb-3 overflow-hidden rounded-[20px] border border-border bg-white">
              {profile.photo_paths?.[0] ? (
                <ProfilePhoto
                  name={profile.display_name}
                  path={profile.photo_paths[0]}
                  className="h-[155px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[155px] items-center justify-center bg-accent text-5xl font-semibold text-primary">
                  {profile.display_name.slice(0, 1)}
                </div>
              )}
              <div className="p-3">
                <p className="text-[17px] font-semibold">
                  {profile.display_name} <span className="text-sm font-normal">{profile.age}</span>
                  {verification.data?.status === "approved" && (
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-blue-700">
                      Selfie verified
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{profile.town}</p>
                <p className="mt-2 text-xs leading-5">{profile.bio}</p>
                <p className="mt-2 text-xs font-medium text-primary">{profile.intent}</p>
                {!!profile.photo_paths?.length && (
                  <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
                    {profile.photo_paths.map((path) => (
                      <ProfilePhoto
                        key={path}
                        name={profile.display_name}
                        path={path}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}
                {profile.voice_intro_path ? (
                  <div className="mt-3">
                    <VoiceIntroPlayer path={profile.voice_intro_path} />
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Add a voice intro so people can hear your hello.
                  </p>
                )}
              </div>
            </div>
          )}
          {profile && editing && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="mx-5 mb-3 flex items-center gap-2 text-xs font-semibold text-primary"
            >
              <Pencil className="h-4 w-4" />
              {editing ? "Done editing" : "Edit profile"}
            </button>
          )}
          {profile && editing && (
            <div className="mx-5 mb-5 flex gap-2">
              <Link
                to="/safety"
                className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-center text-xs font-semibold"
              >
                Safety settings
              </Link>
              <Link
                to="/verification"
                className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-center text-xs font-semibold"
              >
                Verification
              </Link>
            </div>
          )}
          {profile && editing && (
            <Link
              to="/notifications"
              className="mx-5 mb-5 flex justify-center rounded-full bg-secondary px-4 py-2.5 text-center text-xs font-semibold"
            >
              Notifications
            </Link>
          )}
          {!profile && (
            <p className="mx-5 mb-4 rounded-xl bg-secondary px-4 py-3 text-sm leading-5 text-muted-foreground">
              Complete your profile to appear in discovery. Only members who meet your preferences
              will be recommended.
            </p>
          )}
          {editing && (
            <>
              <VoiceIntroRecorder userId={userId} initialPath={profile!.voice_intro_path} />
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
                    <select
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      className="input"
                    >
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
                  <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    className="input"
                  >
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
                              selected
                                ? tags.filter((t) => t !== tag)
                                : [...tags, tag].slice(0, 10),
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
  const [birthDate, setBirthDate] = useState("");
  const [town, setTown] = useState("Windhoek");
  const [intent, setIntent] = useState("A relationship");
  const [seeking, setSeeking] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [minAge, setMinAge] = useState(24);
  const [maxAge, setMaxAge] = useState(36);
  const [prefTown, setPrefTown] = useState("Windhoek");
  const [adult, setAdult] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const titles = [
    "Let’s get to know you",
    "What are you looking for?",
    "Add your photos",
    "Add a voice intro",
  ];
  const saveBasics = async () => {
    if (name.trim().length < 2 || !birthDate || age < 18 || age > 99 || !adult || minAge > maxAge)
      return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: name.trim(),
      age,
      town,
      intent,
      seeking: seeking.trim().slice(0, 400) || intent,
      bio: bio.trim().slice(0, 500),
      tags: tags.slice(0, 10),
      pref_min_age: minAge,
      pref_max_age: maxAge,
      pref_town: prefTown,
    });
    setBusy(false);
    if (error) setNotice("We couldn't save your details. Please try again.");
    else setStep(2);
  };
  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    if (photos.length + files.length > 6) {
      setNotice("You can add up to six photos.");
      return;
    }
    const selected = Array.from(files);
    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setNotice("Choose JPG, PNG or WebP photos under 5 MB each.");
      return;
    }
    setBusy(true);
    setNotice("");
    const uploaded: string[] = [];
    for (const rawFile of selected) {
      const file = await compressProfilePhoto(rawFile);
      const extension = extensionForMimeType(file.type);
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { contentType: file.type });
      if (error) {
        await supabase.storage.from("profile-photos").remove(uploaded);
        setNotice("A photo couldn't upload. Please try again.");
        setBusy(false);
        return;
      }
      uploaded.push(path);
    }
    const next = [...photos, ...uploaded];
    const { error } = await supabase
      .from("profiles")
      .update({ photo_paths: next })
      .eq("id", userId);
    if (error) {
      await supabase.storage.from("profile-photos").remove(uploaded);
      setNotice("Photos couldn't be saved to your profile.");
    } else setPhotos(next);
    setBusy(false);
  };
  const removePhoto = async (path: string) => {
    const next = photos.filter((item) => item !== path);
    const { error } = await supabase
      .from("profiles")
      .update({ photo_paths: next })
      .eq("id", userId);
    if (error) {
      setNotice("We couldn't remove that photo.");
      return;
    }
    setPhotos(next);
    await supabase.storage.from("profile-photos").remove([path]);
  };
  return (
    <main className="onboarding-flow mx-auto flex min-h-svh max-w-md flex-col bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
          className="text-sm text-muted-foreground disabled:opacity-40"
        >
          ‹ Back
        </button>
        <span className="text-xs text-muted-foreground">{step + 1} of 4</span>
      </header>
      <div className="mt-4 flex gap-1.5" aria-label={`Onboarding step ${step + 1} of 4`}>
        {titles.map((title, index) => (
          <span
            key={title}
            className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>
      <h1 className="mt-7 text-[22px] font-semibold tracking-[-0.02em]">{titles[step]}</h1>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {
          [
            "A few basics to help you find the right people in Namibia. Your town is shown, never your exact location.",
            "Likes become chats when they're mutual. Replies to posts stay private between you and the author.",
            "Choose a clear cover photo and show a bit of your life.",
            "Record 20–30 seconds about yourself. It helps you stand out and feel more real.",
          ][step]
        }
      </p>
      {step === 0 && (
        <div className="mt-7 space-y-5">
          <Field label="First name">
            <input
              className="input"
              autoComplete="given-name"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name"
            />
          </Field>
          <Field label="Birth date">
            <input
              className="input"
              type="date"
              autoComplete="bday"
              value={birthDate}
              max={new Date(
                new Date().getFullYear() - 18,
                new Date().getMonth(),
                new Date().getDate(),
              )
                .toISOString()
                .slice(0, 10)}
              onChange={(e) => {
                const value = e.target.value;
                setBirthDate(value);
                if (value) {
                  const today = new Date();
                  const born = new Date(`${value}T12:00:00`);
                  const years =
                    today.getFullYear() -
                    born.getFullYear() -
                    (today.getMonth() < born.getMonth() ||
                    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())
                      ? 1
                      : 0);
                  setAge(years);
                }
              }}
            />
          </Field>
          <Field label="Town">
            <select
              className="input"
              value={town}
              onChange={(e) => {
                setTown(e.target.value);
                setPrefTown(e.target.value);
              }}
            >
              {towns.map((place) => (
                <option key={place}>{place}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
              className="accent-primary"
            />{" "}
            I confirm I’m at least 18
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            {["A relationship", "Friends first", "Something casual", "Still figuring it out"].map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={intent === option}
                  onClick={() => setIntent(option)}
                  className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm ${intent === option ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
                >
                  {option}
                  <span
                    className={`h-4 w-4 rounded-full border ${intent === option ? "border-[5px] border-primary" : "border-muted-foreground"}`}
                  />
                </button>
              ),
            )}
          </div>
          <Field label={`Preferred age range · ${minAge}–${maxAge}`}>
            <div className="flex gap-3">
              <input
                aria-label="Minimum preferred age"
                type="range"
                min={18}
                max={maxAge}
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-1/2 accent-primary"
              />
              <input
                aria-label="Maximum preferred age"
                type="range"
                min={minAge}
                max={99}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-1/2 accent-primary"
              />
            </div>
          </Field>
          <Field label="Preferred town">
            <select
              className="input"
              value={prefTown}
              onChange={(e) => setPrefTown(e.target.value)}
            >
              {towns.map((place) => (
                <option key={place}>{place}</option>
              ))}
            </select>
          </Field>
          <Field label="What matters to you in a connection?">
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={400}
              value={seeking}
              onChange={(e) => setSeeking(e.target.value)}
              placeholder="Tell us in your own words…"
            />
          </Field>
          <Field label="A little about you">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {namibianPrompts.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() =>
                    setBio((current) =>
                      current.includes(prompt)
                        ? current
                        : `${current ? `${current.trim()} ` : ""}${prompt}: `,
                    )
                  }
                  className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  + {prompt}
                </button>
              ))}
            </div>
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Your days, your people, what makes you you…"
            />
          </Field>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Interests · choose up to 10
            </p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={tags.includes(interest)}
                  onClick={() =>
                    setTags((current) =>
                      current.includes(interest)
                        ? current.filter((tag) => tag !== interest)
                        : [...current, interest].slice(0, 10),
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs ${tags.includes(interest) ? "border-primary bg-accent text-primary" : "border-border"}`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((path) => (
              <div
                key={path}
                className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary"
              >
                <ProfilePhoto name={name} path={path} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => void removePhoto(path)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                <span className="text-2xl">+</span>Add photo
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => void uploadPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Use clear, recent photos of yourself. Your first photo becomes your cover.
          </p>
        </div>
      )}
      {step === 3 && (
        <div className="mt-8">
          <VoiceIntroRecorder userId={userId} initialPath={null} />
        </div>
      )}
      {notice && (
        <p role="alert" className="mt-4 text-xs text-destructive">
          {notice}
        </p>
      )}
      <div className="mt-auto pt-8">
        <button
          type="button"
          disabled={
            busy ||
            (step === 0 && (name.trim().length < 2 || !birthDate || age < 18 || age > 99 || !adult))
          }
          onClick={() => {
            if (step === 0) {
              setStep(1);
            } else if (step === 1) {
              void saveBasics();
            } else if (step === 2) {
              setStep(3);
            } else {
              triggerHaptic("match");
              void captureProductEvent("profile_completed");
              void sendWelcomeEmail({
                data: { displayName: name.trim(), town },
              }).catch(() => undefined);
              onComplete();
            }
          }}
          className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : step === 3 ? "Finish setup" : "Continue"}
        </button>
        {step >= 2 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {step === 2 ? "You can add photos later." : "You can add a voice intro later."}
          </p>
        )}
      </div>
    </main>
  );
}

function YouProfileSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-5 space-y-3" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="overflow-hidden rounded-[15px] border border-border bg-white shadow-float">
        <div className="h-[155px] w-full animate-pulse bg-secondary" />
        <div className="space-y-2.5 p-3">
          <div className="h-5 w-36 animate-pulse rounded-full bg-secondary" />
          <div className="h-3.5 w-24 animate-pulse rounded-full bg-secondary/80" />
          <div className="h-3.5 w-full animate-pulse rounded-full bg-secondary/70" />
          <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-secondary/60" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
        <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
      </div>
    </div>
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
