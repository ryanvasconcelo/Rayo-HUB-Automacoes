import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Em produção, o app é servido pelo rayo-server em /subvencoes-app/
  // Em desenvolvimento, roda normalmente em localhost:5174
  base: process.env.NODE_ENV === 'production' ? '/subvencoes-app/' : '/',

  server: {
    port: 5174,
    strictPort: true,
    // SEM X-Frame-Options: o app precisa ser embutido no Rayo Hub
    // (origem diferente em dev, mesma origem em produção via rayo-server)
    cors: true,
  },

  preview: {
    port: 5174,
    strictPort: true,
  },
})
