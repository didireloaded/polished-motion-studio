import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, MapPin, NotebookText, MessageCircle, UserRound } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const tabs = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/radar", label: "Nearby", icon: MapPin },
  { to: "/posts", label: "Posts", icon: NotebookText },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/you", label: "You", icon: UserRound },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  if (
    [
      "/welcome",
      "/auth",
      "/moderation",
      "/verification",
      "/safety",
      "/crossed-paths",
      "/date-plan",
    ].includes(pathname)
  )
    return null;
  return (
    <nav className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 md:rounded-[20px] md:border md:shadow-float">
      <ul className="mx-auto flex h-[60px] max-w-md items-center justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className="relative flex min-w-[60px] flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium"
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={active ? "relative text-primary" : "relative text-muted-foreground"}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.7} />
                </motion.span>
                <span
                  className={active ? "relative text-primary" : "relative text-muted-foreground"}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[56px] items-center justify-between px-5 pb-2 pt-3"
    >
      <div>
        <h1 className={title === "Mutal" ? "" : "text-[20px] font-semibold tracking-[-0.035em]"}>
          {title === "Mutal" ? <BrandLogo /> : title}
        </h1>
        {eyebrow && <p className="mt-0.5 text-[12px] text-muted-foreground">{eyebrow}</p>}
      </div>
      {right}
    </motion.header>
  );
}
