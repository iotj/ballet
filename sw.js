const CACHE = 'ballet-v1'
const SHELL = [
  '/ballet/',
  '/ballet/index.html',
  '/ballet/style.css',
  '/ballet/js/mediapipe.js',
  '/ballet/js/camera.js',
  '/ballet/js/overlay.js',
  '/ballet/js/scorer.js',
  '/ballet/js/poseRegistry.js',
  '/ballet/js/poses/turnout.js',
  '/ballet/js/poses/arabesque.js',
  '/ballet/js/poses/plie.js',
  '/ballet/data/thresholds.js'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // MediaPipe CDN 리소스 (wasm, model) — cache-first
  if (e.request.url.includes('mediapipe') || e.request.url.includes('jsdelivr')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // 앱 셸 — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
