import { describe, expect, it } from "vitest";
import {
  decodeJsString,
  isPlaylistId,
  isThemeId,
  parseMusicPlaylistData,
  parseMusicPlaylistHtml,
  parsePlaylistFeed,
  parsePlaylistFeedItems,
  parsePlaylistPage,
} from "./youtube";

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

  it("préfère la chaîne de la vidéo au propriétaire de la playlist", () => {
    const xml = `<feed><entry>
      <yt:videoId>DDDDDDDDDDD</yt:videoId>
      <author><name>Album fr</name></author>
      <media:credit role="uploader">Daft Punk</media:credit>
      <media:group><media:title>Get Lucky (Official Video)</media:title></media:group>
    </entry></feed>`;
    expect(parsePlaylistFeedItems(xml)).toEqual([
      { id: "DDDDDDDDDDD", title: "Get Lucky (Official Video)", artist: "Daft Punk" },
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

describe("YouTube Music theme parser", () => {
  const renderer = (id: string, title: string, artist: string) => ({
    musicResponsiveListItemRenderer: {
      playlistItemData: { videoId: id },
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: title }] } } },
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "Titre" }, { text: " • " }, { text: artist }] },
          },
        },
      ],
    },
  });

  it("décode les séquences JavaScript de YouTube Music", () => {
    expect(decodeJsString("\\x7b\\x22ok\\x22\\x7d")).toBe('{"ok"}');
    expect(decodeJsString("caf\\u00e9")).toBe("café");
    expect(decodeJsString("l\\'amour")).toBe("l'amour");
  });

  it("valide seulement les thèmes élargis connus", () => {
    expect(isThemeId("80s")).toBe(true);
    expect(isThemeId("film")).toBe(true);
    expect(isThemeId("inconnu")).toBe(false);
    expect(isThemeId("__proto__")).toBe(false);
  });

  it("lit les morceaux d'une playlist YouTube Music", () => {
    const data = {
      contents: [
        renderer("AAAAAAAAAAA", "Take On Me", "a-ha"),
        renderer("BBBBBBBBBBB", "Sweet Dreams", "Eurythmics"),
        renderer("AAAAAAAAAAA", "Doublon", "a-ha"),
      ],
    };
    expect(parseMusicPlaylistData(data)).toEqual([
      { id: "AAAAAAAAAAA", title: "Take On Me", artist: "a-ha" },
      { id: "BBBBBBBBBBB", title: "Sweet Dreams", artist: "Eurythmics" },
    ]);
  });

  it("lit le JSON initial encodé d'une page YouTube Music", () => {
    const data = { contents: [renderer("CCCCCCCCCCC", "Africa", "Toto")] };
    const json = JSON.stringify(data);
    const literal = json
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, "\\x22")
      .replace(/\{/g, "\\x7b")
      .replace(/\}/g, "\\x7d");
    const html = `<script>try {const initialData = [];initialData.push({path: '/browse', data: '${literal}'});ytcfg.set({'YTMUSIC_INITIAL_DATA': initialData});} catch (e) {}</script>`;
    expect(parseMusicPlaylistHtml(html)).toEqual([{ id: "CCCCCCCCCCC", title: "Africa", artist: "Toto" }]);
  });
});
