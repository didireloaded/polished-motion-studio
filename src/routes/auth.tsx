import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { currentNextPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mutal" },
      { name: "description", content: "Sign in or create your Mutal account." },
      { property: "og:title", content: "Sign in — Mutal" },
      { property: "og:description", content: "Sign in or create your Mutal account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL(currentNextPath() ?? "/you", window.location.origin).href,
          },
        });
        if (error) setMsg(error.message);
        else if (!data.session) setMsg("Check your email to confirm your account.");
        else {
          const next = currentNextPath();
          if (next) window.location.assign(next);
          else await navigate({ to: "/you" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
        else {
          const next = currentNextPath();
          if (next) window.location.assign(next);
          else await navigate({ to: "/you" });
        }
      }
    } catch {
      setMsg("We couldn't reach the sign-in service. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: new URL(currentNextPath() ?? "/you", window.location.origin).href,
      });
      if (result?.error) setMsg(result.error.message ?? "Google sign-in couldn't be started.");
    } catch {
      setMsg("Google sign-in couldn't be started. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setMsg("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setMsg(error ? error.message : "Check your email for a password reset link.");
  };

  return (
    <main className="mx-auto min-h-svh max-w-[440px] bg-white px-6 pb-10 pt-9">
      <Link
        to="/welcome"
        aria-label="Back to welcome"
        className="text-[13px] text-muted-foreground"
      >
        ‹ Back
      </Link>
      <div className="mt-6 text-center">
        <BrandLogo className="mx-auto h-10" />
        <p className="mt-1 text-[11px] text-muted-foreground">Same land. Real connections.</p>
      </div>
      <img
        src="/design/auth-landscape.jpg"
        alt="Illustration of a Namibian quiver tree and desert hills"
        className="mt-5 h-[142px] w-full rounded-xl object-cover"
      />
      <h1 className="mt-6 text-[20px] font-semibold tracking-[-0.03em]">
        {mode === "in" ? "Sign in" : "Create your account"}
      </h1>
      <div className="mt-5 space-y-4">
        <label className="block text-[12px] font-semibold">
          Email address
          <input
            className="input mt-1.5 bg-white"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-[12px] font-semibold">
          Password
          <input
            className="input mt-1.5 bg-white"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mode === "in" && (
          <button
            type="button"
            onClick={() => void resetPassword()}
            className="block w-full text-right text-[12px] text-primary"
          >
            Forgot password?
          </button>
        )}
        <button
          disabled={busy || !email || password.length < 8}
          onClick={submit}
          className="mt-1 h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-45"
        >
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
        <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <button
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="h-11 w-full rounded-full border border-border text-sm font-semibold"
        >
          <span className="mr-2 font-bold text-[#4285f4]">G</span> Sign in with Google
        </button>
        {msg && (
          <p role="status" className="text-sm text-muted-foreground">
            {msg}
          </p>
        )}
      </div>
      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-5 w-full text-center text-[13px] text-primary"
      >
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      <p className="mt-6 text-center text-[11px] leading-4 text-muted-foreground">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </main>
  );
}
