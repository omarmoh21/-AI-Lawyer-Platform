import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Runs on 5174 so it can be tested side-by-side with the current frontend (5173).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // Vite rejects requests with an unrecognized Host header by default;
    // the cloudflared quick-tunnel hostname needs to be allow-listed so it
    // can proxy through to this dev server.
    allowedHosts: ['.trycloudflare.com'],
    // Proxy API calls to the backend server-to-server, so the browser only
    // ever sees one origin (the frontend's). Without this, the frontend and
    // backend tunnels are two different sites from the browser's point of
    // view, making the auth cookie third-party — which desktop Chrome mostly
    // tolerates but mobile Safari/Chrome block outright, breaking login on
    // phones even though it looked fine on a laptop.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
