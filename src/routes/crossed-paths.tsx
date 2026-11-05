import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Footprints } from "lucide-react";

export const Route = createFileRoute("/crossed-paths")({
  head: () => ({ meta: [{ title: "Crossed paths — Mutal" }] }),
  component: CrossedPaths,
});

function CrossedPaths() {
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-24">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/radar" aria-label="Back to Nearby">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-[15px] font-semibold">Crossed paths</h1>
      </header>
      <section className="px-8 py-20 text-center">
        <Footprints className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-base font-semibold">Crossed paths isn’t available yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We’ll show encounters here only after opt-in location matching is ready.
        </p>
      </section>
    </main>
  );
}
