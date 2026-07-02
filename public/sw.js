const CACHE_VERSION = '1.6.3-20260602';
const APP_CACHE = `bomdevoto-app-${CACHE_VERSION}`;
const STATIC_CACHE = `bomdevoto-static-${CACHE_VERSION}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json?v=1.6.3-20260602',
  '/icons/favicon-32.png?v=1.6.3-20260602',
  '/icons/apple-touch-icon.png?v=1.6.3-20260602',
  '/icons/bomdevoto-192.png?v=1.6.3-20260602',
  '/icons/bomdevoto-512.png?v=1.6.3-20260602'
];
const CURRENT_CACHES = [APP_CACHE, STATIC_CACHE];
const NAVIGATION_TIMEOUT_MS = 4500;

const isSameOrigin = (url) => url.origin === self.location.origin;

const fetchWithTimeout = (request, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

const putIfCacheable = async (cacheName, request, response) => {
  const method = request instanceof Request ? request.method : 'GET';
  if (!response || !response.ok || method !== 'GET') return;

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => (
            /^(meuvoto|nossovoto)-/.test(cacheName) && !CURRENT_CACHES.includes(cacheName)
          ))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

const handleNavigation = async (request) => {
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    await putIfCacheable(APP_CACHE, '/index.html', response);
    return response;
  } catch {
    const cachedRoute = await caches.match(request);
    if (cachedRoute) return cachedRoute;

    const cachedShell = await caches.match('/index.html');
    if (cachedShell) return cachedShell;

    return new Response('Aplicacao indisponivel offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};

const handleStaticAsset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await putIfCacheable(STATIC_CACHE, request, response);
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(handleStaticAsset(request));
  }
});
