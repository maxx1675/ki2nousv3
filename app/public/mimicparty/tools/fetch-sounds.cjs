#!/usr/bin/env node
/* MIMIC PARTY — télécharge de VRAIS extraits (voix, cris, chansons) dans sounds/v2/.
 *
 * Usage (depuis le dossier mimicparty, Node 18+) :
 *   node tools/fetch-sounds.js                 télécharge tous les sons manquants
 *   node tools/fetch-sounds.js --report        affiche ce qui est présent / manquant
 *   node tools/fetch-sounds.js --only quoicoubeh,cpasfaux
 *   node tools/fetch-sounds.js --no-sfx        ignore les simples effets sonores
 *   node tools/fetch-sounds.js --force         retélécharge même si le fichier existe
 *
 * Source par défaut : la banque de sons MyInstants (sons de mèmes envoyés par des fans).
 * Si le son trouvé n'est pas le bon, ou pour une source précise (lien MP3 direct,
 * TikTok, YouTube…), crée sounds/v2/_overrides.json :
 *
 *   {
 *     "quoicoubeh": "https://www.myinstants.com/media/sounds/xxxx.mp3",
 *     "pedro":      { "url": "https://www.tiktok.com/@xxx/video/123", "start": 2, "dur": 6 },
 *     "rickroll":   { "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "start": 43, "dur": 6 }
 *   }
 *
 * Les liens qui ne sont pas un MP3 direct passent par yt-dlp + ffmpeg (à installer :
 *   winget install yt-dlp.yt-dlp   et   winget install Gyan.FFmpeg ).
 * Tu peux aussi simplement déposer toi-même <id>.mp3 dans sounds/v2/ : il est prioritaire.
 * La liste de ce qui a été téléchargé (titre + lien) est gardée dans sounds/v2/_sources.json.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "sounds", "v2");
const SRC_FILE = path.join(OUT, "_sources.json");
const OVR_FILE = path.join(OUT, "_overrides.json");
const SITE = "https://www.myinstants.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const BAD_WORDS = ["remix", "loop", "hour", "bass boost", "earrape", "ear rape", "extended", "slowed", "reverb", "10 min"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function loadBank() {
  const code = fs.readFileSync(path.join(ROOT, "memes.js"), "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.MimicBank.OFFICIAL;
}

/** Extrait { title, url } des résultats d'une page de recherche MyInstants. */
function parseResults(html) {
  const out = [];
  const chunks = String(html).split(/class="instant"/).slice(1);
  for (const chunk of chunks) {
    const mp3 = /\/media\/sounds\/[^'"\s)<>]+?\.mp3/i.exec(chunk);
    if (!mp3) continue;
    const t = /class="instant-link[^"]*"[^>]*>\s*([^<]+?)\s*</i.exec(chunk) || /title="([^"]+)"/i.exec(chunk);
    const title = decode(t ? t[1] : decodeURIComponent(mp3[0].split("/").pop().replace(/\.mp3$/i, "")).replace(/[_-]+/g, " "));
    out.push({ title, url: SITE + mp3[0] });
  }
  return out;
}

/** Note un résultat : recouvrement des mots de la recherche, malus pour remix / boucles / 10 heures. */
function rank(query, results) {
  const q = norm(query).split(" ").filter((w) => w.length > 1);
  return results
    .map((r, i) => {
      const t = norm(r.title);
      let hit = 0;
      q.forEach((w) => { if (t.includes(w)) hit++; });
      let s = q.length ? hit / q.length : 0;
      if (hit === q.length) s += 0.5;
      BAD_WORDS.forEach((b) => { if (t.includes(b)) s -= 0.4; });
      return { r, s: s - i * 0.01 };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r);
}

async function httpGet(url, asBuffer) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr,en;q=0.8" }, redirect: "follow" });
    if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.text();
  }
  throw new Error("trop de requêtes (HTTP 429), réessaie dans quelques minutes");
}

const looksLikeMp3 = (b) => b.length > 3000 && ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));

async function searchSound(query) {
  for (const lang of ["fr", "en"]) {
    const html = await httpGet(`${SITE}/${lang}/search/?name=${encodeURIComponent(query)}`);
    const res = rank(query, parseResults(html));
    if (res.length) return res;
    await sleep(300);
  }
  return [];
}

