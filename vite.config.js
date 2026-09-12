import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const model1Proxy = {
  '/satquery-model1': {
    target: 'https://satquery-model1-vqa-api.onrender.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/satquery-model1/, ''),
    timeout: 120000,
  },
}

const model2Proxy = {
  '/api': {
    target: 'https://sih-satquery.onrender.com',
    changeOrigin: true,
    timeout: 120000,
  },
}

const model3Proxy = {
  '/satquery-model3': {
    target: 'https://satquery-model3-api.onrender.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/satquery-model3/, ''),
    timeout: 120000,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { ...model1Proxy, ...model2Proxy, ...model3Proxy } },
  preview: { proxy: { ...model1Proxy, ...model2Proxy, ...model3Proxy } },
})
