import { Hono } from "hono";
import { fetchPlaylistItems, fetchThemeItems, isPlaylistId, isThemeId } from "../lib/youtube";

export const youtubeRoutes = new Hono();

/** GET /api/youtube/playlist?list=PL... -> { ok, ids, items } */
youtubeRoutes.get("/playlist", async (c) => {
  const list = c.req.query("list") ?? "";
  if (!isPlaylistId(list)) return c.json({ ok: false, error: "Playlist invalide" }, 400);
  const items = await fetchPlaylistItems(list);
  if (!items.length) return c.json({ ok: false, error: "Playlist illisible ou vide" }, 404);
  return c.json({ ok: true, ids: items.map((item) => item.id), items });
});

/** GET /api/youtube/theme?theme=80s -> { ok, items } */
youtubeRoutes.get("/theme", async (c) => {
  const theme = c.req.query("theme") ?? "";
  if (!isThemeId(theme)) return c.json({ ok: false, error: "Thème inconnu" }, 400);
  const items = await fetchThemeItems(theme);
  if (!items.length) return c.json({ ok: false, error: "Aucune sélection YouTube pour ce thème" }, 404);
  return c.json({ ok: true, items });
});
