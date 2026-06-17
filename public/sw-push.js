/* global self, clients, ServiceWorkerGlobalScope */
// Service Worker context — `self`, `clients`, etc. provided by the SW global.

// DAD War Room — Web Push handler.
//
// This file is pulled into the Workbox-generated service worker via
// `workbox.importScripts: ['/sw-push.js']` in vite.config.ts. It adds the
// `push` + `notificationclick` listeners that Workbox does not ship by
// default. Keep this script dependency-free (no bundler runs over it).

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch (err) {
    payload = { title: 'War Room', body: event.data.text() }
  }
  const { title, body, emoji, image_url, tap_target, tap_url } = payload
  const finalTitle = `${emoji || ''} ${title || 'War Room'}`.trim()
  event.waitUntil(
    self.registration.showNotification(finalTitle, {
      body: body || '',
      image: image_url,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { tap_target, tap_url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const target = data.tap_target || 'hub'
  let url = '/'
  if (target === 'url' && data.tap_url) {
    url = data.tap_url
  } else if (target === 'events') {
    url = '/events'
  } else if (target === 'polls') {
    url = '/alliance/polls'
  } else if (target === 'alliance') {
    url = '/alliance'
  }
  event.waitUntil(clients.openWindow(url))
})
