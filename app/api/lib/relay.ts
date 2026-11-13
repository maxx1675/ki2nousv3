/**
 * Cœur du relais de salons (sans dépendance à Hono : c'est ce qui est testé dans relay.test.ts).
 *
 * Ce que fait le relais, en plus de simplement transmettre les messages :
 *  - HÔTE : le 1er arrivé (ou celui qui crée le salon) est l'hôte. Si l'hôte disparaît plus de
 *    HOST_GRACE_MS (coupure réseau, onglet fermé…), le relais désigne automatiquement un autre joueur
 *    (le plus ancien encore connecté) et lui envoie la dernière « photo » (snapshot) de la partie :
 *    la partie continue. Si l'ancien hôte revient, il redevient un simple joueur.
 *  - REPRISE : un salon vide est gardé ROOM_TTL_MS (au lieu d'être supprimé immédiatement), avec son
 *    snapshot : tout le monde peut se reconnecter (téléphones verrouillés, page rechargée…).
 *  - CLASSEMENT DE SOIRÉE : les résultats de chaque jeu s'additionnent par code de salon.
 */

export type Sink = { send(event: string, data: unknown): void; close(): void };
type Conn = { id: string; cid: string; sink: Sink };
type Snap = { data: unknown; ts: number; epoch: number };
export type Room = {
  name: string;
  createdAt: number;
  lastActive: number;
  emptySince: number;
  hostCid: string;
  epoch: number;
  hostLostAt: number;
  order: string[];
  conns: Map<string, Conn>;
  snap: Snap | null;
};

export type Row = { cid: string; n: string; e: string; c: string; total: number; wins: number; games: number; per: Record<string, number> };
type Party = { code: string; ts: number; rows: Map<string, Row>; sids: Set<string>; history: { game: string; sid: string; ts: number }[] };

export const ROOM_RE = /^[A-Za-z0-9-]{3,16}$/;
export const RANK_PTS = [10, 7, 5, 4, 3, 2];

export type RelayOpts = {
  now?: () => number;
  hostGraceMs?: number;
  roomTtlMs?: number;
  maxRooms?: number;
  maxConnsPerRoom?: number;
};

export type JoinResult =
  | { ok: true; conn: string; host: boolean; epoch: number; hostCid: string; serverNow: number; snap?: unknown }
  | { ok: false; status: number; error: string; code?: string };

export class Relay {
  rooms = new Map<string, Room>();
  parties = new Map<string, Party>();
  publicRooms = new Map<string, { game: string; room: string; host: string; count: number; max: number; ts: number }>();
  now: () => number;
  hostGraceMs: number;
  roomTtlMs: number;
  maxRooms: number;
  maxConnsPerRoom: number;

  constructor(o: RelayOpts = {}) {
    this.now = o.now ?? Date.now;
    this.hostGraceMs = o.hostGraceMs ?? 20_000;
    this.roomTtlMs = o.roomTtlMs ?? 20 * 60_000;
    this.maxRooms = o.maxRooms ?? 2000;
    this.maxConnsPerRoom = o.maxConnsPerRoom ?? 32;
  }

  /* ---------- utilitaires ---------- */
  liveCids(room: Room): Set<string> {
    return new Set([...room.conns.values()].map((c) => c.cid));
  }
  private newRoom(name: string): Room {
    const t = this.now();
    return { name, createdAt: t, lastActive: t, emptySince: t, hostCid: "", epoch: 0, hostLostAt: t, order: [], conns: new Map(), snap: null };
  }
  private broadcastPeers(room: Room) {
    const peers = [...this.liveCids(room)];
    for (const c of room.conns.values()) c.sink.send("peers", peers);
  }
  private promote(room: Room, cid: string) {
    room.hostCid = cid;
    room.epoch++;
    room.hostLostAt = 0;
    for (const c of room.conns.values()) {
      const msg: { cid: string; epoch: number; snap?: unknown } = { cid, epoch: room.epoch };
      if (c.cid === cid && room.snap) msg.snap = room.snap.data;
      c.sink.send("host", msg);
    }
  }

  /* ---------- connexion ---------- */
  join(p: { room: unknown; cid: unknown; create?: unknown; resume?: unknown; wasHost?: unknown }): JoinResult {
    const name = String(p.room ?? "");
    const cid = String(p.cid ?? "");
    if (!ROOM_RE.test(name) || !cid || cid.length > 32) return { ok: false, status: 400, error: "Salon introuvable" };
    const create = p.create === true;
    const resume = p.resume === true;
    const wasHost = p.wasHost === true;
    let room = this.rooms.get(name);

    // Un vieux salon vide avec le même code : celui qui CRÉE repart de zéro.
    if (room && create && room.conns.size === 0) {
      this.rooms.delete(name);
      room = undefined;
    }
    if (!room) {
      if (!create && !resume) return { ok: false, status: 404, error: "Salon introuvable", code: "noroom" };
      if (this.rooms.size >= this.maxRooms) this.sweep();
      if (this.rooms.size >= this.maxRooms) return { ok: false, status: 503, error: "Trop de salons actifs" };
      room = this.newRoom(name);
      this.rooms.set(name, room);
    }
    // salon sans hôte (tout neuf, ou recréé après un redémarrage du serveur) :
    // le créateur, ou l'ancien hôte qui revient, devient hôte tout de suite.
    if (!room.hostCid && (create || wasHost)) {
      room.hostCid = cid;
      room.hostLostAt = 0;
    }
    if (!room.order.includes(cid)) room.order.push(cid);
    room.lastActive = this.now();
    const host = room.hostCid === cid;
    const conn = crypto.randomUUID();
    const res: JoinResult = { ok: true, conn, host, epoch: room.epoch, hostCid: room.hostCid, serverNow: this.now() };
    if (host && room.snap) res.snap = room.snap.data;
    return res;
  }

