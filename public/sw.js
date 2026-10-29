self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const kind = (() => {
    try {
      return event.data?.json()?.kind;
    } catch {
      return undefined;
    }
  })();
  const target = kind === "post_reply" ? "/posts" : "/chats";
  event.waitUntil(
    self.registration.showNotification("Mutal", {
      body: "You have a new update.",
      icon: "/icons/mutal-regular-192.png",
      badge: "/favicon-32x32.png",
      data: { target },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.target === "/posts" ? "/posts" : "/chats";
  event.waitUntil(self.clients.openWindow(target));
});
