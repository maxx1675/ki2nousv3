/* ============================================================================
   GARLIC PHONE — le téléphone arabe du dessin (hôte autoritaire)
   ----------------------------------------------------------------------------
   Chaque joueur lance une histoire. Les histoires tournent : phrase → dessin →
   phrase → dessin… jusqu'à ce que tout le monde ait contribué à chaque chaîne.
   L'hôte tient les chaînes, le minuteur et l'album final ; les clients
   soumettent leurs réponses par messages ciblés vers l'hôte.
   Adaptation libre (MIT) du projet Garlic Phone de Cristhian Duran.
   ========================================================================== */
"use strict";

const GAME = "gp";
const ROOM = (c) => "gp-" + c;
const MIN = 2;
const MAX = 8;
const TEXT_MAX = 180;
// Zone de dessin plus grande et plus confortable (ratio 16/10).
const CANVAS_W = 960;
const CANVAS_H = 600;

const SUGGESTIONS = [
  "Un chat qui pilote un avion de chasse",
  "Le président en pyjama à l'ONU",
  "Une licorne qui fait du shopping",
  "Un poulpe qui joue de la batterie",
  "Un dragon qui fait griller des marshmallows",
  "Une grand-mère championne de skate",
  "Un pingouin qui vend des glaces",
  "Un robot qui tombe amoureux d'une imprimante",
  "Une girafe bloquée dans un ascenseur",
  "Un requin qui apprend le solfège",
  "Le Père Noël en vacances à la plage",
  "Un escargot qui fait la course en Formule 1",
  "Un extraterrestre qui passe le permis de conduire",
  "Une banane qui fait du yoga",
  "Un crocodile coiffeur pour stars",
  "Un canard qui présente le journal télévisé",
  "Une momie qui fait du camping",
  "Un koala qui dirige un orchestre",
  "Un hamburger qui manifeste pour ses droits",
  "Une sorcière qui commande une pizza au balai",
];

const COLORS = [
  ["#2a2118", "Noir"],
  ["#5b4a3a", "Crayon"],
  ["#8c7a63", "Terre"],
  ["#ffffff", "Blanc"],
  ["#e2543e", "Tomate"],
  ["#f06a3c", "Mandarine"],
  ["#f0a12c", "Moutarde"],
  ["#f7d94c", "Soleil"],
  ["#8fbf5a", "Basilic"],
  ["#3f9b8f", "Menthe"],
  ["#2aa8c9", "Océan"],
  ["#3f74c9", "Myrtille"],
  ["#5b5bd6", "Indigo"],
  ["#7b4bb7", "Ail"],
  ["#d94f8a", "Framboise"],
  ["#f2a7c3", "Rose"],
];
const BRUSH_SIZES = [3, 6, 11, 18, 28];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const app = () => document.querySelector("#app");
const msg = (t) => {
  const e = document.querySelector("#hmsg");
  if (e) e.textContent = t || "";
};
const clean = (v) => String(v ?? "").trim().slice(0, 40);
const nameOf = (id) => {
  const p = S && S.pl ? S.pl.find((x) => x.id === id) : null;
  return p ? p.n : "?";
};
const escAttr = (v) => esc(v).replace(/\n/g, " ");
const stepKind = (step) => (step % 2 === 1 ? "draw" : "text");

/* -------------------------------- État ----------------------------------- */
let R = null;
let S = null;
let H = { order: [], chains: [], stepEndAt: 0 };
let isHost = false;
let code = "";
let blankCache = "";

const L = {
  name: "",
  hello: null,
  tick: null,
  touch: null,
  late: false,
  blockedUntil: 0,
  homeMsg: "",
  sig: "",
  draft: {},
  sent: {},
  albumView: 0,
  endKey: "",
  suggestions: [],
  draw: null,
  prompt: null,
  sentShot: {},
  autoStep: -1,
};

function newState() {
  return {
    ph: "lobby",
    host: ME,
    pl: [],
    cfg: { stepTime: 120 },
    step: 0,
    n: 0,
    deadline: 0,
    submitted: [],
    prompts: {},
    startedAt: 0,
    endedAt: 0,
    album: [],
    albumIndex: 0,
  };
}

function buildAlbum(chains) {
  return (chains || []).map((c, i) => ({
    i,
    owner: c.owner,
    entries: c.entries
      .filter(Boolean)
      .map((e) => ({ kind: e.kind, by: e.by, value: e.value, timeout: !!e.timeout })),
  }));
}

function blankDrawing() {
  if (blankCache) return blankCache;
  try {
    const c = document.createElement("canvas");
    c.width = CANVAS_W;
    c.height = CANVAS_H;
    const g = c.getContext("2d");
    g.fillStyle = "#fffdf6";
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);
    g.fillStyle = "#cbbfa6";
    g.font = "700 32px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("(temps écoulé)", CANVAS_W / 2, CANVAS_H / 2);
    blankCache = c.toDataURL("image/webp", 0.45);
  } catch (_) {
    blankCache = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" fill="#fffdf6"/><text x="480" y="310" text-anchor="middle" font-size="32" fill="#cbbfa6">(temps écoulé)</text></svg>',
    );
  }
  return blankCache;
}

function chainFor(pid, step) {
  const n = H.order.length;
  const i = H.order.indexOf(pid);
  if (i < 0 || !n) return -1;
  return ((i - step) % n + n) % n;
}

function buildPrompts(step) {
  const out = {};
  (S.pl || []).forEach((p) => {
    const ci = chainFor(p.id, step);
    const prev = ci >= 0 ? H.chains[ci]?.entries[step - 1] : null;
    // On ne transmet pas l'auteur pendant la partie : les noms ne sont
    // révélés que dans l'album final.
    out[p.id] = prev ? { kind: prev.kind, value: prev.value } : null;
  });
  return out;
}

/** Diffuse l'état. `withPrompts` n'est vrai qu'aux changements d'étape :
    les dessins ne sont ainsi pas renvoyés à chaque copie rendue. */
function bc(withPrompts) {
  if (!R || !isHost || !S) return;
  const st = withPrompts === false ? { ...S, prompts: {} } : S;
  R.emit("st", st).catch(() => {});
  // La photo d'hôte évite de doubler l'album : il est reconstruit depuis H.
  R.snap({
    S: { ...S, prompts: {}, album: [] },
    H: { order: H.order, chains: H.chains, stepEndAt: H.stepEndAt },
  });
}

function send(d) {
  d.p = ME;
  if (isHost) hostAct(d);
  else if (R) R.emit("act", d, "host").catch(() => {});
}

