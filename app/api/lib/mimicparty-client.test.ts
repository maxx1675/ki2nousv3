import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Meme = {
  id: string;
  name: string;
  emoji: string;
  cat: string;
  dur: number;
  diff: number;
  desc?: string;
  file: string;
  start?: number;
};
type Bank = {
  CATS: Array<{ id: string; label: string; emoji: string }>;
  OFFICIAL: Meme[];
  byId: (id: unknown) => Meme | null;
  cat: (id: unknown) => { id: string; label: string; emoji: string };
  filter: (options?: { cats?: string[]; diff?: number }) => Meme[];
  pick: (pool: Meme[], used?: string[], rnd?: () => number) => Meme | null;
};
type Feature = { sr: number; dur: number; mel: Float32Array[]; energy: number[]; onset: number[]; pitch: number[] };
type Score = {
  features: (samples: Float32Array | number[], sr: number) => Feature;
  compare: (orig: Feature | null, rec: Feature | null) => { score: number; parts: Record<string, number> };
  analyse: (orig: { samples: Float32Array; sr: number }, rec: { samples: Float32Array; sr: number }) => { score: number; parts: Record<string, number> };
  toPoints: (value: unknown) => number;
  weights: Record<string, number>;
  _internal: {
    dtw: (a: Float32Array[], b: Float32Array[], band?: number) => number;
    resample: (samples: Float32Array, sr: number, target: number) => Float32Array;
  };
};

const dir = path.resolve(import.meta.dirname, "../../public/mimicparty");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(dir, "memes.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(dir, "score.js"), "utf8"), context);
const globals = context as unknown as { MimicBank: Bank; MimicScore: Score };
const bank = globals.MimicBank;
const score = globals.MimicScore;

const SR = 16000;

function tone(freq: number, seconds: number) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = 0.35 + 0.65 * Math.abs(Math.sin(2 * Math.PI * 3 * t));
    out[i] = env * 0.6 * Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2.01 * t);
  }
  return out;
}

function silence(seconds: number) {
  return new Float32Array(Math.round(seconds * SR));
}

/** Bruit large bande déterministe (xorshift32), sans hauteur détectable. */
function noise(seconds: number) {
  const out = new Float32Array(Math.round(seconds * SR));
  let seed = 0x12345678;
  for (let i = 0; i < out.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    out[i] = ((seed >>> 0) / 0x100000000) * 2 - 1;
  }
  return out;
}

