/* Récupération des vidéos d'une playlist YouTube côté serveur.
   Le client ne peut pas lire un flux RSS YouTube à cause du CORS ; ce module
   sert de source fiable quand l'API IFrame ne remplit pas getPlaylist(). */

// Les identifiants publics de playlist font généralement 34 caractères ;
// on garde une marge pour les anciens identifiants, sans accepter un mot court.
const PLAYLIST_ID = /^[A-Za-z0-9_-]{16,80}$/;

export type PlaylistItem = { id: string; title: string; artist: string };

export function isPlaylistId(id: unknown): id is string {
  return typeof id === "string" && PLAYLIST_ID.test(id);
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (all, code: string) => {
      if (code[0] === "#") {
        const hex = code[1] === "x" || code[1] === "X";
        const n = Number(hex ? "0x" + code.slice(2) : code.slice(1));
        return Number.isFinite(n) ? String.fromCodePoint(n) : all;
      }
      switch (code.toLowerCase()) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          return all;
      }
    })
    .trim();
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

/** Lit le flux Atom : identifiant, titre et chaîne (souvent « Artiste - Topic »). */
export function parsePlaylistFeedItems(xml: string): PlaylistItem[] {
  const items: PlaylistItem[] = [];
  const seen = new Set<string>();
  for (const entry of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = entry[1] ?? "";
    const id = block.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/)?.[1];
    if (!id || seen.has(id)) continue;
    const rawTitle = block.match(/<media:title>([\s\S]*?)<\/media:title>/)?.[1] ?? block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const rawChannel =
      block.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ??
      block.match(/<media:credit[^>]*>([\s\S]*?)<\/media:credit>/)?.[1] ??
      "";
    const title = decodeXml(rawTitle);
    const artist = decodeXml(rawChannel)
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/VEVO$/i, "")
      .trim();
    seen.add(id);
    items.push({ id, title, artist });
  }
  return items;
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

type Json = Record<string, unknown>;
const isJson = (v: unknown): v is Json => typeof v === "object" && v !== null;
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

function readInitialData(html: string): unknown {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const end = html.indexOf("</script>", start + marker.length);
  if (end < 0) return null;
  let raw = html.slice(start + marker.length, end).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readLockup(v: Json): PlaylistItem | null {
  const id = asString(v.contentId);
  const meta = isJson(v.metadata) && isJson(v.metadata.lockupMetadataViewModel) ? v.metadata.lockupMetadataViewModel : null;
  const title = meta && isJson(meta.title) ? asString(meta.title.content) : "";
  let artist = "";
  if (meta && isJson(meta.metadata) && isJson(meta.metadata.contentMetadataViewModel)) {
    const rows = meta.metadata.contentMetadataViewModel.metadataRows;
    if (Array.isArray(rows) && isJson(rows[0]) && Array.isArray(rows[0].metadataParts)) {
      const first = rows[0].metadataParts[0];
      if (isJson(first) && isJson(first.text)) artist = asString(first.text.content);
    }
  }
  let videoId = id;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    const image = isJson(v.contentImage) && isJson(v.contentImage.thumbnailViewModel) && isJson(v.contentImage.thumbnailViewModel.image) ? v.contentImage.thumbnailViewModel.image : null;
    const sources = image && Array.isArray(image.sources) ? image.sources : [];
    for (const source of sources) {
      const url = isJson(source) ? asString(source.url) : "";
      const found = url.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1];
      if (found) {
        videoId = found;
        break;
      }
    }
  }
  return /^[A-Za-z0-9_-]{11}$/.test(videoId) && title ? { id: videoId, title, artist } : null;
}

function readVideoRenderer(v: Json): PlaylistItem | null {
  const id = asString(v.videoId);
  const titleNode = isJson(v.title) ? v.title : null;
  let title = titleNode ? asString(titleNode.simpleText) : "";
  if (!title && titleNode && Array.isArray(titleNode.runs) && isJson(titleNode.runs[0])) title = asString(titleNode.runs[0].text);
  let artist = "";
  const byline = isJson(v.shortBylineText) ? v.shortBylineText : isJson(v.longBylineText) ? v.longBylineText : null;
  if (byline && Array.isArray(byline.runs) && isJson(byline.runs[0])) artist = asString(byline.runs[0].text);
  return /^[A-Za-z0-9_-]{11}$/.test(id) && title ? { id, title, artist } : null;
}

function findPlaylistItems(node: unknown, depth = 0): PlaylistItem[] {
  if (depth > 12 || !isJson(node)) return [];
  if (Array.isArray(node.contents)) {
    const items: PlaylistItem[] = [];
    const seen = new Set<string>();
    for (const entry of node.contents) {
      if (!isJson(entry)) continue;
      const item =
        (isJson(entry.lockupViewModel) && readLockup(entry.lockupViewModel)) ||
        (isJson(entry.playlistVideoRenderer) && readVideoRenderer(entry.playlistVideoRenderer)) ||
        (isJson(entry.videoRenderer) && readVideoRenderer(entry.videoRenderer)) ||
        null;
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
        if (items.length >= 100) break;
      }
    }
    if (items.length) return items;
  }
  for (const value of Object.values(node)) {
    const found = findPlaylistItems(value, depth + 1);
    if (found.length) return found;
  }
  return [];
}

/** Lit la page publique : titres, artistes et identifiants dans ytInitialData. */
export function parsePlaylistPageItems(html: string): PlaylistItem[] {
  const data = readInitialData(html);
  const items = data ? findPlaylistItems(data) : [];
  if (items.length) return items;
  return parsePlaylistPage(html).map((id) => ({ id, title: "", artist: "" }));
}

const cache = new Map<string, { items: PlaylistItem[]; ts: number }>();
const CACHE_MS = 10 * 60_000;

export async function fetchPlaylistItems(listId: string): Promise<PlaylistItem[]> {
  if (!isPlaylistId(listId)) return [];
  const hit = cache.get(listId);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.items;

  let feedItems: PlaylistItem[] = [];
  let pageItems: PlaylistItem[] = [];
  try {
    const feed = await fetch("https://www.youtube.com/feeds/videos.xml?playlist_id=" + encodeURIComponent(listId), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HubDeSoiree/2.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (feed.ok) feedItems = parsePlaylistFeedItems(await feed.text());
  } catch {
    /* on tente la page complète */
  }

  if (feedItems.length < 30) {
    try {
      const page = await fetch("https://www.youtube.com/playlist?list=" + encodeURIComponent(listId), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (page.ok) pageItems = parsePlaylistPageItems(await page.text());
    } catch {
      /* aucune donnée : le client affichera son message */
    }
  }

  // La page publique est la source la plus complète : elle contient aussi les
  // playlists de plus de 15 vidéos, contrairement au flux RSS.
  const byId = new Map<string, PlaylistItem>();
  for (const item of feedItems) byId.set(item.id, item);
  for (const item of pageItems) {
    const known = byId.get(item.id);
    if (!known || (!known.title && item.title)) byId.set(item.id, item);
  }
  const ordered = pageItems.length ? pageItems.map((item) => item.id) : feedItems.map((item) => item.id);
  const items: PlaylistItem[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    items.push(byId.get(id) ?? { id, title: "", artist: "" });
  }
  if (!items.length) items.push(...feedItems);

  if (items.length) cache.set(listId, { items, ts: Date.now() });
  return items;
}

export async function fetchPlaylistIds(listId: string): Promise<string[]> {
  return (await fetchPlaylistItems(listId)).map((item) => item.id);
}
