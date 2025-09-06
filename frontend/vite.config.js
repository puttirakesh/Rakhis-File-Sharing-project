import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// no tailwindcss import needed here
export default defineConfig({
  plugins: [react()],
  tailwindcss: {},
  autoprefixer: {},
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
