// Offline shell for the installed app: the page and icons come from the cache when there is no
// network; the encrypted data is always fetched fresh, falling back to the last copy offline.
const CACHE = "resell-v4";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Network first everywhere, so a new version or new prices show at once; the cache is the offline fallback.
  e.respondWith(
    // "no-cache" revalidates with the server, so the browser's own HTTP cache never serves an old page.
    fetch(e.request, { cache: "no-cache" }).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        const key = url.pathname.endsWith("data.enc") ? new Request(url.origin + url.pathname) : e.request;
        caches.open(CACHE).then((c) => c.put(key, copy));
      }
      return res;
    }).catch(() => caches.match(url.pathname.endsWith("data.enc") ? new Request(url.origin + url.pathname) : e.request))
  );
});