/* ----------------------------- Hôte : actions ---------------------------- */
function hostAct(d) {
  if (!isHost || !S || !d) return;
  if (d.k === "join") {
    const p = S.pl.find((x) => x.id === d.p);
    if (p) {
      p.n = clean(d.n) || p.n;
      bc();
      render();
      return;
    }
    if (S.ph !== "lobby") {
      R.emit("late", { code }, d.p).catch(() => {});
      return;
    }
    if (S.pl.length >= MAX) {
      R.emit("full", { code }, d.p).catch(() => {});
      return;
    }
    S.pl.push({ id: d.p, n: clean(d.n) || "Joueur" });
    bc();
    render();
    return;
  }
  if (d.k === "cfg" && S.ph === "lobby" && d.p === S.host) {
    if ([60, 120, 180].includes(+d.v)) S.cfg.stepTime = +d.v;
    bc();
    render();
    return;
  }
  if (d.k === "start" && S.ph === "lobby" && d.p === S.host) {
    startGame();
    return;
  }
  if (d.k === "sub" && S.ph === "play") {
    hostSubmit(d);
    return;
  }
  if (d.k === "skip" && S.ph === "play" && d.p === S.host) {
    fillMissing();
    advanceStep();
    return;
  }
  if (d.k === "album" && S.ph === "end") {
    const n = S.album.length;
    if (!n) return;
    S.albumIndex = ((S.albumIndex + (Number(d.dir) || 0)) % n + n) % n;
    bc();
    render();
    return;
  }
  if (d.k === "replay" && S.ph === "end" && d.p === S.host) {
    resetToLobby();
    return;
  }
  if (d.k === "end" && d.p === S.host && (S.ph === "play" || S.ph === "lobby")) {
    if (S.ph === "play") fillMissing();
    finishGame(true);
    return;
  }
  if (d.k === "hello" && d.p === S.host) bc();
}

function startGame() {
  if (!S || S.pl.length < MIN) return;
  const ids = S.pl.map((p) => p.id);
  H = {
    order: shuffle(ids),
    chains: [],
    stepEndAt: 0,
  };
  H.chains = H.order.map((owner) => ({ owner, entries: [] }));
  S.n = H.order.length;
  S.step = 0;
  S.deadline = 0;
  S.submitted = [];
  S.prompts = {};
  S.album = [];
  S.albumIndex = 0;
  S.startedAt = Net.now();
  S.endedAt = 0;
  L.sent = {};
  L.draft = {};
  L.sentShot = {};
  L.autoStep = -1;
  L.albumView = 0;
  L.suggestions = shuffle(SUGGESTIONS).slice(0, 3);
  L.prompt = null;
  beginStep();
}

function beginStep() {
  if (!S) return;
  if (S.step >= S.n) {
    finishGame();
    return;
  }
  H.stepEndAt = 0;
  S.submitted = [];
  S.prompts = buildPrompts(S.step);
  S.deadline = Net.now() + S.cfg.stepTime * 1000;
  S.ph = "play";
  bc();
  if (isHost) render();
}

