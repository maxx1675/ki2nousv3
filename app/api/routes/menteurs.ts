import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { MenteursEngine, type MenteursAction, type MenteursConfig } from "../lib/menteurs";

/**
 * Routes du jeu « La Table Des Menteurs ».
 * La logique de partie est dans api/lib/menteurs.ts (autoritaire, en mémoire).
 */
export const menteurs = new MenteursEngine();
export const menteursRoutes = new Hono();

const attempts = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || now - cur.t > 60_000) {
    attempts.set(ip, { n: 1, t: now });
    return false;
  }
  cur.n += 1;
  if (attempts.size > 2000) {
    for (const [k, v] of attempts) if (now - v.t > 60_000) attempts.delete(k);
  }
  return cur.n > 40;
}
/* Les actions de jeu sont plus fréquentes que les créations de salon :
   on garde une limite séparée, large mais suffisante contre le spam. */
const actionAttempts = new Map<string, { n: number; t: number }>();
function actionRateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = actionAttempts.get(ip);
  if (!cur || now - cur.t > 60_000) {
    actionAttempts.set(ip, { n: 1, t: now });
    return false;
  }
  cur.n += 1;
  if (actionAttempts.size > 4000) {
    for (const [k, v] of actionAttempts) if (now - v.t > 60_000) actionAttempts.delete(k);
  }
  return cur.n > 240;
}
function ipOf(c: { req: { header: (name: string) => string | undefined } }): string {
  return (c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "local").split(",")[0].trim();
}

menteursRoutes.post(
  "/create",
  bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    if (rateLimited(ipOf(c))) return c.json({ ok: false, error: "Trop de tentatives" }, 429);
    const b = await c.req.json().catch(() => null);
    const r = menteurs.create({
      room: b?.room,
      id: b?.pid,
      name: b?.name,
      avatar: b?.avatar,
      config: b?.config as Partial<MenteursConfig> | undefined,
    });
    return r.ok ? c.json(r) : c.json({ ok: false, error: r.error, code: r.code }, (r.status ?? 400) as 400);
  },
);

menteursRoutes.post(
  "/join",
  bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    if (rateLimited(ipOf(c))) return c.json({ ok: false, error: "Trop de tentatives" }, 429);
    const b = await c.req.json().catch(() => null);
    const r = menteurs.join({ room: b?.room, id: b?.pid, name: b?.name, avatar: b?.avatar, token: b?.token });
    return r.ok ? c.json(r) : c.json({ ok: false, error: r.error, code: r.code }, (r.status ?? 400) as 400);
  },
);

menteursRoutes.get("/state", (c) => {
  const r = menteurs.state(c.req.query("room") ?? "", c.req.query("pid") ?? "", c.req.query("token") ?? "");
  return r.ok ? c.json(r) : c.json({ ok: false, error: r.error, code: r.code }, (r.status ?? 400) as 400);
});

menteursRoutes.post(
  "/action",
  bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.body(null, 413) }),
  async (c) => {
    if (actionRateLimited(ipOf(c))) return c.json({ ok: false, error: "Trop d'actions, attends un instant" }, 429);
    const b = await c.req.json().catch(() => null);
    const r = menteurs.action(
      String(b?.room ?? ""),
      String(b?.pid ?? ""),
      String(b?.token ?? ""),
      b?.action as MenteursAction,
      typeof b?.aid === "string" ? b.aid : undefined,
    );
    return r.ok ? c.json(r) : c.json({ ok: false, error: r.error, code: r.code }, (r.status ?? 400) as 400);
  },
);

menteursRoutes.post("/leave", async (c) => {
  const b = await c.req.json().catch(() => null);
  const r = menteurs.leave(String(b?.room ?? ""), String(b?.pid ?? ""), String(b?.token ?? ""));
  return c.json({ ok: r.ok, error: r.error }, r.ok ? 200 : 403);
});

menteursRoutes.post("/ping", async (c) => {
  const b = await c.req.json().catch(() => null);
  const r = menteurs.ping(String(b?.room ?? ""), String(b?.pid ?? ""), String(b?.token ?? ""));
  return c.json({ ok: r.ok, error: r.error }, r.ok ? 200 : 400);
});

/** Balayage : chronos, déconnexions, manches suivantes, victoires. */
export function startMenteursSweeper() {
  const t = setInterval(() => menteurs.sweep(), 1000);
  (t as unknown as { unref?: () => void }).unref?.();
  return t;
}
