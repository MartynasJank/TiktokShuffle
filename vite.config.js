import { defineConfig } from 'vite'
import { tiktokEmbedProxy } from './plugins/tiktok-embed-proxy.js'

export default defineConfig({
  base: '/',
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  plugins: [tiktokEmbedProxy()],
})