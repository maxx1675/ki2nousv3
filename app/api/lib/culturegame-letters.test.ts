import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Letters = {
  cleanWord: (value: unknown) => string;
  scrambleWord: (value: unknown, random?: () => number) => string;
};

const source = readFileSync(fileURLToPath(new URL("../../public/culturegame/letters.js", import.meta.url)), "utf8");
const sandbox: { window: { CG_LETTERS?: Letters } } = { window: {} };
runInNewContext(source, sandbox);
const CG = sandbox.window.CG_LETTERS;
if (!CG) throw new Error("CG_LETTERS helpers not exposed by letters.js");

const flat = (value: string) => value.replace(/\s+/g, "");
const sorted = (value: string) => value.split("").sort().join("");

describe("Culture Game — anagrammes", () => {
  it("normalise accents, casse et ponctuation", () => {
    expect(CG.cleanWord("Éléphant bleu !")).toBe("ELEPHANTBLEU");
    expect(CG.cleanWord("  république-française  ")).toBe("REPUBLIQUEFRANCAISE");
    expect(CG.cleanWord(null)).toBe("");
  });

  it("mélange réellement les lettres sans en perdre", () => {
    const word = "REPONSE";
    const scrambled = CG.scrambleWord(word);
    expect(scrambled).toContain(" ");
    expect(flat(scrambled)).not.toBe(word);
    expect(sorted(flat(scrambled))).toBe(sorted(word));
  });

  it("ne renvoie jamais le mot d'origine pour un mot normal", () => {
    for (const word of ["CHAT", "MONTAGNE", "BICYCLETTE", "ORDINATEUR", "PROFESSEUR"]) {
      for (let i = 0; i < 20; i++) expect(flat(CG.scrambleWord(word))).not.toBe(word);
    }
  });

  it("reste déterministe avec un générateur fourni", () => {
    const random = () => 0.42;
    const a = CG.scrambleWord("JARDIN", random);
    const b = CG.scrambleWord("JARDIN", random);
    expect(a).toBe(b);
    expect(sorted(flat(a))).toBe(sorted("JARDIN"));
  });

  it("gère les mots courts ou composés d'une seule lettre répétée", () => {
    expect(CG.scrambleWord("A")).toBe("A");
    expect(CG.scrambleWord("")).toBe("");
    expect(CG.scrambleWord("AA")).toBe("A A");
  });

  it("retire les accents avant de mélanger", () => {
    const scrambled = CG.scrambleWord("ÉTÉ");
    expect(flat(scrambled)).not.toBe("ÉTÉ");
    expect(sorted(flat(scrambled))).toBe(sorted("ETE"));
  });
});
