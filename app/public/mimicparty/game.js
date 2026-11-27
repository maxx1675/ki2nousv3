/* MIMIC PARTY — « on écoute, on imite, on note ».
 *
 * L'hôte est autoritaire (même modèle que Make It Meme / Garlic Phone) :
 * il diffuse l'état `st` (petit : métadonnées, phases, chronos), reçoit les
 * actions `act` et les imitations `submit`, puis renvoie les extraits audio
 * `clips` à tout le monde au moment de la lecture. Le relais Hono ne fait que
 * transmettre : aucune règle de jeu n'est déplacée côté serveur.
 *
 * Le son officiel n'est jamais transféré : chaque appareil charge le même
 * extrait depuis `sounds/v2/`. Seuls les mèmes importés et les imitations voyagent.
 *
 * v2 : notation MFCC/DTW (score.js), verdict + conseil après chaque note, bonus « quasi
 * parfait », vote « coup de cœur » du public (3 joueurs et plus), récap de fin de partie
 * avec awards, écoute « original puis imitation », sélection d'enregistrements à garder
 * (WAV, ZIP, best-of, partage), filtre « paroles et chants ».
 */
(function () {
  "use strict";

  var MAX_PLAYERS = 8;
  var LS = { sess: "mp", custom: "mp:custom" };
  var AVATAR = "🙂";

  var WHEEL = [
    { k: "mega", emoji: "🎁", label: "+15 PTS", bonus: 15 },
    { k: "plus10", emoji: "✨", label: "+10 PTS", bonus: 10 },
    { k: "x15", emoji: "🚀", label: "×1,5", bonus: 0 },
    { k: "steal", emoji: "🥷", label: "VOLE 5", bonus: 5 },
    { k: "plus5", emoji: "🍀", label: "+5 PTS", bonus: 5 }
  ];
  var PARTS = [
    { k: "timbre", label: "Sons" }, { k: "pitch", label: "Mélodie" },
    { k: "rhythm", label: "Rythme" }, { k: "energy", label: "Intensité" },
    { k: "pauses", label: "Pauses" }, { k: "duration", label: "Tempo" }
  ];
  var PERFECT = 90, PERFECT_BONUS = 5, FAV_BONUS = 8, MIN_VOTERS = 3;

  var R = null, S = null, isHost = false, code = "";
  var custom = [];          // bibliothèque locale de l'hôte (IndexedDB)
  var sharedCustom = [];    // mèmes partagés reçus (session)
  var BUFS = new Map();     // id de mème -> AudioBuffer
  var L = {
    name: "", av: AVATAR, entering: false, sig: "", rid: "", sub: "", autoTried: false,
    hello: null, hl: null, sessT: null, live: false, micErr: "", micBusy: false,
    attempt: null, attemptDone: false, submitted: false, myClip: null, analyzing: false,
    subs: {}, clipBufs: {}, sched: {}, origFeat: null, origRid: "", wave: null, waveRid: "",
    revealDone: {}, wheelShown: false, lastTick: 0, audioRid: "", modalOpen: false,
    vol: 80, clipPending: {}, clipAsk: 0, starting: false,
    ph: "", audioState: "", audioLoading: "", qrUrl: "",
    recap: [], fav: {}, vote: "", voteRid: "", sndOk: 0, sndPreloaded: false, busy: ""
  };
  var IMP = null; // état de la modale d'import

  function $id(id) { var e = document.getElementById(id); return e; }
  function app() { return $id("app"); }
  function now() { return Net.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pct(v) { return Math.round(clamp(v, 0, 1) * 100) + "%"; }
  function nameOf(id) { var p = S && S.pl.find(function (x) { return x.id === id; }); return p ? p.n : "Joueur"; }
  function avOf(id) { var p = S && S.pl.find(function (x) { return x.id === id; }); return (p && p.av) || AVATAR; }
  function catLabel(id) { return MimicBank.cat(id).label; }
  function diffLabel(d) { return d >= 3 ? "★★★" : d === 2 ? "★★☆" : "★☆☆"; }
  function volGain() { return clamp(L.vol == null ? 80 : L.vol, 0, 100) / 100; }
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function noteTone(score) { return score >= 85 ? "lime" : score >= 60 ? "amber" : "pink"; }

  /* ============================================================
     CONNEXION
     ============================================================ */
  async function startOnline(create, joinCode, o) {
    if (L.entering) return;
    L.entering = true;
    o = o || {};
    try {
      var input = $id("mp-name");
      var name = o.name || (input ? input.value.trim() : "") || Profile.get().name || "";
      if (!name) name = "Joueur " + Math.floor(10 + Math.random() * 89);
      L.name = name.slice(0, 16);
      L.av = Profile.get().emoji || AVATAR;
      try { Profile.set({ name: L.name }); } catch (e) {}
      var c = create ? (o.code || mkCode()) : joinCode;
      showWait(create ? "Création du salon…" : "Connexion au salon " + c + "…");
      var res;
      try {
        res = await Net.enter({
          game: "mp",
          room: function (cd) { return "mp-" + cd; },
          create: !!create,
          code: c,
          joinCode: c,
          resume: !!o.resume,
          wasHost: !!o.wasHost,
          retry: o.retry == null ? (create ? 0 : 25) : o.retry,
          onMsg: msg
        });
      } catch (e) {
        renderHome();
        msg(e.message || "Connexion impossible");
        return;
      }
      if (!res) { renderHome(); return; }
      R = res.R; code = res.code; isHost = R.host;
      if (!isHost && !R.hostCid) {
        try { R.leave(); } catch (e) {}
        R = null; code = "";
        Sess.clear("mp");
        renderHome();
        msg("La partie n’existe plus. Crée un nouveau salon.");
        return;
      }
      Sess.save("mp", { code: code, name: L.name, host: isHost });
      if (L.sessT) clearInterval(L.sessT);
      L.sessT = setInterval(function () { Sess.touch("mp"); }, 20000);
      Party.listen(R, code, function () { Sess.clear("mp"); });
      bindNet();
      if (isHost) {
        if (L.hello) { clearInterval(L.hello); L.hello = null; }
        var snap = R.initSnap;
        S = snap && snap.S ? snap.S : newState();
        S.host = ME;
        addSelf();
        loadCustom().then(function () { render(); });
        startHostLoop();
        broadcast(true);
        render();
      } else {
        S = R.initSnap && R.initSnap.S ? R.initSnap.S : null;
        startHello();
        render();
      }
    } finally {
      L.entering = false;
    }
  }

  function bindNet() {
    R.on("st", function (d) {
      if (isHost || !d) return;
      S = d;
      render();
    });
    R.on("act", function (d) { if (isHost) act(d); });
    R.on("meme", function (d) { if (!d) return; onMemeShared(d); });
    R.on("clips", function (d) { if (!isHost) receiveClips(d); });
    R.on("full", function () {
      L.full = true;
      if (L.hello) { clearInterval(L.hello); L.hello = null; }
      toast("Salon complet (8 joueurs max)");
    });
    R.on("kicked", function () {
      toast("L’hôte t’a retiré du salon.");
      setTimeout(function () { location.href = Party.salon(code); }, 1100);
    });
    R.onPromote(function (snap) { onPromoted(snap); });
    R.onDemote(function () {
      isHost = false;
      stopHostLoop();
      startHello();
      toast("Un autre joueur est devenu l’hôte");
      render();
    });
    R.onPeers(function () { if (isHost) prunePeers(); });
  }

  function startHello() {
    if (L.hello) return;
    var hello = function (force) {
      if (!R || isHost || L.full) return;
      if (force || !S || !S.pl.some(function (p) { return p.id === ME; })) {
        R.emit("act", { k: "join", p: ME, n: L.name, av: L.av }, "host").catch(function () {});
      }
      if (!S) R.emit("act", { k: "sync", p: ME }, "host").catch(function () {});
      /* un mème importé peut manquer après un rechargement en pleine manche */
      if (S && S.round && S.round.meme && S.round.meme.custom && !findCustom(S.round.meme.id)) {
        R.emit("act", { k: "needMeme", p: ME, id: S.round.meme.id }, "host").catch(function () {});
      }
    };
    hello(true);
    L.hello = setInterval(hello, 3000);
  }

  function onPromoted(snap) {
    isHost = true;
    if (L.hello) { clearInterval(L.hello); L.hello = null; }
    if (snap && snap.S) S = snap.S;
    if (!S) S = newState();
    S.host = ME;
    addSelf();
    loadCustom().then(function () { render(); });
    try { MimicAudio.preload(MimicBank.OFFICIAL); } catch (e) {}
    startHostLoop();
    Sess.save("mp", { code: code, name: L.name, host: true });
    toast("👑 Tu es maintenant l’hôte");
    broadcast(true);
    render();
  }

  function prunePeers() {
    if (!isHost || !S || !R || S.ph !== "lobby") return;
    var peers = R.peers(), t = Date.now(), before = S.pl.length;
    S.pl.forEach(function (p) {
      if (p.id === ME) return;
      if (peers.has(p.id)) p.seen = t;
      else if (!p.seen) p.seen = t;
    });
    S.pl = S.pl.filter(function (p) { return p.id === ME || !p.seen || t - p.seen < 30000; });
    if (S.pl.length !== before) { broadcast(false); render(); }
  }

  /* ============================================================
     ÉTAT DE L'HÔTE
     ============================================================ */
  function newState() {
    return {
      host: ME, ph: "lobby", ver: 2, sid: "mp-" + code + "-" + Date.now().toString(36),
      cfg: { src: "mix", cats: [], rounds: 3, listens: 2, imit: 8, diff: 0, kind: 1 },
      pl: [], r: 0, used: [], round: null, submitted: [], scores: [], play: null,
      wheel: null, votes: {}, fav: null, gid: "", done: false, since: now(), nextAt: 0
    };
  }
  function addSelf() {
    if (!S) return;
    var p = S.pl.find(function (x) { return x.id === ME; });
    if (p) { p.n = L.name; p.av = L.av; return; }
    if (S.pl.length >= MAX_PLAYERS) return;
    S.pl.push({ id: ME, n: L.name, av: L.av, sc: 0, gain: 0, seen: Date.now() });
  }
  function cleanState() {
    try { return JSON.parse(JSON.stringify(S)); } catch (e) { return S; }
  }
  function broadcast(force) {
    if (!isHost || !R || !S) return;
    var d = cleanState();
    try { R.snap({ S: d }); } catch (e) {}
    R.emit("st", d).catch(function () {});
  }

  function act(d) {
    if (!isHost || !d || !S) return;
    if (d.k === "join") return onJoin(d);
    if (d.k === "submit") return onSubmission(d);
    if (d.k === "vote") return onVote(d);
    if (d.k === "sync") {
      var p = S.pl.find(function (x) { return x.id === d.p; });
      if (p && d.n) { p.n = String(d.n).slice(0, 16); p.av = d.av || p.av; }
      R.emit("st", cleanState(), d.p).catch(function () {});
      return;
    }
    if (d.k === "needMeme") return sendMeme(d.id, d.p);
    if (d.k === "needClips") return sendClips(d.p, d.ids);
    if (d.k === "leave") {
      S.pl = S.pl.filter(function (p) { return p.id !== d.p; });
      broadcast(true); render();
    }
  }

  function onJoin(d) {
    var p = S.pl.find(function (x) { return x.id === d.p; });
    if (p) {
      p.n = String(d.n || p.n).slice(0, 16);
      p.av = d.av || p.av;
      p.seen = Date.now();
    } else {
      if (S.pl.length >= MAX_PLAYERS) {
        if (d.p) R.emit("full", {}, d.p).catch(function () {});
        return;
      }
      S.pl.push({ id: d.p, n: String(d.n || "Joueur").slice(0, 16), av: d.av || AVATAR, sc: 0, gain: 0, seen: Date.now() });
      toast("👋 " + String(d.n || "Un joueur").slice(0, 16) + " arrive");
    }
    broadcast(true);
    render();
  }

  function onSubmission(d) {
    if (!d.p) return;
    if (d.rid && S.round && d.rid !== S.round.rid) return; /* retardataire d'une manche passée */
    var score = clamp(Math.round(Number(d.score) || 0), 0, 100);
    var data = String(d.data || "");
    if (data.length > 1500000) data = "";
    L.subs[d.p] = {
      data: data, mime: String(d.mime || ""), sr: Number(d.sr) || 0,
      dur: clamp(Number(d.dur) || 0, 0.2, 30), score: score,
      parts: d.parts && typeof d.parts === "object" ? d.parts : null,
      x: d.x && typeof d.x === "object" ? { tip: String(d.x.tip || "").slice(0, 12), fl: String(d.x.fl || "").slice(0, 24) } : null
    };
    if (S.submitted.indexOf(d.p) < 0) S.submitted.push(d.p);
    relayClip(d.p); /* chacun reçoit l'imitation dès qu'elle arrive : prête avant la phase 3 */
    if (S.ph === "collect" || S.ph === "imitate") { broadcast(false); render(); }
  }

  /* ---------- vote « coup de cœur » ---------- */
  function canVote() { return !!S && S.pl.length >= MIN_VOTERS && (S.ph === "playback" || S.ph === "scores"); }
  function votable(id) {
    var items = S && S.play ? S.play.items : [];
    return items.some(function (it) { return it.id === id && !it.forfait; });
  }
  function onVote(d) {
    if (!isHost || !S || !d || !d.p || !canVote()) return;
    if (d.rid && S.round && d.rid !== S.round.rid) return;
    if (!S.pl.some(function (p) { return p.id === d.p; })) return;
    if (!d.t || d.t === d.p || !votable(d.t)) return;
    if (!S.votes) S.votes = {};
    if (S.votes[d.p] === d.t) delete S.votes[d.p]; else S.votes[d.p] = d.t;
    broadcast(false);
    render();
  }
  function voteFor(id) {
    if (!S || !S.round || !canVote() || id === ME || !votable(id)) return;
    MimicAudio.sfx("tick");
    var cur = (S.votes && S.votes[ME]) || (L.voteRid === S.round.rid ? L.vote : "");
    L.voteRid = S.round.rid; L.vote = cur === id ? "" : id;
    paintVotes();
    if (isHost) onVote({ p: ME, t: id, rid: S.round.rid });
    else R.emit("act", { k: "vote", p: ME, t: id, rid: S.round.rid }, "host").catch(function () {});
  }
  function myVote() {
    if (!S || !S.round) return "";
    if (L.voteRid === S.round.rid) return L.vote;
    return (S.votes && S.votes[ME]) || "";
  }
  function paintVotes() {
    var btns = document.querySelectorAll("[data-a='vote']");
    if (!btns.length) return;
    var mine = myVote(), counts = {};
    Object.keys((S && S.votes) || {}).forEach(function (v) { var t = S.votes[v]; counts[t] = (counts[t] || 0) + 1; });
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], id = b.dataset.v, on = mine === id;
      b.classList.toggle("on", on);
      b.textContent = (on ? "❤️" : "🤍") + (counts[id] ? " " + counts[id] : "");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  function voteBtn(it) {
    if (!canVote() || it.id === ME || it.forfait) return "";
    return '<button type="button" class="mpx-vote" data-a="vote" data-v="' + esc(it.id) + '" aria-label="Voter pour ' + esc(it.n) + '">🤍</button>';
  }
  /** Compte les votes de la manche ; en cas d'égalité, la meilleure note départage. */
  function tallyVotes() {
    if (!S || S.pl.length < MIN_VOTERS) return null;
    var counts = {}, best = 0;
    Object.keys(S.votes || {}).forEach(function (v) {
      var t = S.votes[v];
      if (!votable(t) || t === v) return;
      counts[t] = (counts[t] || 0) + 1;
      if (counts[t] > best) best = counts[t];
    });
    if (!best) return null;
    var top = (S.scores || []).filter(function (r) { return counts[r.id] === best; }).sort(function (a, b) { return b.score - a.score; })[0];
    return top ? { id: top.id, n: top.n, av: top.av, v: best, bonus: FAV_BONUS } : null;
  }

  function sendMeme(id, to) {
    var item = custom.find(function (m) { return m.id === id; });
    if (!item) return;
    var payload = {
      id: item.id, name: item.name, emoji: "🎵", cat: item.cat, diff: item.diff,
      dur: item.dur, desc: item.desc || "", img: item.img || "", custom: true,
      data: item.data, mime: item.mime || "", shared: true
    };
    R.emit("meme", payload, to || "").catch(function () {});
  }

  /** Envoie UNE imitation (un message par clip : léger, pas de gros paquet unique). */
  function relayClip(cid, to) {
    if (!isHost || !R || !S || !S.round) return;
    var s = L.subs[cid];
    if (!s || !s.data) return;
    var clips = {};
    clips[cid] = { data: s.data, mime: s.mime, sr: s.sr || 0, dur: s.dur };
    R.emit("clips", { rid: S.round.rid, clips: clips }, to || "").catch(function () {});
  }

  function sendClips(to, ids) {
    if (!isHost || !S || !S.round) return;
    Object.keys(L.subs).forEach(function (cid) {
      if (ids && ids.length && ids.indexOf(cid) < 0) return;
      relayClip(cid, to);
    });
  }

  /* ---------- boucle de l'hôte ---------- */
  function startHostLoop() {
    if (L.hl) return;
    L.hl = setInterval(function () { if (isHost) hostTick(); }, 300);
  }
  function stopHostLoop() { if (L.hl) { clearInterval(L.hl); L.hl = null; } }

  function allSubmitted() {
    return S.pl.length > 0 && S.pl.every(function (p) { return S.submitted.indexOf(p.id) >= 0; });
  }

  function hostTick() {
    if (!isHost || !S) return;
    var t = now();
    if (S.ph === "listen" && S.round && t >= S.round.recStart) {
      S.ph = "imitate"; S.since = t; broadcast(true); render();
    } else if (S.ph === "imitate" && S.round && (t >= S.round.recEnd + 900 || allSubmitted())) {
      S.ph = "collect"; S.since = t; broadcast(true); render();
    } else if (S.ph === "collect" && t >= S.since + (allSubmitted() ? 700 : 6500)) {
      /* on attend les retardataires (analyse locale) au lieu de les déclarer forfait à 1,8 s */
      beginPlayback();
    } else if (S.ph === "playback" && S.play && t >= S.play.endAt) {
      beginScores();
    } else if (S.ph === "scores" && t >= (S.revealAt || 0) + S.scores.length * 520 + 1600) {
      beginWheel();
    } else if (S.ph === "wheel" && S.wheel && t >= S.wheel.at + 4400) {
      S.ph = "roundEnd"; S.since = t; S.nextAt = t + 7000; broadcast(true); render();
    } else if (S.ph === "roundEnd" && t >= S.nextAt) {
      nextRound();
    }
  }

  /* ---------- manches ---------- */
  function officialPool() { return MimicBank.filter({ cats: S.cfg.cats, diff: S.cfg.diff, voc: S.cfg.kind == null ? true : !!S.cfg.kind }); }
  function customPool() {
    return custom.filter(function (m) {
      if (S.cfg.cats.length && S.cfg.cats.indexOf(m.cat) < 0) return false;
      if (S.cfg.diff && (Number(m.diff) || 2) > S.cfg.diff) return false;
      return true;
    }).map(metaOfCustom);
  }
  function metaOfCustom(m) {
    return { id: m.id, name: m.name, emoji: "🎵", cat: m.cat || "absurde", diff: Number(m.diff) || 2, dur: Number(m.dur) || 5, desc: m.desc || "", img: m.img || "", custom: true };
  }
  function pickMeme() {
    return MimicBank.pick(poolFor(S.cfg.src), S.used.concat(S.round ? [S.round.meme.id] : []));
  }

  /** Vivier de la partie, sans doublon d'identifiant. */
  function poolFor(src) {
    var off = src === "custom" ? [] : officialPool();
    var cus = src === "official" ? [] : customPool();
    var seen = {}, names = {};
    return off.concat(cus).filter(function (m) {
      if (!m || seen[m.id]) return false;
      if (!m.custom) {
        if (MimicAudio.isBad(m.id)) return false;               /* fichier absent */
        var nk = String(m.name || "").toLowerCase();
        if (names[nk]) return false;                             /* même nom = même mème */
        names[nk] = 1;
      }
      seen[m.id] = 1;
      return true;
    });
  }

  function startGame() {
    if (!isHost || L.starting) return;
    if (S.pl.length < 2) { toast("Il faut au moins 2 joueurs"); return; }
    if (!poolFor(S.cfg.src).length) { toast("Aucun mème ne correspond aux filtres"); return; }
    L.starting = true;
    toast("Vérification des sons…");
    /* charge chaque son officiel de la sélection : ceux dont le fichier manque sont écartés
       (sinon la manche se jouerait en silence) et la durée des mèmes « auto » est mesurée. */
    MimicAudio.preload(officialPool()).catch(function () {}).then(function () {
      L.starting = false;
      if (!isHost || !S || (S.ph !== "lobby" && S.ph !== "end")) return;
      var pool = poolFor(S.cfg.src);
      var missing = officialPool().filter(function (m) { return MimicAudio.isBad(m.id); });
      if (missing.length) {
        try { console.warn("[Mimic Party] sons introuvables, ignorés :", missing.map(function (m) { return m.file; })); } catch (e) {}
        toast(missing.length + " son(s) introuvable(s) ignoré(s)");
      }
      if (!pool.length) { toast("Aucun son disponible dans la sélection"); return; }
      /* jamais deux fois le même son : on borne les manches à la taille du vivier */
      var rounds = clamp(Math.round(Number(S.cfg.rounds) || 3), 1, 10);
      if (rounds > pool.length) {
        S.cfg.rounds = pool.length;
        toast("Sélection de " + pool.length + " mème(s) : la partie fera " + pool.length + " manche(s).");
      } else {
        S.cfg.rounds = rounds;
      }
      S.r = 0; S.used = []; S.scores = []; S.play = null; S.wheel = null; S.done = false;
      S.votes = {}; S.fav = null; S.gid = "g" + Date.now().toString(36);
      L.recap = []; L.fav = {};
      S.pl.forEach(function (p) { p.sc = 0; p.gain = 0; });
      nextRound();
    });
  }

  function nextRound() {
    if (!isHost || !S) return;
    if (S.ph !== "roundEnd" && S.ph !== "lobby" && S.ph !== "end") return;
    S.r++;
    if (S.r > S.cfg.rounds) return endGame();
    var meme = pickMeme();
    if (!meme) {
      toast("Plus de mèmes disponibles, on termine !");
      return endGame();
    }
    S.used.push(meme.id);
    var dur = Math.max(0.4, Number(meme.dur) || 2);
    var listens = clamp(Math.round(S.cfg.listens), 1, 2);
    var gap = 650;
    var t = now();
    var listenAt = t + 2100;
    var listenEnd = listenAt + (listens - 1) * (dur * 1000 + gap) + dur * 1000;
    var recStart = listenEnd + 650;
    var recEnd = recStart + clamp(Number(S.cfg.imit) || 8, 3, 20) * 1000;
    S.round = {
      rid: "r" + S.r + "-" + Date.now().toString(36),
      n: S.r, meme: meme, listenAt: listenAt, listenEnd: listenEnd,
      segDur: Math.round(dur * 1000), gap: gap, listens: listens,
      recStart: recStart, recEnd: recEnd
    };
    S.submitted = []; S.scores = []; S.play = null; S.wheel = null; S.votes = {}; S.fav = null;
    S.ph = "listen"; S.since = t;
    L.subs = {}; L.revealDone = {}; L.wheelShown = false; L.vote = ""; L.voteRid = "";
    resetRoundLocal();
    broadcast(true);
    if (meme.custom) sendMeme(meme.id);
    render();
  }

  function resetRoundLocal() {
    L.sub = ""; L.autoTried = false; L.attemptDone = false; L.submitted = false;
    L.myClip = null; L.analyzing = false; L.micErr = ""; L.origFeat = null;
    L.origRid = ""; L.audioRid = ""; L.audioLoading = ""; L.wave = null; L.waveRid = "";
    L.sched = {};
  }

  function beginPlayback() {
    if (!isHost || !S || !S.round) return;
    var t = now();
    var items = S.pl.map(function (p) {
      var s = L.subs[p.id];
      return {
        id: p.id, n: p.n, av: p.av,
        score: s ? s.score : 0, parts: s ? s.parts : null, x: s ? s.x : null,
        forfait: !s || !s.data, dur: s && s.data ? clamp(s.dur, 0.5, 20) : 1.2
      };
    });
    var at = t + 3000, cur = at;
    items.forEach(function (it) {
      it.at = cur;
      it.slot = it.forfait ? 1100 : Math.round(it.dur * 1000) + 800;
      cur += it.slot;
    });
    S.play = { at: at, items: items, endAt: cur + 300 };
    S.ph = "playback"; S.since = t; S.revealAt = 0;
    broadcast(true);
    hostCacheClips();
    render();
  }

  function beginScores() {
    if (!isHost || !S || !S.play || S.ph !== "playback") return;
    var t = now();
    var rows = S.play.items.map(function (it) {
      var bonus = !it.forfait && it.score >= PERFECT ? PERFECT_BONUS : 0;
      return {
        id: it.id, n: it.n, av: it.av, score: it.score, parts: it.parts, x: it.x,
        forfait: it.forfait, bonus: bonus, gain: it.score + bonus
      };
    });
    rows.sort(function (a, b) { return b.score - a.score || String(a.n).localeCompare(String(b.n)); });
    S.pl.forEach(function (p) {
      var row = rows.find(function (x) { return x.id === p.id; });
      p.gain = row ? row.gain : 0;
      p.sc += p.gain;
    });
    S.scores = rows;
    S.ph = "scores"; S.since = t; S.revealAt = t + 600;
    L.revealDone = {};
    broadcast(true);
    render();
  }

  function beginWheel() {
    if (!isHost || !S || S.ph !== "scores") return;
    var t = now();
    var winner = (S.scores || []).find(function (x) { return !x.forfait; });
    if (!winner) { /* personne n'a imité : pas de roue */
      S.fav = null;
      S.ph = "roundEnd"; S.since = t; S.nextAt = t + 7000; broadcast(true); render();
      return;
    }
    /* coup de cœur du public : calculé avant la roue, bonus ajouté tout de suite */
    S.fav = tallyVotes();
    if (S.fav) {
      var fp = S.pl.find(function (x) { return x.id === S.fav.id; });
      if (fp) { fp.sc += S.fav.bonus; fp.gain = (fp.gain || 0) + S.fav.bonus; }
    }
    var idx = Math.floor(Math.random() * WHEEL.length);
    var opt = WHEEL[idx];
    var bonus = Math.round(Number(opt.bonus) || 0);
    var extra = "";
    if (opt.k === "x15") bonus = Math.round((winner.score || 0) * 0.5);
    if (opt.k === "steal") {
      var leader = S.pl.filter(function (x) { return x.id !== winner.id; }).sort(function (a, b) { return b.sc - a.sc; })[0];
      if (leader) {
        leader.sc = Math.max(0, leader.sc - 5);
        extra = leader.n;
      } else bonus = 0;
    }
    var p = S.pl.find(function (x) { return x.id === winner.id; });
    if (p) { p.sc += bonus; p.gain = (p.gain || 0) + bonus; }
    S.wheel = {
      k: opt.k, emoji: opt.emoji, label: opt.label, bonus: bonus, steal: extra,
      target: winner.id, n: winner.n, at: t + 600,
      angle: 1440 + (360 - (idx * 72 + 36))
    };
    S.ph = "wheel"; S.since = t;
    L.wheelShown = false;
    broadcast(true);
    render();
  }

  function endGame() {
    if (!isHost || !S) return;
    S.ph = "end"; S.done = true; S.since = now();
    broadcast(true);
    render();
    if (S.pl.length >= 2) {
      Party.report(R, "mp", S.sid, S.pl.map(function (p) { return { id: p.id, n: p.n, s: p.sc }; })).catch(function () {});
    }
  }

  /* ============================================================
     COPIE LOCALE DES MORCEAUX AUDIO
     ============================================================ */
  function findCustom(id) {
    var list = isHost ? custom.concat(sharedCustom) : sharedCustom;
    return list.find(function (m) { return m.id === id; }) || null;
  }

  function ensureBuffer(meta, tries) {
    tries = tries || 0;
    if (!meta) return Promise.reject(new Error("Mème inconnu"));
    if (BUFS.has(meta.id)) return Promise.resolve(BUFS.get(meta.id));
    if (meta.custom) {
      var item = findCustom(meta.id);
      if (!item || !item.data) {
        if (tries > 24) return Promise.reject(new Error("Audio du mème indisponible"));
        if (!isHost) R.emit("act", { k: "needMeme", p: ME, id: meta.id }, "host").catch(function () {});
        return new Promise(function (res) { setTimeout(res, 350); }).then(function () { return ensureBuffer(meta, tries + 1); });
      }
      return MimicAudio.decodeBlob(MimicAudio.dataUrlToBlob(item.data)).then(function (b) {
        BUFS.set(meta.id, b); return b;
      });
    }
    var m = MimicBank.byId(meta.id) || (meta.file ? meta : null);
    if (!m) return Promise.reject(new Error("Mème inconnu"));
    return MimicAudio.loadMeme(m).then(function (b) { BUFS.set(meta.id, b); return b; });
  }

  function ensureOrigFeatures() {
    if (!S || !S.round) return Promise.reject(new Error("Aucune manche"));
    if (L.origFeat && L.origRid === S.round.rid) return Promise.resolve(L.origFeat);
    var rid = S.round.rid;
    return ensureBuffer(S.round.meme).then(function (buf) {
      var f = MimicScore.features(buf.getChannelData(0), buf.sampleRate);
      if (S && S.round && S.round.rid === rid) { L.origFeat = f; L.origRid = rid; }
      return f;
    });
  }

  function onMemeShared(d) {
    if (!d || d.shared === false) {
      if (d && d.id) sharedCustom = sharedCustom.filter(function (m) { return m.id !== d.id; });
      render();
      return;
    }
    var row = {
      id: d.id, name: d.name || "Mème importé", cat: d.cat || "absurde", diff: Number(d.diff) || 2,
      dur: Number(d.dur) || 5, desc: d.desc || "", img: d.img || "", data: d.data || "",
      mime: d.mime || "", shared: true
    };
    var i = sharedCustom.findIndex(function (m) { return m.id === row.id; });
    if (i >= 0) sharedCustom[i] = row; else sharedCustom.push(row);
    if (BUFS.has(row.id)) BUFS.delete(row.id);
    L.audioRid = "";
    render();
  }

  /* ============================================================
     IMITATION (côté joueur)
     ============================================================ */
  function beginAttempt(manual) {
    if (!S || !S.round || S.ph === "lobby" || S.ph === "end") return;
    if (L.attemptDone || L.submitted || L.attempt) return;
    if (L.analyzing) return;
    var left = S.round.recEnd - now();
    if (left < 400) { if (manual) toast("Trop tard, la manche est finie"); return; }
    MimicAudio.stopAll();
    L.micErr = "";
    L.micBusy = true;
    render();
    var maxMs = Math.max(600, Math.min(S.cfg.imit * 1000, left));
    var pending = MimicAudio.record({
      maxMs: maxMs,
      onLevel: function (level, elapsed, buf) { drawMic(level, buf); },
      onAutoStop: function () { L.attemptDone = true; }
    });
    if (!pending) { L.micBusy = false; L.micErr = "Audio indisponible sur ce navigateur."; render(); return; }
    pending.then(function (handle) {
      L.attempt = handle;
      L.micBusy = false;
      L.micErr = "";
      render();
      handle.done.then(function (r) {
        L.attempt = null;
        L.attemptDone = true;
        finishAttempt(r);
      }).catch(function () {
        L.attempt = null; L.attemptDone = true; L.micErr = "Enregistrement interrompu"; render();
      });
    }).catch(function (e) {
      L.micBusy = false;
      L.attempt = null;
      L.autoTried = true;
      L.micErr = (e && (e.name === "NotAllowedError" || e.name === "SecurityError"))
        ? "Micro refusé. Autorise le micro dans le navigateur puis réessaie."
        : "Micro indisponible sur cet appareil.";
      render();
    });
  }

  function stopAttempt() {
    if (!L.attempt) return;
    L.attemptDone = true;
    try { L.attempt.stop(); } catch (e) {}
  }

  function finishAttempt(r) {
    if (!r || !r.blob || r.dur < 0.25) {
      L.submitted = true;
      L.myClip = null;
      submitPayload("", "", 0, 0, null, 0);
      return;
    }
    L.analyzing = true;
    render();
    MimicAudio.decodeBlob(r.blob).then(function (buf) {
      return ensureOrigFeatures().then(function (orig) {
        var feat = MimicScore.features(buf.getChannelData(0), buf.sampleRate);
        var res = MimicScore.compare(orig, feat);
        return { buf: buf, res: res };
      }).catch(function () {
        return { buf: buf, res: { score: 0, parts: null } };
      });
    }).then(function (out) {
      /* format universel (µ-law) : lisible sur tous les appareils, silences coupés */
      var clip = MimicAudio.encodeClip(out.buf);
      var x = { tip: out.res.tip || "", fl: Object.keys(out.res.flags || {}).join(",") };
      L.myClip = { buf: out.buf, score: out.res.score, parts: out.res.parts, dur: clip.dur, tip: x.tip };
      L.analyzing = false;
      L.submitted = true;
      submitPayload(clip.data, clip.mime, clip.dur, out.res.score, out.res.parts, clip.sr, x);
    }).catch(function () {
      L.analyzing = false;
      L.submitted = true;
      submitPayload("", "", r.dur, 0, null, 0);
    });
  }

  function submitPayload(data, mime, dur, score, parts, sr, x) {
    score = clamp(Math.round(Number(score) || 0), 0, 100);
    if (isHost) {
      L.subs[ME] = { data: data, mime: mime, sr: Number(sr) || 0, dur: clamp(Number(dur) || 0.5, 0.2, 30), score: score, parts: parts, x: x || null };
      if (S.submitted.indexOf(ME) < 0) S.submitted.push(ME);
      broadcast(false);
      relayClip(ME);
    } else {
      R.emit("act", { k: "submit", p: ME, rid: S && S.round ? S.round.rid : "", data: data, mime: mime, sr: sr, dur: dur, score: score, parts: parts, x: x || null }, "host").catch(function () {});
    }
    render();
  }

  /* ---------- réception des extraits pour la lecture ---------- */
  function cacheClip(cid, c, rid) {
    if (!c || !c.data) return;
    var key = cid + "|" + (rid || "");
    if ((L.clipBufs[cid] && L.clipBufs[cid].rid === key) || L.clipPending[key]) return;
    L.clipPending[key] = 1;
    MimicAudio.decodeClip(c).then(function (buf) {
      delete L.clipPending[key];
      L.clipBufs[cid] = { buf: buf, rid: key, round: rid || "", dur: c.dur };
      render();
    }).catch(function () { delete L.clipPending[key]; });
  }

  function receiveClips(d) {
    if (!d || !d.clips) return;
    Object.keys(d.clips).forEach(function (cid) { cacheClip(cid, d.clips[cid], d.rid); });
  }

  /** L'hôte ne reçoit pas ses propres envois : il décode ses copies locales. */
  function hostCacheClips() {
    if (!isHost || !S || !S.round) return;
    var rid = S.round.rid;
    Object.keys(L.subs).forEach(function (cid) {
      var s = L.subs[cid];
      if (!s || !s.data) return;
      cacheClip(cid, { data: s.data, mime: s.mime, sr: s.sr, dur: s.dur }, rid);
    });
  }

  /** Buffer d'une imitation : copie reçue, ou la sienne (jamais renvoyée par le réseau). */
  function clipFor(id) {
    var c = L.clipBufs[id];
    if (c && c.buf && (!c.round || !S || !S.round || c.round === S.round.rid)) return c.buf;
    if (id === ME && L.myClip && L.myClip.buf) return L.myClip.buf;
    return null;
  }

  /** Redemande à l'hôte les imitations manquantes (message perdu, arrivée tardive). */
  function requestMissingClips() {
    if (isHost || !R || !S || !S.play || !S.round) return;
    if (S.ph !== "playback" && S.ph !== "scores") return;
    var t = now();
    if (t < S.play.at - 1500 || t - L.clipAsk < 1800) return;
    var ids = S.play.items.filter(function (it) {
      return !it.forfait && !clipFor(it.id) && !L.clipPending[it.id + "|" + S.round.rid];
    }).map(function (it) { return it.id; });
    if (!ids.length) return;
    L.clipAsk = t;
    R.emit("act", { k: "needClips", p: ME, ids: ids }, "host").catch(function () {});
  }

  function schedulePlayback() {
    if (!S || !S.play || S.ph !== "playback" || !S.round) return;
    if (MimicAudio.state() !== "running") { MimicAudio.unlock(); return; }
    S.play.items.forEach(function (it) {
      if (it.forfait) return;
      var buf = clipFor(it.id);
      if (!buf) return;
      var key = it.id + "|" + S.round.rid;
      if (L.sched[key]) return;
      var delay = (it.at - now()) / 1000;
      var late = delay < 0 ? -delay : 0;               /* arrivé en retard : on reprend au bon endroit */
      if (late >= buf.duration) { L.sched[key] = 1; return; }
      var src = MimicAudio.playBuffer(buf, { delay: Math.max(0, delay), offset: late, gain: volGain() });
      if (src) L.sched[key] = 1;
    });
  }

  /** Joue le mème officiel uniquement pendant la phase d'écoute.
   *  On réserve l'identifiant AVANT le chargement asynchrone pour éviter
   *  toute planification multiple, et on attend que l'AudioContext tourne. */
  function scheduleRoundAudio() {
    if (!S || !S.round || S.ph !== "listen") return;
    var rid = S.round.rid;
    if (L.audioRid === rid || L.audioLoading === rid) return;
    if (now() >= S.round.recStart) return;
    L.audioLoading = rid;
    MimicAudio.ensureRunning().then(function () {
      return ensureBuffer(S.round.meme);
    }).then(function (buf) {
      if (!S || !S.round || S.round.rid !== rid || S.ph !== "listen") return;
      L.audioLoading = "";
      L.audioRid = rid;
      if (!L.wave || L.waveRid !== rid) { L.wave = MimicAudio.waveform(buf, 56); L.waveRid = rid; }
      var r = S.round, t = now(), dur = r.segDur;
      for (var i = 0; i < r.listens; i++) {
        var segStart = r.listenAt + i * (dur + r.gap);
        if (t >= segStart + dur) continue;
        var delay = Math.max(0, segStart - t) / 1000;
        var offset = Math.max(0, (t - segStart) / 1000);
        MimicAudio.playBuffer(buf, { delay: delay, offset: offset, gain: volGain() });
      }
      drawWaveNow();
    }).catch(function () {
      if (L.audioLoading === rid) L.audioLoading = "";
      if (!S || !S.round || S.round.rid !== rid) return;
      L.audioRid = "";
      /* le bouton « Activer le son » reste affiché : c'est lui qui relance */
    });
  }

  function replayMeme() {
    if (!S || !S.round) return;
    var rid = S.round.rid;
    MimicAudio.ensureRunning().then(function () {
      return ensureBuffer(S.round.meme);
    }).then(function (buf) {
      if (!S || !S.round || S.round.rid !== rid) return;
      MimicAudio.stopAll();
      MimicAudio.playBuffer(buf, { gain: volGain() });
    }).catch(function () { toast("Son bloqué : appuie d’abord sur « Activer le son »."); });
  }

  /* ============================================================
     RENDU
     ============================================================ */
  function msg(t) {
    var el = $id("mp-msg");
    if (el) el.textContent = t || "";
    else if (t) toast(t);
  }

  function showWait(text) {
    if (!app()) return;
    app().innerHTML = '<div class="mp-wait"><div class="spin">💿</div><h2>' + esc(text || "Connexion…") +
      '</h2><p class="hint">' + (code ? "Salon <b>" + esc(code) + "</b>" : "Préparation du salon") + "</p></div>";
  }

  function render() {
    if (!app()) return;
    updateWho();
    if (!S) {
      if (code) showWait("En attente de l’hôte…");
      else renderHome();
      return;
    }
    /* Coupe net tout son planifié dès qu'on change de phase : sans ça, un
       mème programmé en avance peut se rejouer pendant l'imitation. */
    if (L.ph !== S.ph) {
      L.ph = S.ph;
      MimicAudio.stopAll();
      L.sched = {};
      L.lastTick = 0;
      if ((S.ph === "collect" || S.ph === "playback") && !L.attempt) { try { MimicAudio.releaseMic(); } catch (e) {} }
    }
    var sig = stateSig();
    if (sig !== L.sig) {
      L.sig = sig;
      var map = {
        lobby: renderLobby, listen: renderListen, imitate: renderImitate, collect: renderCollect,
        playback: renderPlayback, scores: renderScores, wheel: renderWheel,
        roundEnd: renderRoundEnd, end: renderEnd
      };
      (map[S.ph] || renderLobby)();
    }
    if (S.round && S.ph === "listen") scheduleRoundAudio();
    if (S.ph === "playback") schedulePlayback();
    if (S.ph === "playback" || S.ph === "scores") paintVotes();
  }

  function updateWho() {
    var w = $id("who");
    if (w) w.textContent = L.name ? Profile.tag(L.name) : "";
  }

  function stateSig() {
    if (!S) return "none";
    var base = [
      S.ph, S.r, S.cfg.src, S.cfg.rounds, S.cfg.listens, S.cfg.imit, S.cfg.diff, S.cfg.kind, L.sndOk,
      (S.cfg.cats || []).join(","), S.host || "",
      S.pl.length, S.pl.map(function (p) { return p.id + ":" + p.n + ":" + (p.av || "") + ":" + p.sc + ":" + (p.gain || 0); }).join("|"),
      (S.submitted || []).join(","),
      /* état purement local (micro, analyse, onde) : sinon la vue ne se met pas à jour */
      L.micOk ? 1 : 0, L.micBusy ? 1 : 0, L.attempt ? 1 : 0, L.analyzing ? 1 : 0,
      L.submitted ? 1 : 0, L.micErr || "", L.myClip ? L.myClip.score : "",
      L.wave ? 1 : 0, L.waveRid || ""
    ].join("/");
    if (!S.round) return base;
    if (S.ph === "listen" || S.ph === "imitate" || S.ph === "collect") return base + "/" + S.round.rid + "/" + S.ph;
    if (S.ph === "playback") return base + "/" + (S.play ? S.play.at : "") + "/" + Object.keys(L.clipBufs).length + "/" + (S.pl.length >= MIN_VOTERS ? 1 : 0);
    if (S.ph === "scores") return base + "/scores/" + (S.scores || []).map(function (x) { return x.id + x.score; }).join(",");
    if (S.ph === "wheel") return base + "/wheel/" + (S.wheel ? S.wheel.k + ":" + S.wheel.at : "");
    if (S.ph === "roundEnd") return base + "/re/" + (S.fav ? S.fav.id + S.fav.v : "");
    if (S.ph === "end") return base + "/end/" + L.recap.length + ":" + L.recap.reduce(function (n, e) { return n + e.rows.filter(function (r) { return r.buf; }).length; }, 0);
    return base;
  }

  /* ---------- accueil ---------- */
  function renderHome() {
    var p = Profile.get();
    var pref = p.name || "";
    app().innerHTML =
      '<div class="mp-hero">' +
      '<span class="mp-sticker">🔥 2 à 8 joueurs · chacun sur son téléphone</span>' +
      '<h1>MIMIC <em>PARTY</em></h1>' +
      '<p>Écoute un mème culte, imite-le au micro, et laisse l’IA de la soirée juger ta ressemblance. Le plus proche de l’original gagne.</p>' +
      '</div>' +
      '<div class="mp-cards">' +
      '<section class="mp-card"><h2>🎉 Créer un salon</h2>' +
      '<div class="mp-field"><label for="mp-name">Ton pseudo</label>' +
      '<input type="text" id="mp-name" maxlength="16" autocomplete="nickname" placeholder="Ex. Sofia" value="' + esc(pref) + '"></div>' +
      '<button type="button" class="btn primary big" data-a="create">Créer et inviter</button>' +
      '<p class="hint">Un code à 4 caractères sera affiché pour que tes potes te rejoignent.</p></section>' +
      '<section class="mp-card"><h2>🔑 Rejoindre</h2>' +
      '<div class="mp-field"><label for="mp-code">Code du salon</label>' +
      '<div class="mp-joinrow"><input type="text" id="mp-code" maxlength="4" inputmode="text" autocapitalize="characters" placeholder="ABCD"></div></div>' +
      '<button type="button" class="btn big" data-a="join">Entrer dans la partie</button>' +
      '<p class="hint">Demande le code à l’hôte, ou scanne son QR code.</p></section>' +
      '</div>' +
      '<section class="mp-card mp-how"><h2>🧠 Comment ça se joue</h2><ol>' +
      '<li><b>On écoute le mème</b> — tous les joueurs entendent exactement le même extrait, en même temps.</li>' +
      '<li><b>On imite</b> — le micro s’ouvre après la lecture, une seule tentative, chrono limité.</li>' +
      '<li><b>On écoute les imitations</b> — chaque voix passe à tour de rôle avec le pseudo.</li>' +
      '<li><b>On découvre les notes</b> — une IA locale compare les sons, la mélodie, le rythme, l’intensité, les pauses et le tempo sur 100, avec un verdict et un conseil. Le public vote son coup de cœur, puis la roue des bonus distribue des points.</li>' +
      '<li><b>On garde les meilleurs moments</b> — à la fin, un récap avec awards : réécoute les imitations, garde celles que tu veux et télécharge-les ou partage-les.</li>' +
      '</ol><p class="hint">Astuce : mets des écouteurs pour éviter que le micro réenregistre le mème.</p></section>' +
      '<p class="mp-error" id="mp-msg"></p>';
  }

  /* ---------- barre de salon ---------- */
  function roomBar(extra) {
    return '<div class="mp-roombar"><span class="mp-small">Salon</span><b class="code">' + esc(code || "----") + "</b>" +
      '<span class="mp-small">' + S.pl.length + "/" + MAX_PLAYERS + " joueurs</span>" +
      '<span class="spacer"></span>' +
      '<label class="mp-vol" title="Volume"><span aria-hidden="true">🔊</span><input id="mp-vol" type="range" min="0" max="100" step="5" aria-label="Volume" value="' + (L.vol == null ? 80 : L.vol) + '"></label>' +
      '<button type="button" class="mp-iconbtn" data-a="shareRoom" aria-label="Partager le lien du salon">🔗</button>' +
      '<button type="button" class="mp-quitbtn" data-a="leaveRoom" aria-label="Quitter le salon" title="Quitter le salon">🚪 Quitter</button>' +
      (extra || "") + "</div>";
  }

  function playersHtml() {
    return '<div class="mp-players">' + S.pl.map(function (p) {
      return '<span class="mp-player ' + (p.id === ME ? "me" : "") + '">' +
        '<span class="av">' + esc(p.av || AVATAR) + "</span>" + esc(p.n) +
        (p.id === S.host ? '<span class="crown">👑</span>' : "") +
        (S.ph !== "lobby" && S.ph !== "end" ? '<span class="mp-badge-note">' + (p.sc || 0) + "</span>" : "") +
        "</span>";
    }).join("") + "</div>";
  }

  function cfgHtml() {
    var dis = isHost ? "" : " disabled";
    var cfg = S.cfg;
    var srcBtns = [["official", "Officiels"], ["custom", "Mes mèmes"], ["mix", "Mélange"]].map(function (s) {
      return '<button type="button" class="pill ' + (cfg.src === s[0] ? "on" : "") + '" data-a="src" data-v="' + s[0] + '"' + dis + ">" + s[1] + "</button>";
    }).join("");
    var cats = MimicBank.CATS.map(function (c) {
      var on = cfg.cats.indexOf(c.id) >= 0;
      return '<button type="button" class="mp-cat ' + (on ? "on" : "") + '" data-a="cat" data-v="' + c.id + '"' + dis + ">" + c.emoji + " " + esc(c.label) + "</button>";
    }).join("");
    var diffBtns = [[0, "Toutes"], [1, "Facile ★"], [2, "Moyen ★★"], [3, "Difficile ★★★"]].map(function (d) {
      return '<button type="button" class="pill ' + (Number(cfg.diff) === d[0] ? "on" : "") + '" data-a="cfg" data-k="diff" data-v="' + d[0] + '"' + dis + ">" + d[1] + "</button>";
    }).join("");
    var kindBtns = [[1, "🗣️ Paroles & chants"], [0, "🔊 Tous les sons"]].map(function (k) {
      var on = (cfg.kind == null ? 1 : Number(cfg.kind)) === k[0];
      return '<button type="button" class="pill ' + (on ? "on" : "") + '" data-a="cfg" data-k="kind" data-v="' + k[0] + '"' + dis + ">" + k[1] + "</button>";
    }).join("");
    function step(k, v, min, max, label, unit) {
      return '<div class="mp-cfg-row"><span>' + label + "<small>" + min + " à " + max + " " + unit + "</small></span>" +
        '<div class="stepper"><button type="button" data-a="cfg" data-k="' + k + '" data-v="' + (v - 1) + '"' + dis + " aria-label=\"Moins\">−</button>" +
        "<output>" + v + "</output>" +
        '<button type="button" data-a="cfg" data-k="' + k + '" data-v="' + (v + 1) + '"' + dis + " aria-label=\"Plus\">+</button></div></div>";
    }
    return '<div class="mp-cfg-row"><span>Source<small>officiels, tes imports, ou les deux</small></span></div>' +
      '<div class="mp-src">' + srcBtns + "</div>" +
      step("rounds", cfg.rounds, 1, 10, "Manches", "manches") +
      step("listens", cfg.listens, 1, 2, "Écoutes du mème", "écoute(s)") +
      step("imit", cfg.imit, 4, 15, "Temps pour imiter", "secondes") +
      '<div class="mp-cfg-row"><span>Type de sons<small>vraies voix et chansons, ou aussi les effets</small></span></div>' +
      '<div class="pills">' + kindBtns + "</div>" +
      '<div class="mp-cfg-row"><span>Difficulté<small>filtre la banque de mèmes</small></span></div>' +
      '<div class="pills">' + diffBtns + "</div>" +
      '<div class="mp-cfg-row"><span>Catégories<small>aucune sélection = toutes</small></span></div>' +
      '<div class="mp-cats">' + cats + "</div>";
  }

  function libHtml() {
    var list = isHost ? custom : sharedCustom;
    var rows = list.map(function (m) {
      var meta = metaOfCustom(m);
      var thumb = m.img ? '<img src="' + esc(m.img) + '" alt="">' : '<span class="mp-lib-thumb">🎵</span>';
      return '<div class="mp-lib-item">' + thumb +
        "<div><b>" + esc(m.name) + "</b><small>" + esc(catLabel(m.cat)) + " · " + diffLabel(Number(m.diff) || 2) + " · " + (Number(m.dur) || 0).toFixed(1) + "s</small></div>" +
        '<div class="acts">' +
        '<button type="button" class="mp-iconbtn" data-a="previewMeme" data-v="' + esc(m.id) + '" aria-label="Écouter">▶</button>' +
        (isHost ? '<button type="button" class="mp-iconbtn" data-a="shareMeme" data-v="' + esc(m.id) + '" aria-label="Partager">' + (m.shared ? "🤝" : "🔒") + "</button>" : "") +
        (isHost ? '<button type="button" class="mp-iconbtn" data-a="delMeme" data-v="' + esc(m.id) + '" aria-label="Supprimer">🗑️</button>' : "") +
        "</div></div>";
    }).join("");
    return (isHost
      ? '<div class="row between" style="margin-bottom:8px"><span class="mp-count">' + list.length + " mème(s) importé(s)</span>" +
        '<button type="button" class="btn" data-a="addMeme">➕ Ajouter un mème</button></div>'
      : '<p class="hint" style="margin-top:0">' + (list.length ? "Mèmes partagés par l’hôte :" : "L’hôte n’a pas encore partagé de mème perso.") + "</p>") +
      (rows ? '<div class="mp-lib-list">' + rows + "</div>" : "") +
      '<p class="hint">MP3, WAV, OGG, M4A ou vidéo (MP4, WebM, MOV) : choisis le passage exact de 2 à 10 secondes. Les imports restent sur ton appareil, et sont partagés au salon seulement si tu le demandes.</p>';
  }

  /** État des fichiers audio (visible par l'hôte) : dit tout de suite si sounds/v2/ est vide. */
  function sndBanner() {
    if (!isHost || !L.sndPreloaded) return "";
    var st = MimicAudio.status(MimicBank.OFFICIAL);
    if (!st.ok) {
      return '<p class="mpx-warn">⚠️ Aucun son trouvé dans <b>sounds/v2/</b>. Dans le dossier du jeu, lance <code>node tools/fetch-sounds.js</code> (voir LISEZ-MOI.md).</p>';
    }
    return '<p class="mp-small mp-muted">🔊 ' + st.ok + " son(s) prêt(s)" + (st.bad ? " · " + st.bad + " manquant(s), ignoré(s)" : "") + ".</p>";
  }

  function renderLobby() {
    var poolSize = poolFor(S.cfg.src).length;
    var hostActions = isHost
      ? '<button type="button" class="btn primary big" data-a="start"' + (S.pl.length < 2 || !poolSize ? " disabled" : "") + ">▶ Lancer la partie</button>" +
        (S.pl.length < 2 ? '<p class="hint" style="text-align:center">En attente d’au moins un autre joueur…</p>' : "") +
        (!poolSize ? '<p class="mp-error" style="text-align:center">Aucun mème ne correspond aux filtres.</p>' : "")
      : '<div class="mp-recorded">⏳ L’hôte prépare la partie…</div>';
    app().innerHTML = roomBar() +
      '<div class="mp-stack">' +
      '<section class="mp-card"><h2>👥 Joueurs</h2>' + playersHtml() +
      '<p class="hint">Partage le code <b>' + esc(code) + '</b>. 2 joueurs minimum, 8 maximum.</p>' +
      qrHtml() +
      '<button type="button" class="btn" data-a="micTest">🎙️ Tester mon micro</button>' +
      '<div class="mp-small" style="margin-top:6px;color:var(--muted)">' + (L.micOk || MimicAudio.hasMic() ? "Micro prêt ✔" : "Micro non encore autorisé") + "</div>" +
      hostActions + "</section>" +
      '<section class="mp-card"><h2>🎛️ Réglages ' + (isHost ? "" : '<span class="mp-small mp-muted">(par l’hôte)</span>') + "</h2>" +
      cfgHtml() + '<p class="mp-count">' + poolSize + " mème(s) dans la sélection</p>" + sndBanner() + "</section>" +
      "</div>" +
      '<section class="mp-card"><h2>📚 Bibliothèque de mèmes</h2>' + libHtml() + "</section>" +
      '<section class="mp-card"><h2>🎁 La roue des bonus</h2><p class="hint" style="margin-top:0">Après chaque classement, la roue tourne pour la meilleure imitation.</p><div class="pills">' +
      WHEEL.map(function (w) { return '<span class="pill">' + w.emoji + " " + w.label + "</span>"; }).join("") + "</div></section>";
    paintQr();
  }

  /* QR de partage : même code que le salon, scannable depuis un téléphone. */
  function qrHtml() {
    return '<div class="mp-qr">' +
      '<div class="mp-qr-img" id="mp-qr-img"><span class="mp-qr-load">⏳</span></div>' +
      '<div class="mp-qr-txt"><b>Scanne pour rejoindre</b>' +
      '<span class="mp-small mp-muted">Code <b style="letter-spacing:.16em">' + esc(code) + '</b></span>' +
      '<button type="button" class="btn" data-a="shareRoom">🔗 Copier le lien</button></div>' +
      "</div>";
  }

  function paintQr() {
    var box = $id("mp-qr-img");
    if (!box || !code || typeof Share === "undefined") return;
    var url = Share.url(code, "/mimicparty/index.html");
    if (box.dataset.qr === url) return;
    box.dataset.qr = url;
    Share.qrImg(url, 170).then(function (src) {
      var el = $id("mp-qr-img");
      if (!el || box.dataset.qr !== url) return;
      el.innerHTML = src
        ? '<img src="' + src + '" width="170" height="170" alt="QR code du salon ' + esc(code) + '">'
        : '<span class="mp-qr-load">QR indisponible</span>';
    }).catch(function () {
      var el = $id("mp-qr-img");
      if (el) el.innerHTML = '<span class="mp-qr-load">QR indisponible</span>';
    });
  }

  /* ---------- écoute ---------- */
  function memeHtml(m) {
    var thumb = m.img ? '<img src="' + esc(m.img) + '" alt="">' : esc(m.emoji || "🎵");
    return '<div class="mp-meme-thumb">' + thumb + "</div>" +
      '<h2 class="mp-meme-name">' + esc(m.name) + "</h2>" +
      '<div class="mp-meme-meta">' + (m.kind ? MimicBank.kind(m.kind).emoji + " " + esc(MimicBank.kind(m.kind).label) + " · " : "") + esc(catLabel(m.cat)) + " · " + (Number(m.dur) || 0).toFixed(1) + "s · " + diffLabel(Number(m.diff) || 1) + "</div>" +
      (m.say ? '<p class="mpx-say">🗣️ « ' + esc(m.say) + " »</p>" : "") +
      (m.desc ? '<p class="mp-meme-desc">' + esc(m.desc) + "</p>" : "");
  }

  function renderListen() {
    var r = S.round, m = r.meme;
    var dots = "";
    for (var i = 0; i < r.listens; i++) dots += "<i></i>";
    var soundAlert = MimicAudio.state() === "running" ? "" :
      '<button type="button" class="btn primary mp-sound-btn" data-a="soundOn">🔊 Activer le son</button>' +
      '<p class="hint" style="text-align:center">Ton téléphone bloque le son : appuie une fois pour l’entendre.</p>';
    app().innerHTML = roomBar() +
      '<div class="mp-stage">' +
      '<span class="mp-phase-tag">1 · On écoute le mème</span>' +
      '<div class="mp-meme">' + memeHtml(m) +
      '<canvas class="mp-wave" id="mp-wave" aria-label="Onde audio du mème"></canvas>' +
      '<div class="mp-progress"><i id="mp-listenbar"></i></div>' +
      '<p class="mp-listen-hint"><span class="dot">●</span> Écoute bien le son à imiter</p>' +
      soundAlert +
      '<div class="mp-attempts" id="mp-attempts" title="Écoutes autorisées">' + dots + "</div>" +
      "</div>" +
      '<p class="hint" style="text-align:center">Manche ' + r.n + " / " + S.cfg.rounds + " · l’enregistrement démarre automatiquement après l’écoute.</p>" +
      '<div class="mp-listen-actions"><button type="button" class="btn" data-a="replayMeme">🔁 Réécouter le mème</button></div>' +
      '<p class="hint" style="text-align:center">🎧 Mets des écouteurs : le micro ne doit pas réenregistrer le mème.</p>' +
      "</div>";
    if (!L.wave || L.waveRid !== r.rid) {
      ensureBuffer(m).then(function (buf) {
        if (S && S.round && S.round.rid === r.rid) {
          L.wave = MimicAudio.waveform(buf, 56); L.waveRid = r.rid; drawWaveNow();
        }
      }).catch(function () {});
    }
    scheduleRoundAudio();
  }

  function drawWaveNow() {
    var cv = $id("mp-wave"), r = S && S.round;
    if (!cv || !L.wave || !r) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth || 320, h = cv.clientHeight || 74;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    var g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var total = Math.max(1, (r.listenEnd - r.listenAt));
    var ratio = clamp((now() - r.listenAt) / total, 0, 1);
    var peaks = L.wave, n = peaks.length, bw = w / n;
    for (var i = 0; i < n; i++) {
      var bh = Math.max(3, peaks[i] * (h - 12));
      var played = (i / n) <= ratio;
      g.fillStyle = played ? "#ff2f5e" : "rgba(106,71,255,.28)";
      g.fillRect(i * bw + bw * 0.16, (h - bh) / 2, Math.max(1.4, bw * 0.68), bh);
    }
    g.fillStyle = "#1b1340";
    g.fillRect(ratio * w, 4, 2, h - 8);
  }

  /* ---------- imitation ---------- */
  function renderImitate() {
    var r = S.round;
    var remaining = secs(r.recEnd - now());
    var body;
    if (L.analyzing) {
      body = '<div class="mp-analyse"><span class="brain">🧠</span><h2>L’IA écoute ta voix…</h2><div class="mp-dots"><span></span><span></span><span></span></div></div>';
    } else if (L.submitted) {
      var sc = L.myClip ? L.myClip.score : 0;
      body = '<div class="mp-analyse"><span class="brain">✅</span><h2>Imitation envoyée !</h2>' +
        '<p class="mp-muted">La note sera révélée après l’écoute de toutes les voix.</p>' +
        (L.myClip ? '<div class="mp-recorded">Ta note locale : <b>' + sc + '/100</b> <button type="button" class="link" style="margin:0" data-a="playMine">▶ Réécouter</button></div>' : "") +
        '<p class="hint">Tu peux suivre le chrono ci-dessous.</p></div>';
    } else {
      body = '<h2>À TON TOUR <em>D’IMITER !</em></h2>' +
        '<div class="mp-big-timer" id="mp-big">' + remaining + "</div>" +
        '<div class="mp-mic-wrap"><button type="button" class="mp-mic' + (L.attempt ? " rec" : L.micBusy ? " off" : "") + '" data-a="mic" aria-label="Démarrer ou arrêter l’enregistrement">' +
        (L.attempt ? "⏹️" : "🎙️") + "</button></div>" +
        '<p class="mp-mic-note" id="mp-micnote">' + (L.micBusy ? "Activation du micro…" : L.attempt ? "Enregistrement… appuie pour arrêter" : L.micErr || "Ton micro s’ouvre automatiquement") + "</p>" +
        '<canvas class="mp-rec-canvas" id="mp-reccanvas" aria-label="Niveau du micro"></canvas>' +
        '<div class="mp-progress slim"><i id="mp-recbar"></i></div>' +
        '<p class="hint">Une seule tentative. Imite le timbre, le rythme et l’énergie — pas besoin de chanter juste.</p>';
    }
    app().innerHTML = roomBar() +
      '<div class="mp-stage mp-imit">' +
      '<span class="mp-phase-tag">2 · On imite le mème</span>' +
      '<div class="mp-meme" style="padding:10px 12px;margin-bottom:10px"><div class="mp-small mp-muted">' + esc(r.meme.emoji || "🎵") + " " + esc(r.meme.name) + " · " + (r.meme.dur || 0).toFixed(1) + "s" + (r.meme.say ? " · 🗣️ « " + esc(r.meme.say) + " »" : "") + "</div></div>" +
      body +
      '<p class="hint">' + S.submitted.length + " / " + S.pl.length + " imitation(s) envoyée(s)</p>" +
      (isHost ? '<button type="button" class="link" data-a="forceCollect">Passer à l’écoute des imitations →</button>' : "") +
      "</div>";
  }

  function renderCollect() {
    app().innerHTML = roomBar() +
      '<div class="mp-stage mp-analyse">' +
      '<span class="mp-phase-tag">Analyse</span>' +
      '<span class="brain">🧠</span>' +
      "<h2>L’IA compare les voix…</h2>" +
      '<div class="mp-dots"><span></span><span></span><span></span></div>' +
      '<p class="mp-muted">' + S.submitted.length + " / " + S.pl.length + " imitation(s) reçue(s)</p>" +
      '<div class="mp-progress slim" style="max-width:320px;margin:10px auto"><i style="width:' + pct(S.submitted.length / Math.max(1, S.pl.length)) + '"></i></div>' +
      (isHost ? '<button type="button" class="btn" data-a="forceCollect" style="margin-top:12px">▶ Passer à l’écoute</button>' : "") +
      "</div>";
  }

  /* ---------- lecture des imitations ---------- */
  function renderPlayback() {
    var p = S.play;
    if (!p) { app().innerHTML = roomBar() + '<div class="mp-wait">Chargement…</div>'; return; }
    var soundAlert = MimicAudio.state() === "running" ? "" :
      '<button type="button" class="btn primary mp-sound-btn" data-a="soundOn">🔊 Activer le son</button>';
    var cards = p.items.map(function (it, i) {
      var bars = "";
      for (var b = 0; b < 22; b++) {
        var h = 14 + Math.round(70 * Math.abs(Math.sin((i + 1) * 1.7 + b * 0.55)));
        bars += '<i style="height:' + h + '%"></i>';
      }
      return '<div class="mp-clip" data-clip="' + esc(it.id) + '">' +
        '<div class="mp-clip-head"><span class="av">' + esc(it.av || AVATAR) + "</span><b>" + esc(it.n) + "</b>" +
        '<span class="tag">' + (it.forfait ? "😶 forfait" : "🎙️ imitation") + "</span>" + voteBtn(it) + "</div>" +
        '<div class="mp-bars">' + bars + "</div></div>";
    }).join("");
    app().innerHTML = roomBar() +
      '<div class="mp-stage">' +
      '<span class="mp-phase-tag">3 · On écoute les imitations</span>' +
      '<h2 style="text-align:center">Chaque voix passe à tour de rôle</h2>' +
      soundAlert +
      '<div class="mp-progress slim"><i id="mp-playbar"></i></div>' +
      (canVote() ? '<p class="hint" style="text-align:center;margin:4px 0">❤️ Touche le cœur de ton imitateur préféré (pas toi !) : +' + FAV_BONUS + " pts pour le coup de cœur.</p>" : "") +
      cards +
      '<p class="hint" style="text-align:center">🔇 Micro coupé · écoute bien, la note arrive juste après.</p>' +
      "</div>";
    paintVotes();
    schedulePlayback();
  }

  /* ---------- notes ---------- */
  function renderScores() {
    var rows = S.scores || [];
    var lines = rows.map(function (r, i) {
      var v = MimicScore.verdict(r.score);
      var parts = r.parts && !r.forfait ? '<div class="mpx-parts">' + PARTS.map(function (p) {
        var val = clamp(Number(r.parts[p.k]) || 0, 0, 100);
        var c = val >= 75 ? "#1fb856" : val >= 45 ? "#f0a000" : "#ee2f5e";
        return '<span class="mpx-p"><em>' + p.label + " <b>" + val + '</b></em><i style="--v:' + val + "%;--c:" + c + '"></i></span>';
      }).join("") + "</div>" : "";
      var fl = r.x && r.x.fl ? r.x.fl : "";
      var chips = "";
      if (r.bonus) chips += '<span class="mpx-chip">🎯 Quasi parfait +' + r.bonus + "</span>";
      if (/copy/.test(fl)) chips += '<span class="mpx-chip warn">🎧 Original rejoué ?</span>';
      if (/noisy/.test(fl)) chips += '<span class="mpx-chip warn">💨 Du souffle, pas une voix</span>';
      var tip = r.id === ME && r.x && r.x.tip && !r.forfait ? '<p class="mpx-tip">💡 ' + esc(MimicScore.tipText(r.x.tip)) + "</p>" : "";
      var verdict = r.forfait ? "" : '<div class="mpx-verdict ' + v.tone + '">' + v.emoji + " " + esc(v.label) + "</div>";
      return '<div class="mp-score-line' + (i === 0 ? " best" : "") + '" data-line="' + i + '">' +
        '<span class="rk">' + (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".") + "</span>" +
        '<span class="av">' + esc(r.av || AVATAR) + "</span>" +
        '<div class="body"><span class="nm">' + esc(r.n) + (r.forfait ? ' <span class="mp-small mp-muted">(forfait)</span>' : "") + "</span>" +
        verdict + (chips ? '<div class="mpx-chips">' + chips + "</div>" : "") + parts + tip + "</div>" +
        voteBtn(r) +
        '<button type="button" class="mp-iconbtn" data-a="playClip" data-v="' + esc(r.id) + '" aria-label="Réécouter">▶</button>' +
        '<span class="note" data-target="' + r.score + '">0</span>' +
        '<span class="pt">/100</span></div>';
    }).join("");
    app().innerHTML = roomBar() +
      '<div class="mp-stage">' +
      '<span class="mp-phase-tag">4 · On découvre les notes</span>' +
      '<h2 style="text-align:center">Ressemblance avec l’original</h2>' +
      '<p class="hint" style="text-align:center;margin-top:0">Sons, mélodie, rythme, intensité, pauses et tempo — pas la beauté de la voix.</p>' +
      (canVote() ? '<p class="hint" style="text-align:center;margin:4px 0">❤️ Dernière chance de voter pour ton coup de cœur (+' + FAV_BONUS + " pts).</p>" : "") +
      lines +
      '<p class="hint" style="text-align:center">La roue des bonus va départager le meilleur imitateur…</p>' +
      "</div>";
    paintVotes();
    updateScores();
  }

  function updateScores() {
    if (!S || !S.scores || !S.revealAt) return;
    var t = now();
    var lines = document.querySelectorAll(".mp-score-line");
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i];
      var due = S.revealAt + i * 520;
      if (t >= due && el.dataset.on !== "1") {
        el.dataset.on = "1";
        el.classList.add("revealed");
        var note = el.querySelector(".note");
        animateNumber(note, Number(note && note.dataset.target) || 0, 650);
        MimicAudio.sfx(i === 0 ? "ding" : "tick");
      }
    }
  }

  function animateNumber(el, target, ms) {
    if (!el) return;
    var start = performance.now();
    function step(ts) {
      var k = clamp((ts - start) / ms, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ---------- roue ---------- */
  function renderWheel() {
    var w = S.wheel;
    var labels = WHEEL.map(function (x, i) {
      /* position sur le cercle : angle mesuré depuis le haut, dans le sens horaire */
      var rad = (i * 72 + 36) * Math.PI / 180;
      var left = 50 + Math.sin(rad) * 33;
      var top = 50 - Math.cos(rad) * 33;
      return '<span class="lbl" style="left:' + left.toFixed(1) + '%;top:' + top.toFixed(1) + '%">' +
        x.emoji + "<br>" + x.label + "</span>";
    }).join("");
    app().innerHTML = roomBar() +
      '<div class="mp-stage mp-wheel-wrap">' +
      '<span class="mp-phase-tag">Bonus</span>' +
      "<h2>La roue des bonus</h2>" +
      '<p class="mp-muted">Pour <b>' + esc(w.n) + "</b></p>" +
      '<div class="mp-wheel-pointer">▼</div>' +
      '<div class="mp-wheel" id="mp-wheel">' + labels + '<div class="hub">🎁</div></div>' +
      '<div class="mp-wheel-result" id="mp-wheel-result">' + w.emoji + " " + esc(w.label) +
      (w.bonus > 0 ? " · +" + w.bonus + " pts" : "") +
      (w.steal ? " à " + esc(w.steal) : "") + "</div>" +
      '<p class="hint">Le bonus est déjà ajouté au classement.</p>' +
      "</div>";
    var wheel = $id("mp-wheel");
    if (wheel) {
      setTimeout(function () {
        if (!wheel) return;
        wheel.style.transform = "rotate(" + w.angle + "deg)";
        MimicAudio.sfx("whoosh");
      }, 60);
    }
    updateWheel();
  }

  function updateWheel() {
    if (!S || !S.wheel) return;
    var el = $id("mp-wheel-result");
    if (!el) return;
    if (now() >= S.wheel.at + 3200 && el.dataset.on !== "1") {
      el.dataset.on = "1";
      el.classList.add("show");
      MimicAudio.sfx("ding");
    }
  }

  /* ---------- fin de manche ---------- */
  function renderRoundEnd() {
    var ranked = S.pl.slice().sort(function (a, b) { return b.sc - a.sc; });
    var rows = ranked.map(function (p, i) {
      return '<div class="prow ' + (p.id === ME ? "me" : "") + '"><span>' + (i + 1) + ". " + esc(p.av || AVATAR) + " " + esc(p.n) + "</span>" +
        '<span class="pts">' + p.sc + "</span></div>";
    }).join("");
    var last = S.scores || [];
    var favHtml = S.fav ? '<div class="mpx-fav">❤️ Coup de cœur du public : <b>' + esc(S.fav.av || AVATAR) + " " + esc(S.fav.n) + "</b> · +" + S.fav.bonus + " pts (" + S.fav.v + " vote" + (S.fav.v > 1 ? "s" : "") + ")</div>" : "";
    app().innerHTML = roomBar() +
      '<div class="mp-stage">' +
      '<span class="mp-phase-tag">Manche ' + S.r + " / " + S.cfg.rounds + "</span>" +
      '<h2 style="text-align:center">Récap de la manche</h2>' + favHtml +
      '<div class="mp-card" style="box-shadow:none">' + last.map(function (r, i) {
        return '<div class="mp-score-line"><span class="rk">' + (i + 1) + '.</span><span class="av">' + esc(r.av || AVATAR) + "</span>" +
          '<span class="nm">' + esc(r.n) + (r.bonus ? ' <span class="mp-small mp-muted">+' + r.bonus + "</span>" : "") + '</span><span class="note" style="background:var(--mp-lime)">' + r.score + "</span></div>";
      }).join("") + "</div>" +
      "<h2>🏆 Classement général</h2>" + rows +
      (isHost ? '<button type="button" class="btn primary big" data-a="next">' + (S.r >= S.cfg.rounds ? "Voir le podium" : "Manche suivante") + "</button>" : '<p class="hint" style="text-align:center" data-countdown>La suite démarre automatiquement…</p>') +
      "</div>";
  }

  function renderEnd() {
    var ranked = S.pl.slice().sort(function (a, b) { return b.sc - a.sc; });
    var podium = ranked.slice(0, 3).map(function (p, i) {
      var med = ["🥇", "🥈", "🥉"][i] || (i + 1) + ".";
      return '<div class="podium-row ' + (i === 0 ? "first" : "") + '"><span class="medal">' + med + "</span>" +
        "<span>" + esc(p.av || AVATAR) + " " + esc(p.n) + "</span>" +
        '<span class="pts">' + p.sc + "</span></div>";
    }).join("");
    var rest = ranked.slice(3).map(function (p, i) {
      return '<div class="prow"><span>' + (i + 4) + ". " + esc(p.n) + '</span><span class="pts">' + p.sc + "</span></div>";
    }).join("");
    app().innerHTML = roomBar() +
      '<div class="mp-stage">' +
      '<span class="mp-phase-tag">Fin de partie</span>' +
      '<h1 style="font-size:clamp(1.7rem,7vw,2.4rem)">Le meilleur imitateur est…</h1>' +
      '<div class="mp-podium">' + podium + "</div>" + rest +
      recapHtml() +
      '<div id="mp-end"></div>' +
      '<p class="hint" style="text-align:center">Les points de la soirée sont envoyés au classement du salon.</p>' +
      "</div>";
    Party.endCard("#mp-end", { code: code, isHost: isHost, R: R });
    refreshRecapUI();
  }

  /* ============================================================
     BOUCLE D'AFFICHAGE
     ============================================================ */
  function ticker() {
    requestAnimationFrame(ticker);
    if (!S) return;
    var aud = MimicAudio.state();
    if (aud !== L.audioState) {
      L.audioState = aud;
      if (S.ph === "listen" || S.ph === "playback") { L.sig = ""; render(); }
    }
    if (!S.round) return;
    var t = now();

    if (S.round) {
      if (L.rid !== S.round.rid) {
        L.rid = S.round.rid;
        L.sub = ""; L.autoTried = false; L.attemptDone = false; L.submitted = false;
        L.myClip = null; L.analyzing = false; L.lastTick = 0;
        Object.keys(L.clipBufs).forEach(function (k) { if (L.clipBufs[k].round !== S.round.rid) delete L.clipBufs[k]; });
        L.wave = null; L.waveRid = "";
        /* Ne PAS vider audioRid/audioLoading ici : la planification du mème
           peut être déjà en cours pour cette même manche (renderListen l'a
           lancée), et la vider provoquerait un second envoi en parallèle. */
        L.origFeat = null; L.origRid = "";
      }
      /* après un rechargement en pleine manche, ne pas rejouer une tentative déjà envoyée */
      if (!L.submitted && S.submitted.indexOf(ME) >= 0 &&
          (S.ph === "imitate" || S.ph === "collect" || S.ph === "playback" || S.ph === "scores")) {
        L.submitted = true; L.sig = "";
      }
      if (S.ph === "listen" || S.ph === "imitate") {
        var sub = t < S.round.recStart ? "listen" : "imitate";
        if (sub !== L.sub) { L.sub = sub; L.sig = ""; render(); }
        if (sub === "imitate" && !L.autoTried && !L.attemptDone && !L.submitted && t >= S.round.recStart && t < S.round.recEnd - 400) {
          L.autoTried = true;
          beginAttempt(false);
        }
        if (t >= S.round.recEnd && L.attempt) stopAttempt();
      }
      /* micro refusé / indisponible : on envoie un forfait pour ne pas bloquer la manche */
      if ((S.ph === "imitate" || S.ph === "collect") && !L.submitted && !L.attempt && !L.analyzing && !L.micBusy &&
          t >= S.round.recEnd + 300) {
        L.submitted = true; L.attemptDone = true; L.sig = "";
        submitPayload("", "", 0, 0, null, 0);
      }
      if (S.ph === "listen" || S.ph === "imitate") updateListenView(t);
      if (S.ph === "playback") updatePlayback(t);
      if (S.ph === "scores") { updateScores(); requestMissingClips(); }
      if (S.ph === "wheel") updateWheel();
      if ((S.ph === "scores" || S.ph === "wheel" || S.ph === "roundEnd" || S.ph === "end") && t - (L.recapT || 0) > 300) {
        L.recapT = t; captureRecap(); fillRecap();
      }
      if (S.ph === "roundEnd" && S.nextAt) {
        var el = document.querySelector("[data-countdown]");
        if (el) el.textContent = "La suite démarre dans " + secs(S.nextAt - t) + "s…";
      }
    }
    if (S.ph === "collect" && L.attempt) stopAttempt();
  }

  function updateListenView(t) {
    var r = S.round;
    if (S.ph === "listen") {
      var bar = $id("mp-listenbar");
      if (bar) bar.style.width = pct((t - r.listenAt) / Math.max(1, r.listenEnd - r.listenAt));
      drawWaveNow();
      var dots = document.querySelectorAll("#mp-attempts i");
      if (dots.length) {
        for (var i = 0; i < dots.length; i++) {
          var segStart = r.listenAt + i * (r.segDur + r.gap);
          dots[i].classList.toggle("on", t < segStart + r.segDur);
        }
      }
      var left = secs(r.recStart - t);
      var tick = left > 0 ? left : 0;
      if (tick > 0 && tick <= 3 && L.lastTick !== tick) {
        L.lastTick = tick; MimicAudio.sfx("tick");
      }
    } else if (S.ph === "imitate") {
      var big = $id("mp-big");
      if (big) {
        var rem = secs(r.recEnd - t);
        big.textContent = rem;
        big.classList.toggle("low", rem <= 3);
        if (rem <= 3 && rem > 0 && L.lastTick !== rem) { L.lastTick = rem; MimicAudio.sfx("tick"); }
      }
      var rbar = $id("mp-recbar");
      if (rbar) rbar.style.width = pct((r.recEnd - t) / Math.max(1, r.recEnd - r.recStart));
    }
  }

  function updatePlayback(t) {
    if (!S.play) return;
    var items = S.play.items;
    var active = -1;
    for (var i = 0; i < items.length; i++) {
      if (t >= items[i].at && t < items[i].at + items[i].slot) { active = i; break; }
    }
    var cards = document.querySelectorAll("[data-clip]");
    for (i = 0; i < cards.length; i++) cards[i].classList.toggle("now", i === active);
    var bar = $id("mp-playbar");
    if (bar) bar.style.width = pct((t - S.play.at) / Math.max(1, S.play.endAt - S.play.at));
    schedulePlayback();
    requestMissingClips();
  }

  function drawMic(level, buf) {
    var cv = $id("mp-reccanvas");
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth || 320, h = cv.clientHeight || 84;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var color = level > 0.16 ? "#ff2f5e" : "#6a47ff";
    if (buf) {
      g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
      for (var i = 0; i < buf.length; i += 4) {
        var x = (i / buf.length) * w;
        var y = h / 2 + ((buf[i] - 128) / 128) * (h * 0.44);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    } else {
      g.fillStyle = color;
      var bw = 8, n = Math.floor(w / bw);
      for (var b = 0; b < n; b++) {
        var hh = (0.2 + Math.abs(Math.sin(b + performance.now() / 120)) * 0.8) * (h - 10) * clamp(level * 3, 0.2, 1);
        g.fillRect(b * bw + 2, (h - hh) / 2, 4, hh);
      }
    }
    var mic = document.querySelector(".mp-mic");
    if (mic) mic.classList.toggle("hot", level > 0.05);
  }

  /* ============================================================
     ACTIONS UI
     ============================================================ */
  function setCfg(k, v) {
    if (!isHost || !S) return;
    var n = Math.round(Number(v));
    if (!isFinite(n)) return;
    if (k === "rounds") S.cfg.rounds = clamp(n, 1, 10);
    else if (k === "listens") S.cfg.listens = clamp(n, 1, 2);
    else if (k === "imit") S.cfg.imit = clamp(n, 4, 15);
    else if (k === "diff") S.cfg.diff = clamp(n, 0, 3);
    else if (k === "kind") S.cfg.kind = n ? 1 : 0;
    broadcast(true);
    render();
  }

  function toggleCat(id) {
    if (!isHost || !S) return;
    var i = S.cfg.cats.indexOf(id);
    if (i >= 0) S.cfg.cats.splice(i, 1); else S.cfg.cats.push(id);
    broadcast(true);
    render();
  }

  function shareRoom() {
    var url = location.origin + "/mimicparty/index.html?c=" + code;
    if (navigator.share) {
      navigator.share({ title: "Mimic Party", text: "Rejoins ma partie, code " + code, url: url }).catch(function () {});
      return;
    }
    try {
      navigator.clipboard.writeText(url).then(function () { toast("Lien copié ✔"); });
    } catch (e) { prompt("Copie ce lien :", url); }
  }

  function leaveRoom() {
    if (!R) { renderHome(); return; }
    var question = isHost
      ? "Quitter le salon ? La partie s’arrêtera pour les autres joueurs."
      : "Quitter le salon et revenir à l’accueil ?";
    if (!confirm(question)) return;
    MimicAudio.stopAll();
    MimicAudio.releaseMic();
    var rr = R;
    if (!isHost) {
      try { rr.emit("act", { k: "leave", p: ME }, "host").catch(function () {}); } catch (e) {}
    }
    try { rr.leave(); } catch (e) {}
    stopHostLoop();
    if (L.hello) { clearInterval(L.hello); L.hello = null; }
    if (L.sessT) { clearInterval(L.sessT); L.sessT = null; }
    R = null; code = ""; S = null; isHost = false;
    Sess.clear("mp");
    renderHome();
  }

  function playClip(id) {
    var buf = clipFor(id);
    if (buf) {
      MimicAudio.ensureRunning().then(function () {
        MimicAudio.stopAll(); MimicAudio.playBuffer(buf, { gain: volGain() });
      }).catch(function () { toast("Son bloqué : appuie sur « Activer le son »."); });
      return;
    }
    if (isHost && L.subs[id] && L.subs[id].data) {
      MimicAudio.decodeClip(L.subs[id]).then(function (b) {
        return MimicAudio.ensureRunning().then(function () {
          MimicAudio.stopAll(); MimicAudio.playBuffer(b, { gain: volGain() });
        });
      }).catch(function () { toast("Extrait indisponible"); });
      return;
    }
    requestMissingClips();
    toast("Extrait en cours de réception…");
  }

  function playMine() {
    if (!L.myClip || !L.myClip.buf) return;
    MimicAudio.ensureRunning().then(function () {
      MimicAudio.stopAll(); MimicAudio.playBuffer(L.myClip.buf, { gain: volGain() });
    }).catch(function () { toast("Son bloqué : appuie sur « Activer le son »."); });
  }

  /* ============================================================
     RÉCAP DE LA SOIRÉE
     ============================================================ */
  function captureRecap() {
    if (!S || !S.round || !S.scores || !S.scores.length) return;
    if (L.recap.length && L.recap[0].gid !== S.gid) { L.recap = []; L.fav = {}; }
    if (L.recap.some(function (e) { return e.rid === S.round.rid; })) return;
    var m = S.round.meme;
    L.recap.push({
      rid: S.round.rid, gid: S.gid, n: S.r,
      meme: { id: m.id, name: m.name, emoji: m.emoji || "🎵", say: m.say || "", custom: !!m.custom, kind: m.kind || "" },
      rows: S.scores.map(function (r) {
        return { id: r.id, n: r.n, av: r.av, score: r.score, parts: r.parts, forfait: !!r.forfait, x: r.x || null, bonus: r.bonus || 0, buf: null };
      }),
      votes: {}, fav: ""
    });
  }

  /** Garde une copie des imitations de la manche en cours (elles sont effacées à la manche suivante). */
  function fillRecap() {
    if (!S || !S.round || !L.recap.length) return;
    var e = L.recap.find(function (x) { return x.rid === S.round.rid; });
    if (!e) return;
    e.rows.forEach(function (r) {
      if (r.buf || r.forfait) return;
      var b = r.id === ME && L.myClip && L.myClip.buf ? L.myClip.buf : clipFor(r.id);
      if (b) r.buf = b;
    });
    if (S.ph === "wheel" || S.ph === "roundEnd" || S.ph === "end") {
      var counts = {};
      Object.keys(S.votes || {}).forEach(function (v) { var t = S.votes[v]; counts[t] = (counts[t] || 0) + 1; });
      e.votes = counts; e.fav = S.fav ? S.fav.id : "";
    }
  }

  function slug(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "x";
  }
  function recRow(key) {
    var p = String(key).split(":"), e = L.recap[Number(p[0])];
    var r = e && e.rows[Number(p[1])];
    return e && r ? { e: e, r: r } : null;
  }
  function recName(o) { return "manche" + o.e.n + "_" + slug(o.e.meme.name) + "_" + slug(o.r.n) + "_" + o.r.score + ".wav"; }
  function allKeys() {
    var out = [];
    L.recap.forEach(function (e, ei) { e.rows.forEach(function (r, ri) { if (!r.forfait && r.buf) out.push(ei + ":" + ri); }); });
    return out;
  }
  function autoKeys() {
    var out = [];
    L.recap.forEach(function (e, ei) {
      var best = -1, sc = -1;
      e.rows.forEach(function (r, ri) { if (!r.forfait && r.buf && r.score > sc) { sc = r.score; best = ri; } });
      if (best >= 0) out.push(ei + ":" + best);
    });
    return out;
  }
  function selectedKeys() {
    var sel = Object.keys(L.fav).filter(function (k) { return L.fav[k] && recRow(k) && recRow(k).r.buf; });
    if (sel.length) return sel;
    var auto = autoKeys();
    if (auto.length) toast("Aucun ⭐ : je prends la meilleure imitation de chaque manche");
    return auto;
  }

  function recapHtml() {
    var rec = L.recap || [];
    if (!rec.length) return "";
    var rounds = rec.map(function (e, ei) {
      var rows = e.rows.map(function (r, ri) {
        var key = ei + ":" + ri, v = MimicScore.verdict(r.score);
        if (r.forfait) {
          return '<div class="mpx-rec"><span class="av">' + esc(r.av || AVATAR) + '</span><span class="nm">' + esc(r.n) + '</span><span class="mp-small mp-muted">forfait</span></div>';
        }
        var dis = r.buf ? "" : " disabled";
        return '<div class="mpx-rec" data-key="' + key + '"><span class="av">' + esc(r.av || AVATAR) + "</span>" +
          '<span class="nm">' + esc(r.n) + '<small class="' + v.tone + '">' + v.emoji + " " + esc(v.label) + "</small></span>" +
          '<span class="mpx-sc ' + v.tone + '">' + r.score + "</span>" +
          '<span class="mpx-btns">' +
          '<button type="button" class="mp-iconbtn" data-a="recPlay" data-v="' + key + '" aria-label="Écouter l’imitation"' + dis + ">▶</button>" +
          '<button type="button" class="mp-iconbtn" data-a="recDuel" data-v="' + key + '" title="Original puis imitation" aria-label="Original puis imitation"' + dis + ">🔁</button>" +
          '<button type="button" class="mp-iconbtn mpx-star" data-a="recFav" data-v="' + key + '" aria-label="Garder" aria-pressed="false"' + dis + ">☆</button>" +
          '<button type="button" class="mp-iconbtn" data-a="recOne" data-v="' + key + '" aria-label="Télécharger"' + dis + ">⬇</button>" +
          "</span></div>";
      }).join("");
      return '<div class="mpx-round"><div class="mpx-round-head"><span class="mpx-rn">Manche ' + e.n + "</span><b>" + esc(e.meme.emoji) + " " + esc(e.meme.name) + "</b>" +
        (e.meme.say ? "<small>« " + esc(e.meme.say) + " »</small>" : "") + "</div>" + rows + "</div>";
    }).join("");
    return '<section class="mpx-recap"><h2>🎬 Le récap de la soirée</h2>' + awardsHtml() +
      '<p class="hint" style="margin:8px 0">▶ écouter · 🔁 original puis imitation · ☆ garder · ⬇ télécharger</p>' +
      '<div class="mpx-toolbar">' +
      '<button type="button" class="btn" data-a="recAuto">✨ Garder les meilleures</button>' +
      '<button type="button" class="btn primary" data-a="recZip">⬇ Télécharger (ZIP)</button>' +
      '<button type="button" class="btn" data-a="recBest">🎞️ Best-of en 1 fichier</button>' +
      '<button type="button" class="btn" data-a="recShare">📤 Partager</button>' +
      '<span class="mp-small mp-muted" id="mpx-count"></span></div>' + rounds + "</section>";
  }

  function awardsHtml() {
    var stats = {}, best = null, flop = null, total = 0, votes = {};
    L.recap.forEach(function (e) {
      e.rows.forEach(function (r) {
        if (r.forfait) return;
        total++;
        var st = stats[r.id] || (stats[r.id] = { id: r.id, n: r.n, av: r.av, sc: [], timbre: [], pitch: [], rhythm: [] });
        st.sc.push(r.score);
        if (r.parts) ["timbre", "pitch", "rhythm"].forEach(function (k) { st[k].push(Number(r.parts[k]) || 0); });
        if (!best || r.score > best.r.score) best = { r: r, e: e };
        if (!flop || r.score < flop.r.score) flop = { r: r, e: e };
      });
      Object.keys(e.votes || {}).forEach(function (id) { votes[id] = (votes[id] || 0) + e.votes[id]; });
    });
    var list = Object.keys(stats).map(function (k) { return stats[k]; });
    if (!list.length) return "";
    function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
    function top(key, min) {
      var c = list.filter(function (p) { return p[key].length; }).sort(function (a, b) { return avg(b[key]) - avg(a[key]); })[0];
      return c && avg(c[key]) >= min ? c : null;
    }
    var out = [];
    out.push(["🏆", "Meilleure imitation", best.r.av + " " + best.r.n, best.r.score + "/100 sur « " + best.e.meme.name + " »"]);
    if (list.length >= 2) {
      var t = top("timbre", 35), p = top("pitch", 40), r = top("rhythm", 40);
      if (t) out.push(["🗣️", "Bouche à sons", t.av + " " + t.n, "sons fidèles à " + Math.round(avg(t.timbre)) + " %"]);
      if (p) out.push(["🎼", "Oreille d’or", p.av + " " + p.n, "mélodie à " + Math.round(avg(p.pitch)) + " %"]);
      if (r) out.push(["🥁", "Métronome", r.av + " " + r.n, "rythme à " + Math.round(avg(r.rhythm)) + " %"]);
      var reg = list.filter(function (q) { return q.sc.length >= 3 && avg(q.sc) >= 40; }).map(function (q) {
        var m = avg(q.sc), sd = Math.sqrt(avg(q.sc.map(function (x) { return (x - m) * (x - m); })));
        return { q: q, sd: sd };
      }).sort(function (a, b) { return a.sd - b.sd; })[0];
      if (reg) out.push(["🎯", "Mister Régulier", reg.q.av + " " + reg.q.n, "toujours autour de " + Math.round(avg(reg.q.sc)) + " pts"]);
    }
    if (total >= 3 && flop && flop.r.score < 30) out.push(["💔", "Plus gros flop", flop.r.av + " " + flop.r.n, flop.r.score + "/100 sur « " + flop.e.meme.name + " »"]);
    var vid = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
    if (vid && stats[vid]) out.push(["❤️", "Chouchou du public", stats[vid].av + " " + stats[vid].n, votes[vid] + " vote" + (votes[vid] > 1 ? "s" : "")]);
    return '<div class="mpx-awards">' + out.map(function (a) {
      return '<div class="mpx-award"><span class="ic">' + a[0] + "</span><div><b>" + esc(a[1]) + "</b><span>" + esc(a[2]) + " · " + esc(a[3]) + "</span></div></div>";
    }).join("") + "</div>";
  }

  function refreshRecapUI() {
    var stars = document.querySelectorAll(".mpx-star");
    var n = 0;
    for (var i = 0; i < stars.length; i++) {
      var on = !!L.fav[stars[i].dataset.v];
      if (on) n++;
      stars[i].textContent = on ? "⭐" : "☆";
      stars[i].setAttribute("aria-pressed", on ? "true" : "false");
      stars[i].classList.toggle("on", on);
    }
    var c = $id("mpx-count");
    if (c) c.textContent = n ? n + " gardé(s)" : "";
  }

  function recPlay(key) {
    var o = recRow(key);
    if (!o || !o.r.buf) return;
    MimicAudio.ensureRunning().then(function () {
      MimicAudio.stopAll(); MimicAudio.playBuffer(o.r.buf, { gain: volGain() });
    }).catch(function () { toast("Son bloqué : touche l’écran puis réessaie."); });
  }

  function recDuel(key) {
    var o = recRow(key);
    if (!o || !o.r.buf) return;
    ensureBuffer(o.e.meme).then(function (orig) {
      return MimicAudio.ensureRunning().then(function () {
        MimicAudio.stopAll();
        MimicAudio.playBuffer(orig, { gain: volGain() });
        MimicAudio.playBuffer(o.r.buf, { gain: volGain(), delay: orig.duration + 0.45 });
      });
    }).catch(function () { toast("Original indisponible, j’écoute juste l’imitation."); recPlay(key); });
  }

  function recFav(key) {
    L.fav[key] = !L.fav[key];
    refreshRecapUI();
  }

  function recAuto() {
    L.fav = {};
    autoKeys().forEach(function (k) { L.fav[k] = true; });
    refreshRecapUI();
    toast("⭐ Meilleure imitation de chaque manche gardée");
  }

  function recOne(key) {
    var o = recRow(key);
    if (!o || !o.r.buf) return;
    MimicAudio.saveBlob(MimicAudio.wavBlob(o.r.buf), recName(o));
  }

  function filesFor(keys) {
    return keys.map(function (k) { var o = recRow(k); return o && o.r.buf ? { name: recName(o), blob: MimicAudio.wavBlob(o.r.buf) } : null; }).filter(Boolean);
  }

  function recZip() {
    if (L.busy) return;
    var files = filesFor(selectedKeys());
    if (!files.length) { toast("Rien à télécharger pour l’instant"); return; }
    L.busy = "zip";
    MimicAudio.zip(files).then(function (blob) {
      MimicAudio.saveBlob(blob, "mimic-party-" + (code || "soiree") + ".zip");
      toast("⬇ " + files.length + " enregistrement(s) téléchargé(s)");
    }).catch(function () { toast("ZIP impossible sur ce navigateur"); }).then(function () { L.busy = ""; });
  }

  function recBest() {
    if (L.busy) return;
    var keys = selectedKeys(), bufs = [];
    keys.forEach(function (k) { var o = recRow(k); if (o) { bufs.push(BUFS.get(o.e.meme.id) || null); bufs.push(o.r.buf); } });
    var out = MimicAudio.concat(bufs.filter(Boolean), 0.5);
    if (!out) { toast("Rien à assembler pour l’instant"); return; }
    MimicAudio.saveBlob(MimicAudio.wavBlob(out), "mimic-party-best-of.wav");
    toast("🎞️ Best-of téléchargé (original puis imitation)");
  }

  function recShare() {
    if (L.busy) return;
    var files = filesFor(selectedKeys()).slice(0, 6);
    if (!files.length) { toast("Rien à partager pour l’instant"); return; }
    L.busy = "share";
    MimicAudio.shareFiles(files, "Mimic Party").then(function (ok) {
      if (ok) return;
      return MimicAudio.zip(files).then(function (blob) {
        MimicAudio.saveBlob(blob, "mimic-party-" + (code || "soiree") + ".zip");
        toast("Partage indisponible ici : ZIP téléchargé à la place");
      });
    }).catch(function () { toast("Partage impossible"); }).then(function () { L.busy = ""; });
  }

  /* ---------- styles des éléments ajoutés (le thème du hub n'est pas modifié) ---------- */
  function injectCss() {
    if ($id("mpx-css")) return;
    var st = document.createElement("style");
    st.id = "mpx-css";
    st.textContent =
      ".mpx-say{margin:6px 0 2px;font-weight:700;font-size:.98rem}" +
      ".mpx-warn{margin:8px 0 0;padding:8px 10px;border-radius:10px;background:rgba(255,160,0,.16);font-size:.85rem}" +
      ".mpx-warn code{font-size:.8rem}" +
      ".mpx-verdict{font-size:.84rem;font-weight:800;margin-top:2px}" +
      ".mpx-verdict.lime,.mpx-rec small.lime{color:#168a3a}.mpx-verdict.amber,.mpx-rec small.amber{color:#b36b00}.mpx-verdict.pink,.mpx-rec small.pink{color:#d6204f}" +
      ".mpx-parts{display:grid;grid-template-columns:repeat(3,1fr);gap:5px 10px;margin-top:6px}" +
      ".mpx-p{display:flex;flex-direction:column;gap:2px;font-size:.66rem;opacity:.9}.mpx-p em{font-style:normal}" +
      ".mpx-p i{display:block;height:5px;border-radius:3px;background:rgba(127,127,127,.22);position:relative;overflow:hidden}" +
      ".mpx-p i::after{content:'';position:absolute;left:0;top:0;bottom:0;width:var(--v);background:var(--c);border-radius:3px}" +
      ".mpx-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}" +
      ".mpx-chip{font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(40,190,90,.18)}.mpx-chip.warn{background:rgba(255,160,0,.22)}" +
      ".mpx-tip{margin:6px 0 0;font-size:.78rem;opacity:.85}" +
      ".mpx-vote{border:0;background:rgba(127,127,127,.16);border-radius:99px;min-width:44px;height:36px;padding:0 10px;font-size:1rem;cursor:pointer;flex:none}.mpx-vote.on{background:rgba(238,47,94,.22)}" +
      ".mpx-fav{margin:8px 0;padding:8px 12px;border-radius:12px;text-align:center;background:rgba(238,47,94,.14);font-weight:700}" +
      ".mpx-recap{margin-top:18px}" +
      ".mpx-awards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:8px 0}" +
      ".mpx-award{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(127,127,127,.12)}" +
      ".mpx-award .ic{font-size:1.5rem}.mpx-award b{display:block;font-size:.85rem}.mpx-award span{font-size:.76rem;opacity:.8}" +
      ".mpx-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 12px}" +
      ".mpx-round{margin:10px 0;padding:8px 10px;border-radius:14px;background:rgba(127,127,127,.1)}" +
      ".mpx-round-head{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin-bottom:6px}.mpx-rn{font-size:.7rem;font-weight:800;text-transform:uppercase;opacity:.65}.mpx-round-head small{opacity:.7}" +
      ".mpx-rec{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(127,127,127,.18)}.mpx-rec:first-of-type{border-top:0}" +
      ".mpx-rec .nm{flex:1;min-width:0;font-weight:700;display:flex;flex-direction:column}.mpx-rec .nm small{font-size:.7rem;font-weight:700}" +
      ".mpx-sc{font-weight:800;min-width:34px;text-align:center}.mpx-btns{display:flex;gap:4px}" +
      ".mpx-star.on{background:rgba(255,200,0,.3)}.mpx-btns button:disabled{opacity:.35}" +
      "@media(max-width:420px){.mpx-parts{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(st);
  }

  /* ============================================================
     BIBLIOTHÈQUE LOCALE
     ============================================================ */
  function loadCustom() {
    if (!window.Lib) { custom = []; return Promise.resolve(); }
    return Lib.list("mimicparty").then(function (rows) {
      custom = (rows || []).map(function (r) {
        var meta = {};
        try { meta = JSON.parse(r.ref || "{}"); } catch (e) {}
        return {
          id: r.id, name: meta.name || r.label || "Mème", emoji: "🎵",
          cat: meta.cat || "absurde", diff: Number(meta.diff) || 2, dur: Number(meta.dur) || 5,
          desc: meta.desc || "", img: meta.img || "", data: r.data || "", mime: meta.mime || "",
          shared: meta.shared !== false
        };
      }).filter(function (m) { return !!m.data; });
    }).catch(function () { custom = []; });
  }

  function saveCustom(item) {
    return Lib.put({
      id: item.id, game: "mimicparty", kind: "meme", label: item.name,
      ref: JSON.stringify({ name: item.name, cat: item.cat, diff: item.diff, dur: item.dur, desc: item.desc, img: item.img, mime: item.mime, shared: item.shared }),
      data: item.data, by: ME, partyId: code, ts: Date.now()
    }).then(function () { return Lib.trim("mimicparty", 40); });
  }

  function delCustom(id) {
    if (!isHost) return;
    var item = custom.find(function (m) { return m.id === id; });
    if (!item) return;
    if (!confirm("Supprimer « " + item.name + " » de ta bibliothèque ?")) return;
    Lib.del(id).then(function () {
      custom = custom.filter(function (m) { return m.id !== id; });
      BUFS.delete(id);
      toast("Mème supprimé");
      render();
    });
  }

  function shareCustom(id) {
    if (!isHost) return;
    var item = custom.find(function (m) { return m.id === id; });
    if (!item) return;
    item.shared = !item.shared;
    saveCustom(item);
    R.emit("meme", item.shared
      ? { id: item.id, name: item.name, cat: item.cat, diff: item.diff, dur: item.dur, desc: item.desc, img: item.img, data: item.data, mime: item.mime, shared: true }
      : { id: item.id, shared: false }
    ).catch(function () {});
    toast(item.shared ? "Mème partagé avec le salon" : "Mème repassé en privé");
    render();
  }

  function previewCustom(id) {
    var item = findCustom(id);
    if (!item) return;
    ensureBuffer(metaOfCustom(item)).then(function (buf) {
      return MimicAudio.ensureRunning().then(function () {
        MimicAudio.stopAll();
        MimicAudio.playBuffer(buf, { gain: volGain() });
      });
    }).catch(function () { toast("Audio indisponible"); });
  }

  /* ============================================================
     MODALE D'IMPORT
     ============================================================ */
  function openImport() {
    if (!isHost) return;
    IMP = {
      kind: "audio", file: null, buffer: null, probe: null, encoded: null,
      start: 0, len: 6, thumb: "", cat: "international", diff: 2, name: "", desc: "",
      busy: false, progress: 0
    };
    L.modalOpen = true;
    var m = $id("mp-modal");
    m.hidden = false; m.setAttribute("aria-hidden", "false");
    renderImport();
  }

  function closeImport() {
    if (IMP && IMP.busy) return;
    if (IMP && IMP.probe && IMP.probe.url) { try { URL.revokeObjectURL(IMP.probe.url); } catch (e) {} }
    IMP = null; L.modalOpen = false;
    var m = $id("mp-modal");
    if (m) { m.hidden = true; m.setAttribute("aria-hidden", "true"); m.innerHTML = ""; }
    MimicAudio.stopAll();
  }

  function importProgress(p) {
    IMP.progress = clamp(p, 0, 1);
    var el = $id("mp-prog");
    if (el) el.style.width = pct(IMP.progress);
  }

  function renderImport() {
    var m = $id("mp-modal");
    if (!m || !IMP) return;
    var has = IMP.buffer || IMP.probe;
    var dur = IMP.buffer ? IMP.buffer.duration : IMP.probe ? IMP.probe.duration : 0;
    var maxLen = Math.min(10, Math.max(2, Math.round((dur || 2) * 2) / 2));
    var len = clamp(IMP.len || 6, 2, maxLen);
    var maxStart = Math.max(0, (dur || 0) - len);
    var start = clamp(IMP.start || 0, 0, maxStart);
    IMP.len = len; IMP.start = start;
    var catOpts = MimicBank.CATS.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === IMP.cat ? " selected" : "") + ">" + c.emoji + " " + esc(c.label) + "</option>";
    }).join("");
    var rangeHtml = !has ? "" :
      '<div class="mp-field"><label>Extrait à imiter</label>' +
      '<input type="range" class="mp-range" data-range="start" min="0" max="' + maxStart.toFixed(2) + '" step="0.1" value="' + start.toFixed(2) + '">' +
      '<div class="mp-range-row"><span>Début ' + start.toFixed(1) + "s</span><span>sur " + dur.toFixed(1) + "s</span></div>" +
      '<input type="range" class="mp-range" data-range="len" min="2" max="' + maxLen + '" step="0.5" value="' + len.toFixed(1) + '">' +
      '<div class="mp-range-row"><span>Durée ' + len.toFixed(1) + "s</span><span>2 à 10 s</span></div></div>";
    m.innerHTML = '<div class="mp-modal-head"><h2 id="mp-modal-title">➕ Ajouter un mème</h2>' +
      '<button type="button" class="mp-iconbtn" data-a="closeImport" aria-label="Fermer">✕</button></div>' +
      '<div class="mp-tabs"><button type="button" class="pill ' + (IMP.kind === "audio" ? "on" : "") + '" data-a="importTab" data-v="audio"' + (IMP.busy ? " disabled" : "") + ">🎵 Audio</button>" +
      '<button type="button" class="pill ' + (IMP.kind === "video" ? "on" : "") + '" data-a="importTab" data-v="video"' + (IMP.busy ? " disabled" : "") + ">🎬 Vidéo</button></div>" +
      '<label class="mp-drop"><span class="ico">' + (IMP.kind === "audio" ? "🎧" : "🎞️") + "</span><b>" + (IMP.file ? esc(IMP.file.name) : "Choisir un fichier") + "</b>" +
      '<div class="mp-small mp-muted">' + (IMP.kind === "audio" ? "MP3, WAV, OGG, M4A" : "MP4, WebM, MOV — l’hôte choisit le passage") + "</div>" +
      '<input type="file" accept="' + (IMP.kind === "audio" ? "audio/*" : "video/*") + '" data-file="src"' + (IMP.busy ? " disabled" : "") + "></label>" +
      (IMP.busy ? '<div class="mp-progline"><i id="mp-prog" style="width:' + pct(IMP.progress) + '"></i></div>' : "") +
      rangeHtml +
      '<div class="mp-field"><label for="mp-meme-name">Nom du mème</label><input type="text" id="mp-meme-name" maxlength="42" value="' + esc(IMP.name) + '"' + (has ? "" : " disabled") + "></div>" +
      '<div class="row" style="gap:8px"><div class="mp-field" style="flex:1"><label for="mp-meme-cat">Catégorie</label><select id="mp-meme-cat">' + catOpts + "</select></div>" +
      '<div class="mp-field" style="flex:0 0 120px"><label for="mp-meme-diff">Difficulté</label><select id="mp-meme-diff">' +
      [1, 2, 3].map(function (d) { return '<option value="' + d + '"' + (Number(IMP.diff) === d ? " selected" : "") + ">" + diffLabel(d) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="mp-field"><label for="mp-meme-desc">Description (facultatif)</label><input type="text" id="mp-meme-desc" maxlength="90" value="' + esc(IMP.desc) + '" placeholder="Ex. le rire qui énerve tout le monde"></div>' +
      '<div class="mp-field"><label>Miniature (facultatif)</label><div class="mp-preview-thumb">' +
      (IMP.thumb ? '<img src="' + esc(IMP.thumb) + '" alt="">' : '<span class="mp-lib-thumb">🖼️</span>') +
      '<label class="btn" style="flex:1;text-align:center;cursor:pointer">Choisir une image<input type="file" accept="image/*" data-file="thumb" style="display:none"></label></div></div>' +
      '<div class="mp-modal-actions"><button type="button" class="btn" data-a="previewImport"' + (has && !IMP.busy ? "" : " disabled") + ">▶ Écouter l’extrait</button>" +
      '<button type="button" class="btn primary" data-a="saveImport"' + (has && !IMP.busy ? "" : " disabled") + ">✅ Ajouter</button></div>" +
      '<p class="mp-error" id="mp-import-msg"></p>' +
      '<p class="hint">Le mème est ajouté à ta bibliothèque locale. Tu peux le supprimer à tout moment depuis le salon.</p>';
    var msgEl = $id("mp-import-msg");
    if (msgEl) msgEl.textContent = "";
  }

  function importMsg(t) {
    var el = $id("mp-import-msg");
    if (el) el.textContent = t || "";
    else if (t) toast(t);
  }

  function readImportForm() {
    if (!IMP) return;
    var n = $id("mp-meme-name"), c = $id("mp-meme-cat"), d = $id("mp-meme-diff"), s = $id("mp-meme-desc");
    if (n) IMP.name = n.value.trim().slice(0, 42);
    if (c) IMP.cat = c.value;
    if (d) IMP.diff = Number(d.value) || 2;
    if (s) IMP.desc = s.value.trim().slice(0, 90);
  }

  function importFile(file) {
    if (!IMP || !file) return;
    IMP.file = file;
    IMP.busy = true; IMP.progress = 0; IMP.buffer = null; IMP.probe = null; IMP.encoded = null;
    renderImport();
    var done = function (buffer) {
      IMP.buffer = buffer;
      var d = buffer.duration;
      IMP.len = clamp(Math.round(Math.min(6, d) * 2) / 2, 2, Math.min(10, d));
      IMP.start = 0;
      if (!IMP.name) IMP.name = file.name.replace(/\.[^.]+$/, "").slice(0, 42);
      IMP.busy = false;
      renderImport();
    };
    if (IMP.kind === "audio") {
      MimicAudio.loadAudioFile(file).then(done).catch(function () {
        IMP.busy = false; renderImport(); importMsg("Format audio non pris en charge ou fichier protégé.");
      });
      return;
    }
    MimicAudio.loadAudioFile(file).then(done).catch(function () {
      /* vidéo non décodable directement : on lit sa durée et on capturera le passage choisi */
      MimicAudio.probeVideo(file).then(function (probe) {
        IMP.probe = probe;
        IMP.probeFile = file;
        IMP.len = clamp(Math.round(Math.min(6, probe.duration) * 2) / 2, 2, Math.min(10, probe.duration));
        IMP.start = 0;
        if (!IMP.name) IMP.name = file.name.replace(/\.[^.]+$/, "").slice(0, 42);
        IMP.busy = false;
        renderImport();
      }).catch(function () {
        IMP.busy = false; renderImport(); importMsg("Vidéo illisible par ce navigateur.");
      });
    });
  }

  function previewImport() {
    if (!IMP) return;
    readImportForm();
    var start = clamp(IMP.start, 0, Math.max(0, (IMP.buffer ? IMP.buffer.duration : IMP.probe ? IMP.probe.duration : 0) - IMP.len));
    var len = IMP.len;
    if (IMP.buffer) {
      MimicAudio.playSnippet(IMP.buffer, start, len);
      return;
    }
    if (!IMP.probe || !IMP.probeFile) { importMsg("Choisis d’abord un fichier."); return; }
    IMP.busy = true; IMP.progress = 0; renderImport();
    MimicAudio.captureVideoClip(IMP.probeFile, start, len, importProgress).then(function (r) {
      IMP.busy = false;
      /* on garde la sonde et le fichier : changer l'extrait relancera la capture */
      IMP.encoded = r;
      renderImport();
      if (r.buffer) MimicAudio.playSnippet(r.buffer, 0, r.buffer.duration);
      else importMsg("Extrait capturé, mais la prévisualisation n’est pas disponible.");
    }).catch(function (e) {
      IMP.busy = false; renderImport(); importMsg(e.message || "Extraction impossible.");
    });
  }

  function saveImport() {
    if (!IMP || IMP.busy) return;
    readImportForm();
    if (!IMP.name) { importMsg("Donne un nom à ton mème."); return; }
    if (!IMP.buffer && !IMP.probe && !IMP.encoded) { importMsg("Choisis un fichier audio ou vidéo."); return; }
    IMP.busy = true; IMP.progress = 0; renderImport();
    var done = function (out) {
      if (!out || !out.data) { IMP.busy = false; renderImport(); importMsg("Encodage impossible, réessaie."); return; }
      var dur = out.dur || IMP.len;
      var id = "mp" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      var item = {
        id: id, name: IMP.name, emoji: "🎵", cat: IMP.cat, diff: IMP.diff, dur: Math.round(dur * 10) / 10,
        desc: IMP.desc, img: IMP.thumb, data: out.data, mime: out.mime || "", shared: true
      };
      saveCustom(item).then(function () {
        custom.unshift(item);
        BUFS.delete(id);
        IMP.busy = false;
        R.emit("meme", { id: id, name: item.name, cat: item.cat, diff: item.diff, dur: item.dur, desc: item.desc, img: item.img, data: item.data, mime: item.mime, shared: true }).catch(function () {});
        closeImport();
        toast("✅ Mème ajouté");
        render();
      }).catch(function () {
        IMP.busy = false; renderImport(); importMsg("Stockage local indisponible (mode privé ?).");
      });
    };
    var finish = function () {
      if (IMP.encoded && IMP.encoded.data) return done(IMP.encoded);
      if (IMP.encoded && IMP.encoded.blob) {
        return MimicAudio.blobToDataUrl(IMP.encoded.blob).then(function (data) {
          done({ data: data, mime: IMP.encoded.mime || IMP.encoded.blob.type, dur: IMP.encoded.dur });
        });
      }
      if (!IMP.buffer) { IMP.busy = false; renderImport(); importMsg("Extrait non disponible."); return; }
      var sliced = MimicAudio.sliceBuffer(IMP.buffer, IMP.start, IMP.len);
      MimicAudio.encodeBuffer(sliced, importProgress).then(done).catch(function () {
        IMP.busy = false; renderImport(); importMsg("Encodage impossible.");
      });
    };
    if (IMP.encoded) finish();
    else if (IMP.probe && IMP.probeFile && !IMP.buffer) {
      var st = clamp(IMP.start, 0, Math.max(0, IMP.probe.duration - IMP.len));
      MimicAudio.captureVideoClip(IMP.probeFile, st, IMP.len, importProgress).then(function (r) {
        if (IMP.probe && IMP.probe.url) { try { URL.revokeObjectURL(IMP.probe.url); } catch (e) {} }
        IMP.probe = null;
        if (r.buffer) { IMP.buffer = r.buffer; IMP.start = 0; IMP.len = clamp(r.buffer.duration, 2, 10); }
        IMP.encoded = r;
        finish();
      }).catch(function (e) {
        IMP.busy = false; renderImport(); importMsg(e.message || "Extraction impossible.");
      });
    } else finish();
  }

  /* ============================================================
     ÉVÉNEMENTS
     ============================================================ */
  document.addEventListener("pointerdown", function () {
    /* premier geste = déblocage audio (iOS/Android exigent un geste utilisateur) */
    MimicAudio.unlock();
  }, { passive: true });

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-a]");
    if (!t || t.disabled) return;
    MimicAudio.unlock();
    var a = t.dataset.a, v = t.dataset.v;
    if (a === "create") return startOnline(true);
    if (a === "join") {
      var c = $id("mp-code");
      var cd = (c ? c.value : "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!/^[A-Z0-9]{4}$/.test(cd)) { msg("Le code doit faire 4 caractères."); return; }
      return startOnline(false, cd);
    }
    if (a === "start") return startGame();
    if (a === "cfg") return setCfg(t.dataset.k, Number(v));
    if (a === "cat") return toggleCat(v);
    if (a === "src") {
      if (!isHost || !S) return;
      S.cfg.src = v; broadcast(true); render(); return;
    }
    if (a === "shareRoom") return shareRoom();
    if (a === "leaveRoom") return leaveRoom();
    if (a === "micTest") {
      MimicAudio.prepareMic().then(function () {
        MimicAudio.releaseMic();
        L.micOk = true;
        toast("🎙️ Micro autorisé");
        render();
      }).catch(function () { toast("Micro refusé : autorise-le dans le navigateur"); });
      return;
    }
    if (a === "mic") {
      if (L.attempt) stopAttempt(); else beginAttempt(true);
      return;
    }
    if (a === "soundOn") {
      MimicAudio.ensureRunning().then(function () {
        L.sig = ""; render();
      }).catch(function () { toast("Autorise le son dans ton navigateur"); });
      return;
    }
    if (a === "replayMeme") return replayMeme();
    if (a === "playMine") return playMine();
    if (a === "forceCollect") {
      if (!isHost || !S) return;
      if (S.ph === "imitate") { S.ph = "collect"; S.since = now(); broadcast(true); render(); }
      else if (S.ph === "collect") { beginPlayback(); }
      return;
    }
    if (a === "playClip") return playClip(v);
    if (a === "vote") return voteFor(v);
    if (a === "recPlay") return recPlay(v);
    if (a === "recDuel") return recDuel(v);
    if (a === "recFav") return recFav(v);
    if (a === "recOne") return recOne(v);
    if (a === "recAuto") return recAuto();
    if (a === "recZip") return recZip();
    if (a === "recBest") return recBest();
    if (a === "recShare") return recShare();
    if (a === "next") { if (isHost) nextRound(); return; }
    if (a === "addMeme") return openImport();
    if (a === "closeImport") return closeImport();
    if (a === "importTab") {
      if (!IMP || IMP.busy) return;
      IMP.kind = v === "video" ? "video" : "audio";
      IMP.file = null; IMP.buffer = null; IMP.encoded = null;
      if (IMP.probe && IMP.probe.url) { try { URL.revokeObjectURL(IMP.probe.url); } catch (x) {} }
      IMP.probe = null;
      renderImport();
      return;
    }
    if (a === "previewImport") return previewImport();
    if (a === "saveImport") return saveImport();
    if (a === "delMeme") return delCustom(v);
    if (a === "shareMeme") return shareCustom(v);
    if (a === "previewMeme") return previewCustom(v);
  });

  document.addEventListener("input", function (e) {
    if (!IMP) return;
    var el = e.target;
    if (el.dataset.range === "start") {
      IMP.start = Number(el.value) || 0; IMP.encoded = null;
      var dur = IMP.buffer ? IMP.buffer.duration : IMP.probe ? IMP.probe.duration : 0;
      var row = el.nextElementSibling;
      if (row) row.firstElementChild.textContent = "Début " + IMP.start.toFixed(1) + "s";
      var other = document.querySelector('[data-range="len"]');
      if (other) other.max = String(Math.min(10, Math.max(2, dur - IMP.start)));
    } else if (el.dataset.range === "len") {
      IMP.len = clamp(Number(el.value) || 6, 2, 10); IMP.encoded = null;
      var row2 = el.nextElementSibling;
      if (row2) row2.firstElementChild.textContent = "Durée " + IMP.len.toFixed(1) + "s";
      var st = document.querySelector('[data-range="start"]');
      var dur2 = IMP.buffer ? IMP.buffer.duration : IMP.probe ? IMP.probe.duration : 0;
      if (st) st.max = String(Math.max(0, dur2 - IMP.len));
    } else if (el.id === "mp-meme-name") {
      IMP.name = el.value.slice(0, 42);
    } else if (el.id === "mp-meme-desc") {
      IMP.desc = el.value.slice(0, 90);
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.dataset.file === "src") {
      var f = el.files && el.files[0];
      if (f) importFile(f);
      return;
    }
    if (el.dataset.file === "thumb") {
      var img = el.files && el.files[0];
      if (!img || !IMP) return;
      MimicAudio.compressImage(img, 220).then(function (data) {
        IMP.thumb = data; renderImport();
      }).catch(function () { toast("Image illisible"); });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && IMP) closeImport();
  });

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  function preloadSounds() {
    MimicAudio.preload(MimicBank.OFFICIAL).catch(function () {}).then(function () {
      L.sndPreloaded = true;
      L.sndOk = MimicAudio.status(MimicBank.OFFICIAL).ok;
      if (S && S.ph === "lobby") { L.sig = ""; render(); }
    });
  }

  function boot() {
    injectCss();
    try { var raw = localStorage.getItem("mp:vol"); if (raw !== null && raw !== "" && Number.isFinite(Number(raw))) L.vol = Math.max(0, Math.min(100, Number(raw))); } catch (e) {}
    document.addEventListener("input", function (e) {
      var el = e.target;
      if (el && el.id === "mp-vol") {
        L.vol = Math.max(0, Math.min(100, Number(el.value) || 0));
        try { localStorage.setItem("mp:vol", String(L.vol)); } catch (x) {}
        try { MimicAudio.unlock(); } catch (x) {}
      }
    });
    document.addEventListener("click", function () { try { MimicAudio.unlock(); } catch (e) {} }, { once: false });
    updateWho();
    var q = bootParams();
    var sess = Sess.load("mp");
    if (sess && sess.code && (!q.code || q.code === sess.code)) {
      startOnline(!!sess.host, sess.code, { name: sess.name, resume: true, wasHost: !!sess.host, code: sess.code });
      setTimeout(preloadSounds, 600);
      return;
    }
    renderHome();
    if (q.code) {
      var ci = $id("mp-code");
      if (ci) ci.value = q.code;
      if (q.host) startOnline(true, q.code, { code: q.code });
      else if (q.go) startOnline(false, q.code);
    }
    /* préchargement discret des sons officiels */
    setTimeout(preloadSounds, 350);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  requestAnimationFrame(ticker);
})();
