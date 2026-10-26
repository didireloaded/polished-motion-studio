"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Heart, Star, X, MapPin, MessageCircle, SlidersHorizontal, UserRound,
  BriefcaseBusiness, Coffee, Navigation, Music, Mountain, Camera, Sun,
  Utensils, Flag, EyeOff, RotateCcw, Sparkles,
} from "lucide-react";
import { type Person, type State } from "../lib/model";
import { portrait } from "./redesign";
import "./home.css";

const interestIcons: Record<string, typeof Coffee> = {
  Coffee, "Road trips": Navigation, "Live music": Music,
  Hiking: Mountain, "Art & design": Camera, Food: Utensils,
  "Beach days": Sun, Photography: Camera, Amapiano: Music, Camping: Mountain,
};

type Props = {
  state: State;
  busy: boolean;
  visible: Person[];
  like: (p: Person) => void;
  save: (p: Person) => Promise<boolean>;
  filters: () => void;
  account: () => void;
  chats: () => void;
  report: (p: Person) => void;
  block: (p: Person) => Promise<boolean>;
  openSaved: () => void;
};

export function Home({ state, busy, visible, like, save, filters, account, chats, report, block, openSaved }: Props) {
  const [activeId, setActiveId] = useState(visible[0]?.id);
  const [passed, setPassed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  const maskId = useId().replaceAll(":", "");
  const available = visible.filter((p) => !passed.includes(p.id));
  const current = available.find((p) => p.id === activeId) ?? available[0];
  const index = available.findIndex((p) => p.id === current?.id);
  const shared = current?.tags.filter((tag) => state.profile.tags.includes(tag)) ?? [];
  const liked = current ? state.likes.includes(current.id) : false;
  const saved = current ? (state.saved ?? []).includes(current.id) : false;

  function browse(direction: number) {
    const person = available[(index + direction + available.length) % available.length];
    if (!person) return;
    setActiveId(person.id);
    setExpanded(false);
    window.scrollTo({ top: 0 });
  }
  function pass() {
    if (!current) return;
    const next = available[index + 1] ?? available[index - 1];
    setPassed((ids) => [...ids, current.id]);
    setActiveId(next?.id);
    setExpanded(false);
    window.scrollTo({ top: 0 });
  }
  function undo() {
    const previous = passed.at(-1);
    if (!previous) return;
    setPassed((ids) => ids.slice(0, -1));
    setActiveId(previous);
    setExpanded(false);
  }
  function toggleDetails() {
    setExpanded((value) => !value);
  }

  return (
    <section className="home-stage" aria-label="Discover people in Namibia">
      <div className="home-atmosphere" aria-hidden="true">
        {current && <img src={portrait(current, true)} alt="" />}
      </div>
      <header className="home-toolbar">
        <div className="home-toolbar-left">
          <button className="home-glass" aria-label="Undo last pass" title="Undo last pass" disabled={!passed.length} onClick={undo}>
            <ArrowLeft size={20} />
          </button>
          <button className="home-account" aria-label="Your profile" onClick={account}>
            {state.profile.name ? state.profile.name[0].toUpperCase() : <UserRound size={20} />}
          </button>
        </div>
        <span className="home-wordmark">namlink.</span>
        <button className="home-glass" aria-label="Open chats" onClick={chats}><MessageCircle size={22} /></button>
      </header>

      {current ? (
        <>
          <div className="home-portrait-wrap">
            <svg className="home-mask" aria-hidden="true" width="0" height="0">
              <defs>
                <clipPath id={maskId} clipPathUnits="objectBoundingBox">
                  <path d="M .105 0 H .895 Q 1 0 1 .08 V .447 C 1 .474 .932 .487 .932 .525 C .932 .561 1 .576 1 .601 V .925 Q 1 1 .895 1 H .615 C .565 1 .555 .935 .5 .935 C .445 .935 .435 1 .385 1 H .105 Q 0 1 0 .925 V .601 C 0 .576 .068 .561 .068 .525 C .068 .487 0 .474 0 .447 V .08 Q 0 0 .105 0 Z" />
                </clipPath>
              </defs>
            </svg>
            <button className="home-portrait" style={{ clipPath: `url(#${maskId})` }} aria-label={`Read about ${current.name}`} onClick={toggleDetails} aria-expanded={expanded} aria-controls="home-profile-details">
              <img src={portrait(current, state.lowData)} alt={`${current.name}, illustrative profile`} style={{ objectPosition: current.id === "p1" ? "right center" : current.position }} fetchPriority="high" />
            </button>
            <span className="home-profile-count">{index + 1} / {available.length}</span>
            <button className="home-browse previous" aria-label="Previous person" disabled={available.length < 2} onClick={() => browse(-1)}><ChevronLeft size={26} /></button>
            <button className="home-browse next" aria-label="Next person" disabled={available.length < 2} onClick={() => browse(1)}><ChevronRight size={26} /></button>
            <button className={"home-save " + (saved ? "selected" : "")} aria-label={`${saved ? "Unsave" : "Save"} ${current.name}`} aria-pressed={saved} title="Save for later" disabled={busy} onClick={() => save(current)}><Star size={27} strokeWidth={1.7} fill={saved ? "currentColor" : "none"} /></button>
            <button className="home-pass" aria-label={`Pass ${current.name}`} title="Pass" onClick={pass}><X size={26} strokeWidth={1.7} /></button>
            <button className={"home-like " + (liked ? "selected" : "")} aria-label={`${liked ? "Unlike" : "Like"} ${current.name}`} aria-pressed={liked} disabled={busy} onClick={() => like(current)}><Heart size={32} strokeWidth={1.9} fill={liked ? "currentColor" : "none"} /></button>
          </div>
          <div className="home-identity" aria-live="polite" aria-atomic="true">
            <h1>{current.name} <span>{current.age}</span></h1>
            <p><MapPin size={16} />{current.town}, Namibia</p>
          </div>
          <section ref={sheet} className={"home-sheet " + (expanded ? "expanded" : "")} aria-label={`${current.name}’s profile`}>
            <button className="home-sheet-handle" aria-label={expanded ? "Collapse profile details" : "Expand profile details"} aria-expanded={expanded} aria-controls="home-profile-details" onClick={toggleDetails}>{expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</button>
            <div className="home-sheet-summary">
              <button className="home-shared" onClick={toggleDetails} aria-expanded={expanded} aria-controls="home-profile-details"><Sparkles size={20} /><span><strong>{shared.length}</strong> shared {shared.length === 1 ? "interest" : "interests"}</span></button>
              <span className="home-sample">Sample profile</span>
              <button className="home-filters" aria-label="Filters" title="Filters" onClick={filters}><SlidersHorizontal size={20} /></button>
            </div>
            <div className="home-interest-preview">
              {current.tags.map((tag, i) => {
                const Icon = interestIcons[tag] ?? Heart;
                return <span key={tag} className={`home-interest tone-${i % 4} ${shared.includes(tag) ? "shared" : ""}`}><Icon size={14} />{tag}</span>;
              })}
            </div>
            <div id="home-profile-details" hidden={!expanded}>
              <div className="home-detail-section">
                <h2>About {current.name}</h2>
                <p>{current.bio}</p>
              </div>
              <div className="home-work"><BriefcaseBusiness size={19} /><div><h2>Work & everyday life</h2><p>{current.job}</p></div></div>
              <div className="home-intention"><h2>I’m looking for</h2><p><Heart size={19} />{current.intent}</p></div>
              <div className="home-prompt"><h2>{current.prompt}</h2><p>“{current.answer}”</p></div>
              <button className="home-saved-link" onClick={openSaved}><Star size={17} /> Your saved profiles <ChevronRight size={17} /></button>
              <div className="home-moderation">
                <button disabled={busy} onClick={async () => { if (await block(current)) setExpanded(false); }}><EyeOff size={16} />Block profile</button>
                <button className="home-report" onClick={() => report(current)}><Flag size={16} />Report profile</button>
              </div>
              <p className="home-preview-note">Illustrative profiles. Likes and saves are private preview actions.</p>
            </div>
          </section>
        </>
      ) : (
        <div className="home-empty">
          <Heart size={34} strokeWidth={1.3} />
          <h1>{visible.length ? "That’s everyone for now." : "A little further afield?"}</h1>
          <p>{visible.length ? "You’ve seen the profiles in this preview. You can revisit them whenever you like." : "Try another town or widen your age range."}</p>
          <button onClick={visible.length ? () => { setPassed([]); setActiveId(visible[0]?.id); } : filters}>{visible.length ? <RotateCcw size={18} /> : <SlidersHorizontal size={18} />}{visible.length ? "See profiles again" : "Adjust filters"}</button>
          {passed.length > 0 && <button className="home-empty-undo" onClick={undo}>Undo last pass</button>}
        </div>
      )}
    </section>
  );
}
