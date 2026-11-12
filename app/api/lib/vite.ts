import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

/**
 * Sert le site construit (dist/public).
 * La page d'accueil est « personnalisée » à la volée : %ORIGIN% (dans les balises de partage OG)
 * est remplacé par l'adresse réelle du site, ce qui donne des aperçus de lien corrects sur WhatsApp, etc.
 */
export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");
  let raw: string | null = null;

  const indexHtml = (origin: string) => {
    if (raw === null) raw = fs.readFileSync(indexPath, "utf-8");
    return raw.replaceAll("%ORIGIN%", origin);
  };
  const originOf = (c: { req: { header: (n: string) => string | undefined; url: string } }) => {
    const proto = (c.req.header("x-forwarded-proto") ?? "").split(",")[0].trim() || new URL(c.req.url).protocol.replace(":", "");
    const host = (c.req.header("x-forwarded-host") ?? c.req.header("host") ?? new URL(c.req.url).host).split(",")[0].trim();
    return `${proto}://${host}`;
  };

  app.get("/", (c) => c.html(indexHtml(originOf(c))));
  app.get("/index.html", (c) => c.html(indexHtml(originOf(c))));

  // Le service worker ne doit jamais être mis en cache longtemps (sinon les mises à jour n'arrivent pas).
  app.use("/sw.js", async (c, next) => {
    await next();
    c.res.headers.set("Cache-Control", "no-cache");
  });
  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
    return c.html(indexHtml(originOf(c)));
  });
}