describe("Mimic Party — banque de mèmes", () => {
  it("expose des catégories et une banque officielle cohérente", () => {
    expect(bank.CATS.length).toBeGreaterThanOrEqual(10);
    expect(bank.OFFICIAL.length).toBeGreaterThanOrEqual(30);

    const ids = new Set(bank.OFFICIAL.map((m) => m.id));
    expect(ids.size).toBe(bank.OFFICIAL.length);

    for (const meme of bank.OFFICIAL) {
      expect(meme.name.length).toBeGreaterThan(0);
      expect(meme.emoji.length).toBeGreaterThan(0);
      expect(meme.file).toMatch(/^\/mimicparty\/sounds\/[a-z0-9-]+\.mp3$/);
      expect(meme.dur).toBeGreaterThanOrEqual(0.3);
      expect(meme.dur).toBeLessThanOrEqual(30);
      expect(meme.start ?? 0).toBeGreaterThanOrEqual(0);
      expect(bank.CATS.some((c) => c.id === meme.cat)).toBe(true);
      expect(meme.diff).toBeGreaterThanOrEqual(1);
      expect(meme.diff).toBeLessThanOrEqual(3);
    }
  });

  it("pointe vers de vrais fichiers audio présents dans le dépôt", () => {
    for (const meme of bank.OFFICIAL) {
      const file = path.join(dir, meme.file.replace(/^\/mimicparty\//, ""));
      expect(fs.existsSync(file), `fichier manquant : ${meme.file}`).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
    }
  });

  it("filtre par catégorie et par difficulté", () => {
    const gaming = bank.filter({ cats: ["gaming"] });
    expect(gaming.length).toBeGreaterThan(0);
    expect(gaming.every((m) => m.cat === "gaming")).toBe(true);

    const easy = bank.filter({ diff: 1 });
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every((m) => m.diff <= 1)).toBe(true);

    const easyGaming = bank.filter({ cats: ["gaming"], diff: 1 });
    expect(easyGaming.length).toBeLessThanOrEqual(gaming.length);
    expect(easyGaming.every((m) => m.cat === "gaming" && m.diff <= 1)).toBe(true);

    expect(bank.filter({}).length).toBe(bank.OFFICIAL.length);
    expect(bank.filter({ cats: ["inconnue"] })).toEqual([]);
  });

  it("retrouve un mème ou une catégorie avec un repli lisible", () => {
    expect(bank.byId("vineboom")?.name).toBe("Vine Boom");
    expect(bank.byId("inconnu")).toBeNull();
    expect(bank.byId(null)).toBeNull();
    expect(bank.cat("gaming").label).toContain("gaming");
    expect(bank.cat("inconnue")).toEqual({ id: "inconnue", label: "inconnue", emoji: "🎵" });
  });

  it("tire un mème non joué, avec repli quand le vivier est épuisé", () => {
    const pool = bank.filter({ cats: ["gaming"] });
    expect(bank.pick(pool, [], () => 0)).toBe(pool[0]);
    expect(bank.pick(pool, [pool[0].id], () => 0)).toBe(pool[1]);
    expect(bank.pick([pool[0]], [pool[0].id], () => 0)).toBe(pool[0]);
    expect(bank.pick([], [], () => 0)).toBeNull();
  });
});

describe("Mimic Party — comparaison audio", () => {
  const original = score.features(tone(220, 1.2), SR);

  it("donne 100 à une imitation identique", () => {
    const result = score.compare(original, score.features(tone(220, 1.2), SR));
    expect(result.score).toBe(100);
    for (const value of Object.values(result.parts)) expect(value).toBe(100);
  });

  it("classe une mauvaise hauteur sous l'original, puis le bruit et le silence", () => {
    const wrong = score.compare(original, score.features(tone(440, 1.2), SR));
    const noisy = score.compare(original, score.features(noise(1.2), SR));
    const silent = score.compare(original, score.features(silence(1.2), SR));

    expect(wrong.score).toBeLessThan(100);
    expect(wrong.score).toBeGreaterThan(noisy.score);
    expect(noisy.score).toBeGreaterThan(silent.score);
    expect(noisy.score).toBeLessThanOrEqual(45);
    expect(silent.score).toBeLessThanOrEqual(25);
  });

  it("pénalise une imitation trop courte, surtout sur la durée", () => {
    const short = score.compare(original, score.features(tone(220, 0.4), SR));
    expect(short.score).toBeLessThan(100);
    expect(short.parts.duration).toBeLessThan(60);
  });

  it("renvoie des sous-notes bornées et zéro sans empreinte", () => {
    const result = score.compare(original, score.features(tone(330, 1.2), SR));
    expect(Object.keys(result.parts).sort()).toEqual(["duration", "energy", "pauses", "pitch", "rhythm", "timbre"]);
    for (const value of Object.values(result.parts)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(score.compare(null, original)).toEqual({
      score: 0,
      parts: { timbre: 0, pitch: 0, rhythm: 0, energy: 0, pauses: 0, duration: 0 },
    });
    expect(score.compare(original, null).score).toBe(0);
  });

  it("expose une empreinte et une API utilisables par un futur modèle", () => {
    expect(original.sr).toBe(SR);
    expect(original.dur).toBeCloseTo(1.2, 2);
    expect(original.mel.length).toBe(original.energy.length);
    expect(original.mel.length).toBe(original.pitch.length);
    expect(original.energy.length).toBe(original.onset.length);

    const empty = score.features(new Float32Array(0), SR);
    expect(empty.mel).toEqual([]);
    expect(empty.dur).toBe(0);

    const points = Object.values(score.weights).reduce((a, b) => a + b, 0);
    expect(points).toBeCloseTo(1, 6);
    expect(score.toPoints(-10)).toBe(0);
    expect(score.toPoints(42.6)).toBe(43);
    expect(score.toPoints(999)).toBe(100);
    expect(score.toPoints("nope")).toBe(0);

    expect(score._internal.dtw(original.mel, original.mel)).toBe(0);
    expect(score._internal.dtw(original.mel, score.features(tone(440, 1.2), SR).mel)).toBeGreaterThan(0);
    expect(score._internal.resample(new Float32Array(100), SR, 8000).length).toBe(50);
  });

  it("compare aussi directement des échantillons via analyse()", () => {
    const same = score.analyse({ samples: tone(220, 0.9), sr: SR }, { samples: tone(220, 0.9), sr: SR });
    expect(same.score).toBe(100);
    expect(same.parts.pitch).toBe(100);
  });
});
