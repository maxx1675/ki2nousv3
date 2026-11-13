import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { env } from "./lib/env";
import { log } from "./lib/logger";
import { roomsRoutes, startSweeper } from "./routes/rooms";

const app = new Hono<{ Bindings: HttpBindings }>();

// Pas de journal des requêtes /api/rooms/* : un événement de jeu = une requête, ça ferait des milliers de lignes.
app.route("/api/rooms", roomsRoutes);
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
  log.error("unhandled request error", { method: c.req.method, path: c.req.path, error: err instanceof Error ? err.message : String(err) });
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);
  startSweeper();
  serve({ fetch: app.fetch, port: env.port }, () => {
    log.info(`Server running on http://localhost:${env.port}/`);
  });
} else {
  // serveur de dev (vite) : le balayage des salons tourne aussi
  startSweeper();
}
