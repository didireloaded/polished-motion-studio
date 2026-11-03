import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { ProfilePhoto } from "@/components/community";
import { generateIcebreakers, triggerHaptic } from "@/lib/icebreakers";
import { captureProductEvent } from "@/lib/telemetry";

export type CelebrationMatch = {
  matchId?: string;
  partnerId: string;
  partnerName: string;
  partnerTown?: string;
  partnerTags?: string[];
  partnerIntent?: string;
  partnerPhotoSrc?: string;
  partnerPhotoPath?: string;
  myName?: string;
  myPhotoSrc?: string;
  myPhotoPath?: string;
};

export function MatchCelebrationModal({
  match,
  onClose,
}: {
  match: CelebrationMatch | null;
  onClose: () => void;
}) {
  const icebreakers = match
    ? generateIcebreakers({
        name: match.partnerName,
        ...(match.partnerTown ? { town: match.partnerTown } : {}),
        ...(match.partnerTags ? { tags: match.partnerTags } : {}),
        ...(match.partnerIntent ? { intent: match.partnerIntent } : {}),
      })
    : [];

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-celebration-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75 px-5 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.88, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="relative w-full max-w-[390px] overflow-hidden rounded-[28px] border border-border bg-card px-6 pb-6 pt-7 text-center shadow-float"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl"
            />
            <div className="relative mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Mutual connection
            </div>

            <div className="relative mt-5 flex items-center justify-center">
              <motion.div
                initial={{ x: -36, rotate: -10, scale: 0.82 }}
                animate={{ x: 10, rotate: -4, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.06 }}
                className="h-24 w-24 overflow-hidden rounded-full border-4 border-card shadow-md"
              >
                <ProfilePhoto
                  name={match.myName || "You"}
                  src={match.myPhotoSrc}
                  path={match.myPhotoPath}
                  className="h-full w-full object-cover"
                />
              </motion.div>

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.18 }}
                className="z-10 -mx-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md"
              >
                <Heart className="h-5 w-5 fill-current" />
              </motion.span>

              <motion.div
                initial={{ x: 36, rotate: 10, scale: 0.82 }}
                animate={{ x: -10, rotate: 4, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.06 }}
                className="h-24 w-24 overflow-hidden rounded-full border-4 border-card shadow-md"
              >
                <ProfilePhoto
                  name={match.partnerName}
                  src={match.partnerPhotoSrc}
                  path={match.partnerPhotoPath}
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </div>

            <h2
              id="match-celebration-title"
              className="mt-5 text-[24px] font-bold tracking-[-0.03em] text-foreground"
            >
              It’s a Match!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You and <span className="font-semibold text-foreground">{match.partnerName}</span>{" "}
              both want to connect.
            </p>

            {icebreakers.length > 0 && (
              <div className="mt-5 text-left">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tap an icebreaker to start talking
                </p>
                <div className="space-y-1.5">
                  {icebreakers.map((prompt) => (
                    <Link
                      key={prompt}
                      to="/chats"
                      search={{
                        matchId: match.matchId ?? match.partnerId,
                        draft: prompt,
                      }}
                      onClick={() => {
                        triggerHaptic(15);
                        void captureProductEvent("match_say_hello", { via: "icebreaker" });
                        onClose();
                      }}
                      className="block rounded-2xl border border-border bg-secondary/60 px-3.5 py-2 text-xs leading-4 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      “{prompt}”
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <Link
                to="/chats"
                search={{
                  matchId: match.matchId ?? match.partnerId,
                  draft: undefined,
                }}
                onClick={() => {
                  triggerHaptic(20);
                  void captureProductEvent("match_say_hello", { via: "button" });
                  onClose();
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float transition-transform active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" />
                Say hello
              </Link>
              <button
                type="button"
                onClick={() => {
                  void captureProductEvent("match_keep_swiping");
                  onClose();
                }}
                className="h-10 w-full rounded-full text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Keep swiping
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