function hostSubmit(d) {
  if (!S || S.ph !== "play") return;
  const pid = d.p;
  if (!pid || !S.pl.some((p) => p.id === pid)) return;
  if (S.submitted.includes(pid)) return;
  if (Number(d.step) !== S.step) return;
  if (Net.now() > S.deadline + 1200) return;
  const kind = stepKind(S.step);
  if (d.kind !== kind) return;
  const ci = chainFor(pid, S.step);
  if (ci < 0) return;
  let value = "";
  if (kind === "text") {
    value = String(d.value ?? "").replace(/\s+/g, " ").trim().slice(0, TEXT_MAX);
    if (!value) return;
  } else {
    value = String(d.value ?? "");
    if (!/^data:image\//.test(value) || value.length > 150000) return;
  }
  H.chains[ci].entries[S.step] = {
    kind,
    by: pid,
    value,
    ts: Net.now(),
    timeout: false,
  };
  S.submitted.push(pid);
  bc(false);
  // On ne reconstruit surtout pas l'écran de l'hôte ici : un autre joueur qui
  // envoie sa copie effaçait le dessin en cours de l'hôte. Le statut est mis à
  // jour par updateLive(), sans toucher au canvas.
}

function fillMissing() {
  if (!S) return;
  const kind = stepKind(S.step);
  (S.pl || []).forEach((p) => {
    const ci = chainFor(p.id, S.step);
    if (ci < 0) return;
    if (!H.chains[ci].entries[S.step]) {
      H.chains[ci].entries[S.step] = {
        kind,
        by: p.id,
        value: kind === "text" ? "(temps écoulé)" : blankDrawing(),
        ts: Net.now(),
        timeout: true,
      };
    }
  });
}

function advanceStep() {
  if (!S || S.ph !== "play") return;
  H.stepEndAt = 0;
  S.step += 1;
  if (S.step >= S.n) finishGame();
  else beginStep();
}

function finishGame(early) {
  if (!S) return;
  H.stepEndAt = 0;
  S.ph = "end";
  S.endedAt = Net.now();
  S.prompts = {};
  S.submitted = [];
  S.album = buildAlbum(H.chains);
  S.albumIndex = 0;
  L.albumView = 0;
  if (early) toast("Partie terminée par l’hôte");
  bc();
  if (isHost) render();
}

function resetToLobby() {
  if (!S) return;
  S.ph = "lobby";
  S.step = 0;
  S.n = 0;
  S.deadline = 0;
  S.submitted = [];
  S.prompts = {};
  S.album = [];
  S.albumIndex = 0;
  S.startedAt = 0;
  S.endedAt = 0;
  H = { order: [], chains: [], stepEndAt: 0 };
  L.sent = {};
  L.draft = {};
  L.sentShot = {};
  L.autoStep = -1;
  L.albumView = 0;
  L.endKey = "";
  L.prompt = null;
  bc();
  if (isHost) render();
}

function hostTick() {
  if (!isHost || !S) return;
  if (S.ph !== "play") return;
  const t = Net.now();
  const all = S.n > 0 && S.submitted.length >= S.n;
  if (all && !H.stepEndAt) H.stepEndAt = t + 1200;
  if (t > S.deadline + 900 && !H.stepEndAt) H.stepEndAt = t + 250;
  if (H.stepEndAt && t >= H.stepEndAt) {
    fillMissing();
    advanceStep();
  }
}

/* ------------------------------ Connexion -------------------------------- */
async function startOnline(create, joinCode, o) {
  o = o || {};
  let name = o.name;
  if (!name) {
    const raw = (document.querySelector("#pname")?.value || "").trim().slice(0, 16);
    if (raw.length < 2) return msg("Choisis un pseudo (2 lettres minimum).");
    Profile.set({ name: raw });
    name = Profile.tag(raw);
  }
  L.name = name;
  L.homeMsg = "Connexion au salon…";
  code = create ? o.code || mkCode() : String(joinCode || "").toUpperCase();
  if (!create && !/^[A-Z0-9]{4}$/.test(code)) return msg("Le code du salon fait 4 caractères.");

  try {
    R = await Net.join(ROOM(code), { create, resume: !!o.resume, wasHost: !!o.wasHost });
  } catch (e) {
    if ((o.retry || 0) > 0 && (e.code === "noroom" || !e.status)) {
      msg("⏳ En attente de l’hôte…");
      await sleep(1500);
      return startOnline(create, joinCode, { ...o, retry: o.retry - 1 });
    }
    if (o.resume && !e.status && (o.net = (o.net || 0) + 1) < 6) {
      msg("🔄 Reconnexion…");
      await sleep(1800);
      return startOnline(create, joinCode, o);
    }
    if (o.resume) Sess.clear(GAME);
    return msg(
      o.resume
        ? "La partie n’existe plus. Tu peux en créer une nouvelle."
        : e.message || "Connexion impossible.",
    );
  }

  isHost = R.host;
  if (create && !isHost) {
    R.leave();
    R = null;
    if (o.code) {
      if ((o.retry || 0) > 0) {
        await sleep(1400);
        return startOnline(true, null, { ...o, retry: o.retry - 1 });
      }
      return msg("Ce code est déjà utilisé, réessaie.");
    }
    if ((o.tries = (o.tries || 0) + 1) > 8) return msg("Impossible de créer un salon.");
    return startOnline(true, null, o);
  }

  Sess.save(GAME, { code, name, host: isHost });
  if (!L.touch) L.touch = setInterval(() => Sess.touch(GAME), 20000);
  Party.listen(R, code, () => Sess.clear(GAME));

  R.on("st", (d) => {
    if (isHost || !d) return;
    const wasEnd = S && S.ph === "end";
    const oldStep = S ? S.step : -1;
    S = d;
    L.late = false;
    if (S.prompts && S.prompts[ME]) L.prompt = S.prompts[ME];
    if (S.ph === "lobby") {
      L.albumView = 0;
      L.sent = {};
      L.prompt = null;
    }
    if (S.ph === "end" && !wasEnd) L.albumView = S.albumIndex || 0;
    if (S.ph === "play" && oldStep !== S.step) {
      L.prompt = S.prompts ? S.prompts[ME] || null : L.prompt;
      L.suggestions = shuffle(SUGGESTIONS).slice(0, 3);
    }
    if (stateSig() !== L.sig) render();
    else updateLive();
  });
  R.on("late", () => {
    L.late = true;
    L.blockedUntil = Date.now() + 8000;
    render();
  });
  R.on("full", () => {
    msg("Le salon est complet (8 joueurs maximum).");
    toast("Salon complet");
  });
  R.on("act", (d) => {
    if (isHost) hostAct(d);
  });
  R.onPromote((snap) => {
    isHost = true;
    if (snap && snap.S) {
      S = snap.S;
      H = snap.H || { order: [], chains: [], stepEndAt: 0 };
      S.host = ME;
      if (S.ph === "play") {
        S.prompts = buildPrompts(S.step);
        if (!S.deadline) S.deadline = Net.now() + S.cfg.stepTime * 1000;
      }
      if (S.ph === "end") S.album = buildAlbum(H.chains);
    } else {
      S = newState();
      H = { order: [], chains: [], stepEndAt: 0 };
    }
    toast("👑 Tu es maintenant l’hôte");
    hostAct({ k: "join", p: ME, n: L.name });
    bc();
    render();
  });
  R.onDemote(() => {
    isHost = false;
    toast("Un autre joueur est devenu l’hôte");
    render();
  });

  if (isHost) {
    const snap = R.initSnap;
    if (snap && snap.S) {
      S = snap.S;
      H = snap.H || { order: [], chains: [], stepEndAt: 0 };
      S.host = ME;
      if (S.ph === "play") S.prompts = buildPrompts(S.step);
      if (S.ph === "end") S.album = buildAlbum(H.chains);
    } else {
      S = newState();
      H = { order: [], chains: [], stepEndAt: 0 };
    }
    hostAct({ k: "join", p: ME, n: L.name });
    bc();
  } else {
    hello();
  }
  startLoops();
  render();
}

function hello() {
  if (!R || isHost) return;
  if (L.late && Date.now() < L.blockedUntil) return;
  if (!S || !S.pl.some((p) => p.id === ME)) {
    R.emit("act", { k: "join", p: ME, n: L.name }, "host").catch(() => {});
  }
}

function startLoops() {
  if (!L.hello) L.hello = setInterval(hello, 2500);
  if (!L.tick) {
    L.tick = setInterval(() => {
      hostTick();
      updateLive();
    }, 220);
  }
}

/* ---------------------------- Minuteur / live ---------------------------- */
function isLocked() {
  if (!S || S.ph !== "play") return true;
  return (S.submitted || []).includes(ME) || !!L.sent[S.step] || Net.now() > S.deadline + 500;
}

function timeUp() {
  return !!(S && S.ph === "play" && Net.now() > S.deadline + 400);
}

function statusText() {
  if (!S || S.ph !== "play") return "";
  const sent = (S.submitted || []).includes(ME) || !!L.sent[S.step];
  if (sent) {
    const waiting = S.pl.filter((p) => !(S.submitted || []).includes(p.id) && p.id !== ME);
    if (!waiting.length) return "✅ Tout le monde a rendu sa copie — on passe à la suite !";
    const names = waiting.slice(0, 2).map((p) => p.n).join(", ");
    const more = waiting.length > 2 ? ` et ${waiting.length - 2} autre${waiting.length - 2 > 1 ? "s" : ""}` : "";
    return `✅ Envoyé · en attente de ${names}${more}`;
  }
  if (timeUp()) return "⏱️ Temps écoulé — l’hôte passe à la suite.";
  const got = (S.submitted || []).length;
  return `✏️ À toi de jouer · ${got}/${S.n} copie${got > 1 ? "s" : ""} rendue${got > 1 ? "s" : ""}`;
}

function updateLive() {
  if (!S) return;
  if (S.ph === "play") {
    const rem = Math.max(0, S.deadline - Net.now());
    const clock = document.querySelector("#gp-clock");
    const bar = document.querySelector("#gp-timer");
    if (clock) {
      clock.textContent = Math.ceil(rem / 1000) + " s";
      clock.classList.toggle("urgent", rem <= 10000);
    }
    if (bar) bar.style.width = Math.max(0, (rem / (S.cfg.stepTime * 1000)) * 100) + "%";
    const st = document.querySelector('[data-live="gp-status"]');
    if (st) {
      st.textContent = statusText();
      st.classList.toggle("ok", (S.submitted || []).includes(ME) || !!L.sent[S.step]);
      st.classList.toggle("late", timeUp() && !isLockedSafely());
    }
    if (timeUp()) {
      // Au temps écoulé, on enregistre automatiquement la copie en cours
      // (dessin compris) au lieu de la remplacer par une image « temps écoulé ».
      autoSubmit();
      document.querySelectorAll("[data-time-lock]").forEach((el) => {
        el.disabled = true;
      });
    }
  }
}

/** Envoie la copie en cours quand le temps est écoulé. */
function autoSubmit() {
  if (!S || S.ph !== "play" || isLockedSafely()) return;
  if (L.autoStep === S.step) return;
  L.autoStep = S.step;
  const kind = stepKind(S.step);
  if (kind === "draw") {
    const url = exportDrawing();
    if (!url) return;
    L.sentShot[S.step] = url;
    L.sent[S.step] = true;
    send({ k: "sub", step: S.step, kind: "draw", value: url });
  } else {
    const el = document.querySelector("#gp-text");
    const raw = el ? el.value : L.draft[S.step];
    const value = String(raw || "").replace(/\s+/g, " ").trim().slice(0, TEXT_MAX);
    if (!value) return;
    L.sent[S.step] = true;
    send({ k: "sub", step: S.step, kind: "text", value });
  }
  render();
}
function isLockedSafely() {
  return (S.submitted || []).includes(ME) || !!L.sent[S.step];
}

/** Signature compacte : pas de reconstruction pendant une saisie. */
function stateSig() {
  if (!S) return "";
  const p = (S.prompts ? S.prompts[ME] : null) || L.prompt;
  return [
    S.ph,
    S.step,
    S.n,
    S.deadline,
    isLocked() ? 1 : 0,
    (S.pl || []).map((x) => x.id + ":" + x.n).join(","),
    p ? p.kind + ":" + String(p.value || "").length : "",
    (S.album || []).length,
    S.albumIndex,
    S.host || "",
  ].join("|");
}

/* -------------------------------- Rendu ---------------------------------- */
function setWho() {
  const el = document.querySelector("#who");
  if (!el) return;
  el.textContent = code ? `Salon ${code}${isHost ? " · hôte" : ""}` : "";
}

function render() {
  setWho();
  if (S) L.sig = stateSig();
  const root = app();
  if (!root) return;
  if (L.late && S && S.ph !== "lobby") return renderLate(root);
  if (!S) return renderWait(root);
  if (S.ph === "lobby") renderLobby(root);
  else if (S.ph === "play") renderPlay(root);
  else renderEnd(root);
}

function renderHome(root, message) {
  const c = bootParams().code;
  root.innerHTML = `
  <section class="gp-hero">
    <div class="gp-sun" aria-hidden="true"></div>
    <p class="gp-kicker">Le téléphone arabe du dessin</p>
    <h1>Garlic <em>Phone</em></h1>
    <p class="gp-lead">Une phrase devient un dessin. Le dessin devient une phrase.
      Et à la fin, plus personne ne sait qui a parlé de quoi.</p>
    <div class="gp-chain" aria-hidden="true">
      <span class="gp-chain-card">💬<small>Une phrase</small></span>
      <span class="gp-chain-arrow">→</span>
      <span class="gp-chain-card">🎨<small>Un dessin</small></span>
      <span class="gp-chain-arrow">→</span>
      <span class="gp-chain-card">💬<small>Une phrase</small></span>
      <span class="gp-chain-arrow">→</span>
      <span class="gp-chain-card">🤯<small>Le chaos</small></span>
    </div>
  </section>
  <section class="card gp-panel">
    <h2>Entre dans la chaîne</h2>
    <label class="gp-field">Ton pseudo
      <input id="pname" type="text" maxlength="16" autocomplete="nickname" placeholder="Ex. Gousse de génie">
    </label>
    <button class="btn primary big" data-a="create" type="button">✏️ Créer un salon</button>
    <div class="gp-or"><span>ou</span></div>
    <div class="gp-join">
      <input id="pcode" type="text" maxlength="4" inputmode="latin" placeholder="CODE" aria-label="Code du salon" value="${esc(c || "")}">
      <button class="btn" data-a="join" type="button">Rejoindre</button>
    </div>
    <p id="hmsg" class="hint" role="status">${esc(message || L.homeMsg || "")}</p>
  </section>
  <section class="gp-features">
    <div><b>2 à 8</b><span>Chacun lance une histoire, puis tout le monde dessine et décrit.</span></div>
    <div><b>1 à 3 min</b><span>Par étape. Tu peux dessiner au doigt, à la souris ou au stylet.</span></div>
    <div><b>Album final</b><span>Toutes les histoires, à feuilleter et à télécharger en image.</span></div>
  </section>`;
  Profile.attach("#pname");
}

function renderWait(root) {
  root.innerHTML = `<section class="card center gp-wait">
    <div class="gp-loader" aria-hidden="true">✏️</div>
    <h2>Connexion au salon ${esc(code || "")}</h2>
    <p class="hint">${esc(L.homeMsg || "On aiguise les crayons…")}</p>
  </section>`;
}

function renderLate(root) {
  root.innerHTML = `<section class="card center gp-late">
    <div class="big-emoji">⏳</div>
    <h2>La partie a déjà commencé</h2>
    <p class="hint">L’album est en cours d’écriture. Reste sur cette page : ta place dans
      le salon ${esc(code)} sera reprise dès que l’hôte relance une partie.</p>
    <button class="btn" data-a="rejoin" type="button">Réessayer maintenant</button>
  </section>`;
}

function renderLobby(root) {
  const n = S.pl.length;
  const host = isHost;
  const timeBtn = (v) =>
    `<button class="pill ${S.cfg.stepTime === v ? "on" : ""}" data-a="cfg" data-v="${v}" type="button" ${
      host ? "" : "disabled"
    }>${v / 60} min</button>`;
  root.innerHTML = `
  <section class="card gp-code-card">
    <p class="gp-kicker">Salon de la soirée</p>
    <div class="gp-code">${esc(code)}</div>
    <p class="hint">Partage ce code : chacun le saisit sur <b>/garlicphone</b>.</p>
    <div id="gp-share"></div>
  </section>
  <section class="card">
    <h2>Joueurs <span class="hint inline">${n}/${MAX}</span></h2>
    <div class="chips gp-players">${S.pl
      .map(
        (p) =>
          `<span class="chip ${p.id === S.host ? "host" : ""} ${p.id === ME ? "me" : ""}">✏️ ${esc(p.n)}</span>`,
      )
      .join("") || '<span class="hint">Personne pour l’instant.</span>'}</div>
    <p class="hint">${n < MIN ? "Il faut au moins " + MIN + " joueurs pour lancer." : "Tout le monde a son crayon ?"}</p>
    <div class="gp-settings">
      <div class="gp-setting">
        <span>Temps par étape</span>
        <div class="pills">${[60, 120, 180].map(timeBtn).join("")}</div>
      </div>
    </div>
    ${
      host
        ? `<button class="btn primary big" data-a="start" type="button" ${n < MIN ? "disabled" : ""}>▶ Lancer les histoires</button>`
        : `<p class="gp-wait-host">✏️ L’hôte choisit le rythme et lance la partie.</p>`
    }
  </section>
  <section class="card gp-rules">
    <h2>Comment on joue ?</h2>
    <ol>
      <li>Chacun écrit une phrase absurde pour lancer son histoire.</li>
      <li>Les histoires tournent : le voisin dessine la phrase.</li>
      <li>Le suivant décrit le dessin avec une nouvelle phrase.</li>
      <li>On alterne jusqu’au bout, puis on découvre la catastrophe finale.</li>
    </ol>
  </section>`;
  Share.mount("#gp-share", {
    code,
    url: location.origin + "/garlicphone/index.html?c=" + code,
    title: "Garlic Phone",
    text: "Rejoins mes histoires ! Code : " + code,
  });
}

function renderPlay(root) {
  const step = S.step;
  const drawStep = stepKind(step) === "draw";
  const prompt = (S.prompts ? S.prompts[ME] : null) || L.prompt;
  if (prompt) L.prompt = prompt;
  const locked = isLocked();
  const total = S.n || 1;
  const dots = Array.from({ length: Math.min(total, 12) }, (_, i) => {
    const cls = i < step ? "done" : i === step ? "now" : "";
    return `<i class="${cls}"></i>`;
  }).join("");

  let promptHtml = "";
  if (step === 0) {
    promptHtml = `<div class="gp-prompt gp-prompt-intro">
      <span class="gp-prompt-label">À toi de lancer l’histoire</span>
      <p>Écris une phrase absurde, précise ou impossible. Les autres devront la dessiner.</p>
    </div>`;
  } else if (prompt && prompt.kind === "text") {
    promptHtml = `<div class="gp-prompt">
      <span class="gp-prompt-label">La phrase à dessiner</span>
      <blockquote class="gp-bubble">"${esc(prompt.value)}"</blockquote>
    </div>`;
  } else if (prompt && prompt.kind === "draw") {
    promptHtml = `<div class="gp-prompt">
      <span class="gp-prompt-label">Le dessin à décrire</span>
      <img class="gp-prompt-img" src="${escAttr(prompt.value)}" alt="Dessin à décrire">
    </div>`;
  } else {
    promptHtml = `<div class="gp-prompt"><span class="gp-prompt-label">Improvise !</span>
      <p>Le prompt précédent s’est perdu dans le salon. Fais confiance à ton instinct.</p></div>`;
  }

  let action = "";
  if (locked) {
    const shot = drawStep ? L.sentShot[S.step] : "";
    action = `<div class="gp-sent">
      <div class="gp-stamp">✓</div>
      <h2>${drawStep ? (timeUp() ? "Temps écoulé" : "Dessin rendu !") : "Copie rendue !"}</h2>
      ${shot ? `<img class="gp-sent-shot" src="${escAttr(shot)}" alt="Ton dessin envoyé">` : ""}
      <p class="hint">${timeUp() ? "Ton dessin reste affiché et rejoint l’histoire. L’hôte passe à la suite." : "On attend les retardataires, puis l’histoire continue."}</p>
    </div>`;
  } else if (drawStep) {
    const colors = COLORS.map(
      ([c, label]) =>
        `<button class="gp-color ${L.draw?.color === c && !L.draw?.eraser ? "on" : ""}" data-a="color" data-v="${c}" type="button" style="--c:${c}" aria-label="${label}" title="${label}"></button>`,
    ).join("");
    const sizes = BRUSH_SIZES.map(
      (z) =>
        `<button class="gp-size ${L.draw?.size === z && !L.draw?.eraser ? "on" : ""}" data-a="size" data-v="${z}" type="button" aria-label="Trait ${z}px" title="Trait ${z}px"><i style="width:${Math.min(z + 4, 28)}px;height:${Math.min(z + 4, 28)}px"></i></button>`,
    ).join("");
    const tool = (a, label, icon, on) =>
      `<button class="gp-tool ${on ? "on" : ""}" data-a="${a}" type="button" title="${label}"><span aria-hidden="true">${icon}</span><small>${label}</small></button>`;
    action = `<div class="gp-draw">
      <div class="gp-canvas-wrap">
        <canvas id="gp-canvas" width="${CANVAS_W}" height="${CANVAS_H}" aria-label="Zone de dessin"></canvas>
        <span class="gp-canvas-hint" aria-hidden="true">dessine ici</span>
      </div>
      <div class="gp-tools">
        <div class="gp-colors">${colors}</div>
        <div class="gp-sizebar"><span class="gp-tool-label">Trait</span><div class="gp-sizes">${sizes}</div></div>
        <div class="gp-toolgroup">
          ${tool("brush", "Crayon", "✏️", !L.draw?.eraser && !L.draw?.fill)}
          ${tool("eraser", "Gomme", "🧽", L.draw?.eraser)}
          ${tool("fill", "Remplir", "🪣", L.draw?.fill)}
          ${tool("undo", "Annuler", "↶", false)}
          ${tool("redo", "Refaire", "↷", false)}
          ${tool("clear", "Effacer", "🗑️", false)}
        </div>
      </div>
      <button class="btn primary big" data-a="send-draw" data-time-lock type="button">🖍️ Envoyer mon dessin</button>
    </div>`;
  } else {
    const draft = L.draft[step] || "";
    const chips =
      step === 0
        ? `<div class="gp-suggest">${L.suggestions
            .map((s) => `<button type="button" data-a="suggest" data-v="${esc(s)}">${esc(s)}</button>`)
            .join("")}</div>`
        : "";
    action = `<form class="gp-write" data-form="gp-text">
      <textarea id="gp-text" maxlength="${TEXT_MAX}" placeholder="${
        step === 0 ? "Ex. Un chat qui pilote un avion de chasse…" : "Décris ce dessin, même mal…"
      }" data-time-lock>${esc(draft)}</textarea>
      <div class="gp-write-foot">
        <span id="gp-count">${draft.length}/${TEXT_MAX}</span>
        <button class="btn primary" type="submit" data-time-lock>${
          step === 0 ? "💬 Lancer l’histoire" : "💬 Envoyer ma phrase"
        }</button>
      </div>
    </form>${chips}`;
  }

  root.innerHTML = `
  <section class="gp-play">
    <div class="gp-hud">
      <span class="gp-badge">Étape ${step + 1}/${total}</span>
      <span class="gp-type">${drawStep ? "🎨 Dessin" : "💬 Phrase"}</span>
      <span class="gp-clock" id="gp-clock">${Math.max(0, Math.ceil((S.deadline - Net.now()) / 1000))} s</span>
    </div>
    <div class="gp-timer"><i id="gp-timer"></i></div>
    <div class="gp-stepdots">${dots}</div>
    <div class="gp-stage">
      ${promptHtml}
      ${action}
    </div>
    <div class="gp-status ${locked ? "ok" : ""}" data-live="gp-status" role="status">${statusText()}</div>
  </section>`;
  if (drawStep && !locked) setupCanvas();
  else if (!drawStep && !locked) setTimeout(() => document.querySelector("#gp-text")?.focus(), 40);
}

/* ------------------------------- Dessin ---------------------------------- */
function setupCanvas() {
  const canvas = document.querySelector("#gp-canvas");
  if (!canvas) return;
  const key = S.step + ":" + S.startedAt;
  if (L.draw && L.draw.key === key && L.draw.canvas === canvas) {
    drawAll();
    return;
  }
  const d = {
    canvas,
    ctx: canvas.getContext("2d"),
    strokes: [],
    redo: [],
    current: null,
    color: L.draw?.color || COLORS[0][0],
    size: L.draw?.size || BRUSH_SIZES[2],
    eraser: !!L.draw?.eraser,
    fill: !!L.draw?.fill,
    key,
  };
  L.draw = d;
  d.ctx.lineCap = "round";
  d.ctx.lineJoin = "round";
  drawAll();

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / Math.max(1, r.width)) * CANVAS_W,
      ((e.clientY - r.top) / Math.max(1, r.height)) * CANVAS_H,
    ];
  };
  const down = (e) => {
    if (isLocked() || !S || S.ph !== "play") return;
    e.preventDefault();
    canvas.parentElement?.querySelector(".gp-canvas-hint")?.classList.add("hide");
    const [x, y] = pos(e);
    if (d.fill) {
      floodFill(d.ctx, x, y, d.color);
      d.strokes.push({ kind: "fill", x, y, color: d.color });
      d.redo = [];
      return;
    }
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    d.current = {
      color: d.eraser ? "#fffdf6" : d.color,
      size: d.eraser ? 30 : d.size,
      points: [[x, y]],
    };
    d.ctx.strokeStyle = d.current.color;
    d.ctx.fillStyle = d.current.color;
    d.ctx.beginPath();
    d.ctx.arc(x, y, d.current.size / 2, 0, Math.PI * 2);
    d.ctx.fill();
  };
  const move = (e) => {
    if (!d.current) return;
    e.preventDefault();
    const [x, y] = pos(e);
    const pts = d.current.points;
    const [px, py] = pts[pts.length - 1];
    d.ctx.strokeStyle = d.current.color;
    d.ctx.lineWidth = d.current.size;
    d.ctx.beginPath();
    d.ctx.moveTo(px, py);
    d.ctx.lineTo(x, y);
    d.ctx.stroke();
    pts.push([x, y]);
  };
  const up = () => {
    if (!d.current) return;
    d.strokes.push(d.current);
    d.redo = [];
    d.current = null;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", (e) => {
    if (d.current && e.buttons === 0) up();
  });
}

