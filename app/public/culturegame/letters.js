/* ============================================================================
   CULTURE GAME — mélange des anagrammes
   ----------------------------------------------------------------------------
   Les banques de questions stockent parfois les lettres déjà dans l'ordre.
   Cette aide mélange systématiquement les lettres de la réponse au début de
   chaque partie : le joueur ne peut plus lire le mot directement.
   ========================================================================== */
(function (global) {
  "use strict";

  const cleanWord = (word) =>
    String(word ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  /** Mélange les lettres ; évite de renvoyer exactement le mot d'origine. */
  function scrambleWord(word, random) {
    const rnd = typeof random === "function" ? random : Math.random;
    const clean = cleanWord(word);
    if (clean.length < 2) return clean;
    const original = clean.split("");
    for (let attempt = 0; attempt < 40; attempt++) {
      const letters = original.slice();
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = letters[i];
        letters[i] = letters[j];
        letters[j] = tmp;
      }
      const candidate = letters.join("");
      if (candidate !== clean) return letters.join(" ");
    }
    // Mot très court ou lettres identiques : une rotation suffit.
    const fallback = original.slice();
    fallback.push(fallback.shift());
    const rotated = fallback.join("");
    return (rotated === clean ? fallback.reverse() : fallback).join(" ");
  }

  global.CG_LETTERS = { cleanWord, scrambleWord };
})(typeof window !== "undefined" ? window : globalThis);
