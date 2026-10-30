import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Details = {
  client?: { name?: string; client_name?: string; redirect_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type Result = { data: Details | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<Result>;
  approveAuthorization: (id: string) => Promise<Result>;
  denyAuthorization: (id: string) => Promise<Result>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  head: () => ({
    meta: [
      { title: "Connect an assistant — Mutal" },
      { name: "description", content: "Approve or deny an assistant's access to your Mutal account." },
      { property: "og:title", content: "Connect an assistant — Mutal" },
      { property: "og:description", content: "Approve or deny an assistant's access to your Mutal account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Consent,
  errorComponent: () => (
    <main className="mx-auto max-w-[440px] px-6 py-16 text-center text-sm">
      Something went wrong loading this request. Go back to your assistant and try connecting again.
    </main>
  ),
});

const scopeLabel = (s: string) =>
  s === "openid" ? null : s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : `Additional permission requested: ${s}`;

function Consent() {
  const [state, setState] = useState<"loading" | "ready" | "error" | "busy">("loading");
  const [msg, setMsg] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [email, setEmail] = useState("");
  const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("authorization_id") : null;

  useEffect(() => {
    (async () => {
      if (!id) {
        setMsg("This connection link is missing or invalid.");
        return setState("error");
      }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        const next = window.location.pathname + window.location.search;
        window.location.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      setEmail(s.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(id);
        if (error) throw error;
        const redirect = data?.redirect_url ?? data?.redirect_to;
        if (redirect && !data?.client) return window.location.replace(redirect);
        setDetails(data);
        setState("ready");
      } catch {
        setMsg("This request has expired or couldn't be loaded. Start connecting again from your assistant.");
        setState("error");
      }
    })();
  }, [id]);

  const decide = async (approve: boolean) => {
    if (!id) return;
    setState("busy");
    try {
      const { data, error } = approve ? await oauth().approveAuthorization(id) : await oauth().denyAuthorization(id);
      if (error) throw error;
      const redirect = data?.redirect_url ?? data?.redirect_to;
      if (redirect) return window.location.replace(redirect);
      throw new Error("no redirect");
    } catch {
      setMsg(approve ? "We couldn't approve this connection. Please try again." : "We couldn't cancel this connection. Please try again.");
      setState("ready");
    }
  };

  const name = details?.client?.name ?? details?.client?.client_name ?? "This assistant";
  const redirectUri = details?.client?.redirect_uri ?? details?.redirect_uri;
  const scopes = (details?.scope ?? "").split(" ").filter(Boolean).map(scopeLabel).filter(Boolean);

  return (
    <main className="mx-auto min-h-svh max-w-[440px] px-6 py-14">
      {state === "loading" && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
      {state === "error" && <p className="text-center text-sm">{msg}</p>}
      {(state === "ready" || state === "busy") && (
        <div className="rounded-2xl border border-border p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.03em]">Connect {name} to Mutal</h1>
          {email && <p className="mt-1 text-[12px] text-muted-foreground">Signed in as {email}</p>}
          {redirectUri && <p className="mt-1 break-all text-[12px] text-muted-foreground">Returns to {redirectUri}</p>}
          <p className="mt-4 text-sm">This lets {name} use Mutal as you: read your profile, your matches and community posts.</p>
          {scopes.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm">{scopes.map((s) => <li key={s!}>{s}</li>)}</ul>
          )}
          <p className="mt-3 text-[12px] text-muted-foreground">This does not bypass Mutal's privacy rules.</p>
          {msg && <p role="alert" className="mt-3 text-sm text-destructive">{msg}</p>}
          <button disabled={state === "busy"} onClick={() => void decide(true)} className="mt-5 h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-45">
            Approve
          </button>
          <button disabled={state === "busy"} onClick={() => void decide(false)} className="mt-2 h-11 w-full rounded-full border border-border text-sm font-semibold">
            Cancel connection
          </button>
        </div>
      )}
    </main>
  );
}
