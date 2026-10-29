import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Heart, MessageCircle, Reply } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Mutal" }] }),
  component: Notifications,
});

const detail = {
  match: { title: "You have a new match", text: "Say hello when you're ready.", icon: Heart },
  message: {
    title: "New message",
    text: "Your conversation has a new message.",
    icon: MessageCircle,
  },
  post_reply: { title: "Private reply", text: "Someone replied to your post.", icon: Reply },
};

function Notifications() {
  const { user, ready } = useSession();
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,kind,target_url,created_at,read_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void client.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, user]);

  const markRead = async (id: number) => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", id);
    if (!error) void client.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-10">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/you" aria-label="Back to profile">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-semibold">Notifications</h1>
        <span className="w-5" />
      </header>
      {!ready || list.isLoading ? (
        <p role="status" className="px-5 py-8 text-sm text-muted-foreground">
          Loading notifications…
        </p>
      ) : !user ? (
        <div className="px-5 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-sm">Sign in to see your notifications.</p>
          <Link
            to="/auth"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      ) : list.isError ? (
        <p role="alert" className="px-5 py-8 text-sm text-muted-foreground">
          Notifications couldn't load. Please try again.
        </p>
      ) : !list.data?.length ? (
        <div className="px-5 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-sm font-semibold">Nothing new yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Matches, messages, and private replies will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border px-5">
          {list.data.map((item) => {
            const itemDetail = detail[item.kind];
            const Icon = itemDetail.icon;
            return (
              <li key={item.id} className="flex items-center gap-3 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{itemDetail.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{itemDetail.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Link
                  to={item.kind === "post_reply" ? "/posts" : "/chats"}
                  {...(item.kind === "post_reply" ? {} : { search: { matchId: undefined } })}
                  onClick={() => void markRead(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.read_at ? "bg-secondary" : "bg-primary text-white"}`}
                >
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
