import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/** The sample data is a dynamic import (off the first task); preload its chunk from the
 * HTML so it downloads alongside the entry instead of after it. */
function preloadSampleData(): Plugin {
  return {
    name: 'psicx-preload-sample-data',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunk = Object.values(ctx.bundle ?? {}).find(
          (c) => c.type === 'chunk' && c.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/services/mockData.ts'),
        )
        if (!chunk) return html
        return { html, tags: [{ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `/${chunk.fileName}` }, injectTo: 'head' }] }
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadSampleData()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5174,
  },
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
