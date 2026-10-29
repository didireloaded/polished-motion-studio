const consentKey = "mutal-product-analytics-consent";
const posthogKey = import.meta.env["VITE_POSTHOG_KEY"];
const posthogHost = import.meta.env["VITE_POSTHOG_HOST"];
const sentryDsn = import.meta.env["VITE_SENTRY_DSN"];

let analyticsPromise: Promise<(typeof import("posthog-js"))["default"] | null> | undefined;
let errorsStarted = false;

export const productAnalyticsAvailable = Boolean(posthogKey && posthogHost);

export function analyticsConsent(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(consentKey) === "yes";
}

async function analytics() {
  if (!productAnalyticsAvailable || !analyticsConsent()) return null;
  analyticsPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_persistence: true,
      bootstrap: { distinctID: crypto.randomUUID() },
      save_referrer: false,
      save_campaign_params: false,
    });
    return posthog;
  });
  return analyticsPromise;
}

export async function setAnalyticsConsent(allowed: boolean) {
  localStorage.setItem(consentKey, allowed ? "yes" : "no");
  if (allowed) (await analytics())?.opt_in_capturing();
  else if (analyticsPromise) (await analyticsPromise)?.opt_out_capturing();
}

export async function captureProductEvent(
  event: "like_sent" | "event_interest" | "date_confirmed",
) {
  try {
    const client = await analytics();
    if (client && analyticsConsent()) client.capture(event);
  } catch {
    // Analytics must never interrupt member actions.
  }
}

export async function startCrashReporting() {
  if (errorsStarted || !sentryDsn || typeof window === "undefined") return;
  errorsStarted = true;
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0,
      beforeSend(event) {
        // Dating profiles and conversations must never become diagnostic payloads.
        delete event.user;
        delete event.request;
        delete event.breadcrumbs;
        delete event.contexts;
        delete event.extra;
        delete event.message;
        for (const exception of event.exception?.values ?? []) exception.value = "Client error";
        return event;
      },
    });
  } catch {
    errorsStarted = false;
  }
}
