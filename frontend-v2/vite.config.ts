import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Runs on 5174 so it can be tested side-by-side with the current frontend (5173).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
})
