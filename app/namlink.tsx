"use client";
import { useState, useEffect, useRef } from "react";
import {
  Compass,
  Heart,
  MessageCircle,
  UserRound,
  MapPin,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Check,
  ChevronDown,
  ShieldCheck,
  Leaf,
  Send,
  Search,
  MoreHorizontal,
  Mountain,
  Sun,
  Music,
  Camera,
  Utensils,
  Coffee,
  LogOut,
  LoaderCircle,
  Flag,
  EyeOff,
  Navigation,
} from "lucide-react";
import {
  people,
  towns,
  initialState,
  sampleMatches,
  type Person,
  type State,
  type Action,
} from "../lib/model";
import {
  Discover,
  Nearby,
  Connections,
  ProfileSetup,
  ThisOrThat,
  Welcome,
  portrait,
} from "./redesign";
type Tab = "discover" | "nearby" | "connections" | "chat" | "profile";
const nav = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "connections", label: "Connections", icon: Heart },
  { id: "chat", label: "Chats", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;
const tagIcons: Record<string, typeof Coffee> = {
  Coffee: Coffee,
  "Road trips": Navigation,
  "Live music": Music,
  Hiking: Mountain,
  "Art & design": Camera,
  Food: Utensils,
  "Beach days": Sun,
  Photography: Camera,
  Amapiano: Music,
  Camping: Mountain,
};
const img = portrait;
function Avatar({ p, size = 42 }: { p: Person; size?: number }) {
  return (
    <img
      className="avatar"
      style={{ width: size, height: size, objectPosition: p.position }}
      src={img(p, true)}
      alt={p.name}
    />
  );
}
function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={"icon-button " + className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <header className="modal-heading">
        <h2>{title}</h2>
        <IconButton label="Close" onClick={close}>
          <X size={20} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
export default function NamLink() {
  const [state, setState] = useState<State>(initialState),
    [loaded, setLoaded] = useState(false),
    [signedIn, setSignedIn] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [tab, setTab] = useState<Tab>("discover"),
    [selected, setSelected] = useState<Person | null>(null),
    [modal, setModal] = useState<
      | null
      | "filters"
      | "onboard"
      | "safety"
      | "quiz"
      | "about"
      | "report"
      | "welcome"
    >(null),
    [reportPerson, setReportPerson] = useState<Person | null>(null),
    [activeChat, setActiveChat] = useState<string | null>(null),
    [connectionView, setConnectionView] = useState("Liked"),
    [town, setTown] = useState("All Namibia"),
    [ageMax, setAgeMax] = useState(40),
    [ageMin, setAgeMin] = useState(18),
    [intent, setIntent] = useState("Any intention"),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  const queue = useRef(Promise.resolve());
  const bottom = useRef<HTMLDivElement>(null);
  async function load() {
    setError("");
    try {
      const res = await fetch("/api/state");
      if (res.status === 401) {
        setSignedIn(false);
        setLoaded(true);
        return;
      }
      if (!res.ok) throw new Error("Couldn’t load your account.");
      const data = (await res.json()) as { state: State };
      setState(data.state);
      setSignedIn(true);
    } catch (e) {
      setError(
        "Your account is unavailable. You can browse the sample profiles and retry.",
      );
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.messages, activeChat]);
  function act(action: Action, success?: string) {
    if (!signedIn) {
      location.href = "/signin-with-chatgpt?return_to=/";
      return Promise.resolve(false);
    }
    setBusy(true);
    const job = queue.current.then(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const data = (await res.json()) as { state: State; error?: string };
        if (!res.ok) throw new Error(data.error || "Could not save.");
        setState(data.state);
        setError("");
        if (success) setToast(success);
        return true;
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Could not save.");
        return false;
      } finally {
        setBusy(false);
      }
    });
    queue.current = job.then(() => {});
    return job;
  }
  function like(p: Person) {
    act(
      { type: "like", person: p.id, value: !state.likes.includes(p.id) },
      state.likes.includes(p.id)
        ? "Removed from your likes."
        : `You liked ${p.name}. Saved to Connections.`,
    );
  }
  function goChat(p: Person) {
    setSelected(null);
    setActiveChat(p.id);
    setTab("chat");
  }
  const visible = people.filter(
    (p) =>
      !state.blocked.includes(p.id) &&
      p.age >= ageMin &&
      p.age <= ageMax &&
      (town === "All Namibia" || p.town === town) &&
      (intent === "Any intention" || p.intent === intent) &&
      (!query ||
        (p.name + " " + p.tags.join(" ") + " " + p.town)
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const matches = people.filter(
    (p) => sampleMatches.includes(p.id) && !state.blocked.includes(p.id),
  );
  const active = people.find((p) => p.id === activeChat);
  function changeTab(id: Tab) {
    setTab(id);
    setActiveChat(null);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const profileName = state.profile.name || "Your profile";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="NamLink home">
          <span className="brand-symbol">
            n<span>•</span>
          </span>
          namlink<span className="brand-dot">.</span>
        </a>

        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav-item active" : "nav-item"}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => changeTab(n.id)}
            >
              <n.icon size={21} strokeWidth={1.7} />
              <span>{n.label}</span>
              {n.id === "chat" && (
                <span className="nav-count">{matches.length}</span>
              )}
              {tab === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="safety-link" onClick={() => setModal("safety")}>
            <ShieldCheck size={17} /> Dating safety
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-user">
            <button
              className="user-avatar"
              onClick={() => changeTab("profile")}
            >
              {state.profile.name ? (
                state.profile.name[0].toUpperCase()
              ) : (
                <UserRound size={21} />
              )}
            </button>
            <div>
              <b>{profileName}</b>
              <small>{state.profile.town}, NA</small>
            </div>
            <IconButton label="About NamLink" onClick={() => setModal("about")}>
              <MoreHorizontal size={20} />
            </IconButton>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <a className="brand" href="/">
            NamLink
          </a>
          <button
            className="location-button"
            onClick={() => setModal("filters")}
          >
            {town === "All Namibia" ? "Namibia" : town}
            <ChevronDown size={15} />
          </button>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        <div className={"page-layout " + (tab === "chat" ? "chat-layout" : "")}>
          <main>
            {tab === "discover" && (
              <>
                <div className="page-heading">
                  <div>
                    <h1>Discover</h1>
                    <p>Sample profiles in Namibia.</p>
                  </div>
                  <button
                    className="filter-button"
                    aria-label="Filters"
                    onClick={() => setModal("filters")}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>
                <Discover
                  state={state}
                  busy={busy}
                  visible={visible}
                  open={setSelected}
                  like={like}
                />
              </>
            )}
            {tab === "nearby" && (
              <>
                <div className="page-heading">
                  <div>
                    <h1>Nearby</h1>
                    <p>Browse people by town.</p>
                  </div>
                  <button
                    className="filter-button"
                    aria-label="Filters"
                    onClick={() => setModal("filters")}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>
                <Nearby
                  state={state}
                  visible={visible}
                  open={setSelected}
                  town={town}
                  setTown={setTown}
                />
              </>
            )}
            {tab === "connections" && (
              <>
                <div className="page-heading">
                  <div>
                    <h1>Connections</h1>
                  </div>
                </div>
                <Connections
                  state={state}
                  busy={busy}
                  open={setSelected}
                  like={like}
                  matches={matches}
                  chat={goChat}
                  view={connectionView}
                  setView={setConnectionView}
                />
              </>
            )}
            {tab === "chat" && (
              <>
                <div className="page-heading">
                  <div>
                    <h1>Chats</h1>
                  </div>
                </div>
                <div
                  className={"chat-container " + (active ? "thread-open" : "")}
                >
                  <section className="conversation-list">
                    <label className="search-box">
                      <Search size={17} />
                      <input
                        placeholder="Find a conversation"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <div className="list-caption">YOUR SAMPLE CONNECTIONS</div>
                    {matches
                      .filter((p) =>
                        p.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          className={
                            activeChat === p.id
                              ? "conversation selected"
                              : "conversation"
                          }
                          onClick={() => setActiveChat(p.id)}
                        >
                          <Avatar p={p} size={51} />
                          <div>
                            <b>{p.name}</b>
                            <p>
                              {state.messages[p.id]?.at(-1)?.text ||
                                "Start a conversation"}
                            </p>
                          </div>
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                  </section>
                  <section className="thread">
                    {active ? (
                      <>
                        <div className="thread-heading">
                          <button
                            className="mobile-back icon-button"
                            onClick={() => setActiveChat(null)}
                            aria-label="Back to conversations"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <Avatar p={active} />
                          <button
                            className="thread-name"
                            onClick={() => setSelected(active)}
                          >
                            <b>{active.name}</b>
                            <small>Sample connection · {active.town}</small>
                          </button>
                          <IconButton
                            label="Date planning checklist"
                            onClick={() => setModal("safety")}
                          >
                            <ShieldCheck size={20} />
                          </IconButton>
                        </div>
                        <div className="message-area">
                          <p className="chat-preview-note">
                            Sample chat. Messages are saved privately and aren’t
                            delivered to anyone.
                          </p>
                          {(state.messages[active.id] ?? []).map((m) => (
                            <div
                              className={
                                "message " + (m.mine ? "mine" : "theirs")
                              }
                              key={m.id}
                            >
                              <p>{m.text}</p>
                              <small>
                                {new Date(m.at).toLocaleTimeString("en-NA", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Africa/Windhoek",
                                })}
                                {m.mine && <Check size={12} />}
                              </small>
                            </div>
                          ))}
                          <div ref={bottom} />
                        </div>
                        <div className="icebreakers">
                          <button
                            onClick={() =>
                              setMessage(
                                `What’s your favourite place for ${active.tags[0].toLowerCase()} in ${active.town}?`,
                              )
                            }
                          >
                            Ask about {active.tags[0].toLowerCase()}
                            <Plus size={12} />
                          </button>
                        </div>
                        <form
                          className="message-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!message.trim() || busy) return;
                            const ok = await act({
                              type: "message",
                              person: active.id,
                              text: message,
                              id: crypto.randomUUID(),
                            });
                            if (ok) setMessage("");
                          }}
                        >
                          <input
                            value={message}
                            maxLength={2000}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Start with something real…"
                            aria-label="Your message"
                          />
                          <button
                            className="send-button"
                            aria-label="Send message"
                            disabled={!message.trim() || busy}
                          >
                            {busy ? (
                              <LoaderCircle className="spin" size={18} />
                            ) : (
                              <ArrowUpRight size={20} />
                            )}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="empty-state">
                        <MessageCircle size={34} />
                        <h2>Make room for a conversation.</h2>
                        <p>Choose a sample connection to try messaging.</p>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
            {tab === "profile" && (
              <>
                <div className="page-heading">
                  <div>
                    <h1>Profile</h1>
                  </div>
                </div>
                <section className="my-profile">
                  <div className="profile-monogram">
                    {state.profile.name ? (
                      state.profile.name[0].toUpperCase()
                    ) : (
                      <UserRound size={45} strokeWidth={1} />
                    )}
                  </div>
                  <h2>
                    {state.profile.name || "Create profile"}
                    {state.onboarded && `, ${state.profile.age}`}
                  </h2>
                  <p>
                    <MapPin size={14} />
                    {state.profile.town}, Namibia
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      setModal(state.onboarded ? "onboard" : "welcome")
                    }
                  >
                    {state.onboarded ? "Edit profile" : "Create profile"}
                    <ArrowUpRight size={17} />
                  </button>
                  <div className="profile-summary">
                    <div className="detail-section-heading">
                      <h3>The story</h3>
                      <span>{state.profile.town}, NA</span>
                    </div>
                    <p>
                      {state.profile.bio ||
                        "Add a bio when you create your profile."}
                    </p>
                    <div className="interest-tags">
                      {state.profile.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    {state.profile.answer && (
                      <blockquote>“{state.profile.answer}”</blockquote>
                    )}
                  </div>
                </section>
                <div className="settings-panel">
                  <button onClick={() => setModal("quiz")}>
                    <span>
                      <Heart size={20} />
                      <div>
                        <b>Prompts</b>
                      </div>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                  <button
                    onClick={() =>
                      act({ type: "lowData", value: !state.lowData })
                    }
                    disabled={busy}
                  >
                    <span>
                      <Leaf size={20} />
                      <div>
                        <b>Data saver</b>
                      </div>
                    </span>
                    <span
                      className={"switch " + (state.lowData ? "on" : "")}
                      role="switch"
                      aria-checked={state.lowData}
                      aria-label="Data saver"
                    >
                      <i />
                    </span>
                  </button>
                  <button onClick={() => setModal("safety")}>
                    <span>
                      <ShieldCheck size={20} />
                      <div>
                        <b>Dating safety</b>
                      </div>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                  <button onClick={() => setModal("about")}>
                    <span>
                      <EyeOff size={20} />
                      <div>
                        <b>About NamLink</b>
                      </div>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                </div>
                {signedIn && (
                  <a
                    className="signout"
                    href="/signout-with-chatgpt?return_to=/"
                    target="_top"
                  >
                    <LogOut size={15} />
                    Sign out
                  </a>
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <nav className="mobile-nav">
        {nav.map((n) => (
          <button
            className={tab === n.id ? "active" : ""}
            aria-current={tab === n.id ? "page" : undefined}
            key={n.id}
            onClick={() => changeTab(n.id)}
          >
            <n.icon
              size={22}
              fill={
                tab === n.id && n.id === "connections" ? "currentColor" : "none"
              }
              strokeWidth={1.7}
            />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {selected && (
        <Modal title="Profile" close={() => setSelected(null)}>
          <div className="detail-photo">
            <img
              src={img(selected, state.lowData)}
              style={{ objectPosition: selected.position }}
              alt={selected.name}
            />
            <div>
              <span>
                <MapPin size={13} />
                {selected.town}
              </span>
              <h2>
                {selected.name}, {selected.age}
              </h2>
              <p>{selected.job}</p>
            </div>
          </div>
          <div className="detail-body">
            <span className="sample-label">
              ILLUSTRATIVE PROFILE · NOT A REAL MEMBER
            </span>
            <div className="detail-intent">
              <Heart size={16} />
              {selected.intent}
            </div>
            <div className="detail-section-heading">
              <h3>The story</h3>
              <span>{selected.town}, NA</span>
            </div>
            <p>{selected.bio}</p>
            <div className="interest-tags">
              {selected.tags.map((t) => {
                const I = tagIcons[t] || Heart;
                return (
                  <span key={t}>
                    <I size={13} />
                    {t}
                  </span>
                );
              })}
            </div>
            <div className="profile-prompt">
              <span>{selected.prompt}</span>
              <h3>{selected.answer}</h3>
            </div>
            <div className="detail-actions">
              <button
                className={
                  "primary " +
                  (state.likes.includes(selected.id) ? "saved" : "")
                }
                disabled={busy}
                onClick={() => like(selected)}
              >
                <Heart
                  size={18}
                  fill={
                    state.likes.includes(selected.id) ? "currentColor" : "none"
                  }
                />
                {state.likes.includes(selected.id)
                  ? "Liked"
                  : "Like " + selected.name}
              </button>
              {sampleMatches.includes(selected.id) && (
                <button className="secondary" onClick={() => goChat(selected)}>
                  <MessageCircle size={17} />
                  Try chat
                </button>
              )}
            </div>
            <div className="profile-moderation">
              <button
                onClick={() => {
                  setReportPerson(selected);
                  setSelected(null);
                  setModal("report");
                }}
              >
                <Flag size={13} />
                Report
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  const ok = await act(
                    { type: "block", person: selected.id },
                    "Profile hidden and removed from your connections.",
                  );
                  if (ok) setSelected(null);
                }}
              >
                <EyeOff size={13} />
                Block profile
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "filters" && (
        <Modal title="Filters" close={() => setModal(null)}>
          <div className="form-body">
            <label>
              Town
              <select value={town} onChange={(e) => setTown(e.target.value)}>
                {["All Namibia", ...towns].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Minimum age
                <input
                  type="number"
                  min={18}
                  max={ageMax}
                  value={ageMin}
                  onChange={(e) =>
                    setAgeMin(
                      Math.min(ageMax, Math.max(18, Number(e.target.value))),
                    )
                  }
                />
              </label>
              <label>
                Maximum age
                <input
                  type="number"
                  min={ageMin}
                  max={100}
                  value={ageMax}
                  onChange={(e) =>
                    setAgeMax(
                      Math.max(ageMin, Math.min(100, Number(e.target.value))),
                    )
                  }
                />
              </label>
            </div>
            <label>
              Looking for
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              >
                {["Any intention", "A relationship", "Open to exploring"].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </label>
            <p className="privacy-note">
              <MapPin size={17} />
              Only towns are used. We don’t request your GPS location.
            </p>
            <button className="primary full" onClick={() => setModal(null)}>
              Show {visible.length} {visible.length === 1 ? "person" : "people"}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "welcome" && (
        <Modal title="Welcome to NamLink" close={() => setModal(null)}>
          <Welcome
            signIn={signedIn}
            start={() => {
              if (!signedIn) {
                location.href = "/signin-with-chatgpt?return_to=/";
                return;
              }
              setModal("onboard");
            }}
            browse={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "onboard" && (
        <Modal
          title={state.onboarded ? "Edit profile" : "Create profile"}
          close={() => setModal(null)}
        >
          <ProfileSetup
            state={state}
            busy={busy}
            act={act}
            close={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "quiz" && (
        <Modal title="Prompts?" close={() => setModal(null)}>
          <div className="form-body">
            <ThisOrThat state={state} busy={busy} act={act} />
          </div>
        </Modal>
      )}
      {modal === "safety" && (
        <Modal title="Dating safety" close={() => setModal(null)}>
          <Safety />
        </Modal>
      )}
      {modal === "report" && reportPerson && (
        <Modal
          title={`Report ${reportPerson.name}`}
          close={() => setModal(null)}
        >
          <div className="form-body">
            <p className="muted">
              This records a preview report and blocks the sample profile. No
              moderation team is monitoring this prototype.
            </p>
            {[
              "Fake profile",
              "Inappropriate content",
              "Harassment",
              "Other",
            ].map((r) => (
              <button
                className="report-option"
                disabled={busy}
                key={r}
                onClick={async () => {
                  if (
                    await act(
                      {
                        type: "report",
                        person: reportPerson.id,
                        reason: r as "Other",
                      },
                      "Preview report recorded. Profile blocked.",
                    )
                  )
                    setModal(null);
                }}
              >
                {r}
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "about" && (
        <Modal title="A little transparency." close={() => setModal(null)}>
          <div className="form-body about-copy">
            <span className="sample-label">DEVELOPMENT PREVIEW</span>
            <h3>Built here. Still becoming.</h3>
            <p>
              NamLink is a Namibia-focused dating app in development. Every
              person shown is a fictional sample with illustrative imagery. No
              likes or messages contact real people.
            </p>
            <h3>What works now</h3>
            <p>
              Browsing and town filters, your profile and quiz, likes, blocking,
              preview reports, and sample conversations. Account changes are
              stored on the server under your ChatGPT identity and are available
              when you sign in on another device.
            </p>
            <h3>Your privacy</h3>
            <p>
              We don’t collect GPS coordinates or phone numbers. Your account
              data is private to your signed-in identity. Chat is not end-to-end
              encrypted. Profile imagery is illustrative, not verified Namibian
              members.
            </p>
            <h3>Before a real-world launch</h3>
            <p>
              Real member onboarding, photo uploads and verification, mutual
              matching, live chat delivery, moderation operations, voice and
              video, and automated safety check-ins still need implementation
              and review. No paywalls are included.
            </p>
            <button
              className="secondary full"
              disabled={busy}
              onClick={async () => {
                if (
                  window.confirm(
                    "Delete all saved preview data, including your profile, likes, quiz answers, and messages?",
                  )
                ) {
                  if (
                    await act(
                      { type: "reset" },
                      "Your saved preview data has been reset.",
                    )
                  )
                    setModal(null);
                }
              }}
            >
              Delete my saved preview data
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Safety() {
  const [checked, setChecked] = useState<string[]>([]);
  const [place, setPlace] = useState(""),
    [time, setTime] = useState(""),
    [notice, setNotice] = useState("");
  async function share() {
    const text = `My date plan\nMeeting at: ${place || "Not set"}\nWhen: ${time || "Not set"}\nPlease check in with me after our date. This is a shared plan, not live tracking.`;
    try {
      if (navigator.share)
        await navigator.share({ title: "My date plan", text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Plan copied. Send it to someone you trust.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNotice(
          "Sharing wasn’t available. Copy your meeting details and send them to a trusted person.",
        );
    }
  }
  return (
    <div className="form-body">
      <p className="muted">
        A little planning goes a long way. Choose what feels right for you.
      </p>
      {[
        "Meet in a busy, public place",
        "Arrange your own way there and back",
        "Let someone you trust know your plan",
        "Keep personal details private until you’re comfortable",
      ].map((t) => (
        <label className="safety-check" key={t}>
          <input
            type="checkbox"
            checked={checked.includes(t)}
            onChange={(e) =>
              setChecked(
                e.target.checked
                  ? [...checked, t]
                  : checked.filter((c) => c !== t),
              )
            }
          />
          {t}
        </label>
      ))}
      <h3>Share a simple date plan</h3>
      <label>
        Meeting place
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="A café, a public spot…"
          maxLength={120}
        />
      </label>
      <label>
        Date & time
        <input
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      <button className="primary full" onClick={share}>
        <ArrowUpRight size={17} />
        Share with someone you trust
      </button>
      <p className="privacy-note">
        This shares only the plan you enter. It does not track location, contact
        anyone automatically, or send alerts. Checklist and plan details stay in
        this open screen.
      </p>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
