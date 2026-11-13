import devServer from "@hono/vite-dev-server";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }), react()],
  server: { port: 3000 },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
