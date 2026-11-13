/* Service worker minimal : permet d'installer l'appli (PWA) et affiche une page « hors ligne » claire.
   Il ne met PAS les pages en cache (les jeux ont besoin du réseau en direct, et on ne veut pas de versions périmées). */
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title>
<body style="font-family:system-ui,sans-serif;background:#1b1340;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">
<div><div style="font-size:4rem">📶</div><h1>Pas de connexion</h1><p>Le Hub de Soirée a besoin d’internet pour jouer en direct.<br>Reconnecte-toi puis réessaie.</p><button onclick="location.reload()" style="font:inherit;font-weight:800;padding:12px 22px;border-radius:14px;border:0;background:#ffc531;color:#1b1340">Réessayer</button></div>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.mode !== "navigate") return; // tout le reste (API, SSE, images…) passe directement par le réseau
  e.respondWith(fetch(r).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
