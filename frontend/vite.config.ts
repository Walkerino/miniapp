import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      api: resolve(root, 'src/api'),
      app: resolve(root, 'src/app'),
      pages: resolve(root, 'src/pages'),
      widgets: resolve(root, 'src/widgets'),
      features: resolve(root, 'src/features'),
      entities: resolve(root, 'src/entities'),
      shared: resolve(root, 'src/shared'),
      components: resolve(root, 'src/components'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
