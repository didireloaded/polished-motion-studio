import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flame, Radar, MessageSquareText, MessagesSquare, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Flame },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/posts", label: "Posts", icon: MessageSquareText },
  { to: "/chats", label: "Chats", icon: MessagesSquare },
  { to: "/you", label: "You", icon: User },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:rounded-full md:border">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2 md:gap-2 md:px-3">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link to={to} className="relative flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-[11px] font-medium">
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-primary/15" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <motion.span whileTap={{ scale: 0.8 }} className={active ? "relative text-primary" : "relative text-muted-foreground"}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                </motion.span>
                <span className={active ? "relative text-foreground" : "relative text-muted-foreground"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between px-5 pb-4 pt-8">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
      </div>
      {right}
    </motion.header>
  );
}
