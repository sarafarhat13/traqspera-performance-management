/**
 * GitHub Pages has no SPA fallback. Serving 404.html as a copy of index.html
 * lets deep links load the app (client router takes over).
 */
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const indexHtml = resolve(import.meta.dirname, '../dist/index.html')

if (!existsSync(indexHtml)) {
  console.error('copy-spa-404: dist/index.html not found — run vite build first')
  process.exit(1)
}

copyFileSync(indexHtml, resolve(import.meta.dirname, '../dist/404.html'))
console.log('copy-spa-404: wrote dist/404.html')
