import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DatePlanScreen = lazy(() => import("@/components/screens/DatePlanScreen"));

export const Route = createFileRoute("/date-plan")({
  validateSearch: (search: Record<string, unknown>) => ({
    matchId: typeof search["matchId"] === "string" ? search["matchId"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Date plan — Mutal" }] }),
  component: DatePlanRoute,
});

function DatePlanRoute() {
  const { matchId } = Route.useSearch();
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-svh max-w-md bg-white px-5 py-10 text-sm text-muted-foreground">
          Loading date plan…
        </main>
      }
    >
      <DatePlanScreen matchId={matchId} />
    </Suspense>
  );
}
