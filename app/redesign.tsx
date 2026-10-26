"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coffee,
  Compass,
  Heart,
  Mic,
  Mountain,
  Pause,
  Sun,
  Trash2,
  Waves,
} from "lucide-react";
import {
  interests,
  people,
  towns,
  type Action,
  type Person,
  type State,
} from "../lib/model";

export const portrait = (person: Person, lowData = false) =>
  `/editorial/${person.photo}${lowData ? "-small" : ""}.jpg`;
type Act = (action: Action, success?: string) => Promise<boolean>;

export function Nearby({
  state,
  visible,
  open,
  town,
  setTown,
}: {
  state: State;
  visible: Person[];
  open: (p: Person) => void;
  town: string;
  setTown: (t: string) => void;
}) {
  return (
    <>
      <label className="native-picker">
        Town
        <select value={town} onChange={(e) => setTown(e.target.value)}>
          {["All Namibia", ...towns].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <div className="people-list">
        {visible.map((p) => (
          <button className="native-person" key={p.id} onClick={() => open(p)}>
            <img src={portrait(p, state.lowData)} alt={p.name} />
            <div>
              <h3>
                {p.name}, {p.age}
              </h3>
              <p>{p.town}</p>
            </div>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state">
          <h2>No profiles here yet</h2>
          <p>Choose another town or adjust your filters.</p>
        </div>
      )}
      <p className="screen-footnote">
        Browsing by town. Your precise location is never requested.
      </p>
    </>
  );
}

export function Connections({
  state,
  busy,
  open,
  like,
  save,
  matches,
  chat,
  view,
  setView,
}: {
  state: State;
  busy: boolean;
  open: (p: Person) => void;
  like: (p: Person) => void;
  save: (p: Person) => void;
  matches: Person[];
  chat: (p: Person) => void;
  view: string;
  setView: (v: string) => void;
}) {
  const liked = people.filter(
    (p) => state.likes.includes(p.id) && !state.blocked.includes(p.id),
  );
  const saved = people.filter((p) => (state.saved ?? []).includes(p.id) && !state.blocked.includes(p.id));
  const shown = view === "Liked" ? liked : view === "Saved" ? saved : matches;
  return (
    <>
      <div className="segmented">
        <button className={view === "Saved" ? "selected" : ""} aria-pressed={view === "Saved"} onClick={() => setView("Saved")}>Saved{saved.length > 0 ? ` (${saved.length})` : ""}</button>
        <button
          className={view === "Liked" ? "selected" : ""}
          aria-pressed={view === "Liked"}
          onClick={() => setView("Liked")}
        >
          Likes{liked.length > 0 ? ` (${liked.length})` : ""}
        </button>
        <button
          className={view === "Sample matches" ? "selected" : ""}
          aria-pressed={view === "Sample matches"}
          onClick={() => setView("Sample matches")}
        >
          Sample matches
        </button>
      </div>
      <div className="people-list">
        {shown.map((p) => (
          <div className="person-row" key={p.id}>
            <button className="person-row-open" onClick={() => open(p)}>
              <img src={portrait(p, true)} alt={p.name} />
              <div>
                <h3>
                  {p.name}, {p.age}
                </h3>
                <p>{p.town}</p>
              </div>
            </button>
            {view === "Saved" ? (
              <button className="plain-action" onClick={() => save(p)}>Remove</button>
            ) : view === "Liked" ? (
              <button
                className="heart-control selected"
                aria-label={`Unlike ${p.name}`}
                disabled={busy}
                onClick={() => like(p)}
              >
                <Heart size={21} fill="currentColor" strokeWidth={1.5} />
              </button>
            ) : (
              <button className="plain-action" onClick={() => chat(p)}>
                Chat
              </button>
            )}
          </div>
        ))}
      </div>
      {!shown.length && (
        <div className="empty-state">
          <h2>{view === "Saved" ? "No saved profiles" : "No likes yet"}</h2>
          <p>{view === "Saved" ? "Use the star on Home to save someone for later." : "People you like will appear here."}</p>
        </div>
      )}
      <p className="screen-footnote">
        Sample matches let you try chat. No real people are contacted.
      </p>
    </>
  );
}

const questions = [
  {
    key: "weekend",
    label: "Sunrise or sunset?",
    choices: [
      {
        value: "Sunrise in the dunes",
        image: "dunes",
        sub: "Sossusvlei · a slow beginning",
      },
      {
        value: "Sunset by the sea",
        image: "coast",
        sub: "Swakopmund · Atlantic air",
      },
    ],
  },
  {
    key: "drink",
    label: "Coffee or a braai?",
    choices: [
      {
        value: "A slow coffee",
        image: "coffee",
        sub: "A favourite table. No hurry.",
      },
      {
        value: "An afternoon braai",
        image: "braai",
        sub: "Good company around a fire.",
      },
    ],
  },
  {
    key: "music",
    label: "Road trip or gallery?",
    choices: [
      { value: "A road trip", image: "road", sub: "The long way around." },
      {
        value: "A gallery stroll",
        image: "gallery",
        sub: "Something new to talk about.",
      },
    ],
  },
] as const;
export function ThisOrThat({
  state,
  busy,
  act,
}: {
  state: State;
  busy: boolean;
  act: Act;
}) {
  return (
    <div className="prompt-flow">
      <p className="muted">Choose what feels like you.</p>
      {questions.map((q, i) => (
        <section className="photo-question" key={q.key}>
          <span className="eyebrow">0{i + 1} / 03</span>
          <h3>{q.label}</h3>
          <div className="photo-choices">
            {q.choices.map((c) => (
              <button
                disabled={busy}
                key={c.value}
                className={state.quiz[q.key] === c.value ? "chosen" : ""}
                aria-pressed={state.quiz[q.key] === c.value}
                onClick={() =>
                  act({ type: "quiz", key: q.key, value: c.value })
                }
              >
                <img src={`/editorial/${c.image}.jpg`} alt="" loading="lazy" />
                <div>
                  <b>{c.value}</b>
                  <span>{c.sub}</span>
                </div>
                <i>{state.quiz[q.key] === c.value && <Check size={16} />}</i>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Welcome({
  start,
  browse,
  signIn,
}: {
  start: () => void;
  browse: () => void;
  signIn: boolean;
}) {
  return (
    <div className="welcome-screen">
      <img
        className="welcome-photo"
        src="/editorial/welcome.jpg"
        alt="Illustrative Namibian dunes at dusk"
      />
      <div className="welcome-content">
        <h2>Welcome to NamLink</h2>
        <p>Meet people in Namibia, through stories and shared interests.</p>
        <button className="primary full" onClick={start}>
          Create your profile
        </button>
        <button className="plain-action full" onClick={browse}>
          Explore the preview
        </button>
        {!signIn && (
          <a
            className="welcome-signin"
            href="/signin-with-chatgpt?return_to=/"
            target="_top"
          >
            Sign in with ChatGPT
          </a>
        )}
        <small>18+ · Development preview</small>
      </div>
    </div>
  );
}

export function VoicePreview() {
  const [status, setStatus] = useState<"idle" | "recording" | "ready">("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const blobUrl = useRef("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);
  useEffect(() => {
    if (status !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (seconds >= 18 && recorder.current?.state === "recording")
      recorder.current.stop();
  }, [seconds]);
  async function start() {
    setError("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Audio recording isn’t supported here. You can still add a written story.",
      );
      return;
    }
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        audio.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = audio;
      const r = new MediaRecorder(audio);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        audio.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = URL.createObjectURL(
          new Blob(chunks, { type: r.mimeType }),
        );
        setUrl(blobUrl.current);
        setStatus("ready");
      };
      recorder.current = r;
      setSeconds(0);
      setStatus("recording");
      r.start();
    } catch {
      setError(
        "Microphone access wasn’t available. Your written story works just as well.",
      );
    }
  }
  function clear() {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = "";
    setUrl("");
    setSeconds(0);
    setStatus("idle");
  }
  return (
    <section className="voice-preview">
      <div className="voice-top">
        <Mic size={18} />
        <span>YOUR VOICE STORY</span>
        <span>18 SEC MAX</span>
      </div>
      <h3>“My perfect Sunday…”</h3>
      {status === "ready" ? (
        <audio controls src={url} aria-label="Your voice intro preview" />
      ) : (
        <div
          className={
            "record-state " + (status === "recording" ? "recording" : "")
          }
        >
          <span className="record-dot" />
          <span>
            {status === "recording"
              ? `Recording · 0:${String(seconds).padStart(2, "0")}`
              : "Ready to record."}
          </span>
        </div>
      )}
      <div className="voice-buttons">
        {status === "recording" ? (
          <button
            className="primary"
            onClick={() => recorder.current?.stop()}
            type="button"
          >
            <Pause size={16} />
            Stop recording
          </button>
        ) : (
          <button className="secondary" type="button" onClick={start}>
            <Mic size={16} />
            {status === "ready" ? "Record again" : "Record voice intro"}
          </button>
        )}
        {status === "ready" && (
          <button
            className="icon-button"
            onClick={clear}
            type="button"
            aria-label="Delete voice recording"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>
      <p className="privacy-note">
        Optional, local playback only. Audio is not uploaded or saved to your
        profile. It is discarded when you close this screen.
      </p>
      {error && (
        <p className="record-error" role="status">
          {error}
        </p>
      )}
    </section>
  );
}

export function ProfileSetup({
  state,
  busy,
  act,
  close,
}: {
  state: State;
  busy: boolean;
  act: Act;
  close: () => void;
}) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    ...state.profile,
    intent: state.profile.intent ?? "A relationship",
  });
  const [showVoice, setShowVoice] = useState(false);
  const steps = ["About you", "Preferences", "Profile"];
  async function finish() {
    if (
      await act(
        {
          type: "profile",
          profile: {
            ...p,
            adult: true,
            town: p.town as (typeof towns)[number],
          },
        },
        "Profile saved.",
      )
    )
      close();
  }
  return (
    <div className="onboarding-flow">
      <div className="step-header">
        <span>{step + 1} of 3</span>
        <span>{steps[step]}</span>
      </div>
      <div className="step-progress">
        {steps.map((s, i) => (
          <i key={s} className={i <= step ? "complete" : ""} />
        ))}
      </div>
      {step === 0 ? (
        <form
          className="setup-step"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(1);
          }}
        >
          <span className="eyebrow">ABOUT YOU</span>
          <h2>About you</h2>
          <p className="muted">Choose your town.</p>
          <div className="form-row">
            <label>
              First name
              <input
                required
                minLength={2}
                maxLength={40}
                value={p.name}
                onChange={(e) => setP({ ...p, name: e.target.value })}
                placeholder="Your first name"
              />
            </label>
            <label>
              Age
              <input
                type="number"
                required
                min={18}
                max={100}
                value={p.age}
                onChange={(e) => setP({ ...p, age: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="town-tiles">
            {towns.map((t, i) => {
              const I = [Mountain, Waves, Waves, Sun, Mountain, Compass][i];
              return (
                <button
                  type="button"
                  aria-pressed={p.town === t}
                  className={p.town === t ? "chosen" : ""}
                  key={t}
                  onClick={() => setP({ ...p, town: t })}
                >
                  <I size={21} />
                  <b>{t}</b>
                  <small>
                    {
                      [
                        "Khomas · City pulse",
                        "Erongo · Coastal calm",
                        "Lagoon & dunes",
                        "Oshana · Northern warmth",
                        "Otjozondjupa · Open spaces",
                        "Kavango · Riverside",
                      ][i]
                    }
                  </small>
                  {p.town === t && <Check size={14} />}
                </button>
              );
            })}
          </div>
          <label>
            What brings you here?
            <select
              value={p.intent}
              onChange={(e) =>
                setP({
                  ...p,
                  intent: e.target.value as NonNullable<
                    State["profile"]["intent"]
                  >,
                })
              }
            >
              <option>A relationship</option>
              <option>Open to exploring</option>
              <option>Coffee & conversations</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              required
              type="checkbox"
              checked={p.adult}
              onChange={(e) => setP({ ...p, adult: e.target.checked })}
            />
            <span>
              I’m 18 or older and live in Namibia. I understand this is a
              development preview.
            </span>
          </label>
          <button className="primary full">
            Continue
            <ArrowRight size={17} />
          </button>
        </form>
      ) : step === 1 ? (
        <div className="setup-step">
          <h2>Your preferences</h2>
          <ThisOrThat state={state} busy={busy} act={act} />
          <div className="step-actions">
            <button className="secondary" onClick={() => setStep(0)}>
              <ArrowLeft size={17} />
              Back
            </button>
            <button className="primary" onClick={() => setStep(2)}>
              Continue
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="setup-step">
          <span className="eyebrow">MORE THAN A PHOTO</span>
          <h2>Your story</h2>
          <button
            className="plain-action"
            type="button"
            aria-expanded={showVoice}
            onClick={() => setShowVoice(!showVoice)}
          >
            {showVoice ? "Close voice intro" : "Add a voice intro"}
          </button>
          {showVoice && <VoicePreview />}
          <label>
            About you
            <textarea
              maxLength={500}
              value={p.bio}
              onChange={(e) => setP({ ...p, bio: e.target.value })}
              placeholder="The things a photo can’t say."
            />
          </label>
          <label>
            My perfect Sunday…
            <textarea
              maxLength={200}
              value={p.answer}
              onChange={(e) => setP({ ...p, answer: e.target.value })}
              placeholder="Starts with…"
            />
          </label>
          <label>
            Interests <small>(up to 8)</small>
          </label>
          <div className="interest-choices">
            {interests.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={p.tags.includes(t)}
                className={p.tags.includes(t) ? "chosen" : ""}
                onClick={() =>
                  setP({
                    ...p,
                    tags: p.tags.includes(t)
                      ? p.tags.filter((v) => v !== t)
                      : p.tags.length < 8
                        ? [...p.tags, t]
                        : p.tags,
                  })
                }
              >
                {t}
                {p.tags.includes(t) && <Check size={12} />}
              </button>
            ))}
          </div>
          <div className="step-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button className="primary" disabled={busy} onClick={finish}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
