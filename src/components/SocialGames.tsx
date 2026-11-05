import { useEffect, useState } from "react";
import {
  castFeedPollVoteServerFn,
  getMyFeedPollVotesServerFn,
} from "@/lib/social-backend.functions";
import { triggerHaptic } from "@/lib/icebreakers";
import { dailyHotTakePrompts, flagSwipePolls } from "@/lib/social-games";

export function HotTakeAndFlagPollHub({
  onAgreeWithTake,
  userId,
  town = "Windhoek",
}: {
  onAgreeWithTake: (quipText: string) => void;
  userId: string;
  town?: string;
}) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getMyFeedPollVotesServerFn()
      .then((ids) => {
        if (active) setCompleted(ids);
      })
      .catch(() => {
        if (active) setError("Polls could not load. Try again later.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const pending = flagSwipePolls.filter((poll) => !completed.includes(poll.id));
  const poll = pending[0];

  const vote = async (choice: "green" | "red") => {
    if (!poll || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await castFeedPollVoteServerFn({ data: { pollId: poll.id, choice, town } });
      if (!result.ok) throw new Error("Vote was not saved");
    } catch {
      setError("Your vote did not save. Please try again.");
      setSaving(false);
      return;
    }
    triggerHaptic(choice === "green" ? "like" : "pass");
    const next = [...completed, poll.id];
    setCompleted(next);
    setSaving(false);
  };

  return (
    <div className="mx-4 mt-4 flex flex-col gap-3">
      <section aria-label="Hot takes" className="order-2">
        <h2 className="mb-2 text-[14px] font-semibold text-foreground">Hot takes</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {dailyHotTakePrompts.slice(0, 3).map((take) => (
            <button
              key={take.id}
              type="button"
              onClick={() => onAgreeWithTake(`I agree: ${take.prompt}`)}
              className="flex min-h-[86px] min-w-[230px] max-w-[230px] flex-col justify-between rounded-[18px] border border-border bg-white p-3 text-left"
            >
              <span className="line-clamp-2 text-[13px] leading-[18px] text-foreground">
                {take.prompt}
              </span>
              <span className="text-[11px] font-medium text-primary">Agree? Write your own</span>
            </button>
          ))}
        </div>
      </section>
      {!loading && poll && (
        <section
          aria-label="Green or red flag poll"
          className="order-1 rounded-[20px] border border-border bg-white p-4"
        >
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="uppercase tracking-wide">Quick poll</span>
            <span>{pending.length} left</span>
          </div>
          <h2 className="mt-2 text-[15px] font-semibold leading-6 text-foreground">
            {poll.statement}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void vote("green")}
              className="h-10 rounded-full bg-secondary text-sm font-medium text-foreground transition-colors hover:text-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              Green flag
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void vote("red")}
              className="h-10 rounded-full bg-primary text-sm font-medium text-white transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              Red flag
            </button>
          </div>
        </section>
      )}
      {error && (
        <p role="status" className="text-xs text-primary">
          {error}
        </p>
      )}
    </div>
  );
}
