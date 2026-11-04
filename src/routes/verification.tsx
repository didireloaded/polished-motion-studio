import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const VerificationScreen = lazy(() => import("@/components/screens/VerificationScreen"));

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Verification — Mutal" }] }),
  component: VerificationRoute,
});

function VerificationRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-svh max-w-md bg-white px-5 py-10 text-sm text-muted-foreground">
          Loading verification…
        </main>
      }
    >
      <VerificationScreen />
    </Suspense>
  );
}
