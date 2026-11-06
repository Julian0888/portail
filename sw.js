// La page vient du réseau dès qu'il répond, pour que chaque publication arrive à la première ouverture.
// Sans réseau, ou s'il tarde trop, le téléphone affiche la dernière version gardée.
// Le serveur Apps Script n'est jamais mis en cache : ni la liste ni les sessions ne restent sur le téléphone.
const CACHE = 'portail-7c829791dd3d';
const FILES = ['./', 'manifest.webmanifest', 'icones/icone-180.png', 'icones/icone-192.png', 'icones/icone-512.png'];
const PAGE_WAIT = 2500;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function freshPage() {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PAGE_WAIT);
  return fetch('./', { cache: 'no-cache', signal: stop.signal })
    .then(res => {
      if (!res.ok) throw res;
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
      return res;
    })
    .catch(() => caches.match('./'))
    .finally(() => clearTimeout(timer));
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(e.request.mode === 'navigate' ? freshPage() : caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
