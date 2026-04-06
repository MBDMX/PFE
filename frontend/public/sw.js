const CACHE_NAME = 'GMAO_CACHE_V1';
const STATIC_ASSETS = [
    '/',
    '/login',
    '/manifest.json',
    '/next.svg',
    '/fonts/Outfit-VariableFont_wght.woff2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // API calls are handled by api.ts (IndexedDB), not SW caching (except for static)
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then(response => {
                // If it's a static chunk, cache it
                if (event.request.url.includes('_next/static')) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return response;
            });
        })
    );
});
