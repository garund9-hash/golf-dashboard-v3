import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project site: https://garund9-hash.github.io/golf-dashboard-v3/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/golf-dashboard-v3/' : '/',
  plugins: [react()],
})
