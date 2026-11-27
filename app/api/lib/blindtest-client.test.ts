import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type SongMeta = { title: string; artist: string };
type BT = {
  norm: (value: unknown) => string;
  match: (guess: unknown, answer: unknown) => boolean;
  matchAny: (guess: unknown, answers: unknown[]) => boolean;
  cleanTitle: (value: unknown) => string;
  cleanArtist: (value: unknown) => string;
  isGenericArtist: (value: unknown) => boolean;
  isKnownArtist: (value: unknown) => boolean;
  songMeta: (title: unknown, artist: unknown) => SongMeta;
  extractBase: (pos: number, duration: number, extract: number, elapsed?: number) => number;
  pickPos: () => number;
};

const source = readFileSync(fileURLToPath(new URL("../../public/blindtest/bank.js", import.meta.url)), "utf8");
const sandbox: { window: { BT?: BT } } = { window: {} };
runInNewContext(source, sandbox);
const BT = sandbox.window.BT;
if (!BT) throw new Error("BT helpers not exposed by bank.js");

describe("Blind Test — réponses", () => {
  it("ignore accents, casse, articles et ponctuation", () => {
    expect(BT.match("champs elysees", "Les Champs-Élysées")).toBe(true);
    expect(BT.match("la vie en rose", "La Vie En Rose")).toBe(true);
    expect(BT.match("dont stop me now", "Don't Stop Me Now")).toBe(true);
  });

  it("tolère les fautes de frappe sans accepter un mot trop court", () => {
    expect(BT.match("daft pank", "Daft Punk")).toBe(true);
    expect(BT.match("get lucki", "Get Lucky")).toBe(true);
    expect(BT.match("rhianna", "Rihanna")).toBe(true);
    expect(BT.match("e", "La vie en rose")).toBe(false);
    expect(BT.match("the", "The Power of Love")).toBe(false);
    expect(BT.match("love", "Glove")).toBe(false);
    expect(BT.match("station", "Nation")).toBe(false);
  });

  it("n'accepte pas un mot isolé ou un radical proche", () => {
    expect(BT.match("queen", "Dancing Queen")).toBe(false);
    expect(BT.match("stop", "Don't Stop Me Now")).toBe(false);
    expect(BT.match("sweet", "Sweet Dreams (Are Made of This)")).toBe(false);
    expect(BT.match("believe", "Believer")).toBe(false);
    expect(BT.match("love night", "Dancing Queen")).toBe(false);
  });

  it("accepte les titres entre parenthèses, les nombres et les alias", () => {
    expect(BT.match("blue", "Blue (Da Ba Dee)")).toBe(true);
    expect(BT.match("da ba dee", "Blue (Da Ba Dee)")).toBe(true);
    expect(BT.match("song two", "Song 2")).toBe(true);
    expect(BT.match("aha", "a-ha")).toBe(true);
    expect(BT.match("backstreets back", "Everybody (Backstreet's Back)")).toBe(true);
    expect(BT.match("sweet child of mine", "Sweet Child O' Mine")).toBe(true);
    expect(BT.match("born to be alive", "Born To Be Alive (From 'Minions: The Rise of Gru' Soundtrack)")).toBe(true);
    expect(BT.match("this wish", 'This Wish (From "Wish") (Official Video)')).toBe(true);
    expect(BT.match("Daft Punk - Get Lucky", "Get Lucky")).toBe(true);
    expect(BT.matchAny("Aha", ["a-ha", "Take On Me"])).toBe(true);
  });

  it("accepte le titre seul quand le titre YouTube contient aussi l'artiste", () => {
    expect(BT.match("Get Lucky", "Daft Punk - Get Lucky - Daft Punk")).toBe(true);
    expect(BT.match("Hello", "Adele - Hello - Adele")).toBe(true);
    expect(BT.match("Daft Punk", "Daft Punk - Get Lucky - Daft Punk")).toBe(true);
  });

  it("accepte les artistes feat. et les mots dans un autre ordre", () => {
    expect(BT.match("David Guetta", "David Guetta feat. Sia")).toBe(true);
    expect(BT.match("Lucky Get", "Get Lucky")).toBe(true);
    expect(BT.match("Earth Wind Fire", "Earth, Wind & Fire")).toBe(true);
  });
});

