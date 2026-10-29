import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — NamLink" }] }),
  component: Welcome,
});

function Welcome() {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-[440px] flex-col overflow-hidden bg-foreground text-white">
      <img
        src="/design/welcome-couple.jpg"
        alt="A couple laughing together outdoors"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="bg-scrim absolute inset-0" aria-hidden="true" />
      <div className="relative mt-auto px-8 pb-[calc(36px+env(safe-area-inset-bottom))] text-center">
        <p className="text-[38px] font-bold tracking-[-0.06em]">NamLink</p>
        <p className="mt-2 text-[18px] font-medium leading-6">
          Meet people worth knowing
          <br />
          in Namibia.
        </p>
        <Link
          to="/auth"
          className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-white"
        >
          Get started
        </Link>
        <Link to="/auth" className="mt-4 inline-block text-[13px] font-medium text-white/90">
          Already have an account? Sign in
        </Link>
        <Link to="/" className="mt-5 block text-[11px] text-white/70">
          Explore the sample app
        </Link>
      </div>
    </main>
  );
}
