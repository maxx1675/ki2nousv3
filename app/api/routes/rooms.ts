import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { Relay, type Sink } from "../lib/relay";
import { getIceServers, turnConfigured } from "../lib/ice";

/**
 * Routes HTTP du relais de salons temps réel (la logique est dans lib/relay.ts).
 *
 *   POST /api/rooms/join   { room, cid, create?, resume?, wasHost? } -> { ok, conn, host, epoch, snap? }
 *   GET  /api/rooms/stream ?room&cid&conn   -> SSE : "peers", "host", "evt"
 *   POST /api/rooms/event  { room, conn, topic, data, to? } -> { ok, delivered }
 *   POST /api/rooms/snap   { room, conn, data }   (hôte seulement : photo de la partie pour la reprise)
 *   POST /api/rooms/leave  { room, conn }
 *   POST /api/rooms/score  { room, conn, sid, game, scores:[{cid,n,e,c,s}] }  (hôte seulement)
 *   GET  /api/rooms/board  ?code=ABCD       -> classement de la soirée
 *   GET  /api/rooms/ice                     -> { iceServers, turn }
 *   POST/GET /api/rooms/public              -> salons publics
 */
export const relay = new Relay();
export const roomsRoutes = new Hono();
const enc = new TextEncoder();

/** À appeler une fois au démarrage : promotion d'hôte + nettoyage des salons vides. */
export function startSweeper() {
  const t = setInterval(() => relay.sweep(), 2000);
  (t as unknown as { unref?: () => void }).unref?.();
  return t;
}

roomsRoutes.post("/join", async (c) => {
  const body = await c.req.json().catch(() => null);
  const r = relay.join({ room: body?.room, cid: body?.cid, create: body?.create, resume: body?.resume, wasHost: body?.wasHost });
  if (!r.ok) return c.json({ ok: false, error: r.error, code: r.code }, r.status as 400);
  return c.json(r);
});

roomsRoutes.get("/stream", (c) => {
  const roomName = c.req.query("room") ?? "";
  const cid = c.req.query("cid") ?? "";
  const conn = c.req.query("conn") ?? "";
  let detach: (() => void) | null = null;
  let hb: ReturnType<typeof setInterval> | null = null;
  let failStatus = 0;

  const body = new ReadableStream<Uint8Array>({
    start(ctrl) {
      const sink: Sink = {
        send(event, data) {
          try {
            ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            /* connexion déjà fermée */
          }
        },
        close() {
          try {
            ctrl.close();
          } catch {
            /* déjà fermé */
          }
        },
      };
      const res = relay.open(roomName, cid, conn, sink);
      if (!res.ok) {
        failStatus = res.status;
        sink.close();
        return;
      }
      detach = res.close;
      hb = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode("event: hb\ndata: 1\n\n"));
        } catch {
          /* fermé */
        }
      }, 20000);
      const cleanup = () => {
        if (hb) clearInterval(hb);
        detach?.();
      };
      c.req.raw.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (hb) clearInterval(hb);
      detach?.();
    },
  });

  // Les erreurs doivent être de vrais codes HTTP (404/429…) : EventSource s'arrête alors proprement
  // et le client (net.js) sait qu'il doit se reconnecter lui-même.
  if (failStatus) return c.body(null, failStatus as 400);
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});

roomsRoutes.post(
  "/event",
  bodyLimit({ maxSize: 16 * 1024 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const r = relay.event({ room: body?.room, conn: body?.conn, topic: body?.topic, data: body?.data, to: body?.to });
    if (!r.ok) return c.json({ ok: false, error: r.error, code: r.code }, r.status as 400);
    return c.json({ ok: true, delivered: r.delivered });
  },
);

roomsRoutes.post(
  "/snap",
  bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const r = relay.setSnap(body?.room, body?.conn, body?.data);
    return c.json({ ok: r.ok }, r.ok ? 200 : (r.status as 400));
  },
);

roomsRoutes.post("/leave", async (c) => {
  const body = await c.req.json().catch(() => null);
  relay.leave(String(body?.room ?? ""), String(body?.conn ?? ""));
  return c.json({ ok: true });
});

roomsRoutes.post(
  "/score",
  bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const r = relay.score({ room: body?.room, conn: body?.conn, sid: body?.sid, game: body?.game, scores: body?.scores });
    if (!r.ok) return c.json({ ok: false, error: r.error }, r.status as 400);
    return c.json({ ok: true, dup: r.dup, board: r.board });
  },
);

roomsRoutes.get("/board", (c) => {
  const code = (c.req.query("code") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return c.json({ ok: false }, 400);
  return c.json({ ok: true, ...relay.board(code) });
});

roomsRoutes.get("/ice", async (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ iceServers: await getIceServers(), turn: turnConfigured() });
});

/* Salons publics : liste éphémère des parties ouvertes (TTL 45 s), par jeu. */
roomsRoutes.post("/public", async (c) => {
  const b = await c.req.json().catch(() => null);
  return relay.setPublic(b ?? {}) ? c.json({ ok: true }) : c.json({ ok: false }, 400);
});
roomsRoutes.get("/public", (c) => c.json({ ok: true, rooms: relay.listPublic(c.req.query("game") ?? "") }));
