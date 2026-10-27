import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

const outDir = resolve(__dirname, '../integration/traqspera-web/public')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    outDir,
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/traqspera/mount.tsx'),
      name: 'TraqsperaPerformance',
      formats: ['iife'],
      fileName: () => 'js/performance-management.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/performance-management.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
    cssCodeSplit: false,
  },
})
