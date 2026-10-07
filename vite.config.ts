import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    // Generates src/routeTree.gen.ts from src/routes; has to run before the React plugin.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // The service worker only exists in the production build.
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Kleiderschrank Kompakt",
        short_name: "Kompakt",
        lang: "de",
        start_url: "/profil/schrank",
        scope: "/",
        display: "standalone",
        theme_color: "#0B1F3A",
        background_color: "#FFFFFF",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell and the self-hosted fonts (bundled by @fontsource into /assets).
        globPatterns: ["**/*.{html,js,css,woff2,svg,png,ico,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Personal data never goes into the Cache Storage: every API request,
        // including /api/files, goes to the network only. Offline data lives
        // in IndexedDB (src/lib/offline) and is cleared on logout.
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith("/api/"), handler: "NetworkOnly" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
  server: {
    // The backend listens on PORT from .env (default 3000).
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
});
