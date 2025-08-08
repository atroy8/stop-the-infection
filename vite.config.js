import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: Set `base` to '/<your-repo>/' if deploying to GitHub Pages
// e.g., base: '/solve-the-outbreak/'
export default defineConfig({
  plugins: [react()],
  // base: '/<REPO_NAME>/',
})
