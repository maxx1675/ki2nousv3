import { Hono } from "hono";
import { fetchPlaylistItems, isPlaylistId } from "../lib/youtube";

export const youtubeRoutes = new Hono();

/** GET /api/youtube/playlist?list=PL... -> { ok, ids, items } */
youtubeRoutes.get("/playlist", async (c) => {
  const list = c.req.query("list") ?? "";
  if (!isPlaylistId(list)) return c.json({ ok: false, error: "Playlist invalide" }, 400);
  const items = await fetchPlaylistItems(list);
  if (!items.length) return c.json({ ok: false, error: "Playlist illisible ou vide" }, 404);
  return c.json({ ok: true, ids: items.map((item) => item.id), items });
});
