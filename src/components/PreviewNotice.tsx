import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NOTICE_KEY = "mutal-preview-notice-v2";

export function PreviewNotice() {
  const { user, ready } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const excluded = ["/welcome", "/auth", "/verification", "/safety"].includes(pathname);

  useEffect(() => {
    if (!ready || user || excluded) {
      setOpen(false);
      return;
    }
    try {
      setOpen(sessionStorage.getItem(NOTICE_KEY) !== "seen");
    } catch {
      setOpen(true);
    }
  }, [ready, user, excluded]);

  const acknowledge = () => {
    try {
      sessionStorage.setItem(NOTICE_KEY, "seen");
    } catch {
      // The notice can still close when browser storage is unavailable.
    }
    setOpen(false);
  };

  return (
    <Dialog open={open && !user && !excluded} onOpenChange={(next) => !next && acknowledge()}>
      <DialogContent className="w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">Take a look around</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6">
            These profiles, posts, events and conversations are fictional preview content. Your
            actions stay on this device and don’t contact anyone.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={acknowledge}
          className="mt-2 h-12 rounded-full bg-primary text-sm font-semibold text-white"
        >
          Explore Mutal
        </button>
        <Link
          to="/welcome"
          onClick={acknowledge}
          className="flex min-h-11 items-center justify-center text-sm font-semibold text-foreground"
        >
          Create an account for real connections
        </Link>
      </DialogContent>
    </Dialog>
  );
}
