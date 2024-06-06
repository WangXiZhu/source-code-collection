/*
 * @Author: zc
 * @Date: 2022-01-27 18:28:30
 * @LastEditors: zc
 * @LastEditTime: 2024-06-05 14:05:35
 * @FilePath: /core-main/Users/limo/Downloads/petite-vue-main/vite.config.ts
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  esbuild: {
    // minify: true
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    // minify: 'terser',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PetiteVue',
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      plugins: [
        {
          name: 'remove-collection-handlers',
          transform(code, id) {
            if (id.endsWith('reactivity.esm-bundler.js')) {
              return code
                .replace(`mutableCollectionHandlers,`, `null,`)
                .replace(`readonlyCollectionHandlers,`, `null,`)
            }
          }
        }
      ]
    }
  }
})
