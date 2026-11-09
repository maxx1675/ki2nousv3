import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

/**
 * Relais de salons temps réel pour les jeux de soirée.
 * Transport : REST (join / event / leave) + SSE (stream) pour la réception.
 * Protocole côté client :
 *   POST /api/rooms/join   { room, cid }              -> { ok, conn }
 *   GET  /api/rooms/stream ?room&cid&conn             -> SSE ("peers", "evt")
 *   POST /api/rooms/event  { room, conn, topic, data, to? } -> { ok }
 *   POST /api/rooms/leave  { room, conn }             -> { ok }
 * Les événements sont relayés à tous les membres du salon sauf l'émetteur,
 * ou uniquement au destinataire si `to` vaut "host" ou un cid de joueur.
 */

type Conn = { cid: string; ctrl: ReadableStreamDefaultController<Uint8Array> };
type Room = { createdAt: number; hostCid: string; conns: Map<string, Conn> };

const rooms = new Map<string, Room>();
const MAX_ROOMS = 2000;
const MAX_CONNS_PER_ROOM = 32;
const ROOM_RE = /^[A-Za-z0-9-]{3,16}$/;
const enc = new TextEncoder();

function sseSend(ctrl: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  try {
    ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  } catch {
    /* connexion déjà fermée */
  }
}

function peersOf(room: Room): string[] {
  return [...new Set([...room.conns.values()].map((c) => c.cid))];
}

function broadcastPeers(roomName: string) {
  const room = rooms.get(roomName);
  if (!room) return;
  const peers = peersOf(room);
  for (const c of room.conns.values()) sseSend(c.ctrl, "peers", peers);
  if (room.conns.size === 0) rooms.delete(roomName);
}

function getOrCreateRoom(name: string): Room | null {
  let room = rooms.get(name);
  if (!room) {
    if (rooms.size >= MAX_ROOMS) return null;
    room = { createdAt: Date.now(), hostCid: "", conns: new Map() };
    rooms.set(name, room);
  }
  return room;
}

export const roomsRoutes = new Hono();

roomsRoutes.post("/join", async (c) => {
  const body = await c.req.json().catch(() => null);
  const roomName = String(body?.room ?? "");
  const cid = String(body?.cid ?? "");
  if (!ROOM_RE.test(roomName) || !cid || cid.length > 32) {
    return c.json({ ok: false, error: "Salon introuvable" }, 400);
  }
  const room = getOrCreateRoom(roomName);
  if (!room) return c.json({ ok: false, error: "Trop de salons actifs" }, 503);
  if (!room.hostCid) room.hostCid = cid;
  const conn = crypto.randomUUID();
  return c.json({ ok: true, conn, host: room.hostCid === cid, serverNow: Date.now() });
});

roomsRoutes.get("/stream", (c) => {
  const roomName = c.req.query("room") ?? "";
  const cid = c.req.query("cid") ?? "";
  const conn = c.req.query("conn") ?? "";
  if (!ROOM_RE.test(roomName) || !cid || !conn) return c.body(null, 400);

  const room = getOrCreateRoom(roomName);
  if (!room) return c.body(null, 503);
  if (room.conns.size >= MAX_CONNS_PER_ROOM && !room.conns.has(conn)) {
    return c.body(null, 429);
  }
  if (!room.hostCid) room.hostCid = cid;

  const body = new ReadableStream<Uint8Array>({
    start(ctrl) {
      room.conns.set(conn, { cid, ctrl });
      sseSend(ctrl, "peers", peersOf(room));
      broadcastPeers(roomName);
      const hb = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(": ping\n\n"));
        } catch {
          /* fermé */
        }
      }, 20000);
      const cleanup = () => {
        clearInterval(hb);
        const r = rooms.get(roomName);
        if (r && r.conns.get(conn)?.ctrl === ctrl) {
          r.conns.delete(conn);
          broadcastPeers(roomName);
        }
      };
      c.req.raw.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      const r = rooms.get(roomName);
      if (r && r.conns.get(conn)?.cid === cid) {
        r.conns.delete(conn);
        broadcastPeers(roomName);
      }
    },
  });

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
    const roomName = String(body?.room ?? "");
    const from = String(body?.conn ?? "");
    const topic = String(body?.topic ?? "");
    const to = body?.to ? String(body.to) : "";
    const room = rooms.get(roomName);
    if (!room || !topic || topic.length > 24) return c.json({ ok: false, error: "Salon introuvable" }, 404);
    const payload = { topic, data: body?.data, from, serverNow: Date.now() };
    let delivered = 0;
    if (to) {
      const targetCid = to === "host" ? room.hostCid : to;
      for (const [id, cn] of room.conns) {
        if (id === from) continue;
        if (cn.cid === targetCid || id === to) {
          sseSend(cn.ctrl, "evt", payload);
          delivered++;
        }
      }
    } else {
      for (const [id, cn] of room.conns) {
        if (id === from) continue;
        sseSend(cn.ctrl, "evt", payload);
        delivered++;
      }
    }
    return c.json({ ok: true, delivered });
  },
);

roomsRoutes.post("/leave", async (c) => {
  const body = await c.req.json().catch(() => null);
  const roomName = String(body?.room ?? "");
  const conn = String(body?.conn ?? "");
  const room = rooms.get(roomName);
  if (room && room.conns.delete(conn)) broadcastPeers(roomName);
  return c.json({ ok: true });
});

/* Salons publics : liste éphémère des parties ouvertes (TTL 45 s), par jeu. */
const publicRooms = new Map<string, { game: string; room: string; host: string; count: number; max: number; ts: number }>();
roomsRoutes.post("/public", async (c) => {
  const b = await c.req.json().catch(() => null);
  const room = String(b?.room ?? "");
  const game = String(b?.game ?? "").slice(0, 16);
  if (!ROOM_RE.test(room) || !game) return c.json({ ok: false }, 400);
  if (b?.close) publicRooms.delete(room);
  else if (publicRooms.size < 2000) {
    publicRooms.set(room, { game, room, host: String(b?.host ?? "").slice(0, 16), count: Number(b?.count) || 1, max: Number(b?.max) || 20, ts: Date.now() });
  }
  return c.json({ ok: true });
});
roomsRoutes.get("/public", (c) => {
  const game = c.req.query("game") ?? "";
  const now = Date.now();
  const list: unknown[] = [];
  for (const [k, v] of publicRooms) {
    if (now - v.ts > 45000) publicRooms.delete(k);
    else if (v.game === game) list.push(v);
  }
  return c.json({ ok: true, rooms: list });
});
