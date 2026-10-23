import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repo =
  process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'traqspera-performance-management'

/** Set GH_PAGES=true only for `npm run build:gh-pages` / deploy (subpath on GitHub Pages). */
const ghPagesBase = process.env.GH_PAGES === 'true' ? `/${repo}/` : '/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: ghPagesBase,
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
