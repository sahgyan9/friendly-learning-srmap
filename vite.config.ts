import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

/**
 * Dependencies worth keeping in their own chunk, so that they stay in the
 * browser cache across deploys instead of being invalidated whenever a page
 * changes.
 *
 * Expressed as a function rather than the `{ name: [packages] }` object this
 * used to be: Rolldown, which Vite 8 bundles with, accepts only the function
 * form. Matching is anchored on `/node_modules/<pkg>/` so that `react` claims
 * react itself and not react-hook-form, and the alternation is longest-first
 * for the same reason.
 */
const VENDOR_CHUNKS: [RegExp, string][] = [
  [/\/node_modules\/(react-router-dom|react-router|react-dom|react|scheduler)\//, "react"],
  [/\/node_modules\/@supabase\//, "supabase"],
  [/\/node_modules\/framer-motion\//, "motion"],
  [/\/node_modules\/recharts\//, "charts"],
];

const chunkFor = (id: string): string | undefined => {
  if (!id.includes("node_modules")) return undefined;
  // Windows ids arrive with backslashes; the patterns above are POSIX.
  const normalised = id.replace(/\\/g, "/");
  return VENDOR_CHUNKS.find(([pattern]) => pattern.test(normalised))?.[1];
};

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
      // Not `__dirname`: Vite 8's native config loader cannot see CommonJS
      // globals, and warns that it will stop supporting them.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
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
        // Client build only: in the SSR build these packages are externalised,
        // and naming an external module in manualChunks is a hard error.
        manualChunks: isSsrBuild ? undefined : chunkFor,
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
