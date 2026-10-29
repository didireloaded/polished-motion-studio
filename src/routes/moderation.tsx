import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/TabBar";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/moderation")({ component: Moderation });

type Report = {
  id: string;
  reported_id: string;
  post_id: string | null;
  category: string;
  details: string;
  created_at: string;
  status: "open" | "reviewed" | "actioned" | "dismissed";
  moderator_note: string;
};

function Moderation() {
  const { user, ready } = useSession();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const roles = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map(({ role }) => role);
    },
  });
  const authorized = roles.data?.some((role) => role === "moderator" || role === "admin") ?? false;
  const reports = useQuery({
    queryKey: ["moderation-reports"],
    enabled: authorized,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id,reported_id,post_id,category,details,created_at,status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const { data: reviews, error: reviewsError } = await supabase
        .from("report_reviews")
        .select("report_id,moderator_note");
      if (reviewsError) throw reviewsError;
      const notes = new Map(
        (reviews ?? []).map((review) => [review.report_id, review.moderator_note]),
      );
      return (data as Omit<Report, "moderator_note" | "reporter_id">[]).map((report) => ({
        ...report,
        moderator_note: notes.get(report.id) ?? "",
      }));
    },
  });

  const review = async (reportId: string, status: Report["status"], note: string) => {
    if (status === "open") return;
    setNotice("");
    const { error } = await supabase.rpc("review_report", {
      _report_id: reportId,
      _status: status,
      _moderator_note: note.slice(0, 500),
    });
    if (error) {
      setNotice("We couldn't update this report. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["moderation-reports"] });
    setNotice("Report updated.");
  };

  if (!ready || roles.isLoading)
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  if (!user || !authorized)
    return (
      <main className="mx-auto max-w-md px-5 py-10">
        <PageHeader title="Moderation" />
        <p className="text-sm text-muted-foreground">This area is available to moderators only.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-md space-y-4 pb-28">
      <PageHeader title="Moderation" eyebrow="Private member reports" />
      {notice && (
        <p role="status" className="px-5 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {reports.isLoading ? (
        <p className="px-5 text-sm text-muted-foreground">Loading reports…</p>
      ) : reports.isError ? (
        <p role="alert" className="px-5 text-sm text-muted-foreground">
          Reports couldn’t be loaded.
        </p>
      ) : !reports.data?.length ? (
        <p className="px-5 text-sm text-muted-foreground">No reports have been filed.</p>
      ) : (
        <ul className="space-y-3 px-5">
          {reports.data.map((report) => (
            <ReportCard key={report.id} report={report} onReview={review} />
          ))}
        </ul>
      )}
    </main>
  );
}

function ReportCard({
  report,
  onReview,
}: {
  report: Report;
  onReview: (id: string, status: Report["status"], note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(report.moderator_note);
  const [busy, setBusy] = useState(false);
  const submit = async (status: Report["status"]) => {
    setBusy(true);
    await onReview(report.id, status, note);
    setBusy(false);
  };
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize">{report.category.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Filed {new Date(report.created_at).toLocaleString()} · {report.status}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">Report {report.id.slice(0, 8)}</span>
      </div>
      <p className="mt-3 text-sm leading-5">{report.details || "No additional details."}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div>
          <dt>Reported member</dt>
          <dd className="break-all">{report.reported_id}</dd>
        </div>
        {report.post_id && (
          <div>
            <dt>Post</dt>
            <dd className="break-all">{report.post_id}</dd>
          </div>
        )}
      </dl>
      <label className="mt-3 block text-xs font-medium" htmlFor={`note-${report.id}`}>
        Private moderator note
      </label>
      <textarea
        id={`note-${report.id}`}
        value={note}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        className="input mt-1 min-h-16 resize-y"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {(["reviewed", "actioned", "dismissed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => void submit(status)}
            className="h-9 rounded-full bg-secondary px-3 text-xs font-semibold capitalize disabled:opacity-50"
          >
            Mark {status}
          </button>
        ))}
      </div>
    </li>
  );
}
