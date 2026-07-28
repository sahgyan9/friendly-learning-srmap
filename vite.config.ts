import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
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
    rollupOptions: {
      output: {
        // Split the big, rarely-changing dependencies into their own chunks so
        // they stay cached across deploys instead of being invalidated every
        // time a page changes.
        //
        // Client build only: in the SSR build these packages are externalised,
        // and naming an external module in manualChunks is a hard rollup error.
        manualChunks: isSsrBuild
          ? undefined
          : {
              react: ["react", "react-dom", "react-router-dom"],
              supabase: ["@supabase/supabase-js"],
              motion: ["framer-motion"],
              charts: ["recharts"],
            },
      },
    },
  },
  // Enable SPA mode for preview
  preview: {
    port: 8080,
    // Enable SPA fallback for preview mode
    historyApiFallback: true,
  },
}));
