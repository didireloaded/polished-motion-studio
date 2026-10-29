import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { people, photo } from "@/lib/namlink";
import { DemoNotice } from "@/components/community";

export const Route = createFileRoute("/crossed-paths")({
  head: () => ({ meta: [{ title: "Crossed paths — NamLink" }] }),
  component: CrossedPaths,
});

function CrossedPaths() {
  const { user } = useSession();
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-8">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/radar" aria-label="Back to Nearby">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-[15px] font-semibold">Crossed paths</h1>
      </header>
      {user ? (
        <div className="px-5 pt-8 text-center">
          <MapPin className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Coming to Nearby</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Crossed paths will require your permission and will show approximate areas only.
            Location tracking is not active yet.
          </p>
          <Link
            to="/radar"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Explore nearby
          </Link>
        </div>
      ) : (
        <>
          <DemoNotice />
          <p className="px-5 py-3 text-[13px] leading-5">
            A preview of how recent crossings could appear. These are sample profiles and places.
          </p>
          <ul className="divide-y divide-border px-5">
            {people.slice(0, 6).map((person, index) => (
              <li key={person.id} className="flex items-center gap-3 py-3">
                <img
                  src={photo(person, true)}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {person.name} {person.age}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sample · near {person.town} · {index + 2} hrs ago
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
