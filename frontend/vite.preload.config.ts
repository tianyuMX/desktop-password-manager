import { defineConfig } from 'vite'

// https://www.electronforge.io/config/plugins/vite#vitepreloadconfigts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: 'preload.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
