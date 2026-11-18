/* Récupération des vidéos d'une playlist YouTube côté serveur.
   Le client ne peut pas lire un flux RSS YouTube à cause du CORS ; ce module
   sert de repli quand l'API IFrame ne remplit pas getPlaylist(). */

// Les identifiants publics de playlist font généralement 34 caractères ;
// on garde une marge pour les anciens identifiants, sans accepter un mot court.
const PLAYLIST_ID = /^[A-Za-z0-9_-]{16,80}$/;

export function isPlaylistId(id: unknown): id is string {
  return typeof id === "string" && PLAYLIST_ID.test(id);
}

export function parsePlaylistFeed(xml: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)) {
    const id = match[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function parsePlaylistPage(html: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  // La page contient aussi des recommandations : on se limite à la zone de la
  // playlist quand elle est repérable, sinon on garde les identifiants trouvés.
  const start = html.indexOf("playlistVideoListRenderer");
  const slice = start >= 0 ? html.slice(start, start + 2_000_000) : html.slice(0, 2_000_000);
  for (const match of slice.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
    const id = match[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
      if (ids.length >= 100) break;
    }
  }
  return ids;
}

const cache = new Map<string, { ids: string[]; ts: number }>();
const CACHE_MS = 10 * 60_000;

export async function fetchPlaylistIds(listId: string): Promise<string[]> {
  if (!isPlaylistId(listId)) return [];
  const hit = cache.get(listId);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.ids;

  let ids: string[] = [];
  try {
    const feed = await fetch("https://www.youtube.com/feeds/videos.xml?playlist_id=" + encodeURIComponent(listId), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HubDeSoiree/2.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (feed.ok) ids = parsePlaylistFeed(await feed.text());
  } catch {
    /* on tente la page complète */
  }

  if (!ids.length) {
    try {
      const page = await fetch("https://www.youtube.com/playlist?list=" + encodeURIComponent(listId), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (page.ok) ids = parsePlaylistPage(await page.text());
    } catch {
      /* aucune donnée : le client affichera son message */
    }
  }

  if (ids.length) cache.set(listId, { ids, ts: Date.now() });
  return ids;
}