describe("Blind Test — titres YouTube", () => {
  it("sépare artiste, titre et artiste répété", () => {
    expect(BT.songMeta("Daft Punk - Get Lucky - Daft Punk", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Hello - Adele - Hello", "Adele")).toEqual({ title: "Hello", artist: "Adele" });
    expect(BT.songMeta("Get Lucky - Daft Punk", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
  });

  it("nettoie les suffixes de version et les chaînes YouTube", () => {
    expect(BT.songMeta("Daft Punk - Get Lucky (Official Video)", "Daft Punk - Topic")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky (feat. Pharrell Williams) [Official Video]", "Daft Punk VEVO")).toEqual({
      title: "Get Lucky",
      artist: "Daft Punk",
    });
    expect(BT.songMeta("Get Lucky (feat. Pharrell Williams) - Daft Punk", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky - Official Video 4K", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky - Live", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky - Live", "")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    // Chaîne de compilation : « Album fr » n'est pas l'artiste, le titre
    // « Artiste - Titre » reprend le dessus.
    expect(BT.songMeta("Daft Punk - Get Lucky", "Album fr")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky (Official Video)", "Album Français")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk - Get Lucky", "Best of 80s")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.isGenericArtist("Album fr")).toBe(true);
    expect(BT.isGenericArtist("Album Français")).toBe(true);
    expect(BT.isGenericArtist("Best of 80s")).toBe(true);
    expect(BT.isGenericArtist("Daft Punk")).toBe(false);
    expect(BT.songMeta("Daft Punk - Get Lucky - Live - Daft Punk", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Artist - Live - Artist", "")).toEqual({ title: "Live", artist: "Artist" });
  });

  it("conserve un vrai titre qui ressemble à un suffixe", () => {
    expect(BT.songMeta("India.Arie - Video", "India.Arie")).toEqual({ title: "Video", artist: "India.Arie" });
    expect(BT.songMeta("Sweet Dreams (Are Made of This)", "Eurythmics")).toEqual({
      title: "Sweet Dreams (Are Made of This)",
      artist: "Eurythmics",
    });
    expect(BT.songMeta("Dancing Queen", "Queen")).toEqual({ title: "Dancing Queen", artist: "Queen" });
  });

  it("déduit l'artiste d'un titre sans chaîne fiable", () => {
    expect(BT.songMeta("Daft Punk - Get Lucky - Daft Punk", "")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Artist1 & Artist2 - Title - Artist1", "Artist1")).toEqual({ title: "Title", artist: "Artist1 & Artist2" });
  });

  it("corrige les métadonnées inversées et les titres sans séparateur", () => {
    expect(BT.songMeta("Daft Punk - Get Lucky", "Get Lucky")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Daft Punk Get Lucky", "Daft Punk")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Album fr - Daft Punk - Get Lucky", "Album fr")).toEqual({ title: "Get Lucky", artist: "Daft Punk" });
    expect(BT.songMeta("Born To Be Alive (From 'Minions: The Rise of Gru' Soundtrack)", "Jackson Wang")).toEqual({
      title: "Born To Be Alive",
      artist: "Jackson Wang",
    });
    expect(BT.songMeta('This Wish (From "Wish") (Official Video)', "Ariana DeBose")).toEqual({
      title: "This Wish",
      artist: "Ariana DeBose",
    });
    expect(BT.isKnownArtist("Daft Punk")).toBe(true);
    expect(BT.isKnownArtist("Get Lucky")).toBe(false);
  });
});

describe("Blind Test — fenêtre de l'extrait", () => {
  it("vise le milieu du morceau sans dépasser la fin", () => {
    expect(BT.extractBase(0.4, 210, 30, 0)).toBeCloseTo(84);
    expect(BT.extractBase(0.4, 60, 30, 0)).toBeCloseTo(24);
    expect(BT.extractBase(0.4, 40, 30, 0)).toBeCloseTo(9.25);
    expect(BT.extractBase(0.4, 20, 30, 0)).toBe(0);
  });

  it("ajoute le temps déjà écoulé lors d'une reprise", () => {
    expect(BT.extractBase(0.4, 210, 30, 10)).toBeCloseTo(94);
    expect(BT.extractBase(0.95, 60, 30, 0)).toBeLessThanOrEqual(29.25);
  });

  it("tire une position entre 40 % et 52 %", () => {
    for (let i = 0; i < 20; i++) {
      const pos = BT.pickPos();
      expect(pos).toBeGreaterThanOrEqual(0.4);
      expect(pos).toBeLessThan(0.52);
    }
  });
});
