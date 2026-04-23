import { defineConfig } from 'vite'

export default defineConfig({
  base: '/TiktokShuffle/',
  server: { host: true },
  plugins: [
    {
      name: 'tiktok-embed-proxy',
      configureServer(server) {
        server.middlewares.use('/tiktok-embed', async (req, res) => {
          const match = req.url.match(/^\/([^?]+)(\?.*)?$/)
          if (!match) { res.statusCode = 400; res.end(); return }

          const videoId = match[1]
          const qs = match[2] || ''

          try {
            const response = await fetch(
              `https://www.tiktok.com/player/v1/${videoId}${qs}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Referer': 'https://www.tiktok.com/',
                }
              }
            )

            let html = await response.text()

            html = html.replace('<head>', `<head>
<style>
  html, body { background: #121212 !important; margin: 0 !important; }
  #embed-video-container { background: #121212 !important; }
  [data-testid="embed-video"] { max-width: 100% !important; width: 100% !important; }
</style>`)

            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
          } catch (err) {
            res.statusCode = 502
            res.end('Proxy error: ' + err.message)
          }
        })
      }
    }
  ]
})
