/* MIMIC PARTY — comparaison audio « IA » locale (v2).
 *
 * Objectif : mesurer la RESSEMBLANCE d'une imitation avec l'original, pas la
 * beauté de la voix ni le grain du micro. Tout est calculé dans le navigateur.
 *
 * Ce qui change par rapport à la v1 :
 *  - timbre = MFCC + normalisation par énoncé (CMVN) + deltas : on compare les
 *    sons (voyelles, consonnes), pas la voix de la personne, donc une fille peut
 *    imiter un garçon sans être pénalisée ;
 *  - DTW avec chemin d'alignement : hauteur, intensité et rythme sont comparés
 *    aux bons endroits, même si l'imitation est un peu plus lente/rapide ;
 *  - mélodie en demi-tons, indépendante de la tonalité (voix grave ou aiguë) ;
 *  - rythme = correspondance des attaques (syllabes) avec tolérance ;
 *  - pondération adaptative : un « boum » n'est pas jugé sur sa mélodie, une
 *    chanson l'est ;
 *  - détection du souffle/bruit à la place d'une vraie voix, du micro coupé et
 *    de la « copie conforme » (original rejoué dans le micro) ;
 *  - verdict et conseil personnalisé pour chaque imitation.
 *
 * API (compatible v1) :
 *   MimicScore.features(samples, sampleRate) -> empreinte
 *   MimicScore.compare(orig, rec) -> { score, parts, weights, flags, tip, ver }
 *   MimicScore.analyse({samples,sr}, {samples,sr}) -> idem
 *   MimicScore.toPoints(score) -> entier 0..100
 *   MimicScore.verdict(score) -> { label, emoji, tone }
 *   MimicScore.tipText(key) -> phrase de conseil (français)
 */
