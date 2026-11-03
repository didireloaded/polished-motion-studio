import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function NearbyFeatureShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-[env(safe-area-inset-bottom)] text-foreground">
      <header className="flex h-14 items-center border-b border-border px-5">
        <Link
          to="/radar"
          aria-label="Back to Nearby"
          className="flex h-10 w-10 items-center justify-start text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-10 text-center text-[15px] font-semibold">{title}</h1>
      </header>
      {children}
    </main>
  );
}
