"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Coffee,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Mic,
  Mountain,
  Pause,
  Play,
  ShieldCheck,
  Sun,
  Trash2,
  Waves,
  X,
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
type PersonActions = {
  state: State;
  busy: boolean;
  open: (p: Person) => void;
  like: (p: Person) => void;
};

export function Discover({
  state,
  busy,
  visible,
  open,
  like,
  act,
  category,
  setCategory,
  town,
  setTown,
}: PersonActions & {
  visible: Person[];
  act: Act;
  category: string;
  setCategory: (value: string) => void;
  town: string;
  setTown: (value: string) => void;
}) {
  const featured = visible[0];
  const rest = visible.slice(1);
  return (
    <>
      <div className="mood-filters" aria-label="Discover categories">
        {[
          "For you",
          "Windhoek",
          "Swakopmund",
          "Road trips",
          "Live music",
          "Coffee",
        ].map((value) => {
          const isTown = towns.includes(value as (typeof towns)[number]);
          const active = isTown
            ? town === value
            : category === value && town === "All Namibia";
          return (
            <button
              key={value}
              aria-pressed={active}
              className={active ? "selected" : ""}
              onClick={() => {
                setTown(isTown ? value : "All Namibia");
                setCategory(isTown ? "For you" : value);
              }}
            >
              {value === "For you" ? (
                <Compass size={14} />
              ) : isTown ? (
                <MapPin size={13} />
              ) : null}
              {value}
            </button>
          );
        })}
      </div>
      {featured ? (
        <>
          <div className="editorial-label">
            <span>YOUR FEATURED STORY</span>
            <span>TAKE A CLOSER LOOK</span>
          </div>
          <article className="feature-card">
            <button
              className="feature-image"
              onClick={() => open(featured)}
              aria-label={`Read ${featured.name}’s story`}
            >
              <img
                src={portrait(featured, state.lowData)}
                alt={`${featured.name}, illustrative profile`}
                style={{ objectPosition: featured.position }}
              />
              <div className="feature-shade" />
              <span className="feature-location">
                <MapPin size={13} />
                {featured.town}
              </span>
              <div className="feature-copy">
                <span className="feature-job">{featured.job}</span>
                <h2>
                  {featured.name}, {featured.age}
                </h2>
                <p>{featured.intent}</p>
                <div className="feature-tags">
                  {featured.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </button>
            <div className="feature-actions">
              <button
                className="round-action"
                onClick={() => open(featured)}
                aria-label={`Read more about ${featured.name}`}
              >
                <ArrowUpRight size={21} />
              </button>
              <span>More than a first impression.</span>
              <button
                className={
                  "primary connect " +
                  (state.likes.includes(featured.id) ? "saved" : "")
                }
                disabled={busy}
                onClick={() => like(featured)}
                aria-pressed={state.likes.includes(featured.id)}
              >
                <Heart
                  size={18}
                  fill={
                    state.likes.includes(featured.id) ? "currentColor" : "none"
                  }
                />
                {state.likes.includes(featured.id) ? "Liked" : "Connect"}
              </button>
            </div>
          </article>
          <section className="namlink-note">
            <div>
              <span className="eyebrow">THE NAMLINK WAY</span>
              <h2>People, not a deck.</h2>
              <p>
                Read their story. Notice the little things. There’s no next
                swipe waiting for you.
              </p>
            </div>
            <span aria-hidden="true">↗</span>
          </section>
          <section className="daily-prompt">
            <div className="editorial-label">
              <span>A LITTLE YOU</span>
              <span>THIS OR THAT</span>
            </div>
            <h2>
              Sunrise in the dunes
              <br />
              or sunset by the sea?
            </h2>
            <p>A good place to find common ground.</p>
            <div className="photo-choices">
              {[
                {
                  value: "Sunrise in the dunes",
                  image: "dunes",
                  label: "Sossusvlei dunes",
                  sub: "The quiet before the day",
                },
                {
                  value: "Sunset by the sea",
                  image: "coast",
                  label: "Swakopmund jetty",
                  sub: "A little salt in the air",
                },
              ].map((c) => (
                <button
                  key={c.value}
                  disabled={busy}
                  aria-pressed={state.quiz.weekend === c.value}
                  className={state.quiz.weekend === c.value ? "chosen" : ""}
                  onClick={() =>
                    act(
                      { type: "quiz", key: "weekend", value: c.value },
                      "Your choice is saved.",
                    )
                  }
                >
                  <img
                    src={`/editorial/${c.image}.jpg`}
                    alt=""
                    loading="lazy"
                  />
                  <div>
                    <b>{c.label}</b>
                    <span>{c.sub}</span>
                  </div>
                  <i>
                    {state.quiz.weekend === c.value ? (
                      <Check size={15} />
                    ) : (
                      <PlusMark />
                    )}
                  </i>
                </button>
              ))}
            </div>
          </section>
          {rest.length > 0 && (
            <>
              <div className="browse-heading">
                <div>
                  <span className="eyebrow">
                    DIFFERENT STORIES. SHARED GROUND.
                  </span>
                  <h2>
                    {town === "All Namibia"
                      ? "Across Namibia"
                      : `Around ${town}`}
                  </h2>
                </div>
                <span>{rest.length} stories</span>
              </div>
              <div className="story-grid">
                {rest.map((p) => (
                  <article className="story-card" key={p.id}>
                    <button
                      className="story-image"
                      aria-label={`Meet ${p.name}, ${p.age}`}
                      onClick={() => open(p)}
                    >
                      <img
                        src={portrait(p, state.lowData)}
                        alt={`${p.name}, illustrative profile`}
                        loading="lazy"
                        style={{ objectPosition: p.position }}
                      />
                      <span className="story-town">{p.town}</span>
                      <div>
                        <h3>
                          {p.name}, {p.age}
                        </h3>
                        <p>{p.job}</p>
                      </div>
                    </button>
                    <button
                      className={
                        "story-heart " +
                        (state.likes.includes(p.id) ? "liked" : "")
                      }
                      disabled={busy}
                      aria-label={`${state.likes.includes(p.id) ? "Unlike" : "Like"} ${p.name}`}
                      aria-pressed={state.likes.includes(p.id)}
                      onClick={() => like(p)}
                    >
                      <Heart
                        size={18}
                        fill={
                          state.likes.includes(p.id) ? "currentColor" : "none"
                        }
                      />
                    </button>
                    <div className="story-footer">
                      <div>
                        {p.tags.slice(0, 2).map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <button onClick={() => open(p)}>
                        Read story
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <div className="rooted-banner">
            <Mountain size={26} strokeWidth={1.4} />
            <span className="eyebrow">ROOTED RIGHT HERE</span>
            <h2>Big country. Closer connections.</h2>
            <p>
              From Windhoek’s city rhythm to the quiet of the coast. Meet
              someone who feels like home.
            </p>
            <div>
              <span>
                <Compass size={14} />
                No endless swiping
              </span>
              <span>
                <Heart size={14} />
                No paywalls
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Compass size={32} />
          <h2>A little further afield?</h2>
          <p>
            No sample profiles match these filters. Try another town or give
            your filters more room.
          </p>
        </div>
      )}
      <div className="end-note">
        No swipes. No rush. Just a little possibility.
        <small>
          Development preview · Fictional profiles & illustrative imagery
        </small>
      </div>
    </>
  );
}
function PlusMark() {
  return <span aria-hidden="true">+</span>;
}

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
  const [view, setView] = useState<"radar" | "list">("radar");
  const [focus, setFocus] = useState<string | null>(null);
  const focused = visible.find((p) => p.id === focus) ?? visible[0];
  return (
    <>
      <div className="view-controls">
        <div className="segmented">
          <button
            className={view === "radar" ? "selected" : ""}
            onClick={() => setView("radar")}
          >
            <Compass size={16} />
            Town radar
          </button>
          <button
            className={view === "list" ? "selected" : ""}
            onClick={() => setView("list")}
          >
            <MapPin size={16} />
            List
          </button>
        </div>
        <span className="sample-label">ILLUSTRATIVE</span>
      </div>
      <div className="mood-filters">
        {["All Namibia", ...towns].map((t) => (
          <button
            className={town === t ? "selected" : ""}
            key={t}
            onClick={() => {
              setTown(t);
              setFocus(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {view === "radar" && (
        <div className="town-radar">
          <div className="radar-rings" aria-hidden="true">
            <i />
            <i />
            <i />
            <span />
          </div>
          <span className="radar-town">
            {town === "All Namibia" ? "NAMIBIA" : town.toUpperCase()}
          </span>
          {visible.slice(0, 5).map((p, i) => (
            <button
              key={p.id}
              className={
                "radar-person position-" +
                i +
                (focused?.id === p.id ? " focused" : "")
              }
              onClick={() => setFocus(p.id)}
              aria-label={`Select ${p.name}, ${p.town}`}
              aria-pressed={focused?.id === p.id}
            >
              <img src={portrait(p, true)} alt="" />
              <span>{p.name}</span>
            </button>
          ))}
          <div className="radar-caption">
            <ShieldCheck size={13} />
            Layout is illustrative. No live GPS or distance data.
          </div>
        </div>
      )}
      {view === "radar" && focused && (
        <button className="radar-selected" onClick={() => open(focused)}>
          <img src={portrait(focused, true)} alt={focused.name} />
          <div>
            <span className="eyebrow">
              A STORY IN {focused.town.toUpperCase()}
            </span>
            <h3>
              {focused.name}, {focused.age}
            </h3>
            <p>{focused.job}</p>
          </div>
          <ArrowUpRight size={20} />
        </button>
      )}
      <div className="browse-heading">
        <div>
          <span className="eyebrow">START IN YOUR CORNER</span>
          <h2>{town === "All Namibia" ? "People & places" : town}</h2>
        </div>
        <span>{visible.length} sample profiles</span>
      </div>
      <div className="nearby-list">
        {visible.map((p) => (
          <button key={p.id} onClick={() => open(p)}>
            <img
              className="avatar"
              width={66}
              height={66}
              src={portrait(p, state.lowData)}
              alt={p.name}
            />
            <div>
              <h3>
                {p.name}, {p.age}
              </h3>
              <p>
                <MapPin size={12} />
                {p.town} · {p.tags[0]}
              </p>
            </div>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state">
          <MapPin size={30} />
          <h2>No stories here yet.</h2>
          <p>Choose another town or adjust your filters.</p>
        </div>
      )}
      <p className="privacy-note">
        <ShieldCheck size={16} />
        We only use the town you select. Crossed paths and precise location
        tracking are not enabled.
      </p>
    </>
  );
}

export function Connections({
  state,
  busy,
  open,
  like,
  matches,
  chat,
  view,
  setView,
}: {
  state: State;
  busy: boolean;
  open: (p: Person) => void;
  like: (p: Person) => void;
  matches: Person[];
  chat: (p: Person) => void;
  view: string;
  setView: (v: string) => void;
}) {
  const liked = people.filter(
    (p) => state.likes.includes(p.id) && !state.blocked.includes(p.id),
  );
  const shown = view === "Liked" ? liked : matches;
  return (
    <>
      <div className="connection-summary">
        <button
          className={view === "Sample matches" ? "selected" : ""}
          onClick={() => setView("Sample matches")}
        >
          <MessageCircle size={19} />
          <b>{matches.length}</b>
          <span>Sample connections</span>
        </button>
        <button
          className={view === "Liked" ? "selected" : ""}
          onClick={() => setView("Liked")}
        >
          <Heart size={19} />
          <b>{liked.length}</b>
          <span>People you liked</span>
        </button>
      </div>
      <div className="browse-heading">
        <div>
          <span className="eyebrow">SEE WHERE IT GOES</span>
          <h2>
            {view === "Liked" ? "A little interest." : "Start a conversation."}
          </h2>
        </div>
      </div>
      <div className="spark-list">
        {shown.map((p) => (
          <article key={p.id}>
            <button className="spark-image" onClick={() => open(p)}>
              <img src={portrait(p, state.lowData)} alt={p.name} />
            </button>
            <div className="spark-copy">
              <span className="eyebrow">{p.town.toUpperCase()}</span>
              <button className="spark-name" onClick={() => open(p)}>
                <h3>
                  {p.name}, {p.age}
                </h3>
                <ArrowUpRight size={17} />
              </button>
              <p>{p.job}</p>
              <div className="spark-prompt">
                <span>{p.prompt}</span>
                <p>“{p.answer}”</p>
              </div>
              {view === "Liked" ? (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => like(p)}
                >
                  <Heart size={15} fill="currentColor" />
                  Remove like
                </button>
              ) : (
                <button className="primary" onClick={() => chat(p)}>
                  <MessageCircle size={16} />
                  Try conversation
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!shown.length && (
        <div className="empty-state">
          <Heart size={32} />
          <h2>Someone will catch your eye.</h2>
          <p>
            Tap Connect or a heart on Discover. Your likes will be saved here.
          </p>
        </div>
      )}
      <p className="privacy-note">
        These are sample profiles. Likes don’t create a real match, and sample
        messages don’t contact anyone.
      </p>
    </>
  );
}

const questions = [
  {
    key: "weekend",
    label: "Your kind of golden hour?",
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
    label: "How does the weekend begin?",
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
    label: "A little room to explore?",
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
      <p className="muted">
        No scores. No right answers. Just a few things you might have in common.
      </p>
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
      <div className="welcome-image">
        <img
          src="/editorial/welcome.jpg"
          alt="Illustration of a couple looking across the Namibian dunes"
        />
        <div className="welcome-wordmark">
          namlink<span>.</span>
        </div>
        <span className="welcome-caption">
          MADE FOR THE PLACE WE CALL HOME.
        </span>
      </div>
      <div className="welcome-content">
        <span className="eyebrow">ROOTED IN NAMIBIA</span>
        <h2>
          People,
          <br />
          not a deck.
        </h2>
        <p>
          There’s more to a connection than a quick glance. Start with a story,
          a shared place, a little curiosity.
        </p>
        <div className="welcome-values">
          <span>
            <MapPin size={16} />
            Namibia only
          </span>
          <span>
            <Heart size={16} />
            Always free
          </span>
          <span>
            <MessageCircle size={16} />
            Story first
          </span>
        </div>
        <button className="primary full" onClick={start}>
          Start your story
          <ArrowRight size={18} />
        </button>
        <button className="browse-preview" onClick={browse}>
          Explore the preview first
          <ArrowUpRight size={15} />
        </button>
        {!signIn && (
          <a
            className="welcome-signin"
            href="/signin-with-chatgpt?return_to=/"
            target="_top"
          >
            Already started? Sign in with ChatGPT
          </a>
        )}
        <small>18+ · Development preview · Illustrative profiles</small>
      </div>
    </div>
  );
}

export function VerificationInfo() {
  return (
    <div className="verification-info">
      <div className="verification-symbol">
        <ShieldCheck size={42} strokeWidth={1.25} />
      </div>
      <span className="eyebrow">TRUST TAKES MORE THAN A BADGE</span>
      <h2>
        A real connection
        <br />
        starts with trust.
      </h2>
      <p>
        Selfie verification is planned. It isn’t available in this preview, and
        no profile shown here is verified.
      </p>
      <div className="verification-status">
        <CameraMark />
        <div>
          <b>No selfie needed today.</b>
          <p>
            We won’t request camera access or collect biometric information.
          </p>
        </div>
        <span>PLANNED</span>
      </div>
      <div className="verification-status">
        <ShieldCheck size={23} />
        <div>
          <b>You stay in control.</b>
          <p>
            Keep personal details private, meet in public, and report anything
            that feels wrong.
          </p>
        </div>
      </div>
      <p className="privacy-note">
        A verification badge should describe a completed check. It can never
        guarantee someone’s intentions or your safety.
      </p>
    </div>
  );
}
function CameraMark() {
  return <UserShape />;
}
function UserShape() {
  return <span className="selfie-outline" aria-hidden="true" />;
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
      <h3>“My perfect Sunday sounds like…”</h3>
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
              : "A little more you."}
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
            {status === "ready" ? "Record again" : "Try recording"}
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
  const steps = [
    "Roots & intent",
    "Common ground",
    "Your story",
    "A safer beginning",
  ];
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
        "Your story is saved. Welcome to NamLink.",
      )
    )
      close();
  }
  return (
    <div className="onboarding-flow">
      <div className="step-header">
        <span>STEP {step + 1} OF 4</span>
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
          <span className="eyebrow">YOUR ROOTS & INTENT</span>
          <h2>
            Where is home
            <br />
            in Namibia?
          </h2>
          <p className="muted">
            City rhythm or coastal breeze. Start where you are.
          </p>
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
            Find common ground
            <ArrowRight size={17} />
          </button>
        </form>
      ) : step === 1 ? (
        <div className="setup-step">
          <h2>
            Find your
            <br />
            common ground.
          </h2>
          <ThisOrThat state={state} busy={busy} act={act} />
          <div className="step-actions">
            <button className="secondary" onClick={() => setStep(0)}>
              <ArrowLeft size={17} />
              Back
            </button>
            <button className="primary" onClick={() => setStep(2)}>
              Your story
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : step === 2 ? (
        <div className="setup-step">
          <span className="eyebrow">MORE THAN A PHOTO</span>
          <h2>
            Let a little
            <br />
            personality through.
          </h2>
          <VoicePreview />
          <label>
            A little about you
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
            A few of your favourite things <small>(up to 8)</small>
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
            <button className="secondary" onClick={() => setStep(1)}>
              <ArrowLeft size={17} />
              Back
            </button>
            <button className="primary" onClick={() => setStep(3)}>
              One last thing
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="setup-step">
          <VerificationInfo />
          <div className="step-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setStep(2)}
            >
              <ArrowLeft size={17} />
              Back
            </button>
            <button className="primary" disabled={busy} onClick={finish}>
              {busy ? "Saving…" : "Save & explore"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
