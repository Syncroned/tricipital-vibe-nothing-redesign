import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

// https://vite.dev/config/
export default defineConfig({
  publicDir: false,
  server: {
    proxy: {
      '/api': { target: 'https://levelrequest.com', changeOrigin: true, secure: true },
      '/assets': { target: 'https://levelrequest.com', changeOrigin: true, secure: true },
    },
  },
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'LevelRequest Vibe Nothing Redesign',
        namespace: 'https://tricipital.com',
        version: '0.2.2',
        description: 'A Nothing-inspired full UI redesign for levelrequest.com (tricipital.com)',
        author: 'SyncTM',
        match: [
          '*://levelrequest.com/*',
          '*://www.levelrequest.com/*',
          '*://tricipital.com/*',
          '*://www.tricipital.com/*',
        ],
        exclude: [
          '*://levelrequest.com/api*',
          '*://www.levelrequest.com/api*',
          '*://levelrequest.com/assets*',
          '*://www.levelrequest.com/assets*',
          '*://tricipital.com/api*',
          '*://www.tricipital.com/api*',
          '*://tricipital.com/assets*',
          '*://www.tricipital.com/assets*',
        ],
        grant: 'none',
        'run-at': 'document-end',
      },
    }),
  ],
})
