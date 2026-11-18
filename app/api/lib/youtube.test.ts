import { describe, expect, it } from "vitest";
import { isPlaylistId, parsePlaylistFeed, parsePlaylistFeedItems, parsePlaylistPage } from "./youtube";

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

  it("lit les titres et artistes du flux Atom", () => {
    const xml = `<feed>
      <entry>
        <yt:videoId>AAAAAAAAAAA</yt:videoId>
        <title>NUEVAYoL</title>
        <author><name>Bad Bunny - Topic</name></author>
        <media:group><media:title>NUEVAYoL</media:title></media:group>
      </entry>
      <entry>
        <yt:videoId>BBBBBBBBBBB</yt:videoId>
        <author><name>CyndiLauperVEVO</name></author>
        <media:group><media:title>Girls Just Want to Have Fun (Official Video)</media:title></media:group>
      </entry>
      <entry>
        <yt:videoId>AAAAAAAAAAA</yt:videoId>
        <media:group><media:title>Doublon</media:title></media:group>
      </entry>
    </feed>`;
    expect(parsePlaylistFeedItems(xml)).toEqual([
      { id: "AAAAAAAAAAA", title: "NUEVAYoL", artist: "Bad Bunny" },
      { id: "BBBBBBBBBBB", title: "Girls Just Want to Have Fun (Official Video)", artist: "CyndiLauper" },
    ]);
  });

  it("décode les entités XML des titres", () => {
    const xml = `<feed><entry>
      <yt:videoId>CCCCCCCCCCC</yt:videoId>
      <author><name>Simon &amp; Garfunkel - Topic</name></author>
      <media:group><media:title>The Sound of Silence &amp; Friends</media:title></media:group>
    </entry></feed>`;
    expect(parsePlaylistFeedItems(xml)).toEqual([
      { id: "CCCCCCCCCCC", title: "The Sound of Silence & Friends", artist: "Simon & Garfunkel" },
    ]);
  });

  it("lit les vidéos de la page playlist et ignore les recommandations hors zone", () => {
    const html = `"videoId":"CCCCCCCCCCC"<div class="playlistVideoListRenderer">
      "videoId":"DDDDDDDDDDD" "videoId":"EEEEEEEEEEE"
    </div>`;
    expect(parsePlaylistPage(html)).toEqual(["DDDDDDDDDDD", "EEEEEEEEEEE"]);
  });
});
