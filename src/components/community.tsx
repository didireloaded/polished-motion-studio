import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, ShieldBan, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";

export function DemoNotice() {
  return (
    <div className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
      <span>Demo mode · activity is only saved on this device.</span>
      <Link to="/auth" className="shrink-0 font-semibold text-primary">
        Sign in
      </Link>
    </div>
  );
}

export function ProfilePhoto({
  name,
  src,
  path,
  className = "",
}: {
  name: string;
  src?: string | undefined;
  path?: string | undefined;
  className?: string;
}) {
  const signedPhoto = useQuery({
    queryKey: ["signed-profile-photo", path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const image = src ?? signedPhoto.data;
  if (image) return <img src={image} alt={`${name}'s profile`} className={className} />;
  return (
    <div
      aria-label={`${name}'s profile photo`}
      className={`flex items-center justify-center bg-accent text-2xl font-semibold text-accent-foreground ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function SafetyActions({
  targetId,
  targetName,
  userId,
  postId,
  onBlocked,
}: {
  targetId: string;
  targetName: string;
  userId: string;
  postId?: string;
  onBlocked?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const block = async () => {
    if (
      !window.confirm(
        `Block ${targetName}? Their profile and conversation will disappear, and they won't be able to contact you.`,
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("blocks")
      .upsert(
        { blocker_id: userId, blocked_id: targetId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    setBusy(false);
    if (error) {
      setNotice("We couldn't block this member. Please try again.");
      return;
    }
    onBlocked?.();
  };

  const report = async () => {
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: targetId,
      post_id: postId ?? null,
      category: category as
        "harassment" | "fake_profile" | "inappropriate" | "scam" | "underage" | "other",
      details: details.trim(),
    });
    setBusy(false);
    if (error) {
      setNotice("We couldn't submit the report. Please try again.");
      return;
    }
    setOpen(false);
    setDetails("");
    setNotice("Report received. It is private and won't be shown to the member.");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={block}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        <ShieldBan className="h-3.5 w-3.5" />
        Block
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>
      {notice && (
        <span role="status" className="basis-full text-xs text-muted-foreground">
          {notice}
        </span>
      )}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md rounded-t-[26px] border-border bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-start justify-between px-0 text-left">
            <div>
              <DrawerTitle>Report {postId ? "this post" : "this profile"}</DrawerTitle>
              <DrawerDescription>
                Your report is private. The member won't see who sent it.
              </DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Close report"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>
          <label htmlFor="report-category" className="text-sm font-medium">
            What happened?
          </label>
          <select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input mt-2"
          >
            <option value="inappropriate">Inappropriate content</option>
            <option value="harassment">Harassment</option>
            <option value="fake_profile">Fake profile</option>
            <option value="scam">Scam or suspicious behavior</option>
            <option value="underage">Member may be under 18</option>
            <option value="other">Something else</option>
          </select>
          <label htmlFor="report-details" className="mt-4 text-sm font-medium">
            More context (optional)
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            className="input mt-2 resize-none"
            placeholder="Share only what helps us review this."
          />
          <button
            type="button"
            onClick={report}
            disabled={busy}
            className="mt-4 h-11 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Sending…" : "Submit private report"}
          </button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
