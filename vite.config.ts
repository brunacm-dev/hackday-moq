import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import path from 'path'

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      'solid-js/jsx-runtime': path.resolve('./node_modules/solid-js/h/jsx-runtime/dist/jsx.js'),
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020'
  }
})
