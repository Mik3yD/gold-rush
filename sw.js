// Gold Rush's service worker: a little helper the browser runs next to the game.
// It keeps a copy of everything the game needs (the page, Three.js, the fonts, the icons),
// so the game still opens and plays when the phone has no signal.
//
// - The game's own files: always try the internet first (so updates arrive), and use the copy when offline.
//   ("no-cache" makes the browser check with the web server every time, instead of using its own copy for
//   up to 10 minutes, which GitHub Pages allows. If the file hasn't changed, that check is tiny.)
// - Three.js and the fonts never change: use the copy, and only download them if there isn't one yet.
//
// - The ending cutscene (ending.mp4) is left alone: it always comes from the internet. Videos are sent in pieces
//   (phones, iPhones especially, ask for them that way), which a saved copy can't do, and it's big.
//   Offline, the game just goes straight to the end screen.
//
// If you ever change the list below, change the version in CACHE too, so phones pick up the new list.
// (A new version of sw.js replaces the old one by itself: skipWaiting() and clients.claim() below.
// The game shows "Update available, tap to reload" when index.html changes: see "Updates" in index.html.)

const CACHE = 'gold-rush-v2';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Rye&display=swap';
const GAME_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  THREE_URL,
];

// Installing: download everything once
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(GAME_FILES);
    // The fonts: the font list, then every font file it names
    try {
      const response = await fetch(FONTS_URL);
      const css = await response.clone().text();
      await cache.put(FONTS_URL, response);
      const fontFiles = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((match) => match[1]);
      await cache.addAll([...new Set(fontFiles)]); // (the same file can be listed more than once, which addAll refuses)
    } catch (e) { /* no fonts offline yet (they're saved later, as the page uses them): the game falls back to Georgia */ }
    self.skipWaiting(); // start working straight away
  })());
});

// A new version: throw away old copies, and look after the open game right away
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('range') || request.url.endsWith('.mp4')) return; // videos: straight from the internet
  if (new URL(request.url).hostname.endsWith('.supabase.co')) return; // the Hall of Fame: always fresh, never a saved copy
  const ownFile = new URL(request.url).origin === self.location.origin;
  event.respondWith(ownFile ? internetFirst(request) : copyFirst(request));
});

// Try the internet, keep the fresh file, and fall back to the saved copy when offline
async function internetFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
  }
}

// Use the saved copy; download (and save) it only if there isn't one
async function copyFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}
