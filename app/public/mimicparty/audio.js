/* MIMIC PARTY — moteur audio navigateur.
 *
 * - charge les vrais extraits de la banque officielle (fichiers `sounds/`) ;
 * - décode les fichiers importés (MP3, WAV, OGG, M4A, vidéos MP4/WebM/MOV) ;
 * - extrait un passage d'un fichier audio ou vidéo et le compresse en Opus ;
 * - enregistre une tentative au micro, une seule fois, avec niveau en direct ;
 * - fournit les petits effets sonores de l'interface ;
 * - v2 : normalise le volume des extraits officiels, coupe leur silence de début/fin,
 *   essaie plusieurs emplacements de fichier, et fournit les outils du récap
 *   (concaténation, ZIP, téléchargement, partage).
 */
"use strict";
(function (root) {
  var SR = 44100;
  var TARGET_ENCODE_SR = 44100;
  var CLIP_SR = 12000; /* fréquence des imitations échangées entre joueurs */
  var _ctx = null, _mic = null, _sources = new Set(), _cache = new Map(), _bad = {}, _ok = {};

  function ctx() {
    if (_ctx) {
      if (_ctx.state === "suspended") _ctx.resume().catch(function () {});
      return _ctx;
    }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
    return _ctx;
  }
  function unlock() { var c = ctx(); if (c && c.state === "suspended") c.resume().catch(function () {}); return c; }
  function state() { return _ctx ? _ctx.state : "uninitialized"; }
  /** Reprend le contexte si besoin, et ne résout que lorsqu'il tourne vraiment. */
  function ensureRunning() {
    var c = ctx();
    if (!c) return Promise.reject(new Error("Audio indisponible"));
    if (c.state === "running") return Promise.resolve(c);
    return c.resume().then(function () {
      return c.state === "running" ? c : Promise.reject(new Error("Son bloqué par le navigateur"));
    });
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /**
   * Charge un extrait officiel depuis `file`, puis garde uniquement
   * [start, start+dur] en mono 44 100 Hz : tous les joueurs entendent
   * exactement le même passage.
   */
  function loadMeme(meme) {
    if (!meme || !(meme.file || meme.files)) return Promise.reject(new Error("Extrait inconnu"));
    if (_cache.has("m:" + meme.id)) return _cache.get("m:" + meme.id);
    var urls = Array.isArray(meme.files) && meme.files.length ? meme.files : [meme.file];
    var p = fetchDecode(urls, 0)
      .then(function (buffer) {
        var start = Number(meme.start) || 0;
        var auto = !meme.dur;
        /* mèmes « auto » : on saute le silence du début avant de découper */
        if (auto) start += leadSilence(buffer, start);
        /* sans `dur` (mèmes « auto ») : on garde le début du fichier, plafonné à `max` s */
        var want = Number(meme.dur) || Math.min(Math.max(0.2, buffer.duration - start), Number(meme.max) || 5);
        var out = sliceBuffer(buffer, start, want);
        out = tidy(out, auto);
        if (auto) meme.dur = Math.floor(out.duration * 100) / 100;
        delete _bad[meme.id];
        _ok[meme.id] = true;
        return out;
      })
      .catch(function (e) { _cache.delete("m:" + meme.id); _bad[meme.id] = true; throw e; });
    _cache.set("m:" + meme.id, p);
    return p;
  }

  /** Essaie chaque URL à tour de rôle (les pages d'erreur « 200 » d'un site à page unique sont rejetées). */
  function fetchDecode(urls, i) {
    if (i >= urls.length) return Promise.reject(new Error("Extrait introuvable"));
    return fetch(urls[i], { cache: "force-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("Extrait introuvable");
        var ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
        if (/text\/html/i.test(ct)) throw new Error("Pas un fichier audio");
        return res.arrayBuffer();
      })
      .then(decodeArrayBuffer)
      .catch(function () { return fetchDecode(urls, i + 1); });
  }

  /** Durée de silence à sauter au début (garde 40 ms d'attaque). */
  function leadSilence(buffer, from) {
    var d = mixMono(buffer), sr = buffer.sampleRate, peak = 0, i;
    for (i = 0; i < d.length; i += 4) { var v = Math.abs(d[i]); if (v > peak) peak = v; }
    if (peak < 0.01) return 0;
    var th = peak * 0.05, blk = Math.max(1, Math.floor(sr * 0.01));
    for (i = Math.floor(from * sr); i < d.length - blk; i += blk) {
      var s = 0;
      for (var k = 0; k < blk; k++) s += Math.abs(d[i + k]);
      if (s / blk > th) return Math.max(0, i / sr - from - 0.04);
    }
    return 0;
  }

  /** Normalise le volume (crête ≈ 0,9) et, si demandé, coupe le silence de fin. */
  function tidy(buf, trimTail) {
    var d = buf.getChannelData(0), n = d.length, peak = 0, i;
    for (i = 0; i < n; i++) { var v = Math.abs(d[i]); if (v > peak) peak = v; }
    if (peak < 0.005) return buf;
    var gain = Math.min(6, 0.9 / peak);
    var end = n;
    if (trimTail) {
      var th = peak * 0.04, last = n - 1;
      while (last > 0 && Math.abs(d[last]) < th) last--;
      end = Math.min(n, Math.max(Math.floor(0.3 * buf.sampleRate), last + Math.floor(0.12 * buf.sampleRate)));
    }
    var out = ctx().createBuffer(1, end, buf.sampleRate), o = out.getChannelData(0);
    for (i = 0; i < end; i++) o[i] = clamp(d[i] * gain, -1, 1);
    return out;
  }

  /** Mèmes dont le fichier a bien été chargé / qui ont échoué (pour l'affichage). */
  function status(list) {
    var ok = 0, bad = 0, total = (list || []).length;
    (list || []).forEach(function (m) { if (_ok[m.id]) ok++; else if (_bad[m.id]) bad++; });
    return { ok: ok, bad: bad, total: total };
  }

  /** Vrai si le fichier de ce mème a déjà échoué au chargement (absent, illisible). */
  function isBad(id) { return !!_bad[id]; }

  /** Précharge plusieurs mèmes officiels (6 en parallèle), avec progression (0..1). */
  function preload(list, onProgress) {
    list = list || [];
    var done = 0, i = 0, n = list.length;
    function worker() {
      if (i >= n) return Promise.resolve();
      var m = list[i++];
      return loadMeme(m).catch(function () {}).then(function () {
        done++;
        if (onProgress) { try { onProgress(done / Math.max(1, n), done, n); } catch (e) {} }
        return worker();
      });
    }
    var ws = [];
    for (var k = 0; k < Math.min(6, n); k++) ws.push(worker());
    return Promise.all(ws);
  }

  function track(src) {
    _sources.add(src);
    src.onended = function () { _sources.delete(src); };
    return src;
  }
  function stopAll() {
    _sources.forEach(function (s) { try { s.stop(); } catch (e) {} });
    _sources.clear();
  }

  /** Joue un AudioBuffer. `atMs` = instant absolu (Net.now) optionnel.
   *  Ne planifie rien tant que le contexte n'est pas réellement en marche :
   *  sinon les sons s'empilent et repartent tous ensemble au premier déblocage. */
  function playBuffer(buffer, o) {
    o = o || {};
    var c = ctx();
    if (!c || !buffer) return null;
    if (c.state !== "running") { c.resume().catch(function () {}); return null; }
    var src = c.createBufferSource();
    src.buffer = buffer;
    var g = c.createGain(); g.gain.value = o.gain == null ? 1 : o.gain;
    src.connect(g); g.connect(c.destination);
    var delay = o.delay != null ? Math.max(0, Number(o.delay) || 0) : (o.atMs ? Math.max(0, o.atMs - Date.now()) / 1000 : 0);
    var start = Math.max(0, Number(o.offset) || 0);
    var dur = Number(o.dur) > 0 ? Number(o.dur) : undefined;
    try {
      if (dur) src.start(c.currentTime + delay, start, dur);
      else src.start(c.currentTime + delay, start);
    } catch (e) { return null; }
    return track(src);
  }

  function playSnippet(buffer, start, dur) {
    stopAll();
    return playBuffer(buffer, { offset: start, dur: dur });
  }

  function decodeArrayBuffer(ab) {
    var c = ctx();
    if (!c) return Promise.reject(new Error("Audio indisponible"));
    /* Safari : decodeAudioData ne renvoie pas toujours une promesse. */
    return new Promise(function (resolve, reject) {
      var copy = ab.slice ? ab.slice(0) : ab;
      var ret;
      try { ret = c.decodeAudioData(copy, resolve, reject); } catch (e) { reject(e); return; }
      if (ret && typeof ret.then === "function") ret.then(resolve, reject);
    });
  }

  function decodeBlob(blob) {
    if (!blob) return Promise.reject(new Error("Fichier vide"));
    return blob.arrayBuffer().then(decodeArrayBuffer);
  }

  function loadAudioFile(file) {
    return file.arrayBuffer().then(decodeArrayBuffer);
  }

  function mixMono(buffer) {
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
    var ch = [];
    for (var i = 0; i < buffer.numberOfChannels; i++) ch.push(buffer.getChannelData(i));
    var out = new Float32Array(buffer.length);
    for (var n = 0; n < buffer.length; n++) {
      var s = 0;
      for (i = 0; i < ch.length; i++) s += ch[i][n];
      out[n] = s / ch.length;
    }
    return out;
  }

  /** Extrait [start, start+dur] en mono, rééchantillonné à 44 100 Hz. */
  function sliceBuffer(buffer, start, dur) {
    start = clamp(Number(start) || 0, 0, Math.max(0, buffer.duration - 0.05));
    dur = clamp(Number(dur) || buffer.duration, 0.2, Math.max(0.2, buffer.duration - start));
    var src = mixMono(buffer);
    var sr0 = buffer.sampleRate;
    var n0 = Math.floor(dur * sr0);
    var from = Math.floor(start * sr0);
    var ratio = sr0 / TARGET_ENCODE_SR;
    var n1 = Math.max(1, Math.floor(n0 / ratio));
    var c = ctx();
    var out = c.createBuffer(1, n1, TARGET_ENCODE_SR);
    var d = out.getChannelData(0);
    for (var i = 0; i < n1; i++) {
      var pos = from + i * ratio;
      var i0 = Math.floor(pos), i1 = Math.min(src.length - 1, i0 + 1), f = pos - i0;
      d[i] = (src[i0] || 0) * (1 - f) + (src[i1] || 0) * f;
    }
    return out;
  }

  function wavBlob(buffer) {
    var sr = Math.min(48000, buffer.sampleRate);
    var src = mixMono(buffer);
    var n = Math.floor(src.length * sr / buffer.sampleRate);
    var bytes = 44 + n * 2;
    var ab = new ArrayBuffer(bytes), v = new DataView(ab);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, "RIFF"); v.setUint32(4, bytes - 8, true); str(8, "WAVEfmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) {
      var pos = i * buffer.sampleRate / sr;
      var i0 = Math.floor(pos), i1 = Math.min(src.length - 1, i0 + 1), f = pos - i0;
      var s = (src[i0] || 0) * (1 - f) + (src[i1] || 0) * f;
      v.setInt16(44 + i * 2, clamp(s, -1, 1) * 0x7fff, true);
    }
    return new Blob([ab], { type: "audio/wav" });
  }

  function pickMime() {
    var MR = root.MediaRecorder;
    if (!MR || !MR.isTypeSupported) return "";
    var list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < list.length; i++) if (MR.isTypeSupported(list[i])) return list[i];
    return "";
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(url) {
    var m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(url || ""));
    if (!m) return null;
    var mime = m[1] || "application/octet-stream";
    var bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /** Compresse un buffer en Opus (petit) ou WAV en dernier recours. */
  function encodeBuffer(buffer, onProgress) {
    var c = ctx();
    if (!c) return Promise.resolve({ blob: wavBlob(buffer), mime: "audio/wav", dur: buffer.duration });
    var mime = pickMime();
    if (!root.MediaRecorder || !mime || !c.createMediaStreamDestination) {
      var wb = wavBlob(buffer);
      return blobToDataUrl(wb).then(function (data) {
        return { blob: wb, mime: "audio/wav", data: data, dur: buffer.duration };
      });
    }
    return new Promise(function (resolve) {
      var dest = c.createMediaStreamDestination();
      var src = c.createBufferSource(); src.buffer = buffer; src.connect(dest);
      var chunks = [], mr;
      try { mr = new root.MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 96000 }); }
      catch (e) { var w = wavBlob(buffer); blobToDataUrl(w).then(function (d) { resolve({ blob: w, mime: "audio/wav", data: d, dur: buffer.duration }); }); return; }
      var started = Date.now();
      var timer = setInterval(function () {
        if (onProgress) onProgress(Math.min(1, (Date.now() - started) / (buffer.duration * 1000)));
      }, 120);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        clearInterval(timer);
        var blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
        blobToDataUrl(blob).then(function (data) {
          resolve({ blob: blob, mime: blob.type || mime, data: data, dur: buffer.duration });
        }).catch(function () {
          resolve({ blob: blob, mime: blob.type || mime, data: "", dur: buffer.duration });
        });
      };
      try { mr.start(100); } catch (e) {}
      try { src.start(); } catch (e) {}
      setTimeout(function () {
        try { src.stop(); } catch (e) {}
        try { if (mr.state !== "inactive") mr.stop(); } catch (e) {}
      }, Math.ceil(buffer.duration * 1000) + 220);
    });
  }

  /* ---------- imitations échangées entre joueurs ----------
   * Les imitations voyagent en PCM mono 12 kHz compressé en µ-law (8 bits),
   * pas en Opus/WebM : chaque appareil peut les lire sans dépendre du codec du
   * navigateur de l'émetteur (Safari ne décode pas toujours le WebM de Chrome,
   * Chrome ne décode pas toujours le MP4 de Safari). Les silences de début et
   * de fin sont coupés et le volume est normalisé pour qu'on entende tout le monde. */
  function lin2ulaw(pcm) {
    var sign = (pcm >> 8) & 0x80;
    if (sign) pcm = -pcm;
    if (pcm > 32635) pcm = 32635;
    pcm += 0x84;
    var exp = 7, mask = 0x4000;
    for (; (pcm & mask) === 0 && exp > 0; exp--, mask >>= 1) {}
    var mant = (pcm >> (exp + 3)) & 0x0F;
    return (~(sign | (exp << 4) | mant)) & 0xFF;
  }
  function ulaw2lin(u) {
    u = ~u & 0xFF;
    var sign = u & 0x80, exp = (u >> 4) & 7, mant = u & 0x0F;
    var s = (((mant << 3) + 0x84) << exp) - 0x84;
    return sign ? -s : s;
  }

  /** Buffer -> { data(base64), mime, sr, dur }. */
  function encodeClip(buffer) {
    var src = mixMono(buffer), sr0 = buffer.sampleRate, sr = CLIP_SR, i;
    /* 1. coupe le silence de début/fin (blocs de 20 ms) */
    var blk = Math.max(1, Math.floor(sr0 * 0.02)), nb = Math.floor(src.length / blk), peaks = [], peak = 0;
    for (var b = 0; b < nb; b++) {
      var mx = 0;
      for (i = b * blk; i < (b + 1) * blk; i++) { var v = Math.abs(src[i]); if (v > mx) mx = v; }
      peaks.push(mx); if (mx > peak) peak = mx;
    }
    var from = 0, to = src.length;
    if (nb > 8 && peak > 0.01) {
      var th = Math.max(0.01, peak * 0.08), lo = 0, hi = nb - 1;
      while (lo < hi && peaks[lo] < th) lo++;
      while (hi > lo && peaks[hi] < th) hi--;
      lo = Math.max(0, lo - 8); hi = Math.min(nb - 1, hi + 8);
      if ((hi - lo + 1) * blk >= sr0 * 0.3) { from = lo * blk; to = Math.min(src.length, (hi + 1) * blk); }
    }
    /* 2. gain de normalisation (crête à ~0,85, gain max ×6) */
    var gain = peak > 0.02 ? Math.min(6, 0.85 / peak) : 1;
    /* 3. rééchantillonnage par moyenne (anti-repliement) puis µ-law */
    var ratio = sr0 / sr;
    var n = Math.max(1, Math.min(Math.floor((to - from) / ratio), sr * 15));
    var bytes = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      var a0 = from + Math.floor(i * ratio), a1 = Math.min(to, Math.max(a0 + 1, from + Math.floor((i + 1) * ratio)));
      var sum = 0;
      for (var k = a0; k < a1; k++) sum += src[k] || 0;
      bytes[i] = lin2ulaw(Math.round(clamp(sum / Math.max(1, a1 - a0) * gain, -1, 1) * 32767));
    }
    var bin = "", CH = 0x8000;
    for (i = 0; i < n; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return { data: btoa(bin), mime: "audio/x-mulaw", sr: sr, dur: n / sr };
  }

  /** { data, mime, sr } -> Promise<AudioBuffer>. Gère aussi les anciens clips (data URL). */
  function decodeClip(c) {
    if (!c || !c.data) return Promise.reject(new Error("Clip vide"));
    if (c.mime === "audio/x-mulaw") {
      var cx = ctx();
      if (!cx) return Promise.reject(new Error("Audio indisponible"));
      try {
        var bin = atob(c.data), n = bin.length, sr = Number(c.sr) || CLIP_SR;
        var buf = cx.createBuffer(1, n, sr), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = ulaw2lin(bin.charCodeAt(i)) / 32768;
        return Promise.resolve(buf);
      } catch (e) { return Promise.reject(e); }
    }
    var blob = dataUrlToBlob(c.data);
    return blob ? decodeBlob(blob) : Promise.reject(new Error("Clip illisible"));
  }

  /* ---------- micro ---------- */
  function prepareMic() {
    if (_mic && _mic.getAudioTracks().some(function (t) { return t.readyState === "live"; })) return Promise.resolve(_mic);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("Micro indisponible sur ce navigateur"));
    return navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true }
    }).then(function (s) { _mic = s; return s; });
  }
  function releaseMic() {
    if (!_mic) return;
    _mic.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
    _mic = null;
  }
  function hasMic() {
    return _mic && _mic.getAudioTracks().some(function (t) { return t.readyState === "live"; });
  }

  /**
   * Enregistre une tentative. Une seule piste, arrêt automatique à `maxMs`.
   * Retourne { stop(), done:Promise<{blob,mime,dur}> }.
   */
  function record(o) {
    o = o || {};
    var c = ctx();
    if (!c) return null;
    var maxMs = clamp(Number(o.maxMs) || 8000, 500, 30000);
    var chunks = [], mr = null, src = null, analyser = null, stream = null;
    var started = 0, raf = 0, stopped = false;
    var finishResolve, finishReject;
    var done = new Promise(function (res, rej) { finishResolve = res; finishReject = rej; });

    function cleanup() {
      cancelAnimationFrame(raf);
      try { if (src) src.disconnect(); } catch (e) {}
      try { if (analyser) analyser.disconnect(); } catch (e) {}
      releaseMic();
    }
    function stop() {
      if (stopped) return;
      stopped = true;
      var dur = (Date.now() - started) / 1000;
      try { if (mr && mr.state !== "inactive") mr.stop(); } catch (e) {}
      if (!mr) finishResolve({ blob: null, mime: "", dur: dur });
      /* `onstop` résout avec le blob */
      setTimeout(function () { if (started && !mr) cleanup(); }, 0);
      return dur;
    }

    return prepareMic().then(function (s) {
      stream = s;
      src = c.createMediaStreamSource(stream);
      analyser = c.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      var buf = new Uint8Array(analyser.fftSize);
      var mime = pickMime();
      var useMR = !!root.MediaRecorder;
      if (useMR) {
        try { mr = new root.MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } : undefined); }
        catch (e) { mr = new root.MediaRecorder(stream); }
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          var dur = (Date.now() - started) / 1000;
          var blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
          cleanup();
          finishResolve({ blob: blob, mime: blob.type || mime || "audio/webm", dur: dur });
        };
        try { mr.start(120); } catch (e) { mr = null; }
      }
      if (!mr) {
        cleanup();
        finishReject(new Error("Enregistrement non pris en charge par ce navigateur"));
        return { stop: stop, done: done };
      }
      started = Date.now();
      function loop() {
        if (stopped) return;
        var elapsed = Date.now() - started;
        analyser.getByteTimeDomainData(buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
        var level = Math.sqrt(sum / buf.length);
        if (o.onLevel) { try { o.onLevel(level, elapsed, buf); } catch (e) {} }
        if (elapsed >= maxMs) { try { o.onAutoStop && o.onAutoStop(); } catch (e) {} stop(); return; }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      return { stop: stop, done: done, hasAnalyser: true };
    }).catch(function (e) {
      cleanup();
      finishReject(e);
      throw e;
    });
  }

  /* ---------- fichiers vidéo (repli quand decodeAudioData échoue) ---------- */
  function probeVideo(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.src = url;
      var done = false;
      function end(ok, data) {
        if (done) return; done = true;
        if (!ok) URL.revokeObjectURL(url);
        if (ok) resolve(data); else reject(new Error("Vidéo illisible"));
      }
      v.onloadedmetadata = function () {
        end(true, { url: url, duration: Number(v.duration) || 0, element: v });
      };
      v.onerror = function () { end(false); };
      setTimeout(function () { if (!done) end(false); }, 12000);
    });
  }

  /**
   * Capture en temps réel l'audio d'une vidéo entre `start` et `start+dur`.
   * Utilisé seulement si le navigateur ne sait pas décoder directement le fichier.
   */
  function captureVideoClip(file, start, dur, onProgress) {
    var c = ctx();
    if (!c) return Promise.reject(new Error("Audio indisponible"));
    return probeVideo(file).then(function (probe) {
      return new Promise(function (resolve, reject) {
        var v = probe.element;
        /* le son passe par le graphe WebAudio : il ne faut PAS couper la piste */
        v.muted = false; v.volume = 1; v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
        try { document.body.appendChild(v); } catch (e) {}
        var mime = pickMime();
        var dest = c.createMediaStreamDestination();
        var node;
        try { node = c.createMediaElementSource(v); }
        catch (e) { cleanup(); reject(new Error("Extraction vidéo impossible sur ce navigateur")); return; }
        node.connect(dest);
        var mon = c.createGain(); mon.gain.value = 0.35;
        node.connect(mon); mon.connect(c.destination);
        var chunks = [], mr, startedAt = 0, timer = 0, settled = false, began = false;

        function cleanup() {
          clearInterval(timer);
          try { v.pause(); } catch (e) {}
          try { if (v.parentNode) v.parentNode.removeChild(v); } catch (e) {}
          try { URL.revokeObjectURL(probe.url); } catch (e) {}
        }
        function fail(message) {
          if (settled) return; settled = true;
          cleanup(); reject(new Error(message || "Extraction impossible"));
        }
        try { mr = new root.MediaRecorder(dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } : undefined); }
        catch (e) { fail("Enregistrement non pris en charge"); return; }
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          if (settled) return; settled = true;
          clearInterval(timer);
          var blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
          cleanup();
          decodeBlob(blob).then(function (buffer) {
            resolve({ blob: blob, mime: blob.type || mime, buffer: buffer, dur: buffer.duration });
          }).catch(function () {
            resolve({ blob: blob, mime: blob.type || mime, buffer: null, dur: dur });
          });
        };
        function begin() {
          if (began) return; began = true;
          v.play().then(function () {
            startedAt = Date.now();
            try { mr.start(100); } catch (e) { return fail("Enregistrement impossible"); }
            timer = setInterval(function () {
              if (onProgress) onProgress(Math.min(1, (Date.now() - startedAt) / (dur * 1000)));
            }, 100);
            setTimeout(function () {
              try { if (mr.state !== "inactive") mr.stop(); } catch (e) {}
            }, Math.ceil(dur * 1000) + 150);
          }).catch(function () { fail("Lecture vidéo bloquée"); });
        }
        var target = clamp(Number(start) || 0, 0, Math.max(0, probe.duration - 0.2));
        if (Math.abs(v.currentTime - target) < 0.05) begin();
        else { v.onseeked = function () { v.onseeked = null; begin(); }; v.currentTime = target; }
        setTimeout(function () { if (!startedAt && !settled) fail("Lecture vidéo bloquée"); }, 12000);
      });
    });
  }

  /* ---------- image ---------- */
  function compressImage(file, max) {
    max = max || 240;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var s = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
        var g = cv.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        try { resolve(cv.toDataURL("image/jpeg", 0.82)); } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
      img.src = url;
    });
  }

  function waveform(buffer, buckets) {
    buckets = Math.max(8, buckets || 64);
    var data = mixMono(buffer);
    var out = new Array(buckets).fill(0);
    var per = Math.max(1, Math.floor(data.length / buckets));
    for (var b = 0; b < buckets; b++) {
      var max = 0;
      var from = b * per, to = Math.min(data.length, from + per);
      for (var i = from; i < to; i += 2) { var v = Math.abs(data[i]); if (v > max) max = v; }
      out[b] = Math.min(1, max * 1.8);
    }
    return out;
  }

  /* ---------- récap : concaténation, ZIP, téléchargement, partage ---------- */
  /** Met plusieurs AudioBuffer bout à bout (mono 44,1 kHz), avec `gap` secondes de silence entre chaque. */
  function concat(buffers, gap) {
    var c = ctx(), sr = SR, g = Math.floor((gap == null ? 0.45 : gap) * sr);
    var list = (buffers || []).filter(Boolean), total = 0, i;
    var mono = list.map(function (b) { return { d: mixMono(b), sr: b.sampleRate }; });
    mono.forEach(function (m) { m.n = Math.max(1, Math.floor(m.d.length * sr / m.sr)); total += m.n + g; });
    if (!c || !total) return null;
    var out = c.createBuffer(1, total, sr), o = out.getChannelData(0), pos = 0, peak = 0;
    mono.forEach(function (m) {
      var ratio = m.sr / sr;
      for (i = 0; i < m.n; i++) {
        var p = i * ratio, i0 = Math.floor(p), i1 = Math.min(m.d.length - 1, i0 + 1), f = p - i0;
        o[pos + i] = (m.d[i0] || 0) * (1 - f) + (m.d[i1] || 0) * f;
      }
      pos += m.n + g;
    });
    for (i = 0; i < o.length; i++) { var v = Math.abs(o[i]); if (v > peak) peak = v; }
    if (peak > 0.01 && peak < 0.8) { var k = 0.9 / peak; for (i = 0; i < o.length; i++) o[i] *= k; }
    return out;
  }

  var _crcT = null;
  function crc32(u8) {
    if (!_crcT) {
      _crcT = new Uint32Array(256);
      for (var n = 0; n < 256; n++) { var c0 = n; for (var k = 0; k < 8; k++) c0 = c0 & 1 ? 0xEDB88320 ^ (c0 >>> 1) : c0 >>> 1; _crcT[n] = c0 >>> 0; }
    }
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = _crcT[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /** ZIP « stocké » (sans compression : les WAV ne se compressent presque pas). files = [{ name, blob }]. */
  function zip(files) {
    var enc = new TextEncoder();
    return Promise.all((files || []).map(function (f) {
      return f.blob.arrayBuffer().then(function (ab) { return { name: f.name, data: new Uint8Array(ab) }; });
    })).then(function (items) {
      var parts = [], central = [], offset = 0, d = new Date();
      var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      items.forEach(function (it) {
        var nm = enc.encode(it.name), crc = crc32(it.data), size = it.data.length;
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
        lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
        parts.push(lh.buffer, nm, it.data);
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
        ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
        central.push(ch.buffer, nm);
        offset += 30 + nm.length + size;
      });
      var cdSize = 0;
      central.forEach(function (p) { cdSize += p.byteLength != null ? p.byteLength : p.length; });
      var end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, items.length, true); end.setUint16(10, items.length, true);
      end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [end.buffer]), { type: "application/zip" });
    });
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 5000);
  }

  /** Feuille de partage native (mobile) avec fichiers. Résout true si partagé, false si indisponible. */
  function shareFiles(items, title) {
    try {
      var files = (items || []).map(function (f) { return new File([f.blob], f.name, { type: f.blob.type }); });
      if (!navigator.canShare || !navigator.share || !navigator.canShare({ files: files })) return Promise.resolve(false);
      return navigator.share({ files: files, title: title || "Mimic Party" }).then(function () { return true; }, function (e) {
        return e && e.name === "AbortError" ? true : false;
      });
    } catch (e) { return Promise.resolve(false); }
  }

  /* ---------- petits sons d'interface ---------- */
  function sfx(name) {
    var c = ctx();
    if (!c || c.state !== "running") return;
    var t = c.currentTime + 0.01;
    var o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    if (name === "tick") {
      o.type = "square"; o.frequency.value = 880;
      g.gain.linearRampToValueAtTime(0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.start(t); o.stop(t + 0.08);
    } else if (name === "ding") {
      o.type = "sine"; o.frequency.setValueAtTime(1046, t); o.frequency.setValueAtTime(1568, t + 0.1);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t); o.stop(t + 0.55);
    } else if (name === "whoosh") {
      o.type = "sawtooth"; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.35);
      var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      o.disconnect(); o.connect(f); f.connect(g);
      g.gain.linearRampToValueAtTime(0.1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.start(t); o.stop(t + 0.45);
    } else {
      o.type = "triangle"; o.frequency.value = 520;
      g.gain.linearRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    }
  }

  root.MimicAudio = {
    ctx: ctx, unlock: unlock, state: state, ensureRunning: ensureRunning, sfx: sfx,
    loadMeme: loadMeme, preload: preload, isBad: isBad, status: status,
    concat: concat, zip: zip, saveBlob: saveBlob, shareFiles: shareFiles,
    encodeClip: encodeClip, decodeClip: decodeClip,
    playBuffer: playBuffer, playSnippet: playSnippet, stopAll: stopAll,
    decodeBlob: decodeBlob, decodeArrayBuffer: decodeArrayBuffer, loadAudioFile: loadAudioFile,
    sliceBuffer: sliceBuffer, encodeBuffer: encodeBuffer, wavBlob: wavBlob,
    prepareMic: prepareMic, releaseMic: releaseMic, hasMic: hasMic, record: record,
    probeVideo: probeVideo, captureVideoClip: captureVideoClip,
    compressImage: compressImage, blobToDataUrl: blobToDataUrl, dataUrlToBlob: dataUrlToBlob,
    waveform: waveform, pickMime: pickMime,
    sampleRate: SR
  };
})(typeof window !== "undefined" ? window : globalThis);
