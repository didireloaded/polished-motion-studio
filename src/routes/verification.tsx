import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, LockKeyhole, Smartphone } from "lucide-react";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Verification — NamLink" }] }),
  component: Verification,
});

function Verification() {
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white px-5 pb-10">
      <header className="flex h-14 items-center">
        <Link to="/you" aria-label="Back to profile">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </header>
      <h1 className="text-[22px] font-semibold">Help keep NamLink safe</h1>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        We want members to know who they are meeting.
      </p>
      <section className="mt-6 space-y-3">
        <div className="rounded-[15px] border border-border p-4">
          <div className="flex gap-3">
            <Camera className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Verify your identity</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A live selfie check is planned. It is not available yet.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[15px] border border-border p-4">
          <div className="flex gap-3">
            <Smartphone className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Verify your phone number</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Phone verification is planned. It is not available yet.
              </p>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-8 flex gap-2 text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="h-4 w-4 shrink-0" /> Your identity information would only be used
        for verification.
      </p>
    </main>
  );
}
