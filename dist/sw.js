const staticCacheName = 'mws-restaurant-stage-3';

let filesToCache = [
  '/',
  'manifest.json',
  'index.html',
  'restaurant.html',
  'css/main.css',
  'css/detail.css',
  'js/bundle_main.js',
  'js/bundle_restaurant.js',
  'sw.js',
  'img/favicon/apple-icon-57x57.png',
  'img/favicon/apple-icon-60x60.png',
  'img/favicon/apple-icon-72x72.png',
  'img/favicon/apple-icon-76x76.png',
  'img/favicon/apple-icon-114x114.png',
  'img/favicon/apple-icon-120x120.png',
  'img/favicon/apple-icon-144x144.png',
  'img/favicon/apple-icon-152x152.png',
  'img/favicon/apple-icon-180x180.png',
  'img/favicon/android-icon-192x192.png',
  'img/favicon/favicon-32x32.png',
  'img/favicon/favicon-96x96.png',
  'img/favicon/favicon-16x16.png',
  'img/favicon/ms-icon-144x144.png',
  'img/favicon/ms-icon-70x70.png',
  'img/favicon/ms-icon-150x150.png',
  'img/favicon/ms-icon-310x310.png',
  'img/favicon/android-icon-512x512.png',
  'img/favicon/favicon.ico',
  'img/1-380_small.jpg',
  'img/1-512_medium.jpg',
  'img/1-800_large.jpg',
  'img/2-380_small.jpg',
  'img/2-512_medium.jpg',
  'img/2-800_large.jpg',
  'img/3-380_small.jpg',
  'img/3-512_medium.jpg',
  'img/3-800_large.jpg',
  'img/4-380_small.jpg',
  'img/4-512_medium.jpg',
  'img/4-800_large.jpg',
  'img/5-380_small.jpg',
  'img/5-512_medium.jpg',
  'img/5-800_large.jpg',
  'img/6-380_small.jpg',
  'img/6-512_medium.jpg',
  'img/6-800_large.jpg',
  'img/7-380_small.jpg',
  'img/7-512_medium.jpg',
  'img/7-800_large.jpg',
  'img/8-380_small.jpg',
  'img/8-512_medium.jpg',
  'img/8-800_large.jpg',
  'img/9-380_small.jpg',
  'img/9-512_medium.jpg',
  'img/9-800_large.jpg',
  'img/10-380_small.jpg',
  'img/10-512_medium.jpg',
  'img/10-800_large.jpg',
];


self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('mws-') &&
                 cacheName != staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      ).then(() => { console.log('Service worker active');} );
    })
  );
});


self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});


self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
