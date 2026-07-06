/* ============================================================
   EduBlog — Service Worker (PWA 오프라인 지원)
   ============================================================
   전략:
   · 앱 셸(HTML/CSS/JS/폰트/아이콘) → Cache First (즉시 응답)
   · API 요청(tables/) → Network First (최신 데이터 우선, 실패 시 캐시)
   · 외부 CDN → Stale-While-Revalidate (캐시 응답 + 백그라운드 갱신)
   ============================================================ */

const CACHE_VER    = 'v3';
const CACHE_NAME    = `edublog-${CACHE_VER}`;
const API_CACHE     = `edublog-api-${CACHE_VER}`;
const STATIC_CACHE  = `edublog-static-${CACHE_VER}`;

/* 앱 셸 — 핵심 파일 (없어도 설치 실패하지 않음) */
const APP_SHELL = [
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/cloudinary.js',
  '/js/imgbb.js',
  '/js/mediaUploader.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

/* ── Install: 앱 셸 사전 캐시 (개별 실패 허용) ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      /* 파일 하나씩 시도 — 없어도 전체 설치 실패하지 않음 */
      const results = await Promise.allSettled(
        APP_SHELL.map(url =>
          fetch(url).then(res => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {/* 무시 */})
        )
      );
      const ok  = results.filter(r => r.status === 'fulfilled').length;
      const err = results.filter(r => r.status === 'rejected').length;
      console.log(`[SW] 캐시 완료: ${ok}개 성공, ${err}개 건너뜀`);
    }).then(() => self.skipWaiting())
    .catch(err => {
      console.warn('[SW] 사전 캐시 오류 (무시하고 계속):', err);
      return self.skipWaiting();
    })
  );
});

/* ── Activate: 이전 버전 캐시 삭제 ── */
self.addEventListener('activate', event => {
  const VALID = [CACHE_NAME, API_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !VALID.includes(k)).map(k => {
          console.log('[SW] 구버전 캐시 삭제:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: 요청 유형별 캐시 전략 ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* 1) POST/PATCH/PUT/DELETE → 캐시 무시, 네트워크 직통 */
  if (request.method !== 'GET') return;

  /* 2) chrome-extension / data URI 무시 */
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* 3) API 요청 (tables/) → Network First */
  if (url.pathname.startsWith('/tables/') || url.href.includes('/tables/')) {
    event.respondWith(networkFirst(request, API_CACHE, 4000));
    return;
  }

  /* 4) 외부 CDN (fonts, fontawesome, cloudinary, imgbb 등) → Stale-While-Revalidate */
  if (
    url.origin !== self.location.origin &&
    (url.hostname.includes('fonts.') ||
     url.hostname.includes('cdn.jsdelivr') ||
     url.hostname.includes('cloudinary.com') ||
     url.hostname.includes('imgbb.com') ||
     url.hostname.includes('i.ibb.co') ||
     url.hostname.includes('youtube.com') ||
     url.hostname.includes('googleapis.com'))
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  /* 5) 앱 셸 / 정적 파일 → Cache First */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

/* ── SKIP_WAITING 메시지 처리 (강제 업데이트) ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ============================================================
   캐시 전략 헬퍼
   ============================================================ */

/* Cache First: 캐시 있으면 반환, 없으면 네트워크 후 캐시 저장 */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.status < 400) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    /* 오프라인 폴백 */
    const cachedFallback = await cache.match('/index.html');
    if (cachedFallback) return cachedFallback;
    return new Response(
      `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
       <title>오프라인</title>
       <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
       height:100vh;margin:0;background:#1e1b4b;color:#e0e7ff;text-align:center;}
       h2{font-size:1.5rem;} p{opacity:.7;}</style></head>
       <body><div><h2>📶 오프라인 상태입니다</h2>
       <p>인터넷에 연결하면 EduBlog를 사용할 수 있어요.</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* Network First: 네트워크 우선, timeout 초과 또는 실패 시 캐시 반환 */
async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName);
  try {
    const networkPromise = fetch(request.clone());
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    );
    const response = await Promise.race([networkPromise, timeoutPromise]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: '오프라인 — 캐시된 데이터가 없습니다.', data: [], total: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* Stale-While-Revalidate: 캐시 즉시 반환 + 백그라운드에서 갱신 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}

/* ── 푸시 알림 ── */
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'EduBlog', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'EduBlog', {
      body: data.body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon.svg',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
