import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // In development the React app (5173) talks to the local API (3001) through this proxy,
  // so the browser sees one origin, exactly like production on Vercel.
  server: { proxy: { "/api": "http://localhost:3001" } },
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: "./src/test/setup.js",
  },
});
