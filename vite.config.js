import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import {
  createDevApiProxy,
  devApiProxyNotice,
  normalizeDevApiOrigin,
} from './config/devApiProxy.js'

export default defineConfig(({ command, mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), 'PLANO_VOTO_')
  const isServing = command === 'serve'
  const devApiOrigin = isServing
    ? normalizeDevApiOrigin(
      process.env.PLANO_VOTO_DEV_API_ORIGIN || serverEnv.PLANO_VOTO_DEV_API_ORIGIN
    )
    : null

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isServing ? [devApiProxyNotice(devApiOrigin)] : []),
    ],
    base: '/',
    server: isServing
      ? {
        proxy: {
          '^/api/': createDevApiProxy(devApiOrigin),
        },
      }
      : undefined,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 450,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('qrcode')) return 'feature-share'
            if (id.includes('lucide-react')) return 'vendor-icons'
            return 'vendor'
          },
        },
      },
    },
  }
})
