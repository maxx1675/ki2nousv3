/* MIMIC PARTY — moteur audio navigateur.
 *
 * - charge les vrais extraits de la banque officielle (fichiers `sounds/`) ;
 * - décode les fichiers importés (MP3, WAV, OGG, M4A, vidéos MP4/WebM/MOV) ;
 * - extrait un passage d'un fichier audio ou vidéo et le compresse en Opus ;
 * - enregistre une tentative au micro, une seule fois, avec niveau en direct ;
 * - fournit les petits effets sonores de l'interface.
 */
"use strict";
(function (root) {
  var SR = 22050;
  var TARGET_ENCODE_SR = 22050;
  var _ctx = null, _mic = null, _sources = new Set(), _cache = new Map();

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

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /**
   * Charge un extrait officiel depuis `file`, puis garde uniquement
   * [start, start+dur] en mono 22 050 Hz : tous les joueurs entendent
   * exactement le même passage.
   */
  function loadMeme(meme) {
    if (!meme || !meme.file) return Promise.reject(new Error("Extrait inconnu"));
    if (_cache.has("m:" + meme.id)) return _cache.get("m:" + meme.id);
    var p = fetch(meme.file, { cache: "force-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("Extrait introuvable");
        return res.arrayBuffer();
      })
      .then(decodeArrayBuffer)
      .then(function (buffer) { return sliceBuffer(buffer, meme.start || 0, meme.dur || buffer.duration); })
      .catch(function (e) { _cache.delete("m:" + meme.id); throw e; });
    _cache.set("m:" + meme.id, p);
    return p;
  }

  /** Précharge plusieurs mèmes officiels, avec progression (0..1). */
  function preload(list, onProgress) {
    list = list || [];
    var done = 0;
    return list.reduce(function (chain, m) {
      return chain.then(function () {
        return loadMeme(m).catch(function () {}).then(function () {
          done++;
          if (onProgress) { try { onProgress(done / Math.max(1, list.length), done, list.length); } catch (e) {} }
        });
      });
    }, Promise.resolve());
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

  /** Joue un AudioBuffer. `atMs` = instant absolu (Net.now) optionnel. */
  function playBuffer(buffer, o) {
    o = o || {};
    var c = ctx();
    if (!c || !buffer) return null;
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

  /** Extrait [start, start+dur] en mono, rééchantillonné à 22 050 Hz. */
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
    var sr = Math.min(32000, buffer.sampleRate);
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
      try { mr = new root.MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 32000 }); }
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

  /* ---------- micro ---------- */
  function prepareMic() {
    if (_mic && _mic.getAudioTracks().some(function (t) { return t.readyState === "live"; })) return Promise.resolve(_mic);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("Micro indisponible sur ce navigateur"));
    return navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
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
        try { mr = new root.MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 28000 } : undefined); }
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
        try { mr = new root.MediaRecorder(dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined); }
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

  /* ---------- petits sons d'interface ---------- */
  function sfx(name) {
    var c = ctx();
    if (!c) return;
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
    ctx: ctx, unlock: unlock, sfx: sfx,
    loadMeme: loadMeme, preload: preload,
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
