// Service Worker für Push-Mitteilungen (OHealth). Zeigt Pushs an und öffnet beim Tippen die
// passende Seite. Ist die Seite schon offen und sichtbar, erscheint keine zusätzliche Meldung.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "OHealth", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "OHealth";
  const url = data.url || "/mitteilungen";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const target = new URL(url, self.location.origin).pathname;
      const visible = windows.some(
        (w) => w.visibilityState === "visible" && new URL(w.url).pathname === target,
      );
      if (visible) return undefined;
      return self.registration.showNotification(title, {
        body: data.body || "",
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        lang: "de",
        data: { url },
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) {
          return w.navigate ? w.navigate(url).then((c) => (c || w).focus()) : w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
