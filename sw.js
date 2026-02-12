// sw.js - Service Worker for PWA (Offline & Cache)
const CACHE_NAME = 'drug-scan-v15'; // Updated to v15 for Icon Fix
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.png',
  './home.html',
  './profile.html',
  './Notifications.html',
  './center.html',
  './login.html',
  './register.html',
  './personal_info.html',
  './saved_drugs.html',
  './admin_dashboard.html',
  './admin_users.html',
  './admin_user_drugs.html',
  './css/style.css',
  './js/scanner.js',
  './js/notifications.js',
  './js/auth.js',
  './js/admin.js',
  './js/firebase-config.js',
  './js/pwa.js',
  './js/modal.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// 1. Install Event (Cache Assets)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event (Serve from Cache, Fallback to Network)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, else fetch from network
      return response || fetch(event.request);
    })
  );
});

// 4. Notification Click Event (Open App)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow('index.html');
      }
    })
  );
});