  /** Branche un flux SSE. */
  open(roomName: string, cid: string, conn: string, sink: Sink): { ok: true; close: () => void } | { ok: false; status: number } {
    if (!ROOM_RE.test(roomName) || !cid || cid.length > 32 || !conn || conn.length > 64) return { ok: false, status: 400 };
    const room = this.rooms.get(roomName);
    if (!room) return { ok: false, status: 404 };
    if (room.conns.size >= this.maxConnsPerRoom && !room.conns.has(conn)) return { ok: false, status: 429 };
    const old = room.conns.get(conn);
    if (old && old.sink !== sink) old.sink.close();
    room.conns.set(conn, { id: conn, cid, sink });
    if (!room.order.includes(cid)) room.order.push(cid);
    room.emptySince = 0;
    room.lastActive = this.now();
    if (cid === room.hostCid) room.hostLostAt = 0;
    sink.send("host", { cid: room.hostCid, epoch: room.epoch });
    this.broadcastPeers(room);
    return {
      ok: true,
      close: () => this.dropConn(roomName, conn, sink),
    };
  }

  private dropConn(roomName: string, conn: string, sink?: Sink) {
    const room = this.rooms.get(roomName);
    if (!room) return;
    const c = room.conns.get(conn);
    if (!c || (sink && c.sink !== sink)) return;
    room.conns.delete(conn);
    const live = this.liveCids(room);
    if (room.hostCid && !live.has(room.hostCid) && !room.hostLostAt) room.hostLostAt = this.now();
    if (room.conns.size === 0) room.emptySince = this.now();
    this.broadcastPeers(room);
  }

  leave(roomName: string, conn: string) {
    const room = this.rooms.get(String(roomName));
    const c = room?.conns.get(String(conn));
    if (room && c) {
      c.sink.close();
      this.dropConn(room.name, c.id, c.sink);
    }
  }

  /* ---------- messages ---------- */
  event(p: { room: unknown; conn: unknown; topic: unknown; data: unknown; to?: unknown }) {
    const roomName = String(p.room ?? "");
    const from = String(p.conn ?? "");
    const topic = String(p.topic ?? "");
    const to = p.to ? String(p.to) : "";
    const room = this.rooms.get(roomName);
    if (!room) return { ok: false as const, status: 404, error: "Salon introuvable", code: "noroom" };
    if (!topic || topic.length > 24) return { ok: false as const, status: 400, error: "Sujet invalide" };
    const sender = room.conns.get(from);
    if (!sender) return { ok: false as const, status: 403, error: "Connexion inconnue", code: "noconn" };
    room.lastActive = this.now();
    const payload = { topic, data: p.data, from, serverNow: this.now() };
    let delivered = 0;
    const targetCid = to === "host" ? room.hostCid : to;
    for (const [id, cn] of room.conns) {
      if (id === from) continue;
      if (to && !(cn.cid === targetCid || id === to)) continue;
      cn.sink.send("evt", payload);
      delivered++;
    }
    return { ok: true as const, delivered };
  }

  /** Envoi initié par le serveur lui-même (ex. classement de soirée). */
  serverBroadcast(roomName: string, topic: string, data: unknown) {
    const room = this.rooms.get(roomName);
    if (!room) return 0;
    let n = 0;
    for (const cn of room.conns.values()) {
      cn.sink.send("evt", { topic, data, from: "server", serverNow: this.now() });
      n++;
    }
    return n;
  }

  /* ---------- snapshot de l'hôte ---------- */
  setSnap(roomName: string, conn: string, data: unknown) {
    const room = this.rooms.get(String(roomName));
    if (!room) return { ok: false as const, status: 404 };
    const c = room.conns.get(String(conn));
    if (!c) return { ok: false as const, status: 403 };
    if (c.cid !== room.hostCid) return { ok: false as const, status: 409 };
    room.snap = { data, ts: this.now(), epoch: room.epoch };
    return { ok: true as const };
  }