"use strict";
(function (root) {
  var TARGET_SR = 16000;
  var FFT = 512;
  var HOP = 256;
  var HOP_S = HOP / TARGET_SR;
  var MELS = 26;
  var NCEP = 12;
  var PITCH_MIN = 70;
  var PITCH_MAX = 520;

  /* Réglages de calibration (à ajuster après des tests en vrai). */
  var CFG = {
    timbreLo: 1.00,      /* distance DTW moyenne = 0 pt de timbre */
    timbreHi: 0.14,      /* … = 100 pts de timbre */
    curveK: 6.0,         /* raideur de la courbe finale */
    curveMid: 0.58,      /* note brute qui donne 50/100 */
    copyDist: 0.045,     /* distance si faible = copie conforme */
    pen: 0.12,           /* pénalité des pas non diagonaux du DTW */
    floorLn: 9           /* plancher spectral sous le pic (en ln de puissance) */
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- outils signal ---------- */
  function resample(samples, sr, target) {
    if (!samples || !samples.length) return new Float32Array(0);
    if (!sr || sr === target) return samples instanceof Float32Array ? samples : new Float32Array(samples);
    var ratio = sr / target;
    var len = Math.max(1, Math.floor(samples.length / ratio));
    var out = new Float32Array(len);
    if (ratio > 1) { /* sous-échantillonnage : moyenne sur la fenêtre (anti-repliement) */
      for (var i = 0; i < len; i++) {
        var a = Math.floor(i * ratio), b = Math.min(samples.length, Math.max(a + 1, Math.floor((i + 1) * ratio)));
        var s = 0;
        for (var k = a; k < b; k++) s += samples[k];
        out[i] = s / (b - a);
      }
      return out;
    }
    for (var j = 0; j < len; j++) {
      var pos = j * ratio, i0 = Math.floor(pos), i1 = Math.min(samples.length - 1, i0 + 1), f = pos - i0;
      out[j] = samples[i0] * (1 - f) + samples[i1] * f;
    }
    return out;
  }

  var _tw = {};
  function twiddles(n) {
    if (_tw[n]) return _tw[n];
    var c = new Float32Array(n / 2), s = new Float32Array(n / 2);
    for (var i = 0; i < n / 2; i++) { c[i] = Math.cos(-2 * Math.PI * i / n); s[i] = Math.sin(-2 * Math.PI * i / n); }
    return (_tw[n] = { c: c, s: s });
  }

  function fft(re, im) {
    var n = re.length, i, j, k, len, t, c, s, ur, ui, vr, vi, half, step;
    var tw = twiddles(n);
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (len = 2; len <= n; len <<= 1) {
      half = len >> 1; step = n / len;
      for (i = 0; i < n; i += len) {
        for (k = 0; k < half; k++) {
          c = tw.c[k * step]; s = tw.s[k * step];
          ur = re[i + k]; ui = im[i + k];
          vr = re[i + k + half] * c - im[i + k + half] * s;
          vi = re[i + k + half] * s + im[i + k + half] * c;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
        }
      }
    }
  }

  function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
  function melToHz(m) { return 700 * (Math.pow(10, m / 2595) - 1); }

  var _filters = null;
  function melFilters() {
    if (_filters) return _filters;
    var sr = TARGET_SR, fmin = 60, fmax = 7600;
    var mmin = hzToMel(fmin), mmax = hzToMel(fmax), pts = [], i;
    for (i = 0; i <= MELS + 1; i++) pts.push(Math.round((FFT) * melToHz(mmin + (mmax - mmin) * i / (MELS + 1)) / sr));
    var filters = [];
    for (var m = 1; m <= MELS; m++) {
      var f = new Float32Array(FFT / 2 + 1);
      var lo = pts[m - 1], ce = Math.max(lo + 1, pts[m]), hi = Math.max(ce + 1, pts[m + 1]);
      for (i = lo; i < ce; i++) if (i >= 0 && i < f.length) f[i] = (i - lo) / Math.max(1, ce - lo);
      for (i = ce; i < hi; i++) if (i >= 0 && i < f.length) f[i] = (hi - i) / Math.max(1, hi - ce);
      filters.push(f);
    }
    return (_filters = filters);
  }

  var _dct = null, _win = null;
  function dctTable() {
    if (_dct) return _dct;
    var t = [];
    for (var k = 1; k <= NCEP; k++) {
      var row = new Float32Array(MELS);
      for (var m = 0; m < MELS; m++) row[m] = Math.cos(Math.PI * k * (m + 0.5) / MELS);
      t.push(row);
    }
    return (_dct = t);
  }
  function hannWin() {
    if (_win) return _win;
    _win = new Float32Array(FFT);
    for (var i = 0; i < FFT; i++) _win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT - 1));
    return _win;
  }

  function rmsRange(arr, from, to) {
    var s = 0, n = 0;
    for (var i = from; i < to; i++) { var v = arr[i]; s += v * v; n++; }
    return n ? Math.sqrt(s / n) : 0;
  }

  /* Hauteur : autocorrélation normalisée, plus petit pic fiable (évite les erreurs d'octave). */
  function framePitch(x, from, size, sr) {
    var minLag = Math.floor(sr / PITCH_MAX), maxLag = Math.min(size - 8, Math.floor(sr / PITCH_MIN));
    if (maxLag <= minLag + 2) return { f: 0, r: 0 };
    var r = new Float32Array(maxLag + 2), best = 0, lag, i;
    for (lag = minLag - 1; lag <= maxLag + 1; lag++) {
      var sum = 0, na = 0, nb = 0;
      for (i = 0; i + lag < size; i += 2) {
        var a = x[from + i], b = x[from + i + lag];
        sum += a * b; na += a * a; nb += b * b;
      }
      var den = Math.sqrt(na * nb);
      r[lag] = den > 1e-9 ? sum / den : 0;
      if (lag >= minLag && lag <= maxLag && r[lag] > best) best = r[lag];
    }
    if (best < 0.5) return { f: 0, r: best };
    var pick = 0;
    for (lag = minLag; lag <= maxLag; lag++) {
      if (r[lag] >= 0.88 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) { pick = lag; break; }
    }
    if (!pick) return { f: 0, r: best };
    var y0 = r[pick - 1], y1 = r[pick], y2 = r[pick + 1];
    var denom = y0 - 2 * y1 + y2;
    var delta = Math.abs(denom) > 1e-6 ? clamp(0.5 * (y0 - y2) / denom, -0.5, 0.5) : 0;
    return { f: sr / (pick + delta), r: best };
  }

  function median5(arr) {
    var out = new Float32Array(arr.length), w = [];
    for (var i = 0; i < arr.length; i++) {
      w.length = 0;
      for (var k = -2; k <= 2; k++) { var v = arr[i + k]; if (v > 0) w.push(v); }
      if (w.length < 3 || !(arr[i] > 0)) { out[i] = 0; continue; }
      w.sort(function (a, b) { return a - b; });
      out[i] = w[w.length >> 1];
    }
    /* supprime les îlots voisés de moins de 3 trames */
    var s = 0;
    while (s < out.length) {
      if (out[s] > 0) {
        var e = s;
        while (e < out.length && out[e] > 0) e++;
        if (e - s < 3) for (var q = s; q < e; q++) out[q] = 0;
        s = e;
      } else s++;
    }
    return out;
  }

  function percentile(arr, p) {
    var a = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; });
    return a.length ? a[clamp(Math.floor(p * (a.length - 1)), 0, a.length - 1)] : 0;
  }

  /** Empreinte audio d'un canal mono (Float32Array). */
  function features(input, sampleRate) {
    var x = resample(input, Number(sampleRate) || TARGET_SR, TARGET_SR);
    var sr = TARGET_SR;
    var empty = { ver: 2, sr: sr, dur: 0, vec: [], energy: [], edb: [], flux: [], pitch: [], quiet: [], level: 0, voiced: 0 };
    if (!x.length) return empty;
    var filters = melFilters(), dct = dctTable(), win = hannWin();
    var nFrames = Math.max(1, Math.floor((x.length - FFT) / HOP) + 1);
    var pre = new Float32Array(x.length);
    pre[0] = x[0];
    for (var p = 1; p < x.length; p++) pre[p] = x[p] - 0.97 * x[p - 1];

    var re = new Float32Array(FFT), im = new Float32Array(FFT);
    var energy = new Float32Array(nFrames), flux = new Float32Array(nFrames);
    var cep = [], pitchRaw = new Float32Array(nFrames), lgAll = [], maxE = 0, gmax = -1e9, f, i, m, k;
    for (f = 0; f < nFrames; f++) {
      var from = f * HOP;
      var e = rmsRange(x, from, Math.min(x.length, from + FFT));
      energy[f] = e; if (e > maxE) maxE = e;
      for (i = 0; i < FFT; i++) { re[i] = (from + i < pre.length ? pre[from + i] : 0) * win[i]; im[i] = 0; }
      fft(re, im);
      var lg = new Float32Array(MELS);
      for (m = 0; m < MELS; m++) {
        var filt = filters[m], acc = 0;
        for (i = 0; i < filt.length; i++) { if (filt[i]) acc += (re[i] * re[i] + im[i] * im[i]) * filt[i]; }
        lg[m] = Math.log(acc + 1e-9);
        if (lg[m] > gmax) gmax = lg[m];
      }
      lgAll.push(lg);
    }
    /* plancher spectral : le bruit de fond du micro ne doit pas dominer la comparaison */
    var floorLg = gmax - CFG.floorLn, prevLog = null;
    for (f = 0; f < nFrames; f++) {
      var lg2 = lgAll[f], c = new Float32Array(NCEP);
      for (m = 0; m < MELS; m++) if (lg2[m] < floorLg) lg2[m] = floorLg;
      for (k = 0; k < NCEP; k++) {
        var s = 0, row = dct[k];
        for (m = 0; m < MELS; m++) s += lg2[m] * row[m];
        c[k] = s;
      }
      cep.push(c);
      var fl = 0;
      if (prevLog) for (m = 0; m < MELS; m++) { var d = lg2[m] - prevLog[m]; if (d > 0) fl += d; }
      flux[f] = fl; prevLog = lg2;
    }

    /* seuil de silence adaptatif (bruit de fond estimé, sinon fraction du pic) */
    var nf = percentile(energy, 0.1);
    var thr = Math.max(0.004, maxE * 0.05, (nf < maxE * 0.25 ? nf * 2.6 : 0));
    var act = new Uint8Array(nFrames);
    for (f = 0; f < nFrames; f++) act[f] = energy[f] >= thr ? 1 : 0;
    /* comble les micro-trous (< 4 trames) à l'intérieur de la parole */
    var g = 0;
    while (g < nFrames) {
      if (!act[g]) {
        var h = g; while (h < nFrames && !act[h]) h++;
        if (g > 0 && h < nFrames && h - g < 4) for (var q = g; q < h; q++) act[q] = 1;
        g = h;
      } else g++;
    }
    var lo = 0, hi = nFrames - 1;
    if (maxE > 0) {
      while (lo < hi && !act[lo]) lo++;
      while (hi > lo && !act[hi]) hi--;
      lo = Math.max(0, lo - 2); hi = Math.min(nFrames - 1, hi + 2);
    }
    var n = hi - lo + 1;

    /* hauteur sur toute la zone utile */
    for (f = lo; f <= hi; f++) {
      if (energy[f] < thr * 1.3) { pitchRaw[f] = 0; continue; }
      var pr = framePitch(x, f * HOP, Math.min(FFT, x.length - f * HOP), sr);
      pitchRaw[f] = pr.f;
    }
    var pitchAll = median5(pitchRaw);

    /* découpe + normalisation des MFCC (moyenne/variance par énoncé) */
    var seg = cep.slice(lo, hi + 1), mean = new Float32Array(NCEP), cnt = 0;
    for (f = 0; f < n; f++) if (act[lo + f]) { for (k = 0; k < NCEP; k++) mean[k] += seg[f][k]; cnt++; }
    for (k = 0; k < NCEP; k++) mean[k] /= Math.max(1, cnt);
    var vsum = 0;
    for (f = 0; f < n; f++) if (act[lo + f]) { for (k = 0; k < NCEP; k++) { var dd = seg[f][k] - mean[k]; vsum += dd * dd; } }
    var sd = Math.sqrt(vsum / Math.max(1, cnt * NCEP)) || 1;
    for (f = 0; f < n; f++) for (k = 0; k < NCEP; k++) seg[f][k] = (seg[f][k] - mean[k]) / sd;

    var edb = new Float32Array(n), en = new Float32Array(n), fx = new Float32Array(n);
    var pitch = new Float32Array(n), quiet = new Uint8Array(n), fmax = 0, voicedN = 0, actN = 0;
    for (f = 0; f < n; f++) {
      var ev = energy[lo + f] / (maxE || 1);
      en[f] = ev;
      edb[f] = clamp(20 * Math.log10(ev + 1e-4), -50, 0);
      fx[f] = flux[lo + f]; if (fx[f] > fmax) fmax = fx[f];
      pitch[f] = pitchAll[lo + f];
      quiet[f] = act[lo + f] ? 0 : 1;
      if (act[lo + f]) { actN++; if (pitch[f] > 0) voicedN++; }
    }
    if (fmax > 0) for (f = 0; f < n; f++) fx[f] /= fmax;
    /* lissage léger du flux */
    var fxs = new Float32Array(n);
    for (f = 0; f < n; f++) fxs[f] = ((fx[f - 1] || 0) + 2 * fx[f] + (fx[f + 1] || 0)) / 4;

    /* vecteur par trame : MFCC, deltas, énergie relative (silence ≠ parole) */
    var DIM = NCEP * 2 + 1, vec = [];
    for (f = 0; f < n; f++) {
      var v = new Float32Array(DIM);
      for (k = 0; k < NCEP; k++) {
        v[k] = seg[f][k];
        var a1 = seg[Math.min(n - 1, f + 1)][k] - seg[Math.max(0, f - 1)][k];
        var a2 = seg[Math.min(n - 1, f + 2)][k] - seg[Math.max(0, f - 2)][k];
        v[NCEP + k] = 0.6 * (a1 + 2 * a2) / 6;
      }
      v[DIM - 1] = (edb[f] + 25) / 25;
      vec.push(v);
    }
    var dur = n > 0 ? ((n - 1) * HOP + FFT) / sr : 0;
    return {
      ver: 2, sr: sr, dur: dur, vec: vec, energy: Array.prototype.slice.call(en),
      edb: edb, flux: fxs, pitch: pitch, quiet: quiet, level: maxE,
      voiced: actN ? voicedN / actN : 0
    };
  }

  /* ---------- alignement DTW avec chemin ---------- */
  function fdist(a, b) {
    var s = 0, n = a.length;
    for (var i = 0; i < n; i++) { var d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s / n);
  }

  function dtwAlign(A, B) {
    var n = A.length, m = B.length;
    if (!n || !m) return { mean: 1, path: [] };
    var W = m + 1, INF = 1e9;
    var D = new Float32Array((n + 1) * W).fill(INF), P = new Uint8Array((n + 1) * W);
    D[0] = 0;
    var w = Math.max(12, Math.round(0.34 * Math.max(n, m)));
    for (var i = 1; i <= n; i++) {
      var center = i * m / n;
      var jlo = Math.max(1, Math.floor(center - w)), jhi = Math.min(m, Math.ceil(center + w));
      for (var j = jlo; j <= jhi; j++) {
        var d = fdist(A[i - 1], B[j - 1]);
        var dg = D[(i - 1) * W + (j - 1)], up = D[(i - 1) * W + j] + CFG.pen, lf = D[i * W + (j - 1)] + CFG.pen;
        var best = dg, dir = 0;
        if (up < best) { best = up; dir = 1; }
        if (lf < best) { best = lf; dir = 2; }
        D[i * W + j] = best + d; P[i * W + j] = dir;
      }
    }
    var pairs = [], ii = n, jj = m, sum = 0;
    while (ii > 0 && jj > 0) {
      pairs.push([ii - 1, jj - 1]);
      sum += fdist(A[ii - 1], B[jj - 1]);
      var dr = P[ii * W + jj];
      if (dr === 0) { ii--; jj--; } else if (dr === 1) ii--; else jj--;
    }
    pairs.reverse();
    return { mean: sum / Math.max(1, pairs.length), path: pairs };
  }

  /* ---------- petites stats ---------- */
  function pearson(a, b) {
    var n = Math.min(a.length, b.length);
    if (n < 3) return 0;
    var ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    var s = 0, na = 0, nb = 0;
    for (i = 0; i < n; i++) { var x = a[i] - ma, y = b[i] - mb; s += x * y; na += x * x; nb += y * y; }
    if (na < 1e-9 || nb < 1e-9) return 0;
    return clamp(s / Math.sqrt(na * nb), -1, 1);
  }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }
  function stdev(a) { var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return a.length ? Math.sqrt(s / a.length) : 0; }
  function medianOf(a) { var b = Array.prototype.slice.call(a).sort(function (x, y) { return x - y; }); return b.length ? b[b.length >> 1] : 0; }
  function resample1d(arr, n) {
    var out = new Float64Array(n);
    if (!arr.length) return out;
    for (var i = 0; i < n; i++) {
      var pos = (i / Math.max(1, n - 1)) * (arr.length - 1);
      var i0 = Math.floor(pos), i1 = Math.min(arr.length - 1, i0 + 1), f = pos - i0;
      out[i] = arr[i0] * (1 - f) + arr[i1] * f;
    }
    return out;
  }

  /* pics d'attaque (syllabes) : indices de trames */
  function onsets(flux) {
    var out = [], last = -99;
    for (var i = 1; i < flux.length - 1; i++) {
      if (flux[i] >= 0.28 && flux[i] >= flux[i - 1] && flux[i] > flux[i + 1] && i - last >= 5) { out.push(i); last = i; }
    }
    return out;
  }

  function gaps(quiet) {
    var out = [], i = 0;
    while (i < quiet.length) {
      if (quiet[i]) { var j = i; while (j < quiet.length && quiet[j]) j++; if (j - i >= 5 && i > 0 && j < quiet.length) out.push(j - i); i = j; } else i++;
    }
    return out;
  }

  function weightsFor(A, B) {
    var sd = 0, st = [];
    for (var i = 0; i < A.pitch.length; i++) if (A.pitch[i] > 0) st.push(12 * Math.log2(A.pitch[i] / 110));
    sd = stdev(st);
    var rel = clamp((A.voiced - 0.15) / 0.4, 0, 1) * clamp(0.4 + sd / 4, 0.4, 1);
    var w = { timbre: 0.32, pitch: 0.05 + 0.20 * rel, rhythm: 0.16, energy: 0.12, pauses: 0.05, duration: 0.14 };
    var tot = 0, k;
    for (k in w) tot += w[k];
    for (k in w) w[k] = w[k] / tot;
    weightsFor.rel = rel;
    return w;
  }

  var EMPTY_PARTS = { timbre: 0, pitch: 0, rhythm: 0, energy: 0, pauses: 0, duration: 0 };
  function empty(flags) { return { score: 0, parts: Object.assign({}, EMPTY_PARTS), weights: null, flags: flags || {}, tip: "mute", ver: 2 }; }

  function compare(A, B) {
    if (!A || !B || !A.vec || !B.vec || !A.vec.length || !B.vec.length) return empty({ quiet: true });
    if (typeof B.level === "number" && B.level < 0.006) return empty({ quiet: true });
    if (B.dur < 0.14) return empty({ quiet: true });

    var al = dtwAlign(A.vec, B.vec), path = al.path;
    var timbre = clamp((CFG.timbreLo - al.mean) / (CFG.timbreLo - CFG.timbreHi), 0, 1);

    /* hauteur : demi-tons relatifs à la médiane de chaque voix, le long du chemin */
    var stA = [], stB = [], agree = 0, both = 0, i, t;
    var mA = medianOf(Array.prototype.filter.call(A.pitch, function (v) { return v > 0; }));
    var mB = medianOf(Array.prototype.filter.call(B.pitch, function (v) { return v > 0; }));
    for (t = 0; t < path.length; t++) {
      var pa = A.pitch[path[t][0]], pb = B.pitch[path[t][1]];
      if (A.quiet[path[t][0]] && B.quiet[path[t][1]]) continue;
      both++;
      if ((pa > 0) === (pb > 0)) agree++;
      if (pa > 0 && pb > 0 && mA && mB) { stA.push(12 * Math.log2(pa / mA)); stB.push(12 * Math.log2(pb / mB)); }
    }
    var voicing = both ? agree / both : 0.5;
    var pitch;
    if (A.voiced < 0.15) {
      /* son non mélodique (boum, bruit, cri) : on regarde juste qu'on ne chante pas à côté */
      pitch = clamp(0.55 + 0.45 * voicing, 0, 1);
    } else if (stA.length >= 5) {
      var corr = (pearson(stA, stB) + 1) / 2;
      var mad = 0;
      for (i = 0; i < stA.length; i++) mad += Math.abs(stA[i] - stB[i]);
      mad /= stA.length;
      var madSim = Math.exp(-mad / 3.2);
      var sdA = stdev(stA), sdB = stdev(stB);
      var rangeSim = 1 - Math.min(1, Math.abs(sdA - sdB) / Math.max(1.5, sdA));
      var cover = clamp(stA.length / Math.max(8, A.voiced * A.vec.length * 0.7), 0, 1);
      pitch = (0.35 * corr + 0.4 * madSim + 0.25 * rangeSim) * (0.45 + 0.55 * voicing) * (0.6 + 0.4 * cover);
    } else {
      pitch = B.voiced < 0.1 ? 0.08 : 0.25;
    }
    pitch = clamp(pitch, 0, 1);

    /* intensité : courbe d'énergie le long du chemin + amplitude dynamique */
    var eA = [], eB = [];
    for (t = 0; t < path.length; t += 1) { eA.push(A.edb[path[t][0]]); eB.push(B.edb[path[t][1]]); }
    var ec = (pearson(eA, eB) + 1) / 2;
    var rngA = percentile(A.edb, 0.9) - percentile(A.edb, 0.1), rngB = percentile(B.edb, 0.9) - percentile(B.edb, 0.1);
    var energy = clamp(0.65 * ec + 0.35 * Math.exp(-Math.abs(rngA - rngB) / 14), 0, 1);

    /* rythme : attaques mises à l'échelle du tempo + corrélation de l'enveloppe d'attaque */
    var oA = onsets(A.flux), oB = onsets(B.flux);
    var scale = A.dur / Math.max(0.05, B.dur), tol = 0.11, used = {}, hit = 0;
    for (i = 0; i < oA.length; i++) {
      var ta = oA[i] * HOP_S, bi = -1, bd = tol + 1;
      for (var j = 0; j < oB.length; j++) {
        if (used[j]) continue;
        var dd = Math.abs(oB[j] * HOP_S * scale - ta);
        if (dd < bd) { bd = dd; bi = j; }
      }
      if (bi >= 0 && bd <= tol) { used[bi] = 1; hit++; }
    }
    var fm;
    if (!oA.length && !oB.length) fm = 0.75;
    else if (!oA.length || !oB.length) fm = 0.2;
    else { var P1 = hit / oB.length, R1 = hit / oA.length; fm = (P1 + R1) ? 2 * P1 * R1 / (P1 + R1) : 0; }
    var envC = (pearson(resample1d(A.flux, 64), resample1d(B.flux, 64)) + 1) / 2;
    var rhythm = clamp(oA.length >= 2 ? 0.55 * fm + 0.45 * envC : 0.35 * fm + 0.65 * envC, 0, 1);

    /* pauses */
    var gA = gaps(A.quiet), gB = gaps(B.quiet);
    function qr(f) { var q = 0; for (var k = 0; k < f.quiet.length; k++) q += f.quiet[k]; return q / Math.max(1, f.quiet.length); }
    var pauses = 0.6 * (1 - Math.min(1, Math.abs(qr(A) - qr(B)) / 0.35)) +
      0.4 * (1 - Math.min(1, Math.abs(gA.length - gB.length) / Math.max(1, gA.length, gB.length)));
    pauses = clamp(pauses, 0, 1);

    /* durée / tempo */
    var dev = Math.abs(Math.log(Math.max(0.05, B.dur) / Math.max(0.05, A.dur)));
    var duration = clamp(Math.exp(-Math.max(0, dev - 0.10) * 2.6), 0, 1);

    var parts = { timbre: timbre, pitch: pitch, rhythm: rhythm, energy: energy, pauses: pauses, duration: duration };
    var W = weightsFor(A, B), arith = 0, geo = 0, k;
    for (k in W) { arith += W[k] * parts[k]; geo += W[k] * Math.log(Math.max(0.05, parts[k])); }
    var core = 0.72 * arith + 0.28 * Math.exp(geo);
    /* les sons doivent coller : bonne mélodie sur de mauvais sons = note moyenne au mieux */
    core *= 0.62 + 0.38 * timbre;
    /* trop lent / trop rapide : le temps compte autant que le reste */
    if (duration < 0.85) core *= 0.6 + 0.4 * duration;
    /* un son mélodique chanté à plat : la mélodie fait partie de l'identité du mème */
    core *= 1 - 0.38 * (1 - pitch) * (weightsFor.rel || 0);

    var flags = {};
    /* du souffle ou du bruit à la place d'une voix : jamais une bonne imitation d'un son tonal */
    if (A.voiced >= 0.5 && B.voiced < 0.12) { core *= 0.55; flags.noisy = true; }
    else if (A.voiced >= 0.5 && B.voiced < 0.3) core *= 0.82;
    /* original rejoué dans le micro : distance quasi nulle, ce qu'aucune voix ne produit */
    if (al.mean < CFG.copyDist && path.length > 12) { core = Math.min(core, 0.55); flags.copy = true; }

    var y = function (x) { return 1 / (1 + Math.exp(-CFG.curveK * (x - CFG.curveMid))); };
    var y0 = y(0), y1 = y(1);
    var score = clamp(Math.round(100 * (y(clamp(core, 0, 1)) - y0) / (y1 - y0)), 0, 100);
    if (flags.copy) score = Math.min(score, 55);

    /* conseil : le critère qui coûte le plus de points */
    var tip = "ok", worst = 0;
    for (k in W) {
      var loss = W[k] * (1 - parts[k]);
      if (loss > worst && parts[k] < 0.75) { worst = loss; tip = k; }
    }
    if (tip === "duration") tip = B.dur < A.dur ? "dur_short" : "dur_long";
    if (flags.noisy) tip = "noisy";
    if (flags.copy) tip = "copy";
    if (score >= 92 && !flags.copy) tip = "ok";

    var pr = {};
    for (k in parts) pr[k] = Math.round(parts[k] * 100);
    return { score: score, parts: pr, weights: W, flags: flags, tip: tip, ver: 2, dist: al.mean };
  }

  function analyse(orig, rec) {
    return compare(
      features(orig && orig.samples, orig && orig.sr),
      features(rec && rec.samples, rec && rec.sr)
    );
  }

  function toPoints(score) { return clamp(Math.round(Number(score) || 0), 0, 100); }

  var VERDICTS = [
    [95, "Clone parfait", "🤖", "lime"], [85, "Impressionnant", "🔥", "lime"], [70, "Très bien joué", "👏", "lime"],
    [55, "Pas mal du tout", "👍", "amber"], [40, "Ça y ressemble… de loin", "😅", "amber"],
    [20, "C’était quoi ça ?", "🤨", "pink"], [0, "Aucun rapport", "🫠", "pink"]
  ];
  function verdict(score) {
    var s = Number(score) || 0;
    for (var i = 0; i < VERDICTS.length; i++) if (s >= VERDICTS[i][0]) return { label: VERDICTS[i][1], emoji: VERDICTS[i][2], tone: VERDICTS[i][3] };
    return { label: VERDICTS[VERDICTS.length - 1][1], emoji: "🫠", tone: "pink" };
  }

  var TIPS = {
    ok: "Rien à redire, c’est du travail d’orfèvre.",
    timbre: "Les sons ne collent pas encore : écoute bien les voyelles et les consonnes du mème.",
    pitch: "Ta mélodie diffère : fais monter et descendre ta voix comme l’original.",
    rhythm: "Le rythme décale : cale tes syllabes sur les coups du mème.",
    energy: "L’intensité ne suit pas : joue sur les accents et les moments forts.",
    pauses: "Respecte les silences : ils font partie du mème.",
    dur_short: "Un peu trop court : prends ton temps, étire les sons.",
    dur_long: "Un peu trop long : resserre, le mème va plus vite que ça.",
    noisy: "Du souffle, pas une voix : fais vibrer les cordes vocales !",
    copy: "Trop parfait pour être honnête… on dirait l’original rejoué dans le micro.",
    mute: "On n’a quasiment rien entendu : parle plus fort ou rapproche le micro."
  };
  function tipText(key) { return TIPS[key] || TIPS.ok; }

  var LABELS = { timbre: "Sons", pitch: "Mélodie", rhythm: "Rythme", energy: "Intensité", pauses: "Pauses", duration: "Tempo" };

  root.MimicScore = {
    ver: 2,
    features: features,
    compare: compare,
    analyse: analyse,
    toPoints: toPoints,
    verdict: verdict,
    tipText: tipText,
    labels: LABELS,
    config: CFG,
    constants: { TARGET_SR: TARGET_SR, FFT: FFT, HOP: HOP, MELS: MELS, NCEP: NCEP, PITCH_MIN: PITCH_MIN, PITCH_MAX: PITCH_MAX },
    _internal: { dtw: dtwAlign, resample: resample, fft: fft, framePitch: framePitch }
  };
})(typeof window !== "undefined" ? window : globalThis);
