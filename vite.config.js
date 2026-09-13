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
  '/detect-change': {
    target: 'https://8002-gpu-t4-s-kkb-ass1c0-3v2vi2mcxnyuq-c.asia-southeast1-0.prod.colab.dev',
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
