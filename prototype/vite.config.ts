import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repo =
  process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'traqspera-performance-management'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.NODE_ENV === 'production' ? `/${repo}/` : '/',
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
