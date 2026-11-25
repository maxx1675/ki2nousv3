/* MIMIC PARTY — comparaison audio « IA » locale.
 *
 * Le principe : transformer l'original et l'imitation en empreintes
 * (timbre spectral, hauteur, énergie, rythme, silences), les aligner avec un
 * DTW (Dynamic Time Warping) puis produire une note sur 100 qui mesure la
 * ressemblance, pas la beauté de la voix.
 *
 * Aucun appel réseau, aucune donnée envoyée : tout est calculé dans le
 * navigateur. `MimicScore.compare()` est volontairement isolé du WebAudio pour
 * rester testable et remplaçable par un modèle plus avancé (voir PROJECT_STATUS).
 *
 * API :
 *   MimicScore.features(samples, sampleRate) -> empreinte
 *   MimicScore.compare(orig, rec) -> { score, parts }
 *   MimicScore.analyse({samples,sr}, {samples,sr}) -> { score, parts }
 *   MimicScore.toPoints(score) -> entier 0..100
 */
"use strict";
(function (root) {
  var TARGET_SR = 16000;
  var FFT = 512;
  var HOP = 256;
  var MELS = 24;
  var PITCH_MIN = 70;
  var PITCH_MAX = 520;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function round3(v) { return Math.round(v * 1000) / 1000; }

  /* Rééchantillonnage linéaire simple (suffisant pour comparer des enveloppes). */
  function resample(samples, sr, target) {
    if (!samples || !samples.length) return new Float32Array(0);
    if (!sr || sr === target) return samples instanceof Float32Array ? samples : new Float32Array(samples);
    var ratio = sr / target;
    var len = Math.max(1, Math.floor(samples.length / ratio));
    var out = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      var pos = i * ratio, i0 = Math.floor(pos), i1 = Math.min(samples.length - 1, i0 + 1), f = pos - i0;
      out[i] = samples[i0] * (1 - f) + samples[i1] * f;
    }
    return out;
  }

  /* FFT radix-2 en place (tableaux réels/imaginaires de taille puissance de 2). */
  function fft(re, im) {
    var n = re.length, i, j, k, m, len, t, ang, c, s, ur, ui, vr, vi;
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
      ang = -2 * Math.PI / len;
      for (i = 0; i < n; i += len) {
        for (k = 0; k < len / 2; k++) {
          c = Math.cos(ang * k); s = Math.sin(ang * k);
          ur = re[i + k]; ui = im[i + k];
          vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s;
          vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        }
      }
    }
  }

  function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
  function melToHz(m) { return 700 * (Math.pow(10, m / 2595) - 1); }

  var _filters = null, _filtersKey = "";
  function melFilters(sr) {
    var key = sr + "|" + FFT + "|" + MELS;
    if (_filters && _filtersKey === key) return _filters;
    var fmin = 80, fmax = Math.min(7800, sr / 2 - 200);
    var mmin = hzToMel(fmin), mmax = hzToMel(fmax);
    var pts = [], i;
    for (i = 0; i <= MELS + 1; i++) {
      var hz = melToHz(mmin + (mmax - mmin) * i / (MELS + 1));
      pts.push(Math.round((FFT + 1) * hz / sr));
    }
    var filters = [];
    for (var m = 1; m <= MELS; m++) {
      var f = new Float32Array(FFT / 2 + 1);
      var lo = pts[m - 1], ce = pts[m], hi = pts[m + 1];
      for (i = lo; i < ce; i++) if (i >= 0 && i < f.length) f[i] = (i - lo) / Math.max(1, ce - lo);
      for (i = ce; i < hi; i++) if (i >= 0 && i < f.length) f[i] = (hi - i) / Math.max(1, hi - ce);
      filters.push(f);
    }
    _filters = filters; _filtersKey = key;
    return filters;
  }

  function hann(n, size) {
    if (n === 1) return 1;
    return 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (size - 1));
  }

  function rms(arr, from, to) {
    var s = 0, n = 0;
    for (var i = from; i < to; i++) { var v = arr[i]; s += v * v; n++; }
    return n ? Math.sqrt(s / n) : 0;
  }

  /* Hauteur par autocorrélation sur une fenêtre. Renvoie 0 si non voisé. */
  function framePitch(samples, from, size, sr, energy) {
    if (energy < 0.008) return 0;
    var minLag = Math.floor(sr / PITCH_MAX), maxLag = Math.min(size - 2, Math.floor(sr / PITCH_MIN));
    var best = 0, bestLag = 0, i, lag, sum, norm, corr;
    for (lag = minLag; lag <= maxLag; lag++) {
      sum = 0; norm = 0;
      for (i = 0; i + lag < size; i += 2) {
        if (from + i + lag >= samples.length) break;
        var a = samples[from + i], b = samples[from + i + lag];
        sum += a * b; norm += a * a + b * b;
      }
      corr = norm > 0 ? (2 * sum) / norm : 0;
      if (corr > best) { best = corr; bestLag = lag; }
    }
    if (best < 0.32 || !bestLag) return 0;
    /* affinage parabolique */
    var y0 = best, y1 = best, y2 = best;
    var lag1 = bestLag;
    for (lag = bestLag - 1; lag <= bestLag + 1; lag += 2) {
      if (lag <= minLag || lag >= maxLag) continue;
      sum = 0; norm = 0;
      for (i = 0; i + lag < size; i += 2) {
        if (from + i + lag >= samples.length) break;
        var a2 = samples[from + i], b2 = samples[from + i + lag];
        sum += a2 * b2; norm += a2 * a2 + b2 * b2;
      }
      var c = norm > 0 ? (2 * sum) / norm : 0;
      if (lag < bestLag) y0 = c; else y2 = c;
    }
    var denom = y0 - 2 * y1 + y2;
    var delta = Math.abs(denom) > 1e-6 ? 0.5 * (y0 - y2) / denom : 0;
    delta = clamp(delta, -0.5, 0.5);
    var trueLag = lag1 + delta;
    return trueLag > 0 ? sr / trueLag : 0;
  }

  /** Empreinte audio d'un canal mono (Float32Array). */
  function features(input, sampleRate) {
    var samples = resample(input, Number(sampleRate) || TARGET_SR, TARGET_SR);
    var sr = TARGET_SR;
    if (!samples.length) return { sr: sr, dur: 0, mel: [], energy: [], onset: [], pitch: [] };
    var filters = melFilters(sr);
    var nFrames = Math.max(1, Math.floor((samples.length - FFT) / HOP) + 1);
    var mel = [], energy = [], onset = [], pitch = [];
    var prevE = 0, maxE = 0;
    var re = new Float32Array(FFT), im = new Float32Array(FFT);
    for (var f = 0; f < nFrames; f++) {
      var from = f * HOP;
      var e = rms(samples, from, Math.min(samples.length, from + FFT));
      energy.push(e);
      if (e > maxE) maxE = e;
      var i;
      for (i = 0; i < FFT; i++) {
        var s = from + i < samples.length ? samples[from + i] : 0;
        re[i] = s * hann(i, FFT); im[i] = 0;
      }
      fft(re, im);
      var vec = new Float32Array(MELS);
      for (var m = 0; m < MELS; m++) {
        var filt = filters[m], acc = 0;
        for (i = 0; i < filt.length; i++) {
          if (!filt[i]) continue;
          acc += Math.sqrt(re[i] * re[i] + im[i] * im[i]) * filt[i];
        }
        vec[m] = Math.log(1e-7 + acc);
      }
      /* normalisation L2 de chaque trame : compare le timbre, pas le volume */
      var n2 = 0;
      for (i = 0; i < MELS; i++) n2 += vec[i] * vec[i];
      n2 = Math.sqrt(n2) || 1;
      for (i = 0; i < MELS; i++) vec[i] /= n2;
      mel.push(vec);
      pitch.push(framePitch(samples, from, Math.min(FFT, samples.length - from), sr, e));
      onset.push(Math.max(0, e - prevE));
      prevE = e;
    }
    if (maxE > 0) {
      for (var k = 0; k < energy.length; k++) { energy[k] /= maxE; onset[k] /= maxE; }
    }
    return { sr: sr, dur: samples.length / sr, mel: mel, energy: energy, onset: onset, pitch: pitch };
  }

  function cosine(a, b) {
    var s = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (!na || !nb) return 0;
    return s / Math.sqrt(na * nb);
  }

  function frameDist(a, b) { return 1 - clamp(cosine(a, b), -1, 1); }

  /** DTW borné (bande de Sakoe-Chiba) : aligne deux séquences de trames. */
  function dtw(A, B, bandRatio) {
    var n = A.length, m = B.length;
    if (!n || !m) return 1;
    var band = Math.max(24, Math.round(Math.abs(n - m) + Math.min(n, m) * (bandRatio || 0.28)));
    var INF = 1e9;
    var prev = new Float64Array(m + 1), cur = new Float64Array(m + 1);
    var j;
    for (j = 0; j <= m; j++) prev[j] = INF;
    prev[0] = 0;
    for (var i = 1; i <= n; i++) {
      for (j = 0; j <= m; j++) cur[j] = INF;
      var lo = Math.max(1, i - band), hi = Math.min(m, i + band);
      for (j = lo; j <= hi; j++) {
        var d = frameDist(A[i - 1], B[j - 1]);
        var best = prev[j];
        if (prev[j - 1] < best) best = prev[j - 1];
        if (cur[j - 1] < best) best = cur[j - 1];
        cur[j] = d + best;
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    var norm = prev[m] / (n + m);
    return clamp(norm, 0, 1);
  }

  /** Rééchantillonne un tableau 1D à `n` points (interpolation linéaire). */
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

  function zscore(arr) {
    var mean = 0, i;
    for (i = 0; i < arr.length; i++) mean += arr[i];
    mean /= Math.max(1, arr.length);
    var v = 0;
    for (i = 0; i < arr.length; i++) v += (arr[i] - mean) * (arr[i] - mean);
    var sd = Math.sqrt(v / Math.max(1, arr.length)) || 1;
    var out = new Float64Array(arr.length);
    for (i = 0; i < arr.length; i++) out[i] = (arr[i] - mean) / sd;
    return out;
  }

  function corr(a, b) {
    if (!a.length || a.length !== b.length) return 0;
    var s = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (!na || !nb) return 0;
    return clamp(s / Math.sqrt(na * nb), -1, 1);
  }

  function median(arr) {
    var a = arr.filter(function (v) { return v > 0; }).sort(function (x, y) { return x - y; });
    if (!a.length) return 0;
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  var WEIGHTS = { timbre: 0.28, pitch: 0.2, rhythm: 0.15, energy: 0.12, pauses: 0.07, duration: 0.18 };

  function compare(orig, rec) {
    var empty = { score: 0, parts: { timbre: 0, pitch: 0, rhythm: 0, energy: 0, pauses: 0, duration: 0 } };
    if (!orig || !rec || !orig.mel || !rec.mel || !orig.mel.length || !rec.mel.length) return empty;

    var dist = dtw(orig.mel, rec.mel, 0.28);
    var timbre = clamp(1 - dist / 0.75, 0, 1);

    var N = 96;
    var pA = resample1d(orig.pitch, N), pB = resample1d(rec.pitch, N);
    var pairsA = [], pairsB = [];
    for (var i = 0; i < N; i++) {
      if (pA[i] > 0 && pB[i] > 0) {
        pairsA.push(Math.log2(pA[i]));
        pairsB.push(Math.log2(pB[i]));
      }
    }
    var pitch;
    if (pairsA.length >= 4) {
      var c = (corr(zscore(pairsA), zscore(pairsB)) + 1) / 2;
      var mA = median(orig.pitch), mB = median(rec.pitch);
      var octave = mA && mB ? Math.exp(-Math.abs(Math.log2(mA / mB)) * 1.6) : 0.5;
      pitch = clamp(0.65 * c + 0.35 * octave, 0, 1);
    } else {
      /* pas assez de voix détectée des deux côtés : neutre plutôt que zéro */
      pitch = orig.pitch.filter(function (v) { return v > 0; }).length ? 0.4 : 0.5;
    }

    var eA = zscore(resample1d(orig.energy, N)), eB = zscore(resample1d(rec.energy, N));
    var energy = clamp((corr(eA, eB) + 1) / 2, 0, 1);
    var rA = zscore(resample1d(orig.onset, N)), rB = zscore(resample1d(rec.onset, N));
    var rhythm = clamp((corr(rA, rB) + 1) / 2, 0, 1);

    function silenceRatio(f) {
      var max = 0;
      for (var k = 0; k < f.energy.length; k++) max = Math.max(max, f.energy[k]);
      if (max <= 0) return 1;
      var n = 0;
      for (k = 0; k < f.energy.length; k++) if (f.energy[k] < max * 0.09) n++;
      return n / Math.max(1, f.energy.length);
    }
    var pauses = clamp(1 - Math.abs(silenceRatio(orig) - silenceRatio(rec)) / 0.45, 0, 1);

    var duration = clamp(Math.min(orig.dur, rec.dur) / Math.max(0.001, Math.max(orig.dur, rec.dur)), 0, 1);

    var raw = WEIGHTS.timbre * timbre + WEIGHTS.pitch * pitch + WEIGHTS.rhythm * rhythm +
      WEIGHTS.energy * energy + WEIGHTS.pauses * pauses + WEIGHTS.duration * duration;
    /* Une imitation beaucoup trop courte perd en crédibilité, même si le timbre colle. */
    if (duration < 0.85) raw *= 0.55 + 0.45 * duration;
    /* Un son franchement tonal imité par du bruit sans aucune hauteur (souffle,
       chhh, grésillement) ne peut pas être une bonne imitation : on l'abaisse
       sans pénaliser les sons volontairement bruités (boom, métal, applaudissements). */
    var voicedA = orig.pitch.filter(function (v) { return v > 0; }).length / Math.max(1, orig.pitch.length);
    var voicedB = rec.pitch.filter(function (v) { return v > 0; }).length / Math.max(1, rec.pitch.length);
    if (voicedA >= 0.5 && voicedB < 0.12) raw *= 0.5;
    else if (voicedA >= 0.5 && voicedB < 0.3) raw *= 0.8;
    /* légère courbe pour écarter les notes moyennes, sans écraser les bons essais */
    var score = clamp(Math.round(100 * Math.pow(clamp(raw, 0, 1), 1.12)), 0, 100);
    return {
      score: score,
      parts: {
        timbre: Math.round(timbre * 100),
        pitch: Math.round(pitch * 100),
        rhythm: Math.round(rhythm * 100),
        energy: Math.round(energy * 100),
        pauses: Math.round(pauses * 100),
        duration: Math.round(duration * 100)
      }
    };
  }

  function analyse(orig, rec) {
    return compare(
      features(orig && orig.samples, orig && orig.sr),
      features(rec && rec.samples, rec && rec.sr)
    );
  }

  function toPoints(score) {
    return clamp(Math.round(Number(score) || 0), 0, 100);
  }

  root.MimicScore = {
    features: features,
    compare: compare,
    analyse: analyse,
    toPoints: toPoints,
    weights: WEIGHTS,
    /** Exposé pour les tests / outils : bornes et constantes du modèle. */
    constants: { TARGET_SR: TARGET_SR, FFT: FFT, HOP: HOP, MELS: MELS, PITCH_MIN: PITCH_MIN, PITCH_MAX: PITCH_MAX },
    _internal: { dtw: dtw, cosine: cosine, resample: resample, round3: round3 }
  };
})(typeof window !== "undefined" ? window : globalThis);
