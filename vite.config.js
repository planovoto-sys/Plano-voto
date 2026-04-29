import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const normalizePath = (id) => id.replace(/\\/g, '/')

const manualChunks = (id) => {
  const normalizedId = normalizePath(id)

  if (!normalizedId.includes('/node_modules/')) return undefined

  if (
    normalizedId.includes('/node_modules/react') ||
    normalizedId.includes('/node_modules/react-dom') ||
    normalizedId.includes('/node_modules/react-router') ||
    normalizedId.includes('/node_modules/scheduler')
  ) {
    return 'react-vendor'
  }

  if (
    normalizedId.includes('/node_modules/firebase/') ||
    normalizedId.includes('/node_modules/@firebase/')
  ) {
    return 'firebase-vendor'
  }

  if (
    normalizedId.includes('/node_modules/recharts/') ||
    normalizedId.includes('/node_modules/d3-')
  ) {
    return 'charts-vendor'
  }

  return 'vendor'
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
