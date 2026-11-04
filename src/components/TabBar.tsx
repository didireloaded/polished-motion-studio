import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, MapPin, NotebookText, MessageCircle, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandLogo } from "./BrandLogo";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/namlink";
import { triggerHaptic } from "@/lib/icebreakers";

const tabs = [
  { to: "/", label: "Home", icon: Compass },
  { to: "/radar", label: "Explore", icon: MapPin },
  { to: "/posts", label: "Community", icon: NotebookText },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/you", label: "You", icon: UserRound },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  const { user } = useSession();
  const store = useStore();
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    enabled: !!user,
    staleTime: 20_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) return 0;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`tabbar-unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["unread-notifications-count", user.id],
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const demoUnreadCount = store.matches.filter((id) => !(store.chats[id]?.length ?? 0)).length;
  const chatsBadgeCount = user ? (unreadQuery.data ?? 0) : demoUnreadCount;

  if (
    [
      "/welcome",
      "/auth",
      "/moderation",
      "/verification",
      "/safety",
      "/crossed-paths",
      "/events",
      "/random-friday",
      "/speed-dating",
      "/this-or-that",
      "/date-plan",
      "/notifications",
    ].includes(pathname)
  )
    return null;
  return (
    <nav className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 md:rounded-[20px] md:border md:shadow-float">
      <ul className="mx-auto flex h-[60px] max-w-md items-center justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const showBadge = to === "/chats" && chatsBadgeCount > 0;
          return (
            <li key={to}>
              <Link
                to={to}
                {...(to === "/chats" ? { search: { matchId: undefined, draft: undefined } } : {})}
                onClick={() => triggerHaptic(8)}
                aria-current={active ? "page" : undefined}
                className="relative flex min-w-[60px] flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium"
              >
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className={active ? "relative text-primary" : "relative text-muted-foreground"}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.7} />
                  {showBadge && (
                    <span
                      aria-label={`${chatsBadgeCount} unread`}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground"
                    >
                      {chatsBadgeCount > 9 ? "9+" : chatsBadgeCount}
                    </span>
                  )}
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
      className={`relative flex min-h-[64px] items-center px-5 pb-2 pt-3 ${title === "Mutal" ? "justify-between" : "justify-end"}`}
    >
      <div>
        <h1
          className={
            title === "Mutal"
              ? ""
              : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[17px] font-semibold tracking-[-0.02em]"
          }
        >
          {title === "Mutal" ? <BrandLogo /> : title}
        </h1>
        {eyebrow && <p className="mt-0.5 text-[12px] text-muted-foreground">{eyebrow}</p>}
      </div>
      {right}
    </motion.header>
  );
}
