import devServer from "@hono/vite-dev-server";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }), react()],
  server: {
    port: 3000,
    // Le GLB est écrit/servi par Vite : l'ignorer évite un crash EBUSY du watcher
    // sur Windows pendant les téléchargements d'assets.
    watch: { ignored: ["**/public/menteurs/assets/**", "**/public/mimicparty/sounds/**"] },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
