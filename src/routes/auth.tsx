import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NamLink" },
      { name: "description", content: "Sign in or create your NamLink account." },
      { property: "og:title", content: "Sign in — NamLink" },
      { property: "og:description", content: "Sign in or create your NamLink account." },
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
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) setMsg(error.message);
        else if (!data.session) setMsg("Check your email to confirm your account.");
        else await navigate({ to: "/you" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
        else await navigate({ to: "/you" });
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
        redirect_uri: window.location.origin,
      });
      if (result?.error) setMsg(result.error.message ?? "Google sign-in couldn't be started.");
    } catch {
      setMsg("Google sign-in couldn't be started. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-5 pb-28 pt-10">
      <h1 className="text-[23px] font-semibold tracking-[-0.02em]">
        {mode === "in" ? "Welcome back" : "Join NamLink"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">We only ask for an email and password.</p>
      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={busy || !email || password.length < 8}
          onClick={submit}
          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-45"
        >
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="h-11 w-full rounded-xl border border-border text-sm font-semibold"
        >
          Continue with Google
        </button>
        {msg && (
          <p role="status" className="text-sm text-muted-foreground">
            {msg}
          </p>
        )}
      </div>
      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-4 text-sm text-primary"
      >
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
