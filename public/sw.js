// SHAHI - Service Worker (Offline-First)
// Caches app shell and API GET requests

const CACHE_NAME = 'shahi-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/css/app.css',
  '/js/core.js',
  '/js/start.js',
  '/js/views-home.js',
  '/js/views-orders.js',
  '/js/views-customers.js',
  '/js/views-products.js',
  '/js/views-admin.js',
  '/manifest.webmanifest',
  'https://res.cloudinary.com/stw0awze/image/upload/v1792609127/Shahi_Taste_the_Difference_Logo.png'
];

const API_CACHE_NAME = 'shahi-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension, data:, blob: URLs
  if (!url.protocol.startsWith('http')) return;
  
  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/rest/v1/') || url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstApi(event.request));
    return;
  }
  
  // Static assets - cache first
  event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Network-first with cache fallback for API
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      // Clone response before caching
      const responseClone = response.clone();
      // Add timestamp header for cache expiration
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cachedResponse = new Response(await responseClone.blob(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers
      });
      cache.put(request, cachedResponse);
    }
    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      // Check if cache is expired
      const cachedAt = cached.headers.get('sw-cached-at');
      if (cachedAt && (Date.now() - parseInt(cachedAt)) < API_CACHE_DURATION) {
        return cached;
      }
      // Return stale cache anyway for offline support
      return cached;
    }
    
    // Return offline response for API
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'No cached data available' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for pending mutations (orders, etc.)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Implementation for background sync of offline orders
  // Would read from IndexedDB and POST to Supabase
  console.log('Background sync: pending orders');
}

// Push notifications (future)
self.addEventListener('push', (event) => {
  // Handle push notifications
});