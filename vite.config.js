import { defineConfig } from 'vite'
import { tiktokEmbedProxy } from './plugins/tiktok-embed-proxy.js'

export default defineConfig({
  base: '/TiktokShuffle/',
  server: { host: true },
  plugins: [tiktokEmbedProxy()],
})
