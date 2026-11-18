import { Hono } from "hono";
import { fetchPlaylistIds, isPlaylistId } from "../lib/youtube";

export const youtubeRoutes = new Hono();

/** GET /api/youtube/playlist?list=PL... -> { ok, ids } */
youtubeRoutes.get("/playlist", async (c) => {
  const list = c.req.query("list") ?? "";
  if (!isPlaylistId(list)) return c.json({ ok: false, error: "Playlist invalide" }, 400);
  const ids = await fetchPlaylistIds(list);
  if (!ids.length) return c.json({ ok: false, error: "Playlist illisible ou vide" }, 404);
  return c.json({ ok: true, ids });
});
