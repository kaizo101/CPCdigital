import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import rootPackage from '../../package.json'

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
    __APP_SOURCE_URL__: JSON.stringify(process.env.CPC_SOURCE_URL ?? ''),
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
})
