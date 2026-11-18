/* Audio original de La Table Des Menteurs — WebAudio synthétisé, aucun média protégé. */
let ctx = null;
let master = null;
let ambientGain = null;
let ambTimer = 0;
let muted = false;
let volume = 0.55;

function makeCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch (_) {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  return ctx;
}

export function initAudio() {
  const c = makeCtx();
  if (!c) return null;
  if (c.state === "suspended") c.resume().catch(() => {});
  return c;
}

/**
 * Déverrouille vraiment la WebAudio.
 * À appeler DANS un geste utilisateur (clic, touche) : Chrome, Firefox et
 * Safari créent un contexte « suspended » tant qu'aucun son n'a été lancé
 * pendant une interaction. On ne considère l'audio prêt que lorsque le
 * contexte est réellement passé à « running ».
 * @returns {Promise<boolean>}
 */
export async function unlockAudio() {
  const c = makeCtx();
  if (!c) return false;
  try {
    // Safari iOS : jouer un buffer muet dans le geste débloque la sortie.
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch (_) {
    /* pas bloquant */
  }
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch (_) {
      /* le navigateur a refusé : on retentera au prochain geste */
    }
  }
  return c.state === "running";
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : volume;
}
export function isMuted() {
  return muted;
}
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, Number(v) || 0));
  if (master) master.gain.value = muted ? 0 : volume;
}
export function getVolume() {
  return volume;
}

function tone(freq, dur, type = "sine", peak = 0.16, slide = 0, delay = 0) {
  const c = makeCtx();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}
function noiseBuf(dur) {
  const c = makeCtx();
  if (!c) return null;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  return b;
}
function noise(dur = 0.12, gain = 0.2, freq = 1200) {
  const c = makeCtx();
  if (!c || muted) return;
  const b = noiseBuf(dur);
  if (!b) return;
  const s = c.createBufferSource();
  s.buffer = b;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start();
}

export function sfx(name) {
  if (muted) return;
  initAudio();
  switch (name) {
    case "card":
      noise(0.05, 0.16, 2200);
      tone(480, 0.04, "triangle", 0.04, -100);
      break;
    case "chip":
      tone(1400, 0.03, "square", 0.05, -700);
      tone(1900, 0.02, "square", 0.03, -900, 0.02);
      break;
    case "glass":
      tone(1800, 0.18, "sine", 0.08, -200);
      tone(2400, 0.12, "sine", 0.04, -300, 0.02);
      break;
    case "click":
      tone(900, 0.035, "square", 0.08, -500);
      break;
    case "spin":
      for (let i = 0; i < 7; i++) tone(380 + i * 75, 0.045, "triangle", 0.05, 120, i * 0.055);
      break;
    case "accuse":
      tone(220, 0.18, "sawtooth", 0.1, 90);
      tone(330, 0.14, "triangle", 0.07, 120, 0.06);
      noise(0.08, 0.22, 1600);
      break;
    case "gunshot":
      // claquement sec + détonation grave + souffle
      noise(0.07, 0.55, 6500);
      noise(0.4, 0.8, 1500);
      tone(110, 0.3, "sawtooth", 0.3, -60);
      tone(52, 0.5, "sine", 0.26, -18, 0.01);
      break;
    case "empty":
      tone(1100, 0.05, "square", 0.14, -800);
      noise(0.04, 0.1, 900);
      break;
    case "cock":
      // chien armé : deux petits crans métalliques
      noise(0.035, 0.22, 5200);
      tone(2200, 0.025, "square", 0.06, -1500);
      noise(0.03, 0.16, 5200);
      tone(1500, 0.03, "square", 0.05, -1000, 0.09);
      break;
    case "trigger":
      noise(0.03, 0.12, 3800);
      tone(1200, 0.02, "square", 0.05, -800);
      break;
    case "heartbeat":
      tone(58, 0.18, "sine", 0.24, -14);
      tone(52, 0.2, "sine", 0.18, -10, 0.2);
      tone(46, 0.16, "sine", 0.1, -8, 0.4);
      break;
    case "breath":
      noise(0.55, 0.075, 850);
      tone(150, 0.5, "sine", 0.02, 45, 0.05);
      break;
    case "unlock":
      tone(523, 0.16, "triangle", 0.09);
      tone(784, 0.2, "triangle", 0.07, 0, 0.09);
      tone(1046, 0.26, "sine", 0.05, 0, 0.18);
      noise(0.05, 0.08, 2400);
      break;
    case "win":
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.1, 0, i * 0.14));
      break;
    case "lose":
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.07, 0, i * 0.16));
      break;
    case "gasp":
      noise(0.28, 0.12, 600);
      tone(300, 0.18, "sawtooth", 0.04, 80);
      break;
    case "laugh":
      for (let i = 0; i < 4; i++) tone(220 + i * 18, 0.09, "triangle", 0.05, 30, i * 0.1);
      break;
    case "whoosh":
      noise(0.18, 0.08, 500);
      break;
    case "point":
      noise(0.06, 0.12, 1600);
      tone(300, 0.06, "square", 0.04, 120);
      break;
    case "shuffle":
      for (let i = 0; i < 8; i++) {
        const d = i * 46;
        setTimeout(() => noise(0.05, 0.09, 2400 + (i % 3) * 260), d);
      }
      tone(300, 0.1, "triangle", 0.025, -90, 0.18);
      break;
    case "deal":
      noise(0.09, 0.13, 3000);
      tone(680, 0.05, "triangle", 0.045, -220);
      break;
    case "flip":
      noise(0.04, 0.1, 3300);
      tone(1100, 0.035, "square", 0.03, -520);
      break;
    case "draw":
      noise(0.12, 0.14, 1500);
      tone(420, 0.08, "sawtooth", 0.035, 160);
      break;
    default:
      tone(660, 0.05, "sine", 0.05);
  }
}

