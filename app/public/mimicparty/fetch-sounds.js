#!/usr/bin/env node
/* MIMIC PARTY — télécharge les sons des mèmes « auto » depuis myinstants.com.
 *
 * Usage (depuis le dossier mimicparty/, Node 18+) :
 *   node tools/fetch-sounds.js              # télécharge les sons manquants
 *   node tools/fetch-sounds.js --only oof,nokia
 *   node tools/fetch-sounds.js --force      # retélécharge même si le fichier existe
 *
 * Pour chaque entrée de memes.js ayant un champ `q`, le script cherche ces mots-clés sur
 * myinstants, prend le premier résultat et l'enregistre dans sounds/<id>.mp3.
 * Vérifie les noms affichés : si un résultat est mauvais, remplace le fichier à la main
 * ou affine `q` dans memes.js. Beaucoup de sons sont des extraits protégés : usage privé
 * entre amis, à vérifier avant toute mise en ligne publique.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "sounds");
const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.indexOf("--only");
const only = onlyArg >= 0 ? String(args[onlyArg + 1] || "").split(",").filter(Boolean) : null;

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "memes.js"), "utf8"), ctx);
const list = ctx.window.MimicBank.OFFICIAL.filter((m) => m.q && (!only || only.includes(m.id)));

const UA = { "User-Agent": "Mozilla/5.0 (compatible; MimicPartyFetch/1.0)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isMp3 = (b) => b.length > 1024 && ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));

async function findMp3(q) {
  const res = await fetch("https://www.myinstants.com/en/search/?name=" + encodeURIComponent(q), { headers: UA });
  if (!res.ok) throw new Error("recherche HTTP " + res.status);
  const html = await res.text();
  const m = html.match(/\/media\/sounds\/[^'"\s)<>]+?\.mp3/i);
  return m ? m[0] : null;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  let ok = 0, skipped = 0; const failed = [];
  for (const m of list) {
    const dest = path.join(outDir, path.basename(m.file));
    if (!force && fs.existsSync(dest)) { skipped++; continue; }
    try {
      const p = await findMp3(m.q);
      if (!p) throw new Error("aucun résultat pour « " + m.q + " »");
      const res = await fetch("https://www.myinstants.com" + encodeURI(decodeURI(p)), { headers: UA });
      if (!res.ok) throw new Error("téléchargement HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isMp3(buf)) throw new Error("le fichier reçu n'est pas un MP3");
      fs.writeFileSync(dest, buf);
      ok++;
      console.log("✔ " + m.id.padEnd(14) + " ← " + path.basename(p) + "  (" + Math.round(buf.length / 1024) + " Ko)");
    } catch (e) {
      failed.push(m.id);
      console.log("✘ " + m.id.padEnd(14) + " " + e.message);
    }
    await sleep(800);
  }
  console.log("\n" + ok + " téléchargé(s), " + skipped + " déjà présent(s), " + failed.length + " échec(s)" +
    (failed.length ? " : " + failed.join(", ") : ""));
  if (failed.length) console.log("Pour ceux-là, dépose toi-même sounds/<id>.mp3 : le jeu ignore automatiquement les sons absents.");
})();
