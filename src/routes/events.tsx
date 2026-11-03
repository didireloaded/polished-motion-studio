import { createFileRoute } from "@tanstack/react-router";
import { NearbyPage } from "./radar";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events — Mutal" }] }),
  component: () => <NearbyPage page="events" />,
});
