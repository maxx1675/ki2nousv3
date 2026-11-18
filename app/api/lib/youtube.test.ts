import { describe, expect, it } from "vitest";
import { isPlaylistId, parsePlaylistFeed, parsePlaylistPage } from "./youtube";

describe("YouTube playlist parser", () => {
  it("valide seulement les identifiants de playlist", () => {
    expect(isPlaylistId("PLaLWNpJCbH_pPwtMN-TYkzZ03WxUAfAP-")).toBe(true);
    expect(isPlaylistId("trop-court")).toBe(false);
    expect(isPlaylistId("https://youtube.com/playlist?list=abcd")).toBe(false);
  });

  it("lit les vidéos du flux RSS sans doublon", () => {
    const xml = `<feed>
      <yt:videoId>AAAAAAAAAAA</yt:videoId>
      <yt:videoId>BBBBBBBBBBB</yt:videoId>
      <yt:videoId>AAAAAAAAAAA</yt:videoId>
    </feed>`;
    expect(parsePlaylistFeed(xml)).toEqual(["AAAAAAAAAAA", "BBBBBBBBBBB"]);
  });

  it("lit les vidéos de la page playlist et ignore les recommandations hors zone", () => {
    const html = `"videoId":"CCCCCCCCCCC"<div class="playlistVideoListRenderer">
      "videoId":"DDDDDDDDDDD" "videoId":"EEEEEEEEEEE"
    </div>`;
    expect(parsePlaylistPage(html)).toEqual(["DDDDDDDDDDD", "EEEEEEEEEEE"]);
  });
});
