import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Build optimizations
  build: {
    // Target modern browsers (Tauri uses latest WebView)
    target: "es2021",
    // Chunk size warning at 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate chunks
        manualChunks: {
          'vendor-calendar': [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
            '@fullcalendar/resource-timegrid',
          ],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Disable sourcemaps in production for smaller output
    sourcemap: false,
    // Minify with esbuild (fast, default in Vite 5+)
    minify: "esbuild",
  },
}));
