import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
// no tailwindcss import needed here
export default defineConfig({
  plugins: [react()],
  tailwindcss: {},
  autoprefixer: {},
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_SERVER_URL,
        changeOrigin: true,
        secure: true,
      }
    }
  }
});
