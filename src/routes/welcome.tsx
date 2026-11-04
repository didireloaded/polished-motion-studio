import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Mutal" }] }),
  component: Welcome,
});

function Welcome() {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-[440px] flex-col overflow-hidden bg-black text-white">
      <img
        src="/design/welcome-couple.jpg"
        alt="A couple laughing together outdoors"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85"
        aria-hidden="true"
      />
      <div className="relative mt-auto text-center">
        <img src="/brand/mutal-symbol.png" alt="" className="mx-auto h-20 w-20 object-contain" />
        <h1 className="mt-3 text-[31px] font-bold tracking-[-0.04em]">Mutal</h1>
        <p className="mx-auto mt-2 max-w-60 text-[17px] font-medium leading-6">
          Meet people worth knowing
          <br />
          in Namibia.
        </p>
        <a
          href="/auth?mode=up"
          className="welcome-create mt-8 flex h-[52px] w-full items-center justify-center bg-primary text-[15px] font-semibold text-white"
        >
          Create account
        </a>
        <Link
          to="/auth"
          className="block px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-4 text-[13px] font-medium text-white/90"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  );
}
