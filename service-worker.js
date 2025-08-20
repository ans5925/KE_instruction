// service-worker.js  (새 버전)
const CACHE_NAME = 'atc-pwa-v3'; // ← 이름을 꼭 바꿔주세요
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // 새 SW 즉시 대기열 건너뜀
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim(); // 열린 탭에도 새 SW 바로 반영
    })()
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((m) => 
      m ||
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
