const STATIC_CACHE_NAME = "mutal-static-v1";
const STATIC_ASSET_PREFIXES = ["/brand/", "/icons/", "/design/", "/editorial/"];

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    const isStaticAsset = STATIC_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    if (!isStaticAsset) return;

    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              void cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
  } catch {
    // ignore malformed URLs
  }
});

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
