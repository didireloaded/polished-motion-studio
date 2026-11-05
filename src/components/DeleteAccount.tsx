import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount, getAccountDeletionStatus } from "@/lib/account-deletion.functions";
import { supabase } from "@/integrations/supabase/client";

export function DeleteAccount({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ["account-deletion-status", userId],
    queryFn: () => getAccountDeletionStatus(),
    enabled: open,
    staleTime: 0,
    retry: false,
  });
  const needsSignIn = requiresSignIn || status.data?.requiresSignIn;
  const removeAccount = async () => {
    if (confirmation !== "DELETE" || busy || !status.data?.available || needsSignIn) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await deleteMyAccount({ data: { confirmation: "DELETE" } });
      if (!result.deleted) {
        setMessage(result.message);
        setRequiresSignIn(result.requiresSignIn);
        return;
      }
      try {
        await supabase.auth.signOut({ scope: "local" });
      } finally {
        client.clear();
        window.location.replace("/welcome");
      }
    } catch {
      setMessage("We couldn't confirm account deletion. Please sign in again before retrying.");
      setRequiresSignIn(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Delete account" className="mx-auto max-w-md px-5 pb-28 pt-3">
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (next) {
            setConfirmation("");
            setMessage("");
            setRequiresSignIn(false);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <button type="button" className="min-h-11 text-sm font-medium text-destructive">
            Delete account
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[calc(100%-32px)] max-w-sm rounded-2xl bg-white text-left">
          <AlertDialogTitle className="text-lg font-semibold">
            Delete your account?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
            This permanently deletes your profile, photos, voice intro, posts, events you created,
            matches, chats, and activity. Your matches will lose access to your conversations and
            date plans. Safety reports and moderation records are retained for abuse investigations.
            This cannot be undone.
          </AlertDialogDescription>
          {status.isFetching ? (
            <p role="status" className="text-sm text-muted-foreground">
              Checking your account…
            </p>
          ) : status.isError || !status.data?.available ? (
            <p role="alert" className="text-sm text-destructive">
              Account deletion is unavailable right now. Please try again later.
            </p>
          ) : needsSignIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                For your security, sign in again before deleting your account.
              </p>
              <a
                href="/auth?next=%2Fyou"
                className="flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-semibold text-white"
              >
                Sign in again
              </a>
            </>
          ) : (
            <div>
              <label htmlFor="delete-account-confirmation" className="text-sm font-medium">
                Type DELETE to confirm
              </label>
              <input
                id="delete-account-confirmation"
                value={confirmation}
                disabled={busy}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-sm"
              />
              <button
                type="button"
                disabled={busy || confirmation !== "DELETE"}
                onClick={() => void removeAccount()}
                className="mt-4 min-h-11 w-full rounded-xl bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Deleting account…" : "Permanently delete account"}
              </button>
            </div>
          )}
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <AlertDialogCancel disabled={busy} className="min-h-11 rounded-xl">
            Keep my account
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
