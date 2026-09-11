import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_SERVER_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false, // Set to false for development with HTTP
      }
    }
  },
  // For production build optimization
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for smaller build size
  }
});