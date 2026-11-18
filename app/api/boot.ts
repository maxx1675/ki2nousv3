import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { env } from "./lib/env";
import { log } from "./lib/logger";
import { relay } from "./lib/relay-singleton";
import { roomsRoutes, startSweeper } from "./routes/rooms";
import { menteurs, menteursRoutes, startMenteursSweeper } from "./routes/menteurs";
import { youtubeRoutes } from "./routes/youtube";

const app = new Hono<{ Bindings: HttpBindings }>();

// Menteurs : le serveur est autoritaire. Le relais SSE ne sert qu'à prévenir
// les clients qu'un nouvel état est disponible ; les mains restent privées.
menteurs.onChange = (room) => {
  relay.serverBroadcast(room.name, "mt-state", { ts: Date.now(), phase: room.phase });
};
menteurs.resolveHost = (roomName) => relay.rooms.get(roomName)?.hostCid ?? "";
menteurs.onEnd = (room) => {
  if (!room.startedAt) return;
  const scores = room.players
    .filter((p) => !p.spectator)
    .map((p) => ({
      cid: p.id,
      n: p.name,
      e: "",
      c: "",
      s: Math.max(0, (p.alive ? 1000 : 0) + p.lives * 50 + p.score * 20 + p.bluffs * 10),
    }));
  if (scores.length < 2) return;
  const sid = `mt-${room.code}-${room.startedAt}`;
  let tries = 0;
  const send = () => {
    tries += 1;
    const live = relay.rooms.get(room.name);
    const hostConn = live ? [...live.conns.values()].find((c) => c.cid === live.hostCid) : undefined;
    if (live && hostConn) {
      try {
        // Le classement de soirée n'accepte que la connexion du host du relais.
        const r = relay.score({ room: room.name, conn: hostConn.id, sid, game: "mt", scores });
        if (r.ok) return;
      } catch {
        /* on retente : un passage de relais est peut-être en cours */
      }
    }
    if (tries < 12) setTimeout(send, 5000);
  };
  send();
};

// Pas de journal des requêtes /api/rooms/* : un événement de jeu = une requête, ça ferait des milliers de lignes.
app.route("/api/rooms", roomsRoutes);
app.route("/api/menteurs", menteursRoutes);
app.route("/api/youtube", youtubeRoutes);
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
  startMenteursSweeper();
  serve({ fetch: app.fetch, port: env.port }, () => {
    log.info(`Server running on http://localhost:${env.port}/`);
  });
} else {
  // serveur de dev (vite) : le balayage des salons tourne aussi
  startSweeper();
  startMenteursSweeper();
}
