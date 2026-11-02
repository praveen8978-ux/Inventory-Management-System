import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy keeps API calls same-origin in dev, so the auth cookie just works
    proxy: { "/api": "http://localhost:4000" },
  },
});
