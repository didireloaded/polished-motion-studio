import { supabase } from "@/integrations/supabase/client";

const publicKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"] ?? "";
export const pushConfigured = Boolean(publicKey);

function decodeKey(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function registerPwaWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function currentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePush(userId: string) {
  if (!pushConfigured || !("PushManager" in window) || !("Notification" in window))
    throw new Error("Device alerts are unavailable here.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await registerPwaWorker();
  if (!registration) throw new Error("Service workers are unavailable here.");
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(publicKey),
    }));
  const keys = subscription.toJSON().keys;
  if (!keys?.["p256dh"] || !keys["auth"]) throw new Error("Device subscription was incomplete.");
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: keys["p256dh"],
    auth: keys["auth"],
  });
  if (error && error.code !== "23505") throw new Error("Couldn't save device alerts.");
  if (error?.code === "23505") {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();
    if (!data) throw new Error("This device is registered to another account.");
  }
}

export async function disablePush(userId: string) {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", subscription.endpoint);
  if (error) throw new Error("Couldn't remove device alerts.");
  await subscription.unsubscribe();
}
