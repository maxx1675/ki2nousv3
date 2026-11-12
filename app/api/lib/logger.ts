/**
 * Mini logger : uniquement la console (Render la capture déjà).
 * Plus d'écriture sur disque : avant, chaque événement de jeu écrivait une ligne dans /tmp/kimi-logs/app.log.
 */
type Ctx = Record<string, unknown>;
const line = (level: string, msg: string, ctx?: Ctx) =>
  JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx });

export const log = {
  info: (msg: string, ctx?: Ctx) => console.log(line("info", msg, ctx)),
  warn: (msg: string, ctx?: Ctx) => console.warn(line("warn", msg, ctx)),
  error: (msg: string, ctx?: Ctx) => console.error(line("error", msg, ctx)),
};
