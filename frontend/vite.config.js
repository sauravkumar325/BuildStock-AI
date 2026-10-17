import { defineConfig } from "vite";
// Keep /api same-origin in the browser so HTTP-only authentication cookies work.
const proxy = {
  "/api": { target: "http://localhost:3000", changeOrigin: true },
  "/health": { target: "http://localhost:3000", changeOrigin: true },
};
export default defineConfig({
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 5173, strictPort: true, proxy },
});
