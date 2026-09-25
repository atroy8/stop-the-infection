import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/stop-the-infection/',
  plugins: [react()],
})