function drawAll() {
  const d = L.draw;
  if (!d) return;
  const g = d.ctx;
  if (d.strokes.length) {
    d.canvas.parentElement?.querySelector(".gp-canvas-hint")?.classList.add("hide");
  }
  g.save();
  g.fillStyle = "#fffdf6";
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const s of d.strokes) {
    if (s.kind === "clear") {
      g.fillStyle = "#fffdf6";
      g.fillRect(0, 0, CANVAS_W, CANVAS_H);
      continue;
    }
    if (s.kind === "fill") {
      floodFill(g, s.x, s.y, s.color);
      continue;
    }
    if (!s.points || !s.points.length) continue;
    if (s.points.length === 1) {
      g.fillStyle = s.color;
      g.beginPath();
      g.arc(s.points[0][0], s.points[0][1], s.size / 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.strokeStyle = s.color;
    g.lineWidth = s.size;
    g.beginPath();
    g.moveTo(s.points[0][0], s.points[0][1]);
    for (let i = 1; i < s.points.length; i++) g.lineTo(s.points[i][0], s.points[i][1]);
    g.stroke();
  }
  g.restore();
}

function refreshTools() {
  const d = L.draw;
  if (!d) return;
  const plain = !d.eraser && !d.fill;
  document.querySelectorAll(".gp-color").forEach((b) => {
    b.classList.toggle("on", plain && b.dataset.v === d.color);
  });
  document.querySelectorAll(".gp-size").forEach((b) => {
    b.classList.toggle("on", plain && +b.dataset.v === d.size);
  });
  document.querySelector('[data-a="eraser"]')?.classList.toggle("on", d.eraser);
  document.querySelector('[data-a="fill"]')?.classList.toggle("on", d.fill);
}

/* Remplissage type pot de peinture (scanline). Les actions sont rejouées par
   drawAll(), donc le remplissage reste annulable comme un trait. */
function hexRgb(hex) {
  const v = String(hex || "").replace("#", "");
  const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  const num = parseInt(n, 16);
  return Number.isFinite(num) ? [(num >> 16) & 255, (num >> 8) & 255, num & 255] : [0, 0, 0];
}
function floodFill(g, x, y, color) {
  const w = g.canvas.width;
  const h = g.canvas.height;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const img = g.getImageData(0, 0, w, h);
  const data = img.data;
  const start = (y * w + x) * 4;
  const tr = data[start], tg = data[start + 1], tb = data[start + 2], ta = data[start + 3];
  const [fr, fg, fb] = hexRgb(color);
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;
  const tol = 34;
  const match = (i) =>
    Math.abs(data[i] - tr) <= tol &&
    Math.abs(data[i + 1] - tg) <= tol &&
    Math.abs(data[i + 2] - tb) <= tol &&
    Math.abs(data[i + 3] - ta) <= tol;
  const paint = (i) => {
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = 255;
  };
  const stack = [[x, y]];
  while (stack.length) {
    let [cx, cy] = stack.pop();
    let i = (cy * w + cx) * 4;
    while (cx >= 0 && match(i)) {
      cx--;
      i -= 4;
    }
    cx++;
    i += 4;
    let up = false, down = false;
    while (cx < w && match(i)) {
      paint(i);
      if (cy > 0) {
        const u = i - w * 4;
        if (match(u)) {
          if (!up) { stack.push([cx, cy - 1]); up = true; }
        } else up = false;
      }
      if (cy < h - 1) {
        const dn = i + w * 4;
        if (match(dn)) {
          if (!down) { stack.push([cx, cy + 1]); down = true; }
        } else down = false;
      }
      cx++;
      i += 4;
    }
  }
  g.putImageData(img, 0, 0);
}

function exportDrawing() {
  const canvas = document.querySelector("#gp-canvas");
  if (!canvas) return "";
  let url = canvas.toDataURL("image/webp", 0.5);
  if (url.length > 60000) url = canvas.toDataURL("image/webp", 0.34);
  if (url.length > 110000) {
    const c2 = document.createElement("canvas");
    c2.width = 480;
    c2.height = 300;
    const g2 = c2.getContext("2d");
    g2.fillStyle = "#fffdf6";
    g2.fillRect(0, 0, c2.width, c2.height);
    g2.drawImage(canvas, 0, 0, c2.width, c2.height);
    url = c2.toDataURL("image/webp", 0.4);
  }
  if (url.length > 145000) return "";
  return url;
}

/* -------------------------------- Album ---------------------------------- */
function downloadCurrent() {
  const idx = Math.max(0, Math.min((S?.album || []).length - 1, L.albumView));
  const chain = S && S.album ? S.album[idx] : null;
  if (!chain) return;
  renderAlbumImage(chain)
    .then((blob) => {
      if (!blob) return toast("Impossible de générer l’image.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "garlic-phone-histoire-" + (idx + 1) + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("📥 Histoire téléchargée !");
    })
    .catch(() => toast("Téléchargement impossible."));
}

async function renderAlbumImage(chain) {
  const W = 900;
  const pad = 44;
  const textH = 108;
  const drawH = 300;
  const headH = 150;
  let height = headH + 50;
  for (const e of chain.entries) height += e.kind === "draw" ? drawH + 46 : textH + 34;
  height += 50;
  height = Math.min(16000, height);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = height;
  const g = c.getContext("2d");
  g.fillStyle = "#f7f0dc";
  g.fillRect(0, 0, W, c.height);
  g.strokeStyle = "rgba(42,33,24,.08)";
  g.lineWidth = 1;
  for (let y = 40; y < c.height; y += 34) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.fillStyle = "#7b4bb7";
  g.font = '800 52px "Bricolage Grotesque", system-ui, sans-serif';
  g.fillText("Garlic Phone", pad, 78);
  g.fillStyle = "#2a2118";
  g.font = "800 26px system-ui, sans-serif";
  g.fillText("Histoire n°" + (chain.i + 1) + " — lancée par " + nameOf(chain.owner), pad, 118);
  g.strokeStyle = "#2a2118";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(pad, 136);
  g.lineTo(W - pad, 136);
  g.stroke();

  let y = headH + 22;
  for (let i = 0; i < chain.entries.length; i++) {
    const e = chain.entries[i];
    g.fillStyle = "#6b5e4c";
    g.font = "700 20px system-ui, sans-serif";
    g.fillText(`${i + 1}. ${e.kind === "draw" ? "🎨" : "💬"} ${nameOf(e.by)}${e.timeout ? " (temps écoulé)" : ""}`, pad, y);
    y += 18;
    if (e.kind === "draw") {
      const im = await loadImg(e.value);
      const iw = W - pad * 2;
      const ih = 250;
      g.fillStyle = "#fffdf6";
      g.strokeStyle = "#2a2118";
      g.lineWidth = 3;
      roundRect(g, pad, y, iw, ih, 14);
      g.fill();
      g.stroke();
      if (im) {
        const scale = Math.min((iw - 16) / im.width, (ih - 16) / im.height);
        const dw = im.width * scale;
        const dh = im.height * scale;
        g.drawImage(im, pad + (iw - dw) / 2, y + (ih - dh) / 2, dw, dh);
      }
      y += ih + 22;
    } else {
      const text = String(e.value || "");
      g.fillStyle = "#fffdf6";
      g.strokeStyle = "#2a2118";
      g.lineWidth = 2.5;
      const lines = wrapText(g, "“" + text + "”", W - pad * 2 - 32, "700 23px system-ui, sans-serif");
      const bh = Math.max(textH, 24 + lines.length * 31);
      roundRect(g, pad, y, W - pad * 2, bh, 16);
      g.fill();
      g.stroke();
      g.fillStyle = "#2a2118";
      g.font = "700 23px system-ui, sans-serif";
      lines.forEach((line, li) => g.fillText(line, pad + 16, y + 34 + li * 31));
      y += bh + 22;
    }
  }
  g.fillStyle = "#8c7a63";
  g.font = "600 16px system-ui, sans-serif";
  g.fillText("Généré sur le Hub de soirée — garlicphone", pad, c.height - 24);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrapText(g, text, maxW, font) {
  g.font = font;
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImg(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function renderEnd(root) {
  const album = S.album || [];
  const n = album.length;
  let idx = Math.max(0, Math.min(n - 1, L.albumView));
  L.albumView = idx;
  const chain = album[idx];
  let body = "";
  if (!chain) {
    body = `<div class="card center"><p class="hint">Aucune histoire à afficher.</p></div>`;
  } else {
    const entries = chain.entries
      .map((e, i) => {
        const by = esc(nameOf(e.by));
        if (e.kind === "draw") {
          return `<div class="gp-entry gp-entry-draw" style="--i:${i}">
            <span class="gp-entry-by">🎨 ${by}${e.timeout ? " · ⏱️" : ""}</span>
            <img class="gp-entry-img" src="${escAttr(e.value)}" alt="Dessin de ${by}" loading="lazy">
          </div>`;
        }
        return `<div class="gp-entry gp-entry-text" style="--i:${i}">
          <span class="gp-entry-by">💬 ${by}${e.timeout ? " · ⏱️" : ""}</span>
          <p class="gp-entry-bubble">“${esc(e.value)}”</p>
        </div>`;
      })
      .join("");
    body = `<div class="gp-album">
      <div class="gp-chain-head">
        <span class="gp-chain-num">Histoire ${idx + 1}/${n}</span>
        <span class="gp-chain-owner">lancée par <b>${esc(nameOf(chain.owner))}</b></span>
      </div>
      <div class="gp-chain">${entries}</div>
      <div class="gp-album-nav">
        <button class="btn" data-a="album-prev" type="button" ${n <= 1 ? "disabled" : ""}>← Précédente</button>
        <div class="gp-album-dots">${album
          .map((_, i) => `<button data-a="album-go" data-v="${i}" type="button" class="${i === idx ? "on" : ""}" aria-label="Histoire ${i + 1}"></button>`)
          .join("")}</div>
        <button class="btn" data-a="album-next" type="button" ${n <= 1 ? "disabled" : ""}>Suivante →</button>
      </div>
      <div class="gp-album-actions">
        <button class="btn" data-a="download" type="button">📥 Télécharger cette histoire</button>
        ${n > 1 ? `<button class="btn" data-a="download-all" type="button">📚 Toutes les histoires</button>` : ""}
      </div>
      ${isHost ? `<p class="hint center">Tu peux feuilleter : tout le monde suit. Chacun peut aussi télécharger l’histoire affichée.</p>` : `<p class="hint center">Feuillette librement l’album, puis télécharge les histoires qui te plaisent.</p>`}
    </div>`;
  }
  root.innerHTML = `
  <section class="gp-end">
    <p class="gp-kicker">Fin de la chaîne</p>
    <h1>L’album des catastrophes</h1>
    <p class="gp-lead">${n} histoire${n > 1 ? "s" : ""} ont traversé le salon. Admire le résultat.</p>
    ${body}
    ${isHost ? `<button class="btn primary big" data-a="replay" type="button">🔁 Rejouer avec le même salon</button>` : `<p class="gp-wait-host">L’hôte peut relancer une partie.</p>`}
  </section>
  <div id="gp-endcard"></div>`;
  const el = document.querySelector("#gp-endcard");
  if (el) Party.endCard(el, { code, R, isHost, onLeave: () => Sess.clear(GAME) });
}

/* ------------------------------ Interactions ----------------------------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b || !document.querySelector("#app")?.contains(b)) return;
  const a = b.dataset.a;

  if (a === "create") startOnline(true, null);
  else if (a === "join") {
    const c = (document.querySelector("#pcode")?.value || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(c)) return msg("Le code du salon fait 4 caractères.");
    startOnline(false, c, { retry: 3 });
  } else if (a === "start") send({ k: "start" });
  else if (a === "cfg") send({ k: "cfg", v: b.dataset.v });
  else if (a === "skip") {
    if (isHost && confirm("Passer cette étape ? Les copies manquantes seront remplacées.")) send({ k: "skip" });
  } else if (a === "replay") send({ k: "replay" });
  else if (a === "rejoin") {
    L.blockedUntil = 0;
    L.late = false;
    hello();
    render();
  } else if (a === "suggest") {
    const inp = document.querySelector("#gp-text");
    if (inp) {
      inp.value = b.dataset.v || "";
      L.draft[S.step] = inp.value;
      inp.focus();
    }
  } else if (a === "color") {
    if (!L.draw) return;
    L.draw.color = b.dataset.v;
    L.draw.eraser = false;
    L.draw.fill = false;
    refreshTools();
  } else if (a === "size") {
    if (!L.draw) return;
    L.draw.size = +b.dataset.v;
    L.draw.eraser = false;
    L.draw.fill = false;
    refreshTools();
  } else if (a === "brush") {
    if (!L.draw) return;
    L.draw.eraser = false;
    L.draw.fill = false;
    refreshTools();
  } else if (a === "eraser") {
    if (!L.draw) return;
    L.draw.eraser = !L.draw.eraser;
    if (L.draw.eraser) L.draw.fill = false;
    refreshTools();
  } else if (a === "fill") {
    if (!L.draw) return;
    L.draw.fill = !L.draw.fill;
    if (L.draw.fill) L.draw.eraser = false;
    refreshTools();
  } else if (a === "undo") {
    if (!L.draw) return;
    const last = L.draw.strokes.pop();
    if (last) L.draw.redo.push(last);
    drawAll();
  } else if (a === "redo") {
    if (!L.draw) return;
    const last = L.draw.redo.pop();
    if (last) L.draw.strokes.push(last);
    drawAll();
  } else if (a === "clear") {
    if (!L.draw) return;
    L.draw.strokes.push({ kind: "clear" });
    L.draw.redo = [];
    drawAll();
  } else if (a === "send-draw") {
    if (isLocked() || !S || S.ph !== "play") return;
    const url = exportDrawing();
    if (!url) return toast("Dessin trop lourd : efface quelques traits et réessaie.");
    L.sentShot[S.step] = url;
    L.sent[S.step] = true;
    send({ k: "sub", step: S.step, kind: "draw", value: url });
    render();
  } else if (a === "album-prev") {
    if (isHost) send({ k: "album", dir: -1 });
    else {
      L.albumView = (L.albumView - 1 + (S.album.length || 1)) % (S.album.length || 1);
      render();
    }
  } else if (a === "album-next") {
    if (isHost) send({ k: "album", dir: 1 });
    else {
      L.albumView = (L.albumView + 1) % (S.album.length || 1);
      render();
    }
  } else if (a === "album-go") {
    const i = +b.dataset.v;
    if (isHost) send({ k: "album", dir: i - (S.albumIndex || 0) });
    else {
      L.albumView = i;
      render();
    }
  } else if (a === "download") {
    if (isHost && S.album && S.album[L.albumView]) S.albumIndex = L.albumView;
    downloadCurrent();
  } else if (a === "download-all") {
    downloadAll();
  }
});

document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-form='gp-text']");
  if (!f) return;
  e.preventDefault();
  if (!S || S.ph !== "play" || isLocked()) return;
  const v = (document.querySelector("#gp-text")?.value || "").replace(/\s+/g, " ").trim();
  if (!v) return toast("Écris au moins quelques mots.");
  L.sent[S.step] = true;
  delete L.draft[S.step];
  send({ k: "sub", step: S.step, kind: "text", value: v.slice(0, TEXT_MAX) });
  render();
});

document.addEventListener("input", (e) => {
  if (e.target?.id === "gp-text" && S) {
    L.draft[S.step] = e.target.value;
    const c = document.querySelector("#gp-count");
    if (c) c.textContent = e.target.value.length + "/" + TEXT_MAX;
  }
});

async function downloadAll() {
  if (!S || !S.album) return;
  toast("📚 Préparation de l’album…");
  for (let i = 0; i < S.album.length; i++) {
    const blob = await renderAlbumImage(S.album[i]);
    if (!blob) continue;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "garlic-phone-histoire-" + (i + 1) + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 6000);
    await sleep(350);
  }
  toast("📚 Toutes les histoires sont téléchargées !");
}

/* -------------------------------- Démarrage ------------------------------ */
(function boot() {
  L.suggestions = shuffle(SUGGESTIONS).slice(0, 3);
  const BP = bootParams();
  const saved = Sess.load(GAME, 12 * 3600e3);
  const pr = Profile.get();
  const root = app();
  if (BP.go && BP.code && pr.name) {
    const n0 = Profile.tag(pr.name);
    renderHome(root, "🚀 Lancement de la partie…");
    if (BP.host) startOnline(true, null, { name: n0, code: BP.code, retry: 5 });
    else startOnline(false, BP.code, { name: n0, retry: 20 });
  } else if (saved && (!BP.code || BP.code === saved.code)) {
    renderHome(root, "🔄 Retour dans le salon " + saved.code + "…");
    startOnline(false, saved.code, { name: saved.name, resume: true, wasHost: saved.host });
  } else if (BP.code && pr.name) {
    renderHome(root, "Connexion au salon " + BP.code + "…");
    startOnline(false, BP.code, { name: Profile.tag(pr.name), retry: 3 });
  } else {
    renderHome(root, "");
  }
})();
