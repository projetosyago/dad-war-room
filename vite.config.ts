import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Pre-bundle Tiptap so freshly-installed sub-packages get picked up without
  // a manual `rm -rf node_modules/.vite` after the first run.
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-underline',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extension-color',
      '@tiptap/extension-image',
      '@tiptap/extension-placeholder',
    ],
  },
  // Manual chunk boundaries so the heavy editor stack (Tiptap, framer, etc.)
  // lives in cacheable shared chunks instead of bloating per-page admin
  // bundles. Wave 6 split — see WAR_ROOM_LOG §2.14 for the rationale.
  // Function form (id → chunk name) because the project's rolldown-vite
  // typings only accept ManualChunksFunction, not the legacy object form.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap')) return 'tiptap'
            if (id.includes('@supabase/supabase-js')) return 'supabase'
            if (id.includes('framer-motion')) return 'framer'
            if (id.includes('date-fns')) return 'date-fns'
          }
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'images/**/*'],
      manifest: {
        name: 'DAD War Room — Kingdom 1652',
        short_name: 'DAD War Room',
        description: 'Strategy hub for the Kingshot alliance [DAD] BIGDADDYS, Kingdom 1652.',
        theme_color: '#13172a',
        background_color: '#13172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['games', 'strategy', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Pull our push + notificationclick handlers into the generated SW.
        // Workbox's default SW does not include them; this is the minimum
        // disruption alternative to switching to injectManifest mode.
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
