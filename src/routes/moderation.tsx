import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ModerationScreen = lazy(() => import("@/components/screens/ModerationScreen"));

export const Route = createFileRoute("/moderation")({
  component: ModerationRoute,
});

function ModerationRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">
          Loading moderation…
        </main>
      }
    >
      <ModerationScreen />
    </Suspense>
  );
}
