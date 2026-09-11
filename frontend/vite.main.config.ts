import { defineConfig } from 'vite'

// https://www.electronforge.io/config/plugins/vite#vitemainconfigts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'node:fs', 'node:path', 'node:crypto']
    }
  }
})
