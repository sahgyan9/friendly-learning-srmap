import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Enable SPA fallback for development
    historyApiFallback: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configure static asset handling
  publicDir: 'public',
  build: {
    // Copy public files to dist during build
    copyPublicDir: true,
    // Generate manifest for better caching
    manifest: true,
  },
  // Enable SPA mode for preview
  preview: {
    port: 8080,
    // Enable SPA fallback for preview mode
    historyApiFallback: true,
  },
}));
