/**
 * Moteur autoritaire de « La Table Des Menteurs ».
 *
 * Toute la partie (distribution, tours, annonces, contestations, révolver,
 * chronomètres, éliminations, classement) est calculée ici, côté serveur.
 * Les clients ne reçoivent que :
 *  - l'état public (aucune main, aucune carte cachée) ;
 *  - leur propre main (via un jeton de joueur).
 *
 * Le relais SSE existant (api/lib/relay.ts) ne sert qu'à prévenir les clients
 * qu'un état a changé ; le contenu de partie reste dans ce module.
 */
import { randomInt, randomUUID } from "node:crypto";

export const MENTEURS_VALUES = ["9", "10", "V", "D", "R", "A"] as const;
export type MenteursValue = (typeof MENTEURS_VALUES)[number];
/** Valeurs possibles de la carte cible : figures et As uniquement. */
export const MENTEURS_TARGETS = ["V", "D", "R", "A"] as const;

export const MENTEURS_AVATARS = [
  "sherif",
  "bandit",
  "cowboy",
  "cowgirl",
  "barman",
  "chasseur",
  "horslaloi",
  "prospecteur",
] as const;
export type MenteursAvatar = (typeof MENTEURS_AVATARS)[number];

export type MenteursCard = { v: string; s: string };
export type MenteursLog = { id: string; t: number; msg: string; kind: string };
/** Barillet individuel : une balle secrète et la prochaine chambre à tirer. */
export type MenteursGun = { bullet: number; chamber: number };

export type MenteursConfig = {
  max: number;
  lives: number;
  rounds: number;
  think: number;
  challenge: number;
  special: boolean;
};

export type MenteursPlayer = {
  id: string;
  name: string;
  avatar: MenteursAvatar;
  token: string;
  alive: boolean;
  lives: number;
  hand: MenteursCard[];
  score: number;
  bluffs: number;
  connects: number;
  connected: boolean;
  lastSeen: number;
  spectator: boolean;
  /** Cartes levées devant le joueur (visible par les autres). */
  raised: boolean;
  /** Revolver personnel : balle cachée + chambre suivante. */
  gun: MenteursGun;
};

export type MenteursClaim = {
  by: string;
  count: number;
  target: string;
  cards: MenteursCard[];
  ts: number;
};

export type MenteursReveal = {
  ts: number;
  liar: boolean;
  /** Le joueur qui s'est trompé et retourne son propre revolver contre lui. */
  shooter: string;
  /** Identique à `shooter` : on garde les deux champs pour l'affichage. */
  victim: string;
  bullet: boolean;
  chamber: number;
  /** Chambres encore fermées après ce tir (dénominateur du prochain tir). */
  remaining: number;
  target: string;
  count: number;
  cards: MenteursCard[];
  auto: boolean;
  /** Vies et survie AVANT le tir : permet aux clients de masquer la mort
      jusqu'à la détonation locale. */
  before: { id: string; alive: boolean; lives: number }[];
  /** Nombre d'entrées de journal avant le résultat : le client n'affiche
      pas les lignes de tir/élimination avant la balle. */
  logCount: number;
};

export type MenteursPhase = "lobby" | "claim" | "challenge" | "reveal" | "end";

export type MenteursRoom = {
  code: string;
  name: string;
  hostId: string;
  createdAt: number;
  updatedAt: number;
  phase: MenteursPhase;
  config: MenteursConfig;
  players: MenteursPlayer[];
  turnId: string;
  target: string;
  round: number;
  /** Horodatage du dévoilement de la carte cible (5 s sans jouer). */
  roundAt: number;
  pile: MenteursCard[];
  claim: MenteursClaim | null;
  challenger: string;
  reveal: MenteursReveal | null;
  deadline: number;
  paused: boolean;
  pauseRemain: number;
  winner: string;
  endReason: string;
  log: MenteursLog[];
  autoChallenge: boolean;
  scored: boolean;
  startedAt: number;
  endedAt: number;
  /** Pioche privée : jamais exposée dans MenteursView. */
  deck: MenteursCard[];
  /** Premier joueur de la manche suivante après une révélation. */
  playerAfterReveal: string;
};

export type PublicPlayer = {
  id: string;
  name: string;
  avatar: MenteursAvatar;
  alive: boolean;
  lives: number;
  connected: boolean;
  spectator: boolean;
  score: number;
  bluffs: number;
  handCount: number;
  raised: boolean;
  /** Barillet visible : chambre suivante et chambres restantes (la balle reste secrète). */
  gun: { chamber: number; remaining: number };
};

export type PublicClaim = { by: string; count: number; target: string; ts: number };
export type PublicReveal = MenteursReveal;

export type MenteursView = {
  code: string;
  phase: MenteursPhase;
  config: MenteursConfig;
  hostId: string;
  players: PublicPlayer[];
  you: {
    id: string;
    name: string;
    avatar: MenteursAvatar;
    alive: boolean;
    lives: number;
    hand: MenteursCard[];
    spectator: boolean;
    score: number;
    bluffs: number;
    gun: { chamber: number; remaining: number };
  };
  turnId: string;
  target: string;
  round: number;
  roundAt: number;
  pileCount: number;
  claim: PublicClaim | null;
  challenger: string;
  reveal: PublicReveal | null;
  deadline: number;
  paused: boolean;
  /** Temps restant figé pendant la pause (ms). */
  pauseRemain: number;
  winner: string;
  endReason: string;
  ranking: { id: string; name: string; score: number; lives: number; alive: boolean; bluffs: number }[];
  log: MenteursLog[];
  serverNow: number;
};

