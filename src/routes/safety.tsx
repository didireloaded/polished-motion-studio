import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Flag,
  LockKeyhole,
  MapPin,
  PauseCircle,
  ShieldAlert,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "Safety and privacy — NamLink" }] }),
  component: Safety,
});

const items = [
  {
    icon: ShieldAlert,
    title: "Block or report",
    detail: "Open a member's profile, post, or chat to use the block and report controls.",
    available: true,
    to: "/chats" as const,
  },
  {
    icon: Users,
    title: "Hide me from contacts",
    detail: "Contact hiding is planned and is not active yet.",
    available: false,
  },
  {
    icon: Flag,
    title: "Share a date",
    detail: "Date sharing with a trusted friend is planned.",
    available: false,
  },
  {
    icon: MapPin,
    title: "Check-in",
    detail: "Safety check-ins are planned and are not active yet.",
    available: false,
  },
  {
    icon: PauseCircle,
    title: "Pause my profile",
    detail: "Use your profile settings to manage your visibility.",
    available: true,
    to: "/you" as const,
  },
];

function Safety() {
  return (
    <main className="mx-auto min-h-svh max-w-md bg-white pb-10">
      <header className="flex h-14 items-center gap-3 px-5">
        <Link to="/you" aria-label="Back to profile">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 pr-5 text-center text-sm font-semibold">Safety and privacy</h1>
      </header>
      <ul className="space-y-2 px-4 pt-4">
        {items.map(({ icon: Icon, title, detail, available, to }) => (
          <li
            key={title}
            className="flex items-center gap-3 rounded-[14px] border border-border p-4"
          >
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
            </div>
            {available && to && (
              <Link
                to={to}
                {...(to === "/chats" ? { search: { matchId: undefined } } : {})}
                aria-label={`Open ${title}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="mx-4 mt-6 flex gap-3 rounded-[14px] bg-secondary p-4">
        <LockKeyhole className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-5 text-muted-foreground">
          Your safety matters. Meet in public places and tell someone you trust about your plans.
        </p>
      </div>
    </main>
  );
}
