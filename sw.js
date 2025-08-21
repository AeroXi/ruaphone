const CACHE_NAME = 'ruaphone-v1.3.3';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/version-update.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
  'https://unpkg.com/axios@1.6.7/dist/axios.min.js',
  'https://unpkg.com/dexie/dist/dexie.js'
];

// API endpoints that should not be cached
const NO_CACHE_URLS = [
  'generativelanguage.googleapis.com',
  'api.openai.com',
  '/v1/chat/completions',
  ':generateContent'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing, cache name:', CACHE_NAME);
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip caching for API requests
  const shouldCache = !NO_CACHE_URLS.some(url => event.request.url.includes(url));
  
  if (!shouldCache) {
    // For API requests, always fetch from network
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Fetch from network and cache the response
        return fetch(event.request).then(fetchResponse => {
          // Check if valid response
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return fetchResponse;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating, cache name:', CACHE_NAME);
  // Take control immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});