export type MenteursOk = { ok: true; token: string; state: MenteursView };
export type MenteursErr = { ok: false; error: string; code?: string; status?: number };
export type MenteursResult = MenteursOk | MenteursErr;

export type MenteursAction =
  | { k: "config"; config: Partial<MenteursConfig> }
  | { k: "start" }
  | { k: "pause" }
  | { k: "resume" }
  | { k: "end" }
  | { k: "rematch" }
  | { k: "kick"; id: string }
  | { k: "nextTurn" }
  | { k: "claim"; cards: number[] }
  | { k: "challenge" }
  | { k: "believe" }
  | { k: "raise"; v: boolean };

const MAX_LOG = 80;
const RECENT_ACTION_MS = 30_000;
const DISCONNECT_MS = 35_000;

function cleanName(v: unknown): string {
  return String(v ?? "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 18);
}
function cleanId(v: unknown): string {
  return String(v ?? "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 32);
}
function isAvatar(v: unknown): v is MenteursAvatar {
  return typeof v === "string" && (MENTEURS_AVATARS as readonly string[]).includes(v);
}
function clampInt(v: unknown, min: number, max: number, def: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}
export function sanitizeConfig(input: Partial<MenteursConfig> | undefined, base?: MenteursConfig): MenteursConfig {
  const b = base ?? { max: 6, lives: 1, rounds: 10, think: 20, challenge: 12, special: true };
  const src = input ?? {};
  return {
    max: clampInt(src.max ?? b.max, 2, 8, b.max),
    lives: clampInt(src.lives ?? b.lives, 1, 5, b.lives),
    rounds: clampInt(src.rounds ?? b.rounds, 1, 20, b.rounds),
    think: clampInt(src.think ?? b.think, 5, 60, b.think),
    challenge: clampInt(src.challenge ?? b.challenge, 3, 30, b.challenge),
    special: typeof src.special === "boolean" ? src.special : b.special,
  };
}

export type MenteursEngineOptions = {
  now?: () => number;
  roll?: () => number;
  shuffle?: <T>(a: T[]) => T[];
  onChange?: (room: MenteursRoom) => void;
  resolveHost?: (roomName: string) => string;
  onEnd?: (room: MenteursRoom) => void;
};

export class MenteursEngine {
  rooms = new Map<string, MenteursRoom>();
  now: () => number;
  roll: () => number;
  shuffle: <T>(a: T[]) => T[];
  onChange?: (room: MenteursRoom) => void;
  resolveHost?: (roomName: string) => string;
  onEnd?: (room: MenteursRoom) => void;
  private recent = new Map<string, number>();

  constructor(o: MenteursEngineOptions = {}) {
    this.now = o.now ?? Date.now;
    this.roll = o.roll ?? (() => randomInt(1, 7));
    this.shuffle =
      o.shuffle ??
      (<T,>(a: T[]) => {
        const out = [...a];
        for (let i = out.length - 1; i > 0; i--) {
          const j = randomInt(0, i + 1);
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      });
    this.onChange = o.onChange;
    this.resolveHost = o.resolveHost;
    this.onEnd = o.onEnd;
  }

  private changed(room: MenteursRoom) {
    room.updatedAt = this.now();
    this.onChange?.(room);
  }
  private log(room: MenteursRoom, msg: string, kind = "info") {
    room.log.unshift({ id: randomUUID(), t: this.now(), msg, kind });
    if (room.log.length > MAX_LOG) room.log.length = MAX_LOG;
  }
  private player(room: MenteursRoom, id: string) {
    return room.players.find((p) => p.id === id);
  }
  /** Barillet neuf : une balle placée au hasard, chambre 1 en premier. */
  private newGun(): MenteursGun {
    const n = Math.floor(Number(this.roll()) || 1);
    const bullet = ((n - 1) % 6 + 6) % 6 + 1;
    return { bullet, chamber: 1 };
  }
  private gunView(g?: MenteursGun) {
    const raw = g ? Math.max(1, Math.floor(g.chamber) || 1) : 1;
    return { chamber: Math.min(6, raw), remaining: Math.max(0, 7 - raw) };
  }
  /** Tire une chambre du revolver personnel du tireur. */
  private fire(room: MenteursRoom, shooter: string) {
    const sp = this.player(room, shooter);
    if (!sp) return { bullet: false, chamber: 1, remaining: 6 };
    const gun = sp.gun ?? (sp.gun = this.newGun());
    const chamber = Math.max(1, Math.min(6, Math.floor(gun.chamber) || 1));
    const bullet = chamber === gun.bullet;
    gun.chamber = chamber + 1;
    return { bullet, chamber, remaining: Math.max(0, 6 - chamber) };
  }
  /** Réarme tous les revolvers en début de partie (les barillets restent
      ensuite individuels : chaque tir vide une chambre de SON revolver). */
  private resetGuns(room: MenteursRoom) {
    for (const p of room.players) if (p.alive && !p.spectator) p.gun = this.newGun();
  }
  private alive(room: MenteursRoom) {
    return room.players.filter((p) => p.alive && !p.spectator);
  }
  private syncHost(room: MenteursRoom) {
    if (this.resolveHost) {
      const relayHost = this.resolveHost(room.name);
      const relayPlayer = relayHost ? this.player(room, relayHost) : undefined;
      // On ne suit le relais que s'il désigne un joueur encore présent : sinon
      // un hôte parti resterait « hôte » dans le moteur et bloquerait le
      // panneau de fin de partie / la revanche.
      if (relayPlayer && relayPlayer.connected && relayHost !== room.hostId) {
        room.hostId = relayHost!;
        this.log(room, `👑 Transfert d'hôte à ${this.nameOf(room, relayHost!)}.`, "host");
      }
    }
    const current = this.player(room, room.hostId);
    if (current && current.connected) return;
    // Filet de sécurité : l'hôte a quitté (ou expiré) sans que le relais ait
    // encore promu quelqu'un. On désigne un joueur connecté pour que la table
    // reste pilotable, y compris après une victoire par abandon.
    const next =
      room.players.find((p) => p.connected && !p.spectator) ||
      room.players.find((p) => p.connected) ||
      room.players.find((p) => !p.spectator) ||
      room.players[0];
    if (next && next.id !== room.hostId) {
      room.hostId = next.id;
      this.log(room, `👑 ${next.name} devient hôte.`, "host");
    }
  }
  private nameOf(room: MenteursRoom, id: string) {
    return this.player(room, id)?.name ?? "?";
  }
  private isHost(room: MenteursRoom, id: string) {
    this.syncHost(room);
    return room.hostId === id;
  }
  private requireHost(room: MenteursRoom, id: string) {
    if (!this.isHost(room, id)) return { ok: false as const, error: "Réservé à l'hôte", status: 403 };
    return null;
  }
  private requireToken(room: MenteursRoom, id: string, token: string) {
    const p = this.player(room, id);
    if (!p) return { ok: false as const, error: "Joueur inconnu", code: "gone", status: 404 };
    if (!token || token !== p.token) return { ok: false as const, error: "Jeton invalide", code: "token", status: 403 };
    return null;
  }
  private dedupe(id: string, aid: string | undefined) {
    if (!aid) return null;
    const key = id + ":" + aid.slice(0, 48);
    const t = this.recent.get(key);
    if (t && this.now() - t < RECENT_ACTION_MS) return true;
    this.recent.set(key, this.now());
    if (this.recent.size > 5000) {
      const cut = this.now() - RECENT_ACTION_MS;
      for (const [k, v] of this.recent) if (v < cut) this.recent.delete(k);
    }
    return null;
  }

  view(room: MenteursRoom, id: string, token: string): MenteursView {
    this.syncHost(room);
    const me = this.player(room, id);
    const hand = me && token && token === me.token ? me.hand.map((c) => ({ ...c })) : [];
    const players: PublicPlayer[] = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      alive: p.alive,
      lives: p.lives,
      connected: p.connected,
      spectator: p.spectator,
      score: p.score,
      bluffs: p.bluffs,
      handCount: p.hand.length,
      raised: p.raised !== false,
      gun: this.gunView(p.gun),
    }));
    const ranking = [...room.players]
      .filter((p) => !p.spectator)
      .sort((a, b) => Number(b.alive) - Number(a.alive) || b.lives - a.lives || b.score - a.score || b.bluffs - a.bluffs || a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, name: p.name, score: p.score, lives: p.lives, alive: p.alive, bluffs: p.bluffs }));
    return {
      code: room.code,
      phase: room.phase,
      config: { ...room.config },
      hostId: room.hostId,
      players,
      you: {
        id: me?.id ?? id,
        name: me?.name ?? "",
        avatar: me?.avatar ?? "cowboy",
        alive: me?.alive ?? false,
        lives: me?.lives ?? 0,
        hand,
        spectator: me?.spectator ?? true,
        score: me?.score ?? 0,
        bluffs: me?.bluffs ?? 0,
        gun: this.gunView(me?.gun),
      },
      turnId: room.turnId,
      target: room.target,
      round: room.round,
      roundAt: room.roundAt,
      pileCount: room.pile.length,
      claim: room.claim ? { by: room.claim.by, count: room.claim.count, target: room.claim.target, ts: room.claim.ts } : null,
      challenger: room.challenger,
      reveal: room.phase === "reveal" && room.reveal ? { ...room.reveal, cards: room.reveal.cards.map((c) => ({ ...c })) } : null,
      deadline: room.deadline,
      paused: room.paused,
      pauseRemain: room.pauseRemain,
      winner: room.winner,
      endReason: room.endReason,
      ranking,
      log: room.log.map((l) => ({ ...l })),
      serverNow: this.now(),
    };
  }

  create(p: { room: unknown; id: unknown; name: unknown; avatar: unknown; config?: Partial<MenteursConfig> }): MenteursResult {
    const code = String(p.room ?? "").toUpperCase();
    const id = cleanId(p.id);
    const name = cleanName(p.name);
    if (!/^[A-Z0-9]{4}$/.test(code)) return { ok: false, error: "Code invalide", status: 400 };
    if (!id) return { ok: false, error: "Identité invalide", status: 400 };
    if (!name) return { ok: false, error: "Pseudo invalide", status: 400 };
    const existing = this.rooms.get(code);
    // Sécurité : ne jamais rendre un jeton existant via /create.
    // Un joueur qui revient doit passer par /join avec son jeton.
    if (existing) {
      return { ok: false, error: "Ce code est déjà utilisé", code: "exists", status: 409 };
    }
    const token = randomUUID();
    const room: MenteursRoom = {
      code,
      name: "mt-" + code,
      hostId: id,
      createdAt: this.now(),
      updatedAt: this.now(),
      phase: "lobby",
      config: sanitizeConfig(p.config),
      players: [
        {
          id,
          name,
          avatar: isAvatar(p.avatar) ? p.avatar : "cowboy",
          token,
          alive: true,
          lives: sanitizeConfig(p.config).lives,
          hand: [],
          score: 0,
          bluffs: 0,
          connects: 1,
          connected: true,
          lastSeen: this.now(),
          spectator: false,
          raised: true,
          gun: this.newGun(),
        },
      ],
      turnId: "",
      target: "",
      round: 0,
      roundAt: 0,
      pile: [],
      claim: null,
      challenger: "",
      reveal: null,
      deadline: 0,
      paused: false,
      pauseRemain: 0,
      winner: "",
      endReason: "",
      log: [],
      autoChallenge: false,
      scored: false,
      startedAt: 0,
      endedAt: 0,
      deck: [],
      playerAfterReveal: "",
    };
    this.log(room, `🏠 ${name} ouvre la table.`, "join");
    this.rooms.set(code, room);
    this.changed(room);
    return { ok: true, token, state: this.view(room, id, token) };
  }

  join(p: { room: unknown; id: unknown; name: unknown; avatar: unknown; token?: unknown }): MenteursResult {
    const code = String(p.room ?? "").toUpperCase();
    const id = cleanId(p.id);
    const name = cleanName(p.name);
    const token = String(p.token ?? "");
    if (!/^[A-Z0-9]{4}$/.test(code)) return { ok: false, error: "Code invalide", status: 400 };
    if (!id || !name) return { ok: false, error: "Identité invalide", status: 400 };
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: "Salon introuvable", code: "noroom", status: 404 };
    const existing = this.player(room, id);
    if (existing) {
      if (!token || token !== existing.token) {
        return { ok: false, error: "Jeton invalide", code: "token", status: 403 };
      }
      existing.connected = true;
      existing.lastSeen = this.now();
      existing.connects += 1;
      if (name) existing.name = name;
      if (isAvatar(p.avatar)) existing.avatar = p.avatar;
      this.log(room, existing.spectator ? `👁️ ${existing.name} se reconnecte.` : `🔁 ${existing.name} se reconnecte.`, "join");
      this.changed(room);
      return { ok: true, token: existing.token, state: this.view(room, id, existing.token) };
    }
    const newToken = randomUUID();
    const lobby = room.phase === "lobby";
    if (lobby && room.players.length >= room.config.max) return { ok: false, error: "La table est complète", code: "full", status: 409 };
    if (!lobby && room.players.filter((p) => !p.spectator).length >= 12) return { ok: false, error: "Trop de spectateurs", code: "full", status: 409 };
    const player: MenteursPlayer = {
      id,
      name,
      avatar: isAvatar(p.avatar) ? p.avatar : "cowboy",
      token: newToken,
      alive: lobby,
      lives: lobby ? room.config.lives : 0,
      hand: [],
      score: 0,
      bluffs: 0,
      connects: 1,
      connected: true,
      lastSeen: this.now(),
      spectator: !lobby,
      raised: true,
      gun: this.newGun(),
    };
    room.players.push(player);
    this.log(room, lobby ? `➕ ${name} rejoint la table.` : `👁️ ${name} rejoint en spectateur.`, "join");
    this.changed(room);
    return { ok: true, token: newToken, state: this.view(room, id, newToken) };
  }

  state(roomCode: string, id: string, token: string): MenteursResult {
    const room = this.rooms.get(String(roomCode).toUpperCase());
    if (!room) return { ok: false, error: "Salon introuvable", code: "noroom", status: 404 };
    const bad = this.requireToken(room, id, token);
    if (bad) return bad;
    const p = this.player(room, id)!;
    p.connected = true;
    p.lastSeen = this.now();
    return { ok: true, token, state: this.view(room, id, token) };
  }

  action(roomCode: string, id: string, token: string, action: MenteursAction, aid?: string): MenteursResult {
    const room = this.rooms.get(String(roomCode).toUpperCase());
    if (!room) return { ok: false, error: "Salon introuvable", code: "noroom", status: 404 };
    const bad = this.requireToken(room, id, token);
    if (bad) return bad;
    this.syncHost(room);
    const p = this.player(room, id)!;
    p.connected = true;
    p.lastSeen = this.now();
    const dup = this.dedupe(id, aid);
    if (dup) return { ok: true, token, state: this.view(room, id, token) };
    const k = action?.k;
    if (!k) return { ok: false, error: "Action invalide", status: 400 };

    if (k === "config") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "lobby") return { ok: false, error: "Les règles sont verrouillées", status: 409 };
      room.config = sanitizeConfig((action as { config: Partial<MenteursConfig> }).config, room.config);
      // On ne peut pas descendre la limite sous le nombre de joueurs déjà assis.
      room.config.max = Math.max(room.config.max, Math.min(8, room.players.filter((p) => !p.spectator).length));
      this.log(room, "⚙️ Réglages mis à jour par l'hôte.", "cfg");
    } else if (k === "start") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "lobby") return { ok: false, error: "La partie a déjà commencé", status: 409 };
      const players = room.players.filter((x) => !x.spectator);
      if (players.length < 2) return { ok: false, error: "Il faut au moins 2 joueurs", status: 409 };
      this.start(room);
    } else if (k === "pause") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "claim" && room.phase !== "challenge" && room.phase !== "reveal") return { ok: false, error: "Rien à mettre en pause", status: 409 };
      if (!room.paused) {
        room.pauseRemain = Math.max(0, room.deadline - this.now());
        room.paused = true;
        this.log(room, "⏸️ Partie en pause par l'hôte.", "host");
      }
    } else if (k === "resume") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.paused) {
        room.paused = false;
        room.deadline = this.now() + Math.max(1000, room.pauseRemain || 5000);
        this.log(room, "▶️ Reprise de la partie.", "host");
      }
    } else if (k === "end") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "end") this.finish(room, "host");
    } else if (k === "rematch") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "end") return { ok: false, error: "La partie n'est pas terminée", status: 409 };
      this.rematch(room);
    } else if (k === "kick") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "lobby") return { ok: false, error: "Exclusion possible uniquement dans le salon", status: 409 };
      const target = String((action as { id: string }).id ?? "");
      if (target === room.hostId) return { ok: false, error: "Impossible d'exclure l'hôte", status: 409 };
      const before = room.players.length;
      room.players = room.players.filter((x) => x.id !== target);
      if (room.players.length !== before) this.log(room, `🚪 ${this.nameOf(room, target)} est exclu par l'hôte.`, "kick");
    } else if (k === "nextTurn") {
      const host = this.requireHost(room, id);
      if (host) return host;
      if (room.phase !== "claim" && room.phase !== "challenge") return { ok: false, error: "Aucun tour à passer", status: 409 };
      this.log(room, "⏭️ L'hôte passe au tour suivant.", "host");
      this.advanceTurn(room, room.turnId, false);
    } else if (k === "claim") {
      if (room.paused) return { ok: false, error: "Partie en pause", status: 409 };
      if (room.phase !== "claim") return { ok: false, error: "Ce n'est pas la phase d'annonce", status: 409 };
      if (room.turnId !== id) return { ok: false, error: "Ce n'est pas ton tour", status: 403 };
      if (!p.alive || p.spectator) return { ok: false, error: "Tu es éliminé", status: 403 };
      const hold = room.roundAt + 5000 - this.now();
      if (hold > 0) return { ok: false, error: `La carte cible se dévoile encore (${Math.ceil(hold / 1000)} s)`, status: 409 };
      const indices = (action as { cards: number[] }).cards;
      if (!Array.isArray(indices)) return { ok: false, error: "Cartes invalides", status: 400 };
      const uniq = [...new Set(indices.map((n) => Math.floor(Number(n))))];
      if (uniq.length < 1 || uniq.length > 3) return { ok: false, error: "Joue 1 à 3 cartes", status: 400 };
      if (uniq.some((n) => !Number.isInteger(n) || n < 0 || n >= p.hand.length)) return { ok: false, error: "Carte inconnue", status: 400 };
      const cards = uniq.map((n) => p.hand[n]);
      const sorted = [...uniq].sort((a, b) => b - a);
      for (const n of sorted) p.hand.splice(n, 1);
      room.claim = { by: id, count: cards.length, target: room.target, cards, ts: this.now() };
      room.pile.push(...cards);
      room.challenger = "";
      room.phase = "challenge";
      room.autoChallenge = room.pile.length >= 12;
      room.deadline = this.now() + (room.autoChallenge ? 2200 : room.config.challenge * 1000);
      this.log(room, `🃏 ${p.name} annonce ${cards.length} × ${room.target}.`, "claim");
      // Les cartes pos�es quittent la main sans repioche imm�diate : la main\n      // diminue visuellement. Le repiochage se fait � la nouvelle manche\n      // (dealHands), ce qui correspond � � r�cup�rer � la fin de la manche �.\n      // (aucun repiochage ici)
      if (room.autoChallenge) this.log(room, "⚠️ La table déborde : contestation forcée !", "warn");
    } else if (k === "challenge") {
      if (room.paused) return { ok: false, error: "Partie en pause", status: 409 };
      if (room.phase !== "challenge" || !room.claim) return { ok: false, error: "Aucune annonce à contester", status: 409 };
      if (!p.alive || p.spectator) return { ok: false, error: "Tu ne peux pas contester", status: 403 };
      if (room.claim.by === id) return { ok: false, error: "Tu ne peux pas te contester", status: 409 };
      if (room.challenger) return { ok: false, error: "Quelqu'un a déjà contesté", status: 409 };
      room.challenger = id;
      room.playerAfterReveal = id;
      this.resolve(room);
    } else if (k === "believe") {
      if (room.paused) return { ok: false, error: "Partie en pause", status: 409 };
      if (room.phase !== "challenge" || !room.claim) return { ok: false, error: "Aucune annonce", status: 409 };
      if (!p.alive || p.spectator) return { ok: false, error: "Tu observes la table", status: 403 };
      if (room.claim.by === id) return { ok: false, error: "Tu ne peux pas te croire", status: 409 };
      this.log(room, `🤔 ${p.name} décide de croire ${this.nameOf(room, room.claim.by)}.`, "believe");
    } else if (k === "raise") {
      // État purement visuel, partagé avec la table : les autres voient si le
      // joueur lève ou baisse ses cartes.
      p.raised = !!(action as { v: boolean }).v;
    } else {
      return { ok: false, error: "Action inconnue", status: 400 };
    }
    this.changed(room);
    return { ok: true, token, state: this.view(room, id, token) };
  }

  leave(roomCode: string, id: string, token: string): { ok: boolean; error?: string } {
    const room = this.rooms.get(String(roomCode).toUpperCase());
    if (!room) return { ok: true };
    const p = this.player(room, id);
    if (!p || p.token !== token) return { ok: false, error: "Jeton invalide" };
    if (room.phase === "lobby") {
      room.players = room.players.filter((x) => x.id !== id);
      this.log(room, `🚪 ${p.name} quitte la table.`, "leave");
      if (room.players.length === 0) {
        this.rooms.delete(room.code);
        this.changed(room);
        return { ok: true };
      }
      if (room.hostId === id) {
        room.hostId = room.players[0].id;
        this.log(room, `👑 ${this.nameOf(room, room.hostId)} devient hôte.`, "host");
      }
    } else if (room.phase !== "end") {
      p.connected = false;
      if (p.alive && !p.spectator) {
        p.alive = false;
        p.lives = 0;
        this.log(room, `🏳️ ${p.name} quitte la partie et est éliminé.`, "leave");
        if (this.alive(room).length <= 1) this.finish(room, "last");
      }
    }
    // L'hôte peut partir à n'importe quel moment : on nomme tout de suite un
    // remplaçant présent plutôt que d'attendre la promotion du relais (20 s).
    if (room.hostId === id && room.players.length) {
      const next =
        room.players.find((x) => x.id !== id && x.connected && !x.spectator) ||
        room.players.find((x) => x.id !== id && x.connected) ||
        room.players.find((x) => x.id !== id && !x.spectator) ||
        room.players.find((x) => x.id !== id);
      if (next) {
        room.hostId = next.id;
        this.log(room, `👑 ${next.name} devient hôte.`, "host");
      }
    }
    this.changed(room);
    return { ok: true };
  }

  ping(roomCode: string, id: string, token: string): { ok: boolean; error?: string } {
    const room = this.rooms.get(String(roomCode).toUpperCase());
    if (!room) return { ok: false, error: "Salon introuvable" };
    const p = this.player(room, id);
    if (!p || p.token !== token) return { ok: false, error: "Jeton invalide" };
    p.connected = true;
    p.lastSeen = this.now();
    return { ok: true };
  }

  private start(room: MenteursRoom) {
    room.phase = "claim";
    room.round = 1;
    room.pile = [];
    room.claim = null;
    room.challenger = "";
    room.reveal = null;
    room.winner = "";
    room.endReason = "";
    room.startedAt = this.now();
    room.endedAt = 0;
    room.scored = false;
    room.paused = false;
    room.pauseRemain = 0;
    room.playerAfterReveal = "";
    room.config.max = Math.max(room.config.max, Math.min(8, room.players.filter((p) => !p.spectator).length));
    const players = room.players.filter((p) => !p.spectator);
    for (const p of players) {
      p.alive = true;
      p.lives = room.config.lives;
      p.score = 0;
      p.bluffs = 0;
      p.hand = [];
      p.spectator = false;
      p.raised = true;
    }
    this.resetGuns(room);
    // Première manche : paquet complet, mains privées et carte cible.
    this.dealHands(room);
    room.turnId = this.shuffle(players.map((p) => p.id))[0] ?? "";
    room.deadline = Math.max(
      this.now() + room.config.think * 1000,
      room.roundAt + 5000 + Math.min(room.config.think, 10) * 1000,
    );
    this.log(room, `🎬 La partie commence. Cible : ${room.target}.`, "start");
    this.log(room, `🎯 ${this.nameOf(room, room.turnId)} commence.`, "turn");
  }
  private deckLength(room: MenteursRoom) {
    return room.deck.length;
  }
  private draw(room: MenteursRoom) {
    // Filet de sécurité : même si la pioche est vide, on ne renvoie jamais
    // une carte sans couleur (elle s'affichait comme une carte blanche).
    const fallbackSuits = ["♠", "♥", "♦", "♣"];
    const n = Math.abs(Math.floor(Number(this.roll()) || 1));
    return room.deck.pop() ?? { v: "9", s: fallbackSuits[n % fallbackSuits.length] };
  }
  private handSize(room: MenteursRoom) {
    const n = room.players.filter((p) => !p.spectator).length;
    return n <= 4 ? 5 : n <= 6 ? 4 : 3;
  }
  private newDeck(room: MenteursRoom): MenteursCard[] {
    // Vrai paquet de 52 cartes (4 couleurs × 13 valeurs) + 2 jokers.
    // On garde les indices français V/D/R et les 6 valeurs cibles du jeu.
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"];
    const deck: MenteursCard[] = [];
    for (const s of suits) for (const v of ranks) deck.push({ v, s });
    if (room.config.special) {
      deck.push({ v: "JOKER", s: "*" }, { v: "JOKER", s: "*" });
    }
    return this.shuffle(deck);
  }
  /** Distribue une nouvelle manche : nouveau paquet, nouvelles mains, nouvelle cible. */
  private dealHands(room: MenteursRoom) {
    const deck = this.newDeck(room);
    const players = this.alive(room);
    const hs = this.handSize(room);
    room.pile = [];
    for (const p of room.players) p.hand = [];
    for (let i = 0; i < hs; i++) {
      for (const p of players) if (deck.length) p.hand.push(deck.pop()!);
    }
    room.deck = deck;
    this.setTarget(room);
  }
  private setTarget(room: MenteursRoom) {
    // Tirage uniforme parmi V, D, R et A. L'ancien mapping `roll()` 1..6
    // favorisait V et D (deux cases sur six) au détriment de R et A.
    room.target = this.shuffle([...MENTEURS_TARGETS])[0] ?? "A";
    // La carte cible est dévoilée en début de manche : personne ne joue pendant 5 s.
    room.roundAt = this.now();
  }
  private matches(card: MenteursCard, target: string) {
    return card.v === target || card.v === "JOKER" || card.v === "MIROIR";
  }
  private resolve(room: MenteursRoom) {
    const claim = room.claim;
    if (!claim) return;
    const liar = !claim.cards.every((c) => this.matches(c, claim.target));
    const challenger = room.challenger;
    const claimant = claim.by;
    // Règle du barillet personnel : celui qui s'est trompé retourne son propre
    // revolver contre lui-même. Un menteur démasqué se tire dessus ; un
    // accusateur qui avait tort se tire dessus. Le barillet avance donc pour
    // ce joueur uniquement et ne se réinitialise plus après une élimination.
    const shooter = liar ? claimant : challenger;
    const victim = shooter;
    const shot = this.fire(room, shooter);
    const chamber = shot.chamber;
    const bullet = shot.bullet;
    const vp = this.player(room, victim);
    const cp = this.player(room, claimant);
    const chp = this.player(room, challenger);
    // Photo de la table AVANT le tir : les clients s'en servent pour garder
    // le suspense jusqu'à la détonation (aucune mort visible avant la balle).
    const before = room.players.map((p) => ({ id: p.id, alive: p.alive, lives: p.lives }));
    const logCount = room.log.length;
    if (bullet && vp) {
      vp.lives = 0;
      vp.alive = false;
      this.log(room, `💥 BANG ! ${vp.name} est éliminé.`, "death");
    } else if (vp) {
      this.log(room, `*clic* Chambre vide : ${vp.name} survit. 1 chance sur ${Math.max(1, shot.remaining)} au prochain tir avec son revolver.`, "empty");
    }
    if (liar && chp) {
      chp.score += 1;
      if (cp) cp.bluffs += 1;
    } else if (!liar && cp) {
      cp.score += 1;
    }
    room.claim = null;
    room.pile = [];
    room.reveal = {
      ts: this.now(),
      liar,
      shooter,
      victim,
      bullet,
      chamber,
      remaining: shot.remaining,
      target: claim.target,
      count: claim.count,
      cards: claim.cards.map((c) => ({ ...c })),
      auto: room.autoChallenge,
      before,
      logCount,
    };
    room.autoChallenge = false;
    room.phase = "reveal";
    room.deadline = this.now() + 4800;
    const sv = this.nameOf(room, shooter);
    this.log(room, liar ? `⚖️ Mensonge démasqué ! ${sv} se tire dessus avec son revolver.` : `⚖️ C'était vrai. ${sv} s'est trompé et se tire dessus.`, "reveal");
  }
  private beginTurn(room: MenteursRoom, firstId: string, newTarget = false) {
    room.claim = null;
    room.challenger = "";
    room.reveal = null;
    room.phase = "claim";
    room.autoChallenge = false;
    const p = this.player(room, firstId);
    if (!p || !p.alive) {
      this.finish(room, "last");
      return;
    }
    room.turnId = p.id;
    if (newTarget) this.setTarget(room);
    // Le dévoilement de la cible (5 s) ne doit pas manger le temps de réflexion.
    room.deadline = Math.max(
      this.now() + room.config.think * 1000,
      room.roundAt + 5000 + Math.min(room.config.think, 10) * 1000,
    );
    this.log(room, `🎯 ${p.name} joue. Cible : ${room.target}.`, "turn");
  }
  private advanceTurn(room: MenteursRoom, fromId: string, newTarget = false) {
    const next = this.nextAlive(room, fromId);
    if (!next) {
      this.finish(room, "last");
      return;
    }
    this.beginTurn(room, next.id, newTarget);
  }
  private nextAlive(room: MenteursRoom, afterId: string) {
    const alive = this.alive(room);
    if (!alive.length) return undefined;
    const idx = room.players.findIndex((p) => p.id === afterId);
    for (let i = 1; i <= room.players.length; i++) {
      const p = room.players[(idx + i) % room.players.length];
      if (p.alive && !p.spectator) return p;
    }
    return alive[0];
  }
  private afterReveal(room: MenteursRoom) {
    const alive = this.alive(room);
    if (alive.length <= 1) {
      this.finish(room, "last");
      return;
    }
    room.round += 1;
    if (room.round > room.config.rounds) {
      this.finish(room, "rounds");
      return;
    }
    const challenger = this.player(room, room.playerAfterReveal || room.challenger);
    const first = challenger && challenger.alive
      ? challenger.id
      : this.nextAlive(room, room.playerAfterReveal || room.challenger || room.reveal?.shooter || room.turnId)?.id;
    room.playerAfterReveal = "";
    this.log(room, `🔔 Manche ${room.round}.`, "round");
    // Les cartes de la table sont balayées et un nouveau paquet est distribué
    // à chaque manche.
    this.dealHands(room);
    this.log(room, `🎴 Cartes redistribuées. Cible : ${room.target}.`, "deal");
    if (!first) {
      this.finish(room, "last");
      return;
    }
    this.beginTurn(room, first);
  }
  private finish(room: MenteursRoom, reason: string) {
    if (room.phase === "end") return;
    const alive = this.alive(room);
    room.phase = "end";
    room.winner = alive.length === 1 ? alive[0].id : "";
    room.endReason = reason;
    room.endedAt = this.now();
    room.paused = false;
    room.deadline = 0;
    room.claim = null;
    room.challenger = "";
    room.pile = [];
    room.reveal = null;
    const w = room.winner ? this.nameOf(room, room.winner) : "";
    this.log(room, w ? `🏆 Victoire de ${w} !` : "🏁 Fin de la partie.", "end");
    if (!room.scored) {
      room.scored = true;
      try {
        this.onEnd?.(room);
      } catch {
        /* le classement de soirée ne doit pas bloquer la fin de partie */
      }
    }
  }
  private rematch(room: MenteursRoom) {
    room.phase = "lobby";
    room.round = 0;
    room.roundAt = 0;
    room.turnId = "";
    room.target = "";
    room.pile = [];
    room.claim = null;
    room.challenger = "";
    room.reveal = null;
    room.winner = "";
    room.endReason = "";
    room.deadline = 0;
    room.paused = false;
    room.pauseRemain = 0;
    room.scored = false;
    room.startedAt = 0;
    room.endedAt = 0;
    room.deck = [];
    room.playerAfterReveal = "";
    for (const p of room.players) {
      p.alive = !p.spectator;
      p.lives = room.config.lives;
      p.hand = [];
      p.score = 0;
      p.bluffs = 0;
      p.spectator = false;
      p.raised = true;
    }
    this.resetGuns(room);
    this.log(room, "🔄 Nouvelle partie : retour au salon.", "rematch");
  }

  sweep() {
    const t = this.now();
    for (const [code, room] of this.rooms) {
      let dirty = false;
      for (const p of room.players) {
        if (p.connected && t - p.lastSeen > DISCONNECT_MS) {
          p.connected = false;
          dirty = true;
        }
      }
      if (room.phase === "claim" || room.phase === "challenge" || room.phase === "reveal") {
        if (!room.paused && room.deadline > 0 && t >= room.deadline) {
          dirty = true;
          if (room.phase === "claim") {
            const cur = this.player(room, room.turnId);
            this.log(room, `⏳ ${cur?.name ?? "?"} n'a pas joué à temps.`, "timeout");
            this.advanceTurn(room, room.turnId, false);
          } else if (room.phase === "challenge") {
            if (room.autoChallenge || room.pile.length >= 12) {
              const next = this.nextAlive(room, room.claim?.by ?? room.turnId);
              if (next) {
                room.challenger = next.id;
                room.playerAfterReveal = next.id;
                this.log(room, `🚨 Contestation forcée par ${next.name}.`, "challenge");
                this.resolve(room);
              } else {
                this.advanceTurn(room, room.claim?.by ?? room.turnId, false);
              }
            } else {
              if (room.claim && !room.claim.cards.every((c) => this.matches(c, room.claim!.target))) {
                const cp = this.player(room, room.claim.by);
                if (cp) cp.bluffs += 1;
                this.log(room, `🤫 Personne ne conteste ${this.nameOf(room, room.claim.by)} : le bluff passe.`, "bluff");
              } else {
                this.log(room, `🤝 Personne ne conteste ${this.nameOf(room, room.claim?.by ?? "")}.`, "believe");
              }
              this.advanceTurn(room, room.claim?.by ?? room.turnId, false);
            }
          } else if (room.phase === "reveal") {
            this.afterReveal(room);
          }
        }
      }
      if (room.phase === "end" && room.players.every((p) => !p.connected) && t - room.updatedAt > 2 * 3600_000) {
        this.rooms.delete(code);
        continue;
      }
      if (room.players.every((p) => !p.connected) && t - room.updatedAt > 2 * 3600_000) {
        this.rooms.delete(code);
        continue;
      }
      if (dirty) this.changed(room);
    }
  }

  /** Utilisé par les tests et le serveur pour réinitialiser proprement. */
  destroy(code: string) {
    this.rooms.delete(String(code).toUpperCase());
  }
}

