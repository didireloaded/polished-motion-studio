import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, MapPin, MessageCircle, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  people,
  towns,
  update,
  useStore,
  timeAgo,
  type Post,
  type PrivateReply,
} from "@/lib/namlink";
import { PageHeader } from "@/components/TabBar";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DemoNotice, SafetyActions } from "@/components/community";

type View = "Feed" | "Your posts" | "Your replies";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "Posts — NamLink" },
      { name: "description", content: "Local posts with private replies around Namibia." },
      { property: "og:title", content: "Posts — NamLink" },
    ],
  }),
  component: Posts,
});

function Posts() {
  const s = useStore();
  const { user, ready } = useSession();
  const [text, setText] = useState("");
  const [town, setTown] = useState<string>(s.profile.town);
  const [view, setView] = useState<View>("Feed");
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [inboxPost, setInboxPost] = useState<Post | null>(null);
  const [replyText, setReplyText] = useState("");
  const [notice, setNotice] = useState("");
  const ownPosts = s.posts.filter((post) => post.mine);
  const ownReplies = useMemo(
    () =>
      Object.values(s.postReplies)
        .flat()
        .filter((reply) => reply.from === "me"),
    [s.postReplies],
  );
  const visiblePosts = view === "Your posts" ? ownPosts : s.posts.filter((post) => !post.mine);

  if (!ready)
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  if (user) return <LivePosts key={user.id} userId={user.id} />;

  const submitPost = () => {
    const value = text.trim();
    if (value.length < 3) return;
    if (!s.profile.name.trim()) {
      setNotice("Add your name in You before posting.");
      window.setTimeout(() => setNotice(""), 2400);
      return;
    }
    update((st) => ({
      ...st,
      posts: [
        {
          id: crypto.randomUUID(),
          authorName: st.profile.name.trim(),
          text: value.slice(0, 300),
          town,
          at: Date.now(),
          replies: 0,
          mine: true,
        },
        ...st.posts,
      ],
    }));
    setText("");
    setView("Your posts");
  };

  const submitReply = () => {
    const value = replyText.trim();
    if (!replyTo || value.length < 2 || !s.profile.name.trim()) return;
    const postId = replyTo.id;
    update((st) => ({
      ...st,
      postReplies: {
        ...st.postReplies,
        [postId]: [
          ...(st.postReplies[postId] ?? []),
          {
            id: crypto.randomUUID(),
            postId,
            from: "me",
            personId: "self",
            text: value.slice(0, 300),
            at: Date.now(),
          },
        ],
      },
      posts: st.posts.map((post) =>
        post.id === postId ? { ...post, replies: (post.replies ?? 0) + 1 } : post,
      ),
    }));
    setReplyText("");
    setReplyTo(null);
    setNotice("Reply sent privately to the post author.");
    window.setTimeout(() => setNotice(""), 2400);
  };

  const startChat = (reply: PrivateReply) => {
    if (!inboxPost || !reply.personId) return;
    update((st) => ({
      ...st,
      matches: st.matches.includes(reply.personId!) ? st.matches : [...st.matches, reply.personId!],
      chats: st.chats[reply.personId!] ? st.chats : { ...st.chats, [reply.personId!]: [] },
    }));
    setInboxPost(null);
    setNotice("You connected. Open Chats to continue.");
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Posts" />
      <DemoNotice />
      <div className="mx-5 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="post-compose" className="sr-only">
          Write a post
        </label>
        <textarea
          id="post-compose"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Share a plan or ask the community…"
          className="w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <select
            aria-label="Post town"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="max-w-[55%] rounded-xl bg-secondary px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {towns.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">{300 - text.length}</span>
            <button
              type="button"
              disabled={text.trim().length < 3}
              onClick={submitPost}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
            >
              <Send className="h-4 w-4" />
              Post
            </button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" />
          Your name is shown. Replies are private to you and the author.
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Preview only · activity stays on this device.
        </p>
      </div>

      <div
        className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-border px-5"
        role="tablist"
        aria-label="Post views"
      >
        {(["Feed", "Your posts", "Your replies"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => setView(item)}
            className={
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium " +
              (view === item
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground")
            }
          >
            {item}
          </button>
        ))}
      </div>

      {view === "Your replies" ? (
        <ul className="mt-3 space-y-2 px-5">
          {ownReplies.length ? (
            ownReplies.map((reply) => (
              <li key={reply.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">
                  Your private reply · {timeAgo(reply.at)}
                </p>
                <p className="mt-2 text-sm leading-5">{reply.text}</p>
              </li>
            ))
          ) : (
            <EmptyState
              title="No replies sent"
              body="When you reply to a post, it will be visible only to you and its author."
            />
          )}
        </ul>
      ) : view === "Your posts" ? (
        <ul className="mt-3 space-y-2 px-5">
          {ownPosts.length ? (
            ownPosts.map((post) => {
              const privateReplies = (s.postReplies[post.id] ?? []).filter(
                (reply) => reply.from === "member",
              );
              return (
                <li key={post.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-[11px] text-muted-foreground">
                    Your post · {timeAgo(post.at)}
                  </p>
                  <p className="mt-2 text-[15px] leading-6">{post.text}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {privateReplies.length
                        ? privateReplies.length + " private replies"
                        : "Replies will appear here privately."}
                    </span>
                    <div className="flex items-center gap-3">
                      {privateReplies.length > 0 && (
                        <button
                          onClick={() => setInboxPost(post)}
                          className="text-xs font-semibold text-primary"
                        >
                          View replies
                        </button>
                      )}
                      <button
                        aria-label="Delete post"
                        onClick={() =>
                          update((st) => ({
                            ...st,
                            posts: st.posts.filter((entry) => entry.id !== post.id),
                          }))
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <EmptyState
              title="No posts yet"
              body="Posts you write will show your name. Replies stay private."
            />
          )}
        </ul>
      ) : (
        <ul className="mt-3 space-y-2 px-5">
          <AnimatePresence initial={false}>
            {visiblePosts.map((post, index) => (
              <motion.li
                key={post.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.025 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">{post.authorName || "Member"}</span>
                  {post.sample && (
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
                      Sample
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[15px] leading-6">{post.text}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {post.town}
                    </span>
                    <span>{timeAgo(post.at)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setReplyTo(post);
                      setReplyText("");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Reply privately
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {visiblePosts.length === 0 && (
            <EmptyState
              title="Nothing here yet"
              body="New posts from people nearby will appear in this feed."
            />
          )}
        </ul>
      )}

      <Drawer
        open={!!replyTo}
        onOpenChange={(open) => {
          if (!open) setReplyTo(null);
        }}
      >
        <DrawerContent className="mx-auto max-h-[80svh] max-w-[440px] rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 text-left">
            <div>
              <DrawerTitle className="text-xl">Reply privately</DrawerTitle>
              <DrawerDescription>
                Only the person who wrote this post can see your reply.
              </DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Close reply composer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>
          {replyTo && (
            <blockquote className="rounded-xl bg-secondary p-3 text-sm leading-5 text-muted-foreground">
              {replyTo.text}
            </blockquote>
          )}
          <label htmlFor="private-reply" className="sr-only">
            Your private reply
          </label>
          <textarea
            id="private-reply"
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder="Write a thoughtful reply…"
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm leading-5 outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {300 - replyText.length} characters left
            </span>
            <span className="text-xs text-muted-foreground">
              From {s.profile.name || "your profile"}
            </span>
          </div>
          <button
            type="button"
            disabled={replyText.trim().length < 2 || !s.profile.name.trim()}
            onClick={submitReply}
            className="mt-3 h-12 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            Send private reply
          </button>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={!!inboxPost}
        onOpenChange={(open) => {
          if (!open) setInboxPost(null);
        }}
      >
        <DrawerContent className="mx-auto max-h-[82svh] max-w-[440px] overflow-y-auto rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 text-left">
            <div>
              <DrawerTitle className="text-xl">Private replies</DrawerTitle>
              <DrawerDescription>Only you can see replies to your post.</DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Close private replies"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>
          {inboxPost &&
            (s.postReplies[inboxPost.id] ?? [])
              .filter((reply) => reply.from === "member")
              .map((reply) => {
                const person = people.find((entry) => entry.id === reply.personId);
                return (
                  <div key={reply.id} className="mt-3 rounded-2xl border border-border p-4">
                    <p className="text-[11px] text-muted-foreground">
                      {reply.sample ? "Sample reply" : "Private reply"}
                    </p>
                    <p className="mt-2 text-sm leading-5">{reply.text}</p>
                    <button
                      onClick={() => startChat(reply)}
                      className="mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      Like reply{person ? " from " + person.name : ""} to connect
                    </button>
                  </div>
                );
              })}
        </DrawerContent>
      </Drawer>

      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(92vw,400px)] -translate-x-1/2 rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm shadow-float"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

type LivePost = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  town: string;
  created_at: string;
};
type LiveReply = {
  accepted_at: string | null;
  accepted_by: string | null;
  accepted_match_id: string | null;
  id: string;
  post_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

function LivePosts({ userId }: { userId: string }) {
  const client = useQueryClient();
  const navigate = useNavigate({ from: "/posts" });
  const [body, setBody] = useState("");
  const [town, setTown] = useState<string>("Windhoek");
  const [view, setView] = useState<View>("Feed");
  const [replyTo, setReplyTo] = useState<LivePost | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [notice, setNotice] = useState("");
  const postsQuery = useQuery({
    queryKey: ["posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,author_id,author_name,body,town,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LivePost[];
    },
  });
  const repliesQuery = useQuery({
    queryKey: ["post-replies", userId],
    enabled: !!postsQuery.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_replies")
        .select(
          "id,post_id,sender_id,sender_name,body,created_at,accepted_at,accepted_by,accepted_match_id",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as LiveReply[];
    },
  });
  const posts = postsQuery.data ?? [];
  const replies = repliesQuery.data ?? [];
  const ownPosts = posts.filter((post) => post.author_id === userId);
  const ownReplies = replies.filter((reply) => reply.sender_id === userId);
  const visiblePosts = view === "Your posts" ? ownPosts : posts;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["posts", userId] });
    void client.invalidateQueries({ queryKey: ["post-replies", userId] });
  };

  const submitPost = async () => {
    const value = body.trim();
    if (value.length < 3) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) {
      setNotice("Create your profile in You before posting.");
      return;
    }
    const { error } = await supabase
      .from("posts")
      .insert({ author_id: userId, author_name: profile.display_name, body: value, town });
    if (error) {
      setNotice("We couldn't publish your post. Please try again.");
      return;
    }
    setBody("");
    setView("Your posts");
    refresh();
  };

  const submitReply = async () => {
    const value = replyBody.trim();
    if (!replyTo || value.length < 2) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) {
      setNotice("Create your profile in You before replying.");
      return;
    }
    const { error } = await supabase.from("post_replies").insert({
      post_id: replyTo.id,
      sender_id: userId,
      sender_name: profile.display_name,
      body: value,
    });
    if (error) {
      setNotice("We couldn't send your private reply. Please try again.");
      return;
    }
    setReplyTo(null);
    setReplyBody("");
    setNotice("Reply sent privately to the post author.");
    refresh();
  };

  const removePost = async (postId: string) => {
    if (!window.confirm("Delete this post and its private replies?")) return;
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", userId);
    setNotice(error ? "We couldn't delete the post." : "Post deleted.");
    refresh();
  };

  const acceptReply = async (reply: LiveReply) => {
    const { data: matchId, error } = await supabase.rpc("accept_post_reply", {
      _reply_id: reply.id,
    });
    if (error || !matchId) {
      setNotice(
        error?.code === "42501"
          ? "This reply can’t be accepted. It may no longer be available."
          : "We couldn't connect you. Please try again.",
      );
      return;
    }
    refresh();
    await navigate({ to: "/chats", search: { matchId } });
  };

  return (
    <main className="mx-auto max-w-md pb-28">
      <PageHeader title="Posts" />
      <section className="mx-5 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="live-post-compose" className="sr-only">
          Write a post
        </label>
        <textarea
          id="live-post-compose"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Share a plan or ask the community…"
          className="w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <select
            aria-label="Post town"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="max-w-[55%] rounded-xl bg-secondary px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {towns.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">{300 - body.length}</span>
            <button
              type="button"
              disabled={body.trim().length < 3}
              onClick={() => void submitPost()}
              className="h-9 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
            >
              Post
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your name is shown. Replies are private to you and the author.
        </p>
      </section>
      <div
        className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-border px-5"
        role="tablist"
        aria-label="Post views"
      >
        {(["Feed", "Your posts", "Your replies"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => setView(item)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${view === item ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="mx-5 mt-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {postsQuery.isLoading ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading posts…</p>
      ) : view === "Your replies" ? (
        <ul className="mt-3 space-y-2 px-5">
          {ownReplies.map((reply) => (
            <li key={reply.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Your private reply</p>
              <p className="mt-2 text-sm leading-5">{reply.body}</p>
            </li>
          ))}
          {!ownReplies.length && (
            <EmptyState
              title="No replies sent"
              body="Your replies are private to you and the post author."
            />
          )}
        </ul>
      ) : (
        <ul className="mt-3 space-y-2 px-5">
          {visiblePosts.map((post) => {
            const postReplies = replies.filter((reply) => reply.post_id === post.id);
            return (
              <li key={post.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">{post.author_name}</span>
                  {post.author_id === userId && (
                    <button
                      type="button"
                      onClick={() => void removePost(post.id)}
                      className="text-xs text-muted-foreground"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[15px] leading-6">{post.body}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {post.town}
                    </span>
                    <span>{timeAgo(new Date(post.created_at).getTime())}</span>
                  </div>
                  {post.author_id !== userId && (
                    <button
                      onClick={() => {
                        setReplyTo(post);
                        setReplyBody("");
                      }}
                      className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold"
                    >
                      Reply privately
                    </button>
                  )}
                </div>
                {post.author_id === userId && postReplies.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                      Private replies · only you can see these
                    </p>
                    {postReplies.map((reply) => (
                      <div key={reply.id} className="rounded-xl bg-secondary p-3">
                        <p className="text-xs font-semibold">{reply.sender_name}</p>
                        <p className="mt-1 text-sm">{reply.body}</p>
                        {reply.accepted_match_id ? (
                          <Link
                            to="/chats"
                            search={{ matchId: reply.accepted_match_id }}
                            className="mt-3 inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                          >
                            Open chat
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void acceptReply(reply)}
                            className="mt-3 h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                          >
                            Accept and start chat
                          </button>
                        )}
                        <SafetyActions
                          userId={userId}
                          targetId={reply.sender_id}
                          targetName={reply.sender_name}
                          onBlocked={refresh}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {post.author_id !== userId &&
                  postReplies.some((reply) => reply.accepted_match_id) && (
                    <div className="mt-3">
                      <Link
                        to="/chats"
                        search={{
                          matchId:
                            postReplies.find((reply) => reply.accepted_match_id)
                              ?.accepted_match_id ?? "",
                        }}
                        className="text-xs font-semibold text-primary"
                      >
                        Your reply was accepted · Open chat
                      </Link>
                    </div>
                  )}
                {post.author_id !== userId && (
                  <div className="mt-3 border-t border-border pt-3">
                    <SafetyActions
                      userId={userId}
                      targetId={post.author_id}
                      targetName={post.author_name}
                      postId={post.id}
                      onBlocked={refresh}
                    />
                  </div>
                )}
              </li>
            );
          })}
          {!visiblePosts.length && (
            <EmptyState
              title={view === "Your posts" ? "No posts yet" : "Nothing here yet"}
              body="Posts from members will appear here."
            />
          )}
        </ul>
      )}
      <Drawer
        open={!!replyTo}
        onOpenChange={(open) => {
          if (!open) setReplyTo(null);
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 text-left">
            <div>
              <DrawerTitle>Reply privately</DrawerTitle>
              <DrawerDescription>Only the post author can see your reply.</DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Close reply"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>
          {replyTo && (
            <blockquote className="rounded-xl bg-secondary p-3 text-sm">{replyTo.body}</blockquote>
          )}
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            maxLength={300}
            rows={4}
            className="input mt-3 resize-none"
            placeholder="Write a thoughtful reply…"
          />
          <div className="mt-2 text-right text-xs text-muted-foreground">
            {300 - replyBody.length} characters left
          </div>
          <button
            type="button"
            disabled={replyBody.trim().length < 2}
            onClick={() => void submitReply()}
            className="mt-3 h-11 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-45"
          >
            Send private reply
          </button>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <li className="list-none rounded-2xl border border-border bg-card px-5 py-8 text-center">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-[270px] text-sm leading-5 text-muted-foreground">{body}</p>
    </li>
  );
}
