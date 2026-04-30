const CACHE_NAME = 'paperlogistics-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Vorerst ein passiver Fetch-Event-Listener
});
