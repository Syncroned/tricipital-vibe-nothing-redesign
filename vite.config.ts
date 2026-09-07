import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'https://www.tricipital.com', changeOrigin: true, secure: true },
      '/assets': { target: 'https://www.tricipital.com', changeOrigin: true, secure: true },
    },
  },
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'Tricipital Vibe Nothing Redesign',
        namespace: 'https://tricipital.com',
        version: '0.1.41',
        description: 'A Nothing-inspired full UI redesign for tricipital.com',
        author: 'SyncTM',
        match: ['*://tricipital.com/*', '*://www.tricipital.com/*'],
        exclude: ['*://tricipital.com/api*', '*://www.tricipital.com/api*', '*://tricipital.com/assets*', '*://www.tricipital.com/assets*'],
        grant: 'none',
        'run-at': 'document-end',
      },
    }),
  ],
})