function ytdlp(id, ovr) {
  const base = path.join(OUT, id);
  const args = ["-x", "--audio-format", "mp3", "--audio-quality", "5", "--no-playlist", "-o", base + ".%(ext)s"];
  if (ovr.start != null) {
    const st = Number(ovr.start) || 0, du = Number(ovr.dur) || 6;
    args.push("--download-sections", `*${st}-${st + du}`, "--force-keyframes-at-cuts");
  }
  args.push(ovr.url);
  const r = cp.spawnSync("yt-dlp", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.error || r.status !== 0) throw new Error("yt-dlp a échoué (installé ? winget install yt-dlp.yt-dlp  +  winget install Gyan.FFmpeg)");
  if (!fs.existsSync(base + ".mp3")) throw new Error("yt-dlp n'a pas produit de MP3");
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => argv.includes(n);
  const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : ""; };
  fs.mkdirSync(OUT, { recursive: true });

  let bank = loadBank();
  const only = val("--only") ? val("--only").split(",").map((s) => s.trim()) : null;
  if (only) bank = bank.filter((m) => only.includes(m.id));
  if (flag("--no-sfx")) bank = bank.filter((m) => m.kind !== "sfx");
  const sources = fs.existsSync(SRC_FILE) ? JSON.parse(fs.readFileSync(SRC_FILE, "utf8")) : {};
  const overrides = fs.existsSync(OVR_FILE) ? JSON.parse(fs.readFileSync(OVR_FILE, "utf8")) : {};
  const has = (m) => fs.existsSync(path.join(OUT, m.id + ".mp3"));

  if (flag("--report")) {
    const ok = bank.filter(has), ko = bank.filter((m) => !has(m));
    console.log(`\n${ok.length}/${bank.length} sons présents dans sounds/v2/`);
    if (ko.length) console.log("Manquants :\n  " + ko.map((m) => `${m.id}  (${m.q})`).join("\n  "));
    return;
  }

  const todo = bank.filter((m) => flag("--force") || !has(m));
  console.log(`\n${bank.length - todo.length} déjà présents, ${todo.length} à télécharger.\n`);
  let done = 0, failed = [];
  for (const m of todo) {
    process.stdout.write(`• ${m.id.padEnd(14)} `);
    try {
      const ovr = overrides[m.id];
      if (ovr) {
        const o = typeof ovr === "string" ? { url: ovr } : ovr;
        if (/\.mp3(\?.*)?$/i.test(o.url) && o.start == null) {
          const buf = await httpGet(o.url, true);
          if (!looksLikeMp3(buf)) throw new Error("le lien ne donne pas un MP3");
          fs.writeFileSync(path.join(OUT, m.id + ".mp3"), buf);
        } else ytdlp(m.id, o);
        sources[m.id] = { title: "(lien perso)", url: o.url };
        console.log("OK (lien perso)");
        done++;
        continue;
      }
      const results = await searchSound(m.q || m.name);
      let saved = false;
      for (const r of results.slice(0, 4)) {
        const buf = await httpGet(r.url, true);
        if (!looksLikeMp3(buf) || buf.length > 2.5 * 1024 * 1024) continue;
        fs.writeFileSync(path.join(OUT, m.id + ".mp3"), buf);
        sources[m.id] = { title: r.title, url: r.url, query: m.q };
        console.log(`OK  « ${r.title} »`);
        saved = true;
        break;
      }
      if (!saved) throw new Error(results.length ? "aucun fichier utilisable" : "aucun résultat");
      done++;
    } catch (e) {
      console.log("ÉCHEC : " + e.message);
      failed.push(m.id);
    }
    fs.writeFileSync(SRC_FILE, JSON.stringify(sources, null, 2));
    await sleep(450);
  }
  console.log(`\nTerminé : ${done} téléchargé(s), ${failed.length} échec(s).`);
  if (failed.length) {
    console.log("Échecs : " + failed.join(", "));
    console.log("→ ajoute-les dans sounds/v2/_overrides.json (lien direct) ou dépose <id>.mp3 à la main.");
  }
  console.log("Vérifie les titres dans sounds/v2/_sources.json : si un son n'est pas le bon, supprime son MP3 et ajoute un lien dans _overrides.json.");
}

if (require.main === module) main().catch((e) => { console.error("\nErreur : " + e.message); process.exit(1); });
module.exports = { parseResults, rank, norm };
