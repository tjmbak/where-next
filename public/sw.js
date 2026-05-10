// Where Next service worker — minimal scope: handle web push notifications and
// click events. Caching strategy is intentionally absent; Next.js owns asset
// caching via its build pipeline.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Where Next", body: event.data.text() };
  }

  const title = payload.title || "Where Next";
  const options = {
    body: payload.body,
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/badge.png",
    data: { url: payload.url || "/" },
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction)
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && new URL(client.url).origin === self.location.origin) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
