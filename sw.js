// Offline cache for the app shell. Bump VERSION when files change.
const VERSION = 'kn-v6';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './js/dice.js', './js/io.js', './js/state.js',
  './js/data/rules.js', './js/data/items.js', './js/data/masteries.js', './js/data/creatures.js', './js/data/creatures2.js', './js/data/domain1.js', './js/data/tables_text.js',
  './js/engine/rolls.js', './js/engine/character.js', './js/engine/loot.js', './js/engine/combat.js', './js/engine/abilities.js',
  './js/engine/inventory.js', './js/engine/explore.js', './js/engine/events.js',
  './js/ui/app.js', './js/ui/creation.js', './js/ui/panels.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Network first so updates arrive; fall back to cache offline.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
  } else if (url.hostname.includes('fonts.')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })));
  }
});
