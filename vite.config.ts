import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  //base: 'https://id.exesfull.com/assets/oauth/eidv5-shad/',
  base: mode === 'production' 
    ? 'https://id.exesfull.com/assets/oauth/eidv5-shad/' 
    : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: '', 
  },
}));