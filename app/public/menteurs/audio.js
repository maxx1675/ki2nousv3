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
  ctx = new C();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  return ctx;
}

export function initAudio() {
  const c = makeCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  return c;
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

function env(gain, dur, peak = 0.2, attack = 0.008) {
  const c = makeCtx();
  if (!c) return null;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  g.connect(gain);
  return g;
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
      noise(0.35, 0.75, 1800);
      tone(90, 0.32, "sawtooth", 0.3, -50);
      tone(55, 0.4, "sine", 0.22, -20, 0.01);
      break;
    case "empty":
      tone(1100, 0.05, "square", 0.14, -800);
      noise(0.04, 0.1, 900);
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
export function startAmbient() {
  const c = initAudio();
  if (!c || ambientGain) return;
  ambientGain = c.createGain();
  ambientGain.gain.value = 0.12;
  ambientGain.connect(master);
  // murmure de saloon : bruit filtré très bas
  const b = noiseBuf(6);
  if (b) {
    const s = c.createBufferSource();
    s.buffer = b;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const g = c.createGain();
    g.gain.value = 0.035;
    s.connect(f);
    f.connect(g);
    g.connect(ambientGain);
    s.start();
    ambientGain._murmur = s;
  }
  const playNote = () => {
    if (!ctx || muted) return;
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    const o = ctx.createOscillator();
    o.type = Math.random() < 0.5 ? "triangle" : "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.025, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g);
    g.connect(ambientGain);
    o.start(t);
    o.stop(t + 2.3);
  };
  playNote();
  ambTimer = window.setInterval(() => {
    if (!document.hidden) {
      playNote();
      if (Math.random() < 0.35) setTimeout(() => tone(1200, 0.08, "sine", 0.02, -300), 300);
    }
  }, 2600);
}
export function stopAmbient() {
  if (ambTimer) clearInterval(ambTimer);
  ambTimer = 0;
  if (ambientGain) {
    try {
      ambientGain._murmur && ambientGain._murmur.stop();
    } catch {
      /* déjà arrêté */
    }
    try {
      ambientGain.disconnect();
    } catch {
      /* déjà déconnecté */
    }
    ambientGain = null;
  }
}