  /* ---------- balayage périodique (promotion d'hôte, nettoyage) ---------- */
  sweep() {
    const t = this.now();
    for (const [name, room] of this.rooms) {
      const live = this.liveCids(room);
      if (live.size === 0) {
        if (!room.emptySince) room.emptySince = t;
        if (t - room.emptySince > this.roomTtlMs) this.rooms.delete(name);
        continue;
      }
      room.emptySince = 0;
      if (room.hostCid && live.has(room.hostCid)) {
        room.hostLostAt = 0;
        continue;
      }
      if (!room.hostLostAt) room.hostLostAt = t;
      if (t - room.hostLostAt >= this.hostGraceMs) {
        const next = room.order.find((cid) => live.has(cid)) ?? [...live][0];
        this.promote(room, next);
      }
    }
    for (const [k, v] of this.publicRooms) if (t - v.ts > 45_000) this.publicRooms.delete(k);
    for (const [k, p] of this.parties) if (t - p.ts > 12 * 3600_000) this.parties.delete(k);
  }

  /* ---------- salons publics ---------- */
  setPublic(b: { room?: unknown; game?: unknown; host?: unknown; count?: unknown; max?: unknown; close?: unknown }) {
    const room = String(b.room ?? "");
    const game = String(b.game ?? "").slice(0, 16);
    if (!ROOM_RE.test(room) || !game) return false;
    if (b.close) this.publicRooms.delete(room);
    else if (this.publicRooms.size < 2000) {
      this.publicRooms.set(room, { game, room, host: String(b.host ?? "").slice(0, 20), count: Number(b.count) || 1, max: Number(b.max) || 20, ts: this.now() });
    }
    return true;
  }
  listPublic(game: string) {
    const t = this.now();
    const out: unknown[] = [];
    for (const [k, v] of this.publicRooms) {
      if (t - v.ts > 45_000) this.publicRooms.delete(k);
      else if (v.game === game) out.push(v);
    }
    return out;
  }

  /* ---------- classement de la soirée ---------- */
  static partyCode(room: string): string {
    const m = /^(?:[a-z]{2,4}-)?([A-Za-z0-9]{4})$/.exec(room);
    return m ? m[1].toUpperCase() : "";
  }

  score(p: { room: unknown; conn: unknown; sid: unknown; game: unknown; scores: unknown }) {
    const roomName = String(p.room ?? "");
    const room = this.rooms.get(roomName);
    if (!room) return { ok: false as const, status: 404, error: "Salon introuvable" };
    const c = room.conns.get(String(p.conn ?? ""));
    if (!c) return { ok: false as const, status: 403, error: "Connexion inconnue" };
    if (c.cid !== room.hostCid) return { ok: false as const, status: 403, error: "Réservé à l'hôte" };
    const code = Relay.partyCode(roomName);
    const sid = String(p.sid ?? "").slice(0, 40);
    const game = String(p.game ?? "").slice(0, 8);
    if (!code || !sid || !game || !Array.isArray(p.scores)) return { ok: false as const, status: 400, error: "Requête invalide" };
    const scores = (p.scores as Record<string, unknown>[])
      .slice(0, 40)
      .map((s) => ({
        cid: String(s.cid ?? "").slice(0, 32),
        n: String(s.n ?? "?").replace(/[<>]/g, "").slice(0, 24),
        e: String(s.e ?? "").slice(0, 8),
        c: /^#[0-9a-fA-F]{6}$/.test(String(s.c ?? "")) ? String(s.c) : "",
        s: Number(s.s),
      }))
      .filter((s) => s.cid && Number.isFinite(s.s));
    if (scores.length < 2) return { ok: false as const, status: 400, error: "Il faut au moins 2 joueurs" };

    let party = this.parties.get(code);
    if (!party) {
      if (this.parties.size >= 500) this.sweep();
      party = { code, ts: this.now(), rows: new Map(), sids: new Set(), history: [] };
      this.parties.set(code, party);
    }
    party.ts = this.now();
    if (party.sids.has(sid)) return { ok: true as const, dup: true, board: this.board(code) };
    party.sids.add(sid);
    party.history.push({ game, sid, ts: this.now() });
    if (party.history.length > 100) party.history.shift();

    const sorted = [...scores].sort((a, b) => b.s - a.s);
    sorted.forEach((s) => {
      const rank = sorted.findIndex((x) => x.s === s.s); // égalité = même rang
      const pts = RANK_PTS[rank] ?? 1;
      let row = party!.rows.get(s.cid);
      if (!row) {
        row = { cid: s.cid, n: s.n, e: s.e, c: s.c, total: 0, wins: 0, games: 0, per: {} };
        party!.rows.set(s.cid, row);
      }
      row.n = s.n;
      row.e = s.e;
      row.c = s.c;
      row.total += pts;
      row.games += 1;
      if (rank === 0) row.wins += 1;
      row.per[game] = (row.per[game] ?? 0) + pts;
    });
    const board = this.board(code);
    // on prévient le « salon de la soirée » (page /soiree/) s'il est ouvert
    this.serverBroadcast("pt-" + code, "board", board);
    return { ok: true as const, dup: false, board };
  }

  board(code: string) {
    const party = this.parties.get(String(code).toUpperCase());
    if (!party) return { rows: [] as Row[], games: 0, last: null as null | { game: string; ts: number } };
    const rows = [...party.rows.values()].sort((a, b) => b.total - a.total || b.wins - a.wins || a.n.localeCompare(b.n));
    const last = party.history[party.history.length - 1] ?? null;
    return { rows, games: party.history.length, last: last ? { game: last.game, ts: last.ts } : null };
  }
}
