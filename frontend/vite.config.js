import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Build output goes straight into the backend so FastAPI serves it at "/".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },
  },
  build: {
    outDir: path.resolve(__dirname, "../backend/app/static"),
    emptyOutDir: true,
  },
});