const PENTA = [196, 220, 247, 294, 330, 392, 440, 494, 587];
let ambNote = 0;

/**
 * Démarre la musique d'ambiance. Ne fait rien tant que la WebAudio n'est
 * pas réellement débloquée (contexte « running ») : c'est ce qui rendait
 * le son silencieux sur le site déployé.
 * @returns {boolean} vrai si l'ambiance tourne
 */
export function startAmbient() {
  const c = initAudio();
  if (!c) return false;
  if (ambientGain) return true;
  if (c.state !== "running") return false;

  ambientGain = c.createGain();
  const t0 = c.currentTime;
  ambientGain.gain.setValueAtTime(0.0001, t0);
  ambientGain.gain.exponentialRampToValueAtTime(0.13, t0 + 1.8);
  ambientGain.connect(master);

  // Murmure de saloon : bruit filtré + lent souffle pour éviter la boucle
  // statique et donner l'impression d'une salle vivante.
  const b = noiseBuf(8);
  if (b) {
    const s = c.createBufferSource();
    s.buffer = b;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 520;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 140;
    const g = c.createGain();
    g.gain.value = 0.05;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(f.frequency);
    s.connect(hp);
    hp.connect(f);
    f.connect(g);
    g.connect(ambientGain);
    s.start();
    lfo.start();
    ambientGain._murmur = s;
    ambientGain._lfo = lfo;
  }

  // Nappe grave discrète, comme un piano lointain.
  const drone = c.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 55;
  const droneGain = c.createGain();
  droneGain.gain.value = 0.018;
  drone.connect(droneGain);
  droneGain.connect(ambientGain);
  drone.start();
  ambientGain._drone = drone;

  const playNote = () => {
    if (!ctx || muted || ctx.state !== "running") return;
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    const o = ctx.createOscillator();
    o.type = Math.random() < 0.5 ? "triangle" : "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g);
    g.connect(ambientGain);
    o.start(t);
    o.stop(t + 2.5);
  };
  const playBarSound = () => {
    if (!ctx || muted || ctx.state !== "running") return;
    const r = Math.random();
    if (r < 0.34) {
      // verre posé sur le comptoir
      tone(1700 + Math.random() * 500, 0.16, "sine", 0.018, -260);
    } else if (r < 0.68) {
      // craquement de plancher
      tone(70 + Math.random() * 30, 0.32, "sawtooth", 0.012, -18);
    } else {
      // éclat de rire lointain
      for (let i = 0; i < 3; i++) tone(240 + i * 14, 0.07, "triangle", 0.012, 24, i * 0.09);
    }
  };
  playNote();
  ambTimer = window.setInterval(() => {
    if (document.hidden) return;
    ambNote += 1;
    playNote();
    if (ambNote % 4 === 0) playBarSound();
  }, 2600);
  return true;
}
export function stopAmbient() {
  if (ambTimer) clearInterval(ambTimer);
  ambTimer = 0;
  if (ambientGain) {
    for (const key of ["_murmur", "_lfo", "_drone"]) {
      try {
        ambientGain[key] && ambientGain[key].stop();
      } catch (_) {
        /* déjà arrêté */
      }
    }
    try {
      ambientGain.disconnect();
    } catch (_) {
      /* déjà déconnecté */
    }
    ambientGain = null;
  }
}
