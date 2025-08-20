/* service-worker.js — ATC Drill (PWA v3) */
const VERSION = 'v3';
const PRECACHE = `atc-precache-${VERSION}`;
const RUNTIME  = `atc-runtime-${VERSION}`;

// 배포 파일 목록(루트에 위치)
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/* 설치: 프리캐시 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // 첫 설치시 일부가 실패해도 SW 등록은 되도록
      })
  );
});

/* 활성화: 이전 캐시 정리 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== PRECACHE && key !== RUNTIME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* 유틸: same-origin 여부 */
const sameOrigin = (url) => {
  try { return new URL(url).origin === self.location.origin; }
  catch { return false; }
};

/* 요청 처리:
   - HTML(nav 요청)은 네트워크 우선 → 실패 시 캐시 → 그래도 실패면 index.html
   - 그 외 정적 파일은 캐시 우선 → 없으면 네트워크 후 캐시 저장
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST/PUT 등은 건너뜀
  if (req.method !== 'GET') return;

  const isHTML =
    req.headers.get('accept')?.includes('text/html') ||
    (req.mode === 'navigate');

  if (isHTML && sameOrigin(req.url)) {
    // HTML: network-first
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          // 마지막 폴백: index.html
          const index = await caches.match('./index.html');
          return index || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 정적/기타: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // 같은 출처만 런타임 캐시에 저장(보안/용량 보호)
          if (sameOrigin(req.url)) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // 요청한 정적 파일이 캐시에 없고 네트워크도 실패한 경우:
          // HTML이 아니면 그냥 실패 응답
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});

/* 메시지 수신: 즉시 활성화용 */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
