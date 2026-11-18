/* ============================================================================
   La Table Des Menteurs — décor 3D du saloon (Three.js, procédural + GLB CC0)
   ----------------------------------------------------------------------------
   • saloon chaleureux et lumineux, table centrale très détaillée
   • personnages low-poly retravaillés + animations (parole, rire, tir, victoire)
   • vraies cartes à jouer dessinées au canvas (couleurs, figures, jokers)
   • vue à la première personne : main de cartes 3D levée / baissée
   • un revolver par joueur, posé sur la table, pris seulement pour tirer
   • manche : mélange animé puis carte cible qui sort et flotte au centre
   ========================================================================== */
import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { sfx } from "./audio.js";

/* Rythme de la contestation au revolver. Volontairement lent : on laisse
   le tireur hésiter, armer le chien et trembler avant la détonation.
   La phase « reveal » côté serveur dure 4,8 s : on garde une marge. */
const REVEAL_TIMING = Object.freeze({
  draw: 3600,
  spin: 1250,
  cock: 2150,
  breath: 2450,
  hesitate: 2700,
  fire: 3450,
  end: 4550,
});

/* ------------------------------------------------------------------ */
/* Personnages                                                         */
/* ------------------------------------------------------------------ */
export const AVATARS = {
  sherif: {
    emoji: "⭐", name: "Le Shérif",
    skin: 0xd9a066, shirt: 0x4f6d8a, shirt2: 0x3d566e, vest: 0x2a2a2e, pants: 0x3a2a1a,
    hat: 0x9a7a44, hatType: "cowboy", accent: 0xd4a84b, hair: 0x3a2414,
    beard: false, mustache: true, hairStyle: "short", coat: false,
  },
  bandit: {
    emoji: "🦹", name: "Le Bandit",
    skin: 0xb97a4a, shirt: 0x3a2a2a, shirt2: 0x2a1e1e, vest: 0x1e1a18, pants: 0x2a2018,
    hat: 0x26242a, hatType: "flat", accent: 0x9b2a2a, hair: 0x1a1210,
    beard: true, mustache: true, hairStyle: "messy", coat: true,
  },
  cowboy: {
    emoji: "🤠", name: "Le Cowboy",
    skin: 0xd9a066, shirt: 0x8a5a2a, shirt2: 0x6a4420, vest: 0x5a3a1e, pants: 0x35506a,
    hat: 0x6b4a2a, hatType: "cowboy", accent: 0x3a8a5a, hair: 0x5a3a1e,
    beard: false, mustache: false, hairStyle: "short", coat: false,
  },
  cowgirl: {
    emoji: "👧", name: "La Cowgirl",
    skin: 0xe0b080, shirt: 0xb04a6a, shirt2: 0x8a3452, vest: 0x4a2a1a, pants: 0x3a2a4a,
    hat: 0x7a5030, hatType: "wide", accent: 0xf0c060, hair: 0x5a2a16,
    beard: false, mustache: false, hairStyle: "long", coat: false,
  },
  barman: {
    emoji: "🍺", name: "Le Barman",
    skin: 0xd9a066, shirt: 0xe8dcc0, shirt2: 0xc8b898, vest: 0x4a2a16, pants: 0x2a1e18,
    hat: 0x2a2a2e, hatType: "none", accent: 0x6a3a1e, hair: 0x4a2a14,
    beard: false, mustache: true, hairStyle: "bald", coat: false,
  },
  chasseur: {
    emoji: "🎯", name: "Le Chasseur",
    skin: 0xb97a4a, shirt: 0x4a3a2a, shirt2: 0x382a1e, vest: 0x2a2018, pants: 0x2e241a,
    hat: 0x3a2a1a, hatType: "hunter", accent: 0xd4a84b, hair: 0x2a1a10,
    beard: true, mustache: true, hairStyle: "messy", coat: true,
  },
  horslaloi: {
    emoji: "🏴", name: "Le Hors-la-loi",
    skin: 0xb97a4a, shirt: 0x2a2a2e, shirt2: 0x1e1e22, vest: 0x18181c, pants: 0x241e18,
    hat: 0x1a1a1e, hatType: "cowboy", accent: 0xc03030, hair: 0x120e0c,
    beard: true, mustache: true, hairStyle: "long", coat: true,
  },
  prospecteur: {
    emoji: "⛏️", name: "Le Prospecteur",
    skin: 0xc08a5a, shirt: 0x6a5a4a, shirt2: 0x4a3e32, vest: 0x3a2e22, pants: 0x4a4030,
    hat: 0x5a4a3a, hatType: "bucket", accent: 0x8a8a6a, hair: 0xb0a898,
    beard: true, mustache: true, hairStyle: "long", coat: false,
  },
};

/* ------------------------------------------------------------------ */
/* Textures peintes au canvas                                          */
/* ------------------------------------------------------------------ */
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roundRectPath(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function woodTexture(base = "#6a4020", dark = "#3a2010", light = "#8a5a30") {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * h;
      g.strokeStyle = i % 3 === 0 ? light : dark;
      g.globalAlpha = 0.12 + Math.random() * 0.28;
      g.lineWidth = 0.6 + Math.random() * 2.4;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) {
        g.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + (Math.random() - 0.5) * 3);
      }
      g.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.globalAlpha = 0.3;
      g.strokeStyle = dark;
      for (let r = 2; r < 12; r += 2.5) {
        g.beginPath();
        g.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  });
}

function feltTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.72);
    grad.addColorStop(0, "#226449");
    grad.addColorStop(1, "#123b2a");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,.10)" : "rgba(190,255,210,.045)";
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    g.globalAlpha = 0.06;
    g.strokeStyle = "#9fe0bd";
    for (let y = 0; y < h; y += 3) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

function floorTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#5a381e";
    g.fillRect(0, 0, w, h);
    const ph = 64;
    for (let row = 0; row < h / ph; row++) {
      const off = (row % 2) * 70;
      for (let x = -off; x < w; x += 150) {
        g.fillStyle = `hsl(${26 + Math.random() * 6} 42% ${22 + Math.random() * 8}%)`;
        g.fillRect(x + 2, row * ph + 2, 146, ph - 4);
        g.strokeStyle = "rgba(30,15,6,.65)";
        g.lineWidth = 2;
        g.strokeRect(x + 1, row * ph + 1, 148, ph - 2);
        g.strokeStyle = "rgba(20,10,4,.22)";
        for (let i = 0; i < 5; i++) {
          const yy = row * ph + 6 + i * 12;
          g.beginPath();
          g.moveTo(x + 6, yy);
          g.lineTo(x + 144, yy + Math.sin(i) * 2);
          g.stroke();
        }
      }
    }
  });
}

function wallTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#7a5636";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = x % 128 === 0 ? "rgba(255,225,180,.07)" : "rgba(40,22,10,.10)";
      g.fillRect(x, 0, 32, h);
      g.strokeStyle = "rgba(45,26,12,.35)";
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    g.strokeStyle = "rgba(215,170,100,.18)";
    g.lineWidth = 1.2;
    for (let y = 32; y < h; y += 64) {
      for (let x = 16; x < w; x += 64) {
        g.beginPath();
        g.moveTo(x, y - 13);
        g.lineTo(x + 13, y);
        g.lineTo(x, y + 13);
        g.lineTo(x - 13, y);
        g.closePath();
        g.stroke();
      }
    }
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,.04)" : "rgba(255,240,210,.035)";
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

function rugTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = "#5c1720";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c99a44";
    g.lineWidth = 10;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 3;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = "#e0b05a";
    for (let x = 34; x < w - 30; x += 26) {
      g.beginPath();
      g.moveTo(x, 30);
      g.lineTo(x + 12, 42);
      g.lineTo(x, 54);
      g.lineTo(x - 12, 42);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(x, h - 30);
      g.lineTo(x + 12, h - 42);
      g.lineTo(x, h - 54);
      g.lineTo(x - 12, h - 42);
      g.closePath();
      g.stroke();
    }
    g.globalAlpha = 0.22;
    g.strokeStyle = "#2a0a0e";
    for (let i = 0; i < 500; i++) {
      g.beginPath();
      g.moveTo(Math.random() * w, Math.random() * h);
      g.lineTo(Math.random() * w, Math.random() * h);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

function nightTexture() {
  return canvasTexture(512, 384, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#2a3a6a");
    grad.addColorStop(0.42, "#6a4a6a");
    grad.addColorStop(0.72, "#c07a4a");
    grad.addColorStop(1, "#3a2418");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,240,200,${0.2 + Math.random() * 0.7})`;
      g.fillRect(Math.random() * w, Math.random() * h * 0.45, Math.random() < 0.2 ? 2 : 1, Math.random() < 0.2 ? 2 : 1);
    }
    g.fillStyle = "#ffe6b0";
    g.beginPath();
    g.arc(w * 0.76, h * 0.2, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,230,170,.16)";
    g.beginPath();
    g.arc(w * 0.76, h * 0.2, 58, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#241a14";
    for (let x = 0; x < w; x += 26) {
      const bh = 30 + Math.random() * 60;
      g.fillRect(x, h * 0.66 - bh, 24, bh + h * 0.34);
    }
    g.fillStyle = "rgba(255,180,90,.5)";
    for (let i = 0; i < 16; i++) g.fillRect(Math.random() * w, h * 0.68 + Math.random() * 60, 2, 2);
  });
}

function posterTexture(title, sub) {
  return canvasTexture(256, 320, (g, w, h) => {
    g.fillStyle = "#d8c49a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#5a3a1a";
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#3a2010";
    g.font = "900 40px Georgia, serif";
    g.textAlign = "center";
    g.fillText(title, w / 2, 66);
    g.font = "700 20px Georgia, serif";
    g.fillText(sub, w / 2, 104);
    g.fillStyle = "#2a160c";
    g.beginPath();
    g.arc(w / 2, 174, 44, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#d8c49a";
    g.beginPath();
    g.arc(w / 2, 166, 25, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a160c";
    g.font = "700 18px Georgia, serif";
    g.fillText("REWARD", w / 2, 252);
    g.font = "900 34px Georgia, serif";
    g.fillText("$ 500", w / 2, 294);
  });
}

function signTexture(text) {
  return canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = "#2a160c";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d4a84b";
    g.lineWidth = 8;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#ffcf6a";
    g.font = "900 92px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "#ff8a3c";
    g.shadowBlur = 18;
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

function dustSprite() {
  return canvasTexture(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,235,190,.95)");
    grad.addColorStop(0.45, "rgba(255,215,150,.35)");
    grad.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/* ------------------------------------------------------------------ */
/* Cartes à jouer : vraies faces dessinées (couleurs, figures, jokers) */
/* ------------------------------------------------------------------ */
const CARD_TEX_W = 320;
const CARD_TEX_H = 448;
const CARD_W = 0.36;
const CARD_H = 0.504;
const CARD_T = 0.007;

const RED = "#b0281d";
const INK = "#1b1510";
const GOLD = "#c9a24a";
const GOLD_LIGHT = "#f0d488";
const SKIN = "#f0d3a8";

function suitIsRed(suit) {
  return suit === "♥" || suit === "♦";
}
function suitColor(suit) {
  return suitIsRed(suit) ? RED : INK;
}
function drawSuitGlyph(g, suit, x, y, size, color) {
  g.fillStyle = color;
  g.font = `900 ${size}px Georgia, "Times New Roman", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(suit, x, y);
}
function cornerIndex(g, rank, suit, w, h, color) {
  const draw = (x, y, rot) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 ${rank === "10" ? 26 : 34}px Georgia, serif`;
    g.fillText(rank, 0, -12);
    g.font = "700 24px Georgia, serif";
    g.fillText(suit, 0, 22);
    g.restore();
  };
  draw(26, 40, 0);
  draw(w - 26, h - 40, Math.PI);
}
function pipLayout(rank) {
  const L = 0.26, R = 0.74, C = 0.5;
  const T = 0.02, B = 0.98;
  switch (rank) {
    case "A": return [[C, 0.5]];
    case "2": return [[C, T], [C, B]];
    case "3": return [[C, T], [C, 0.5], [C, B]];
    case "4": return [[L, T], [R, T], [L, B], [R, B]];
    case "5": return [[L, T], [R, T], [C, 0.5], [L, B], [R, B]];
    case "6": return [[L, T], [R, T], [L, 0.5], [R, 0.5], [L, B], [R, B]];
    case "7": return [[L, T], [R, T], [C, 0.27], [L, 0.5], [R, 0.5], [L, B], [R, B]];
    case "8": return [[L, T], [R, T], [C, 0.27], [L, 0.5], [R, 0.5], [C, 0.73], [L, B], [R, B]];
    case "9": return [[L, 0.02], [R, 0.02], [L, 0.27], [R, 0.27], [C, 0.5], [L, 0.73], [R, 0.73], [L, 0.98], [R, 0.98]];
    case "10": return [[L, 0.02], [R, 0.02], [L, 0.27], [R, 0.27], [C, 0.16], [C, 0.84], [L, 0.73], [R, 0.73], [L, 0.98], [R, 0.98]];
    default: return [];
  }
}

function courtBust(g, rank, color, skin, dark) {
  // Robe / épaules
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-52, 60);
  g.quadraticCurveTo(-48, 8, -36, -2);
  g.quadraticCurveTo(-20, -14, -10, -16);
  g.lineTo(10, -16);
  g.quadraticCurveTo(20, -14, 36, -2);
  g.quadraticCurveTo(48, 8, 52, 60);
  g.closePath();
  g.fill();
  // panneau intérieur
  g.fillStyle = rank === "D" ? "#f3e2bf" : "#e8d3a8";
  g.beginPath();
  g.moveTo(-22, 60);
  g.lineTo(-14, 2);
  g.quadraticCurveTo(0, -6, 14, 2);
  g.lineTo(22, 60);
  g.closePath();
  g.fill();
  g.strokeStyle = GOLD;
  g.lineWidth = 2.5;
  g.stroke();
  // col
  g.fillStyle = GOLD;
  g.beginPath();
  g.moveTo(-14, -14);
  g.quadraticCurveTo(0, 2, 14, -14);
  g.lineTo(20, 2);
  g.quadraticCurveTo(0, 12, -20, 2);
  g.closePath();
  g.fill();
  // cou
  g.fillStyle = skin;
  g.fillRect(-8, -26, 16, 16);
  // cheveux derrière la tête
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(0, -46, 25, 28, 0, 0, Math.PI * 2);
  g.fill();
  if (rank === "D" || rank === "V") {
    g.beginPath();
    g.ellipse(-25, -30, 9, 26, 0.25, 0, Math.PI * 2);
    g.ellipse(25, -30, 9, 26, -0.25, 0, Math.PI * 2);
    g.fill();
  }
  // tête
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(0, -44, 19, 23, 0, 0, Math.PI * 2);
  g.fill();
  // oreilles
  g.beginPath();
  g.ellipse(-19, -43, 4, 6, 0, 0, Math.PI * 2);
  g.ellipse(19, -43, 4, 6, 0, 0, Math.PI * 2);
  g.fill();
  // yeux
  g.fillStyle = "#fbf6ea";
  g.beginPath();
  g.ellipse(-7, -48, 4.6, 3.2, 0, 0, Math.PI * 2);
  g.ellipse(7, -48, 4.6, 3.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2a1a10";
  g.beginPath();
  g.arc(-7, -48, 1.9, 0, Math.PI * 2);
  g.arc(7, -48, 1.9, 0, Math.PI * 2);
  g.fill();
  // sourcils
  g.strokeStyle = dark;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-12, -55);
  g.lineTo(-3, -54);
  g.moveTo(12, -55);
  g.lineTo(3, -54);
  g.stroke();
  // nez
  g.strokeStyle = "rgba(90,50,25,.7)";
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(0, -45);
  g.lineTo(-1.5, -37);
  g.stroke();
  // bouche
  g.strokeStyle = "#8a3428";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-6, -33);
  g.quadraticCurveTo(0, -30, 6, -33);
  g.stroke();
  // barbe pour le roi
  if (rank === "R") {
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(-13, -32);
    g.quadraticCurveTo(0, -10, 13, -32);
    g.quadraticCurveTo(10, -20, 0, -18);
    g.quadraticCurveTo(-10, -20, -13, -32);
    g.fill();
  }
  // couvre-chef
  if (rank === "R") {
    g.fillStyle = GOLD;
    g.beginPath();
    g.moveTo(-24, -62);
    g.lineTo(-24, -70);
    g.lineTo(-13, -63);
    g.lineTo(0, -74);
    g.lineTo(13, -63);
    g.lineTo(24, -70);
    g.lineTo(24, -62);
    g.closePath();
    g.fill();
    g.fillStyle = RED;
    g.beginPath();
    g.arc(0, -70, 3.2, 0, Math.PI * 2);
    g.fill();
  } else if (rank === "D") {
    g.fillStyle = GOLD;
    g.beginPath();
    g.moveTo(-18, -62);
    g.lineTo(-12, -72);
    g.lineTo(-5, -64);
    g.lineTo(0, -76);
    g.lineTo(5, -64);
    g.lineTo(12, -72);
    g.lineTo(18, -62);
    g.closePath();
    g.fill();
    g.fillStyle = "#9bdfc0";
    g.beginPath();
    g.arc(0, -71, 2.6, 0, Math.PI * 2);
    g.fill();
  } else {
    // valet : bonnet à plume
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-22, -58);
    g.quadraticCurveTo(0, -84, 22, -58);
    g.closePath();
    g.fill();
    g.strokeStyle = GOLD;
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = "#f3e2bf";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(18, -68);
    g.quadraticCurveTo(30, -84, 38, -76);
    g.stroke();
  }
  // bras + emblème
  g.strokeStyle = color;
  g.lineWidth = 11;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-40, 8);
  g.quadraticCurveTo(-52, 28, -40, 42);
  g.stroke();
  g.beginPath();
  g.moveTo(40, 8);
  g.quadraticCurveTo(52, 28, 40, 42);
  g.stroke();
  g.fillStyle = skin;
  g.beginPath();
  g.arc(-39, 44, 5, 0, Math.PI * 2);
  g.arc(39, 44, 5, 0, Math.PI * 2);
  g.fill();
}

function drawCourt(g, w, h, rank, suit, color) {
  const px = w * 0.19;
  const py = h * 0.13;
  const pw = w * 0.62;
  const ph = h * 0.74;
  const grad = g.createLinearGradient(px, py, px + pw, py + ph);
  grad.addColorStop(0, "#fdf7e8");
  grad.addColorStop(0.5, "#f3e6c8");
  grad.addColorStop(1, "#e8d6b0");
  g.fillStyle = grad;
  g.fillRect(px, py, pw, ph);
  g.strokeStyle = GOLD;
  g.lineWidth = 4;
  g.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
  g.lineWidth = 1.4;
  g.strokeRect(px + 9, py + 9, pw - 18, ph - 18);
  // séparateur central
  g.strokeStyle = "rgba(201,162,74,.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px + 8, py + ph / 2);
  g.lineTo(px + pw - 8, py + ph / 2);
  g.stroke();
  // deux figures symétriques (rotation 180°)
  for (const dir of [1, -1]) {
    g.save();
    g.translate(w / 2, py + ph * (dir === 1 ? 0.27 : 0.73));
    g.scale(dir, dir);
    courtBust(g, rank, color, SKIN, suitIsRed(suit) ? "#6a2a1e" : "#2a2018");
    g.restore();
  }
  // emblèmes de coin du panneau
  drawSuitGlyph(g, suit, px + 18, py + 22, 18, color);
  drawSuitGlyph(g, suit, px + pw - 18, py + ph - 22, 18, color);
}

function drawJoker(g, w, h) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f7ecd4");
  bg.addColorStop(0.5, "#efe0bd");
  bg.addColorStop(1, "#e4cfa4");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = GOLD;
  g.lineWidth = 5;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.lineWidth = 1.5;
  g.strokeRect(16, 16, w - 32, h - 32);
  // fond en éventail
  g.save();
  g.translate(w / 2, h * 0.52);
  for (let i = 0; i < 14; i++) {
    g.rotate((Math.PI * 2) / 14);
    g.fillStyle = i % 2 ? "rgba(155,42,42,.10)" : "rgba(43,90,138,.10)";
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -120);
    g.lineTo(15, -120);
    g.closePath();
    g.fill();
  }
  g.restore();
  // chapeau de bouffon
  g.fillStyle = "#7a2a8a";
  g.beginPath();
  g.moveTo(w / 2 - 26, h * 0.34);
  g.quadraticCurveTo(w / 2 - 70, h * 0.16, w / 2 - 54, h * 0.12);
  g.quadraticCurveTo(w / 2 - 26, h * 0.22, w / 2 - 8, h * 0.30);
  g.closePath();
  g.fill();
  g.fillStyle = "#b02a3a";
  g.beginPath();
  g.moveTo(w / 2 + 26, h * 0.34);
  g.quadraticCurveTo(w / 2 + 70, h * 0.16, w / 2 + 54, h * 0.12);
  g.quadraticCurveTo(w / 2 + 26, h * 0.22, w / 2 + 8, h * 0.30);
  g.closePath();
  g.fill();
  g.fillStyle = "#2a6a4a";
  g.beginPath();
  g.moveTo(w / 2 - 16, h * 0.30);
  g.quadraticCurveTo(w / 2, h * 0.06, w / 2 + 16, h * 0.30);
  g.closePath();
  g.fill();
  g.fillStyle = GOLD;
  for (const [x, y] of [[w / 2 - 54, h * 0.13], [w / 2 + 54, h * 0.13], [w / 2, h * 0.07]]) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  // visage
  g.fillStyle = "#f6dcb4";
  g.beginPath();
  g.ellipse(w / 2, h * 0.47, 38, 42, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1a120d";
  g.beginPath();
  g.arc(w / 2 - 14, h * 0.45, 4, 0, Math.PI * 2);
  g.arc(w / 2 + 14, h * 0.45, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#b02a3a";
  g.beginPath();
  g.arc(w / 2, h * 0.49, 5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#8a3428";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(w / 2, h * 0.52, 17, 0.15, Math.PI - 0.15);
  g.stroke();
  // collerette
  g.fillStyle = "#f3e2bf";
  for (let i = -5; i <= 5; i++) {
    g.beginPath();
    g.arc(w / 2 + i * 11, h * 0.6, 8, 0, Math.PI * 2);
    g.fill();
  }
  // étoile + texte
  g.fillStyle = GOLD;
  g.font = "900 26px Georgia, serif";
  g.textAlign = "center";
  g.fillText("✦", w / 2, h * 0.74);
  g.fillStyle = "#3a2010";
  g.font = "900 22px Georgia, serif";
  g.fillText("JOKER", w / 2, h * 0.81);
}

function drawCardFace(g, w, h, rank, suit) {
  g.fillStyle = "#fbf6e9";
  g.fillRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(255,255,255,.65)");
  grad.addColorStop(1, "rgba(210,190,150,.25)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  roundRectPath(g, 4, 4, w - 8, h - 8, 14);
  g.strokeStyle = "rgba(201,162,74,.55)";
  g.lineWidth = 2;
  g.stroke();
  if (rank === "JOKER") {
    drawJoker(g, w, h);
    cornerIndex(g, "J", "★", w, h, INK);
    return;
  }
  const color = suitColor(suit);
  if (rank === "V" || rank === "D" || rank === "R") {
    drawCourt(g, w, h, rank, suit, color);
  } else {
    const pips = pipLayout(rank || "A");
    const x0 = w * 0.27;
    const x1 = w * 0.73;
    const y0 = h * 0.16;
    const y1 = h * 0.84;
    const big = rank === "A";
    for (const [u, v] of pips) {
      const x = x0 + (x1 - x0) * u;
      const y = y0 + (y1 - y0) * v;
      g.save();
      g.translate(x, y);
      if (v > 0.5) g.rotate(Math.PI);
      if (big) {
        drawSuitGlyph(g, suit, 0, 0, 140, color);
      } else {
        drawSuitGlyph(g, suit, 0, 0, 34, color);
      }
      g.restore();
    }
    if (big) {
      g.strokeStyle = GOLD;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
      g.stroke();
    }
  }
  cornerIndex(g, rank, suit, w, h, color);
}

const cardTexCache = new Map();
function cardFaceTexture(rank, suit) {
  const key = (rank || "") + "|" + (suit || "");
  let t = cardTexCache.get(key);
  if (!t) {
    t = canvasTexture(CARD_TEX_W, CARD_TEX_H, (g, w, h) => drawCardFace(g, w, h, rank, suit));
    cardTexCache.set(key, t);
  }
  return t;
}

let cardBackTex = null;
function cardBackTexture() {
  if (cardBackTex) return cardBackTex;
  cardBackTex = canvasTexture(CARD_TEX_W, CARD_TEX_H, (g, w, h) => {
    g.fillStyle = "#6d1f2b";
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.75);
    grad.addColorStop(0, "rgba(160,60,70,.55)");
    grad.addColorStop(1, "rgba(60,12,20,.9)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = GOLD;
    g.lineWidth = 5;
    g.strokeRect(9, 9, w - 18, h - 18);
    g.lineWidth = 1.6;
    g.strokeRect(17, 17, w - 34, h - 34);
    g.globalAlpha = 0.35;
    g.strokeStyle = GOLD_LIGHT;
    g.lineWidth = 1.2;
    for (let i = -h; i < w; i += 22) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + h, h);
      g.stroke();
      g.beginPath();
      g.moveTo(i + h, 0);
      g.lineTo(i, h);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#f3e2bf";
    g.beginPath();
    g.ellipse(w / 2, h / 2, 62, 82, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = GOLD;
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = "#6d1f2b";
    g.font = "900 62px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("★", w / 2, h / 2 - 6);
    g.font = "900 18px Georgia, serif";
    g.fillText("MENTEURS", w / 2, h / 2 + 42);
    for (const [x, y, r] of [[34, 34, 0], [w - 34, 34, 0.5], [34, h - 34, -0.5], [w - 34, h - 34, 0]]) {
      g.save();
      g.translate(x, y);
      g.rotate(r);
      g.fillStyle = GOLD;
      g.beginPath();
      g.arc(0, 0, 6, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });
  return cardBackTex;
}

const CARD_PLANE = new THREE.PlaneGeometry(CARD_W, CARD_H);
const CARD_EDGE = new THREE.BoxGeometry(CARD_W * 0.99, CARD_H * 0.99, CARD_T);
const cardEdgeMat = new THREE.MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.85 });
let cardBackMat = null;
function getCardBackMat() {
  if (!cardBackMat) cardBackMat = new THREE.MeshStandardMaterial({ map: cardBackTexture(), roughness: 0.62, metalness: 0.02 });
  return cardBackMat;
}

function makeCard(rank = "", suit = "", faceUp = true) {
  const group = new THREE.Group();
  const edge = new THREE.Mesh(CARD_EDGE, cardEdgeMat);
  group.add(edge);
  const frontMat = new THREE.MeshStandardMaterial({ map: cardFaceTexture(rank, suit), roughness: 0.55, metalness: 0.02 });
  const front = new THREE.Mesh(CARD_PLANE, frontMat);
  front.position.z = CARD_T / 2 + 0.0004;
  group.add(front);
  const back = new THREE.Mesh(CARD_PLANE, getCardBackMat());
  back.rotation.y = Math.PI;
  back.position.z = -CARD_T / 2 - 0.0004;
  group.add(back);
  group.userData = { rank, suit, front, back, faceUp };
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return group;
}

/* ------------------------------------------------------------------ */
/* Revolver (procédural de secours, canon vers +Z)                     */
/* ------------------------------------------------------------------ */
function buildRevolver() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9ba6, metalness: 0.92, roughness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3b3c44, metalness: 0.85, roughness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.26 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a2f16, roughness: 0.55, metalness: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 });

  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  // cadre
  add(new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.1, 0.2), steel), 0, 0, 0.02);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.034, 0.3), steel), 0, 0.064, 0.07);
  // canon + nervure
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.42, 16), dark);
  barrel.rotation.x = Math.PI / 2;
  add(barrel, 0, 0.026, 0.31);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.02, 0.4), steel), 0, 0.058, 0.31);
  // éjecteur sous le canon
  const eject = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 10), steel);
  eject.rotation.x = Math.PI / 2;
  add(eject, 0, -0.032, 0.28);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 10), brass), 0, -0.032, 0.46);
  // guidon
  add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.018), brass), 0, 0.082, 0.47);

  // barillet
  const cyl = new THREE.Group();
  cyl.position.set(0, 0, 0.055);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.115, 22), steel);
  drum.rotation.x = Math.PI / 2;
  cyl.add(drum);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.12, 10), black);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0);
    cyl.add(hole);
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.1), dark);
    flute.position.set(Math.cos(a + 0.52) * 0.058, Math.sin(a + 0.52) * 0.058, 0);
    flute.rotation.z = a + 0.52;
    cyl.add(flute);
  }
  g.add(cyl);

  // chien
  const hammer = new THREE.Group();
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.075, 0.036), dark);
  hm.position.set(0, 0.038, 0);
  hammer.add(hm);
  const spur = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.016, 0.03), steel);
  spur.position.set(0, 0.075, -0.01);
  hammer.add(spur);
  hammer.position.set(0, 0.058, 0.05);
  hammer.rotation.x = -0.35;
  g.add(hammer);

  // pontet + détente
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 8, 18, Math.PI), dark);
  guard.rotation.y = Math.PI / 2;
  guard.rotation.z = Math.PI;
  guard.position.set(0, -0.052, 0.035);
  g.add(guard);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.018), brass);
  trigger.position.set(0, -0.045, 0.04);
  trigger.rotation.x = 0.3;
  g.add(trigger);

  // poignée bois
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.21, 0.11), wood);
  grip.position.set(0, -0.135, -0.075);
  grip.rotation.x = 0.34;
  g.add(grip);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.04, 0.12), brass), 0, -0.24, -0.145);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), dark), 0, -0.12, -0.005);

  // lueur + flash de bouche
  const flash = new THREE.PointLight(0xffbb55, 0, 3.2, 2);
  flash.position.set(0, 0.026, 0.55);
  g.add(flash);
  const muzzle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 }),
  );
  muzzle.position.set(0, 0.026, 0.53);
  g.add(muzzle);
  const flare = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dustSprite(), color: 0xffc060, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  flare.position.set(0, 0.026, 0.55);
  flare.scale.setScalar(0.5);
  g.add(flare);

  g.userData = { cyl, hammer, trigger, flash, muzzle, flare, barrel };
  return g;
}

/* ------------------------------------------------------------------ */
/* Personnages 3D retravaillés                                         */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Personnages                                                         */
/* ------------------------------------------------------------------ */
/** Petit éventail de cartes tenu en main (dos visible par la table). */
function buildCardFan(n = 5) {
  const fan = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const c = makeCard("", "", false);
    c.scale.setScalar(0.52);
    const k = i - (n - 1) / 2;
    c.position.set(k * 0.024, Math.abs(k) * -0.007, i * 0.0035);
    c.rotation.z = -k * 0.1;
    c.rotation.x = -0.12;
    const front = c.userData.front;
    if (front) front.visible = true;
    fan.add(c);
  }
  return fan;
}

function buildCharacter(avatar) {
  const st = AVATARS[avatar] || AVATARS.cowboy;
  const g = new THREE.Group();
  const M = (color, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const skin = M(st.skin, 0.78);
  const shirt = M(st.shirt, 0.9);
  const shirt2 = M(st.shirt2, 0.9);
  const vest = M(st.vest, 0.82);
  const pants = M(st.pants, 0.92);
  const hatM = M(st.hat, 0.86);
  const accent = M(st.accent, 0.42, 0.55);
  const dark = M(0x14100c, 0.95);
  const hairM = M(st.hair, 0.95);
  const wood = M(0x5a341d, 0.9);

  /* chaise */
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.62), wood);
  seat.position.y = 0.5;
  chair.add(seat);
  for (const sx of [-0.25, 0.25]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.66, 8), wood);
    post.position.set(sx, 0.83, -0.29);
    chair.add(post);
  }
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.075, 0.05), wood);
    slat.position.set(0, 0.62 + i * 0.18, -0.29);
    chair.add(slat);
  }
  for (const sx of [-0.27, 0.27]) for (const sz of [-0.24, 0.24]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.5, 8), dark);
    leg.position.set(sx, 0.25, sz);
    chair.add(leg);
  }
  g.add(chair);

  /* jambes assises */
  const staticParts = [];
  for (const sx of [-0.115, 0.115]) {
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.13, 0.42), pants);
    thigh.position.set(sx, 0.54, 0.24);
    g.add(thigh);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.13), pants);
    shin.position.set(sx, 0.25, 0.47);
    g.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.28), dark);
    boot.position.set(sx, 0.055, 0.55);
    g.add(boot);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.1), dark);
    toe.position.set(sx, 0.045, 0.7);
    g.add(toe);
    staticParts.push(thigh, shin, boot, toe);
  }

  /* bassin + torse */
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.28), pants);
  pelvis.position.y = 0.58;
  g.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.195, 0.58, 12), shirt);
  torso.position.y = 0.95;
  g.add(torso);
  // panneaux de gilet
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.45, 0.05), vest);
    panel.position.set(s * 0.125, 0.94, 0.185);
    panel.rotation.y = -s * 0.16;
    g.add(panel);
  }
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.075, 12), M(0x3a2414, 0.8));
  belt.position.y = 0.66;
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.03), accent);
  buckle.position.set(0, 0.66, 0.265);
  g.add(buckle);

  /* cou + tête */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.11, 10), skin);
  neck.position.y = 1.255;
  g.add(neck);

  const head = new THREE.Group();
  head.position.y = 1.48;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.172, 20, 16), skin);
  skull.scale.set(1, 1.06, 0.96);
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), skin);
  jaw.scale.set(1, 0.8, 0.85);
  jaw.position.set(0, -0.075, 0.035);
  head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.095, 8), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 0.17);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), skin);
    ear.position.set(s * 0.166, -0.012, 0);
    head.add(ear);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.4 }));
    white.scale.set(1, 0.78, 0.55);
    white.position.set(s * 0.062, 0.028, 0.148);
    head.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), dark);
    pupil.position.set(s * 0.062, 0.028, 0.172);
    head.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.014, 0.016), hairM);
    brow.position.set(s * 0.062, 0.083, 0.158);
    brow.rotation.z = -s * 0.12;
    head.add(brow);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.013, 0.014), M(0x7a3428, 0.8));
  mouth.position.set(0, -0.078, 0.158);
  head.add(mouth);

  // cheveux
  if (st.hairStyle === "bald") {
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.176, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM);
    fringe.scale.set(1, 0.8, 1);
    fringe.position.set(0, 0.02, -0.02);
    head.add(fringe);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.178, 16, 12), hairM);
    hair.scale.set(1.02, 1, 1.02);
    hair.position.set(0, 0.03, -0.022);
    head.add(hair);
    if (st.hairStyle === "long") {
      for (const s of [-1, 1]) {
        const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.42, 8), hairM);
        lock.position.set(s * 0.15, -0.18, -0.06);
        lock.rotation.z = s * 0.1;
        head.add(lock);
      }
    }
    if (st.hairStyle === "messy") {
      for (let i = 0; i < 5; i++) {
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), hairM);
        tuft.position.set((Math.random() - 0.5) * 0.28, 0.16, (Math.random() - 0.5) * 0.22);
        tuft.rotation.z = (Math.random() - 0.5) * 0.7;
        head.add(tuft);
      }
    }
  }
  if (st.beard) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.22, 10), hairM);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.19, 0.07);
    head.add(beard);
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.024), hairM);
    stache.position.set(0, -0.055, 0.165);
    head.add(stache);
  } else if (st.mustache) {
    for (const s of [-1, 1]) {
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.024), hairM);
      stache.position.set(s * 0.032, -0.052, 0.168);
      stache.rotation.z = -s * 0.22;
      head.add(stache);
    }
  }

  // chapeau
  if (st.hatType !== "none") {
    const hat = new THREE.Group();
    const brimR = st.hatType === "wide" ? 0.34 : st.hatType === "bucket" ? 0.26 : 0.3;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(brimR, brimR * 1.02, 0.03, 22), hatM);
    brim.position.y = 0.155;
    hat.add(brim);
    // bord légèrement relevé
    const rim = new THREE.Mesh(new THREE.TorusGeometry(brimR * 0.98, 0.016, 6, 26), hatM);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.168;
    hat.add(rim);
    const crownH = st.hatType === "flat" ? 0.13 : st.hatType === "bucket" ? 0.17 : 0.21;
    const crownR = st.hatType === "wide" ? 0.16 : 0.17;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(crownR * 0.86, crownR, crownH, 16), hatM);
    crown.position.y = 0.17 + crownH / 2;
    hat.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(crownR + 0.006, crownR + 0.01, 0.045, 18), accent);
    band.position.y = 0.19;
    hat.add(band);
    if (st.hatType === "cowboy" || st.hatType === "wide") {
      const dent = new THREE.Mesh(new THREE.SphereGeometry(crownR * 0.75, 10, 6), hatM);
      dent.scale.set(1, 0.28, 1);
      dent.position.y = 0.17 + crownH;
      hat.add(dent);
    }
    hat.rotation.z = 0.045;
    hat.position.y = 0.02;
    head.add(hat);
    g.userData.hat = hat;
  }

  /* détails par personnage */
  if (avatar === "sherif") {
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.014, 5), accent);
    star.rotation.x = Math.PI / 2;
    star.position.set(-0.13, 1.03, 0.215);
    g.add(star);
  }
  if (avatar === "bandit" || avatar === "horslaloi") {
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.07), M(0x9b2a2a, 0.9));
    scarf.position.set(0, 1.15, 0.16);
    g.add(scarf);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), M(0x9b2a2a, 0.9));
    tail.rotation.z = Math.PI;
    tail.position.set(0.1, 1.02, 0.14);
    g.add(tail);
  }
  if (avatar === "cowboy") {
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), accent);
    knot.rotation.x = Math.PI;
    knot.position.set(0, 1.16, 0.17);
    g.add(knot);
  }
  if (avatar === "cowgirl") {
    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI), accent);
    necklace.rotation.x = Math.PI / 2;
    necklace.position.set(0, 1.2, 0.11);
    g.add(necklace);
  }
  if (avatar === "barman") {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.42, 0.035), M(0xe8dcc0, 0.95));
    apron.position.set(0, 0.82, 0.21);
    g.add(apron);
  }
  if (st.coat) {
    const coat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.38, 0.82, 12, 1, true),
      M(st.vest, 0.9, 0),
    );
    coat.material.side = THREE.DoubleSide;
    coat.position.set(0, 0.62, -0.03);
    g.add(coat);
  }
  if (avatar === "prospecteur") {
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.03), M(0x3a2414, 0.8));
      strap.position.set(s * 0.11, 0.95, 0.215);
      strap.rotation.z = s * 0.06;
      g.add(strap);
    }
  }

  /* étui à revolver à la ceinture */
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.17, 0.075), M(0x3a2414, 0.9));
  holster.position.set(0.25, 0.6, 0.02);
  holster.rotation.z = -0.16;
  g.add(holster);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), M(0x5a341d, 0.7));
  grip.position.set(0.265, 0.69, 0.02);
  g.add(grip);

  /* bras */
  const makeArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.275, 1.16, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.26, 10), shirt);
    upper.position.y = -0.13;
    shoulder.add(upper);
    const fore = new THREE.Group();
    fore.position.y = -0.26;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.048, 0.25, 10), shirt2);
    lower.position.y = -0.125;
    fore.add(lower);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 10), M(0xd8c8a8, 0.9));
    cuff.position.y = -0.24;
    fore.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skin);
    hand.scale.set(1, 0.9, 0.75);
    hand.position.y = -0.29;
    fore.add(hand);
    shoulder.add(fore);
    return { shoulder, fore, hand };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  armL.shoulder.rotation.x = -0.92;
  armR.shoulder.rotation.x = -0.92;
  armL.fore.rotation.x = -0.5;
  armR.fore.rotation.x = -0.5;
  armL.shoulder.rotation.z = -0.12;
  armR.shoulder.rotation.z = 0.12;
  g.add(armL.shoulder);
  g.add(armR.shoulder);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Rig : la chaise et les jambes restent FIXES sur le sol, seul le     */
  /* buste s'anime (avant, l'inclinaison du groupe entier faisait       */
  /* glisser le personnage et sa chaise l'un dans l'autre).             */
  /* ------------------------------------------------------------------ */
  const rig = new THREE.Group();
  for (const child of [...g.children]) {
    if (child === chair || staticParts.includes(child)) continue;
    rig.add(child);
  }
  g.add(rig);

  // Cartes tenues en main : dos tourné vers la table, faces vers le joueur.
  const fan = buildCardFan(5);
  fan.position.set(0, 1.24, 0.34);
  fan.rotation.set(-0.5, Math.PI, 0);
  rig.add(fan);

  g.userData = {
    avatar, style: st, chair, rig, fan, cardsUp: true,
    body: torso, head,
    armL: armL.shoulder, armR: armR.shoulder,
    foreL: armL.fore, foreR: armR.fore,
    anim: null, phase: Math.random() * Math.PI * 2,
    dead: false, victory: false, isTurn: false,
    baseY: 0, index: 0, seatAngle: 0,
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* Scène                                                               */
/* ------------------------------------------------------------------ */
export class SaloonScene {
  constructor(canvas, labelLayer) {
    this.canvas = canvas;
    this.labels = labelLayer;
    this.low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.low, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1.25 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a1810);
    this.scene.fog = new THREE.Fog(0x2a1810, 16, 38);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.05, 80);
    this.camera.position.set(0, 4.6, 8.2);
    this.camLook = new THREE.Vector3(0, 1.15, 0);
    this.camMode = "lobby";
    this.camShake = 0;
    this.clock = new THREE.Clock();

    this.chars = new Map();
    this.labelsMap = new Map();
    this.guns = new Map();
    this.ownId = "";
    this.ownAngle = -Math.PI / 2;
    this.ownSeated = false;
    // Table abaissée : les joueurs assis sont enfin visibles au-dessus du
    // tapis (avant, seule leur tête dépassait).
    this.tableY = 0.93;

    this.hand = [];
    this.handCards = [];
    this.sel = new Set();
    this.canPick = false;
    this.raised = true;
    this.handSig = "";
    this.handHover = -1;

    this.tableCards = [];
    this.shuffleFx = null;
    this.targetCard = null;
    this.targetHideAt = 0;
    this.lastRound = 0;
    this.lastTarget = "";
    this.lastClaimTs = 0;
    this.lastRevealTs = 0;
    this.lastPhase = "";
    this.revealFx = null;
    this.patternIndex = 0;
    this.gunTemplate = null;
    this.onCardPick = null;
    this.onRaiseChange = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.build();
    this.scene.add(this.camera);
    this.buildHand();
    this.loadGunModel();

    this.resize();
    this._onResize = () => this.resize();
    this._onPointerDown = (e) => this.onPointerDown(e);
    this._onPointerMove = (e) => this.onPointerMove(e);
    window.addEventListener("resize", this._onResize);
    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /* ------------------------------------------------------------------ */
  setQuality(quality) {
    this.low = quality === "low";
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1 : 2));
    this.renderer.shadowMap.enabled = !this.low;
    if (this.spot) this.spot.castShadow = !this.low;
    if (this.dust) this.dust.visible = !this.low;
    if (this.smoke) this.smoke.visible = !this.low;
    for (const l of this.lanterns || []) l.light.intensity = this.low ? 0.35 : 0.7;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    // Champ large : à la première personne, on voit les voisins de table
    // au lieu d'avoir seulement leurs étiquettes.
    this.camera.fov = w < 700 ? 80 : 68;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1.25 : 2));
  }

  /* ------------------------------------------------------------------ */
  build() {
    const s = this.scene;
    const woodMap = woodTexture();
    woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
    woodMap.repeat.set(2, 2);
    const floorMap = floorTexture();
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(3, 3);
    const wallMap = wallTexture();
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    wallMap.repeat.set(3, 1.5);

    this.mat = {
      wood: new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.86 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x3a2212, roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.92 }),
      wall: new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.95 }),
      trim: new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.85 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.85, roughness: 0.3 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x5a2a1a, roughness: 0.7 }),
      felt: new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.96 }),
    };

    /* sol + tapis */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), this.mat.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.98 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.012;
    rug.receiveShadow = true;
    s.add(rug);

    /* murs */
    const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), this.mat.wall);
    back.position.set(0, 4.5, -8);
    back.receiveShadow = true;
    s.add(back);
    // mur avant (derrière la caméra au salon, face aux joueurs en jeu)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), this.mat.wall);
    front.position.set(0, 4.5, 8.8);
    front.rotation.y = Math.PI;
    front.receiveShadow = true;
    s.add(front);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(17, 9), this.mat.wall);
      wall.position.set(side * 12, 4.5, 0.4);
      wall.rotation.y = side * -Math.PI / 2;
      wall.receiveShadow = true;
      s.add(wall);
    }
    // lambris
    for (const [x, z, ry] of [[0, -7.94, 0], [0, 8.74, Math.PI], [-11.94, 0.4, Math.PI / 2], [11.94, 0.4, -Math.PI / 2]]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(24, 1.35, 0.14), this.mat.trim);
      panel.position.set(x, 0.675, z);
      panel.rotation.y = ry;
      s.add(panel);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 0.24), this.mat.wood);
      rail.position.set(x, 1.4, z);
      rail.rotation.y = ry;
      s.add(rail);
    }
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 1 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 8.4;
    s.add(ceiling);
    // poutres
    for (const z of [-6.5, -3, 1, 4.5]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 0.34, 0.34), this.mat.woodDark);
      beam.position.set(0, 7.35, z);
      s.add(beam);
    }
    for (const x of [-7, 0, 7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 7.6, 0.34), this.mat.woodDark);
      post.position.set(x, 3.8, -7.6);
      s.add(post);
    }

    /* comptoir */
    const counter = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.16, 1.15), this.mat.wood);
    counter.position.set(-0.5, 0.58, -6.55);
    s.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.12, 1.35), new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.5 }));
    counterTop.position.set(-0.5, 1.2, -6.55);
    s.add(counterTop);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x6a7a7a, metalness: 0.9, roughness: 0.14 }));
    mirror.position.set(-0.5, 3.4, -7.93);
    s.add(mirror);
    const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 0.12), this.mat.brass);
    mirrorFrame.position.set(-0.5, 3.4, -7.97);
    s.add(mirrorFrame);
    for (const y of [2.2, 2.9]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.1, 0.52), this.mat.trim);
      shelf.position.set(-0.5, y, -7.6);
      s.add(shelf);
    }
    const bottleColors = [0x2a7a4a, 0x7a2a2a, 0x3a5a8a, 0x8a6a2a, 0x5a2a6a, 0xc9a24a];
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 + Math.random() * 0.025, 0.075, 0.28 + Math.random() * 0.24, 9),
        new THREE.MeshStandardMaterial({
          color: bottleColors[i % bottleColors.length], roughness: 0.18, metalness: 0.1,
          transparent: true, opacity: 0.88,
        }),
      );
      b.position.set(-3.5 + (i % 12) * 0.5, 2.36 + (i < 12 ? 0 : 0.7), -7.42 + (i % 2) * 0.2);
      s.add(b);
    }

    /* piano */
    const piano = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.86), new THREE.MeshStandardMaterial({ color: 0x2a160c, roughness: 0.55 }));
    pBody.position.y = 1.16;
    piano.add(pBody);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.06, 0.36), new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.45 }));
    keys.position.set(0, 1.14, 0.54);
    keys.rotation.x = -0.1;
    piano.add(keys);
    for (let i = 0; i < 14; i++) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0x14100c }));
      k.position.set(-0.72 + i * 0.11, 1.17, 0.5);
      piano.add(k);
    }
    for (const sx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.1, 0.13), new THREE.MeshStandardMaterial({ color: 0x1a0f08 }));
      leg.position.set(sx, 0.55, 0);
      piano.add(leg);
    }
    piano.position.set(-7.6, 0, -3.2);
    piano.rotation.y = 0.7;
    s.add(piano);

    /* escalier */
    for (let i = 0; i < 8; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.44), this.mat.trim);
      st.position.set(7.6, 0.1 + i * 0.19, -4.2 + i * 0.43);
      s.add(st);
    }

    /* fenêtres avec coucher de soleil */
    for (const x of [-7.8, 7.8]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.2), this.mat.woodDark);
      frame.position.set(x, 4.4, -7.86);
      s.add(frame);
      const night = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.7), new THREE.MeshBasicMaterial({ map: nightTexture() }));
      night.position.set(x, 4.4, -7.73);
      s.add(night);
      for (const [w, h] of [[0.07, 2.7], [2.1, 0.07]]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), this.mat.woodDark);
        bar.position.set(x, 4.4, -7.7);
        s.add(bar);
      }
    }

    /* affiches + enseigne */
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.44), new THREE.MeshBasicMaterial({ map: posterTexture("WANTED", "DEAD OR ALIVE") }));
    poster.position.set(2.5, 3.5, -7.9);
    s.add(poster);
    const poster2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: posterTexture("REWARD", "BANDIT") }));
    poster2.position.set(3.8, 3.4, -7.9);
    s.add(poster2);
    const saloonSign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: signTexture("SALOON") }));
    saloonSign.position.set(0, 6.3, -7.88);
    s.add(saloonSign);

    /* tonneaux */
    for (const [x, z] of [[-9.4, -5.6], [-8.8, -4.8], [9.6, -5.4], [9.0, -4.5]]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.05, 14), this.mat.wood);
      barrel.position.set(x, 0.52, z);
      s.add(barrel);
      for (const y of [0.18, 0.52, 0.86]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 18), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.7, roughness: 0.35 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y, z);
        s.add(ring);
      }
    }

    this.buildTable();
    this.buildLights();

    /* poussière */
    const n = this.low ? 90 : 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = Math.random() * 6.5 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: dustSprite(), color: 0xffe0a0, size: this.low ? 0.05 : 0.038,
        transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);

    /* fumée */
    this.smoke = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(
        new THREE.SphereGeometry(0.32 + Math.random() * 0.45, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xccc0aa, transparent: true, opacity: 0.035, depthWrite: false }),
      );
      sp.position.set(-3 + Math.random() * 6, 2.5 + Math.random() * 2, -3 + Math.random() * 4);
      this.smoke.add(sp);
    }
    this.scene.add(this.smoke);

    /* faisceaux de lumière des fenêtres */
    for (const x of [-7.2, 7.2]) {
      const shaft = new THREE.Mesh(
        new THREE.ConeGeometry(1.35, 5.4, 18, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffb060, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );
      shaft.position.set(x * 0.72, 3.1, -4.6);
      shaft.rotation.z = x > 0 ? -0.35 : 0.35;
      shaft.rotation.x = -0.18;
      this.scene.add(shaft);
    }

    this.claimGroup = new THREE.Group();
    this.claimGroup.position.set(0, this.tableY, 0);
    this.scene.add(this.claimGroup);

    /* mur avant : portes battantes, fenêtre, horloge, tables libres */
    const doorHole = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.7),
      new THREE.MeshBasicMaterial({ map: nightTexture(), color: 0xbfa070 }),
    );
    doorHole.position.set(0, 1.35, 8.72);
    doorHole.rotation.y = Math.PI;
    this.scene.add(doorHole);
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.95, 0.16), this.mat.woodDark);
    doorFrame.position.set(0, 1.45, 8.76);
    this.scene.add(doorFrame);
    for (const s2 of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.15, 0.07), this.mat.wood);
      leaf.position.set(s2 * 0.5, 1.72, 8.6);
      leaf.rotation.y = s2 * 0.22;
      this.scene.add(leaf);
      for (const y of [1.28, 1.62, 1.96]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 0.05), this.mat.woodDark);
        slat.position.set(s2 * 0.5, y, 8.57);
        slat.rotation.y = s2 * 0.22;
        this.scene.add(slat);
      }
    }
    // fenêtre du mur avant
    const frontWin = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.4), new THREE.MeshBasicMaterial({ map: nightTexture() }));
    frontWin.position.set(-6.4, 3.9, 8.72);
    frontWin.rotation.y = Math.PI;
    this.scene.add(frontWin);
    const frontWinFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 0.16), this.mat.woodDark);
    frontWinFrame.position.set(-6.4, 3.9, 8.76);
    this.scene.add(frontWinFrame);
    for (const [w, h] of [[0.08, 2.4], [2.3, 0.08]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), this.mat.woodDark);
      bar.position.set(-6.4, 3.9, 8.66);
      this.scene.add(bar);
    }
    // horloge
    const clock = new THREE.Group();
    const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.16, 24), this.mat.woodDark);
    clockBody.rotation.x = Math.PI / 2;
    clock.add(clockBody);
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshStandardMaterial({ color: 0xf3e2bf, roughness: 0.8 }));
    clockFace.position.z = 0.09;
    clock.add(clockFace);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.012), new THREE.MeshStandardMaterial({ color: 0x2a160c }));
      tick.position.set(Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0.1);
      tick.rotation.z = -a;
      clock.add(tick);
    }
    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.014), new THREE.MeshStandardMaterial({ color: 0x1a120d }));
    hand1.position.set(0, 0.08, 0.11);
    hand1.rotation.z = -0.6;
    clock.add(hand1);
    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.28, 0.014), new THREE.MeshStandardMaterial({ color: 0x1a120d }));
    hand2.position.set(0, 0.11, 0.115);
    hand2.rotation.z = 1.9;
    clock.add(hand2);
    clock.position.set(4.6, 5.4, 8.66);
    clock.rotation.y = Math.PI;
    this.scene.add(clock);
    // petites tables libres le long des murs latéraux
    for (const [x, z] of [[-8.2, 2.4], [8.2, 2.4], [-8.2, -2.6], [8.2, -2.6]]) {
      const side = new THREE.Group();
      const topS = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), this.mat.wood);
      topS.position.y = 0.82;
      side.add(topS);
      const legS = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 8), this.mat.trim);
      legS.position.y = 0.41;
      side.add(legS);
      const footS = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 10), this.mat.trim);
      footS.position.y = 0.03;
      side.add(footS);
      for (const a2 of [0.5, Math.PI + 0.5]) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 12), this.mat.leather);
        stool.position.set(Math.cos(a2) * 0.85, 0.48, Math.sin(a2) * 0.85);
        side.add(stool);
        const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.46, 8), this.mat.woodDark);
        sl.position.set(Math.cos(a2) * 0.85, 0.24, Math.sin(a2) * 0.85);
        side.add(sl);
      }
      side.position.set(x, 0, z);
      side.traverse((o) => { if (o.isMesh) { o.castShadow = !this.low; o.receiveShadow = true; } });
      this.scene.add(side);
    }
  }

  buildTable() {
    const s = this.scene;
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.32, 0.17, 56), this.mat.wood);
    top.position.y = 1.02;
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);
    const bevel = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.3, 0.09, 56), this.mat.trim);
    bevel.position.y = 0.95;
    table.add(bevel);
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.04, 2.04, 0.045, 56), this.mat.felt);
    felt.position.y = 1.112;
    felt.receiveShadow = true;
    table.add(felt);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.27, 0.115, 12, 56), this.mat.leather);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.1;
    table.add(rail);
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.012, 6, 60), this.mat.brass);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 1.137;
    table.add(goldRing);
    // rivets
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const tack = new THREE.Mesh(new THREE.SphereGeometry(0.023, 8, 6), this.mat.brass);
      tack.position.set(Math.cos(a) * 2.27, 1.155, Math.sin(a) * 2.27);
      table.add(tack);
    }
    // pied central ouvragé
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.66, 0.98, 18), this.mat.trim);
    pedestal.position.y = 0.49;
    pedestal.castShadow = true;
    table.add(pedestal);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 18), this.mat.brass);
    collar.position.y = 0.22;
    table.add(collar);
    const collar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 18), this.mat.brass);
    collar2.position.y = 0.84;
    table.add(collar2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.82), this.mat.trim);
      foot.position.set(Math.cos(a) * 0.46, 0.08, Math.sin(a) * 0.46);
      foot.rotation.y = -a + Math.PI / 2;
      table.add(foot);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), this.mat.brass);
      toe.scale.set(1, 0.55, 1);
      toe.position.set(Math.cos(a) * 0.84, 0.09, Math.sin(a) * 0.84);
      table.add(toe);
    }
    // marqueterie
    const inlay = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.012, 5, 60), this.mat.brass);
    inlay.rotation.x = Math.PI / 2;
    inlay.position.y = 1.137;
    table.add(inlay);

    // accessoires : verres, bouteille, jetons, cendrier, boîte de cartes
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8c0, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.55 });
    for (const [x, z, c] of [[-1.42, 0.72, 0x9a5a20], [1.42, -0.72, 0x8a2a2a], [0.32, 1.55, 0x6a9a5a]]) {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.23, 14, 1, true), glassMat);
      glass.position.set(x, 1.24, z);
      table.add(glass);
      const drink = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.068, 0.13, 12),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, transparent: true, opacity: 0.8 }),
      );
      drink.position.set(x, 1.19, z);
      table.add(drink);
    }
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.52, 12), new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.2, transparent: true, opacity: 0.9 }));
    bottle.position.set(-1.72, 1.4, -0.18);
    table.add(bottle);
    const neckB = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.2 }));
    neckB.position.set(-1.72, 1.74, -0.18);
    table.add(neckB);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.091, 0.111, 0.16, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.8 }));
    label.position.set(-1.72, 1.4, -0.18);
    table.add(label);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const stack = 2 + (i % 3);
      for (let j = 0; j < stack; j++) {
        const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.017, 14), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xd4a84b : i % 3 === 1 ? 0xa8281a : 0x2a5a8a, roughness: 0.5 }));
        chip.position.set(Math.cos(a) * 1.5, 1.148 + j * 0.018, Math.sin(a) * 1.5);
        table.add(chip);
      }
    }
    const ashtray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.05, 18), this.mat.brass);
    ashtray.position.set(1.7, 1.15, 0.75);
    table.add(ashtray);
    const deckBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.42), new THREE.MeshStandardMaterial({ color: 0x6d1f2b, roughness: 0.7 }));
    deckBox.position.set(-1.15, 1.17, 1.35);
    deckBox.rotation.y = 0.4;
    table.add(deckBox);

    // Tout ce qui est au-dessus du piètement descend de 20 cm : le tapis
    // passe sous la poitrine des personnages assis au lieu de les cacher.
    const topGroup = new THREE.Group();
    for (const part of [...table.children]) {
      if (part.position.y > 0.9) {
        table.remove(part);
        topGroup.add(part);
      }
    }
    topGroup.position.y = -0.2;
    table.add(topGroup);

    s.add(table);
    this.table = table;
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xffe3bd, 0x3a2416, 1.45));
    s.add(new THREE.AmbientLight(0xffd7a8, 0.55));

    // lustre au-dessus de la table
    const chandelier = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 30), this.mat.brass);
    ring.rotation.x = Math.PI / 2;
    chandelier.add(ring);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6), this.mat.brass);
      arm.position.set(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -a;
      chandelier.add(arm);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 0.7 }));
      candle.position.set(Math.cos(a) * 0.72, 0.08, Math.sin(a) * 0.72);
      chandelier.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
      flame.scale.set(1, 1.7, 1);
      flame.position.set(Math.cos(a) * 0.72, 0.2, Math.sin(a) * 0.72);
      chandelier.add(flame);
    }
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 5), new THREE.MeshStandardMaterial({ color: 0x1a0f08 }));
    cord.position.y = 1.3;
    chandelier.add(cord);
    chandelier.position.set(0, 4.8, 0);
    s.add(chandelier);
    const chandLight = new THREE.PointLight(0xffc070, 1.4, 15, 2);
    chandLight.position.set(0, 4.3, 0);
    s.add(chandLight);

    // projecteur principal (ombre douce) — cône large pour éclairer les joueurs
    const spot = new THREE.SpotLight(0xffd6a0, 2.9, 26, Math.PI / 2.55, 0.55, 1.35);
    spot.position.set(0, 7.6, 0.6);
    spot.target.position.set(0, 0.9, 0);
    spot.castShadow = !this.low;
    spot.shadow.mapSize.set(this.low ? 1024 : 2048, this.low ? 1024 : 2048);
    spot.shadow.bias = -0.0014;
    spot.shadow.camera.near = 2;
    spot.shadow.camera.far = 20;
    s.add(spot);
    s.add(spot.target);
    this.spot = spot;

    // lumières d'appoint : les visages et les cartes restent lisibles
    for (const a of [0.9, Math.PI - 0.9, Math.PI + 0.9, -0.9]) {
      const fill = new THREE.PointLight(0xffd6a4, 0.95, 9, 2);
      fill.position.set(Math.cos(a) * 3.35, 2.55, Math.sin(a) * 3.35);
      s.add(fill);
    }
    // éclairage doux au-dessus du tapis : éclaire le devant des joueurs
    // (les tenues sombres ne se fondent plus dans le mur).
    const tableFill = new THREE.PointLight(0xffd9a8, 1.35, 11, 2);
    tableFill.position.set(0, 2.15, 0);
    s.add(tableFill);
    // éclairage frontal doux pour les visages face à la caméra
    const fr = new THREE.DirectionalLight(0xffe6c8, 0.35);
    fr.position.set(0, 3.2, 8);
    s.add(fr);

    // contre-jour chaud
    const rim = new THREE.DirectionalLight(0xff9a50, 0.55);
    rim.position.set(-6, 5, -7);
    s.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffc080, 0.35);
    rim2.position.set(6, 4, -6);
    s.add(rim2);

    // lanternes murales
    this.lanterns = [];
    for (const [x, y, z] of [[-6.2, 3.6, -4.5], [6.2, 3.6, -4.5], [-6.4, 3.2, 4.2], [6.4, 3.2, 4.2]]) {
      const light = new THREE.PointLight(0xffb060, 0.7, 10, 2);
      light.position.set(x, y, z);
      s.add(light);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
      bulb.position.set(x, y, z);
      s.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, y - 0.2, 4), new THREE.MeshStandardMaterial({ color: 0x1a0f08 }));
      cord.position.set(x, y + (y - 0.2) / 2, z);
      s.add(cord);
      this.lanterns.push({ light, bulb, phase: Math.random() * Math.PI * 2 });
    }
  }

  buildHand() {
    this.handGroup = new THREE.Group();
    this.handGroup.position.set(0, -0.14, -0.64);
    this.handGroup.rotation.x = -0.32;
    // Échelle : la main occupe le bas de l'écran sans masquer la table
    // ni le panneau d'action (elle passe proprement derrière lui).
    this.handGroup.scale.setScalar(0.46);
    this.handGroup.visible = false;
    this.camera.add(this.handGroup);
  }

  /* ------------------------------------------------------------------ */
  /* Revolver GLB CC0 (Quaternius) — remplace le modèle procédural       */
  /* ------------------------------------------------------------------ */
  loadGunModel() {
    const loader = new GLTFLoader();
    loader.load(
      "./assets/revolver-quaternius.glb",
      (gltf) => {
        try {
          const model = gltf.scene;
          model.traverse((o) => {
            if (o.isLight || o.isCamera) o.visible = false;
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          // Aligne l'axe le plus long sur +Z (canon), puis normalise l'échelle.
          let box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          if (size.x >= size.y && size.x >= size.z) model.rotation.y = -Math.PI / 2;
          else if (size.y >= size.x && size.y >= size.z) model.rotation.x = Math.PI / 2;
          model.updateMatrixWorld(true);
          box = new THREE.Box3().setFromObject(model);
          const size2 = new THREE.Vector3();
          box.getSize(size2);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const longest = Math.max(size2.x, size2.y, size2.z) || 1;
          const holder = new THREE.Group();
          holder.scale.setScalar(0.56 / longest);
          model.position.sub(center);
          holder.add(model);
          this.gunTemplate = holder;
          for (const gun of this.guns.values()) this.applyGunModel(gun);
        } catch (e) {
          console.warn("[menteurs] revolver GLB illisible", e);
        }
      },
      undefined,
      () => console.warn("[menteurs] revolver GLB indisponible, modèle procédural conservé"),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Décor : le saloon est entièrement procédural (aucun modèle externe  */
  /* n'est requis) ; seul le revolver vient d'un GLB CC0.                */
  /* ------------------------------------------------------------------ */
  applyGunModel(gun) {
    if (!this.gunTemplate) return;
    const u = gun.userData;
    const keep = [u.flash, u.muzzle, u.flare];
    for (const child of [...gun.children]) {
      if (!keep.includes(child)) gun.remove(child);
    }
    const model = this.gunTemplate.clone(true);
    gun.add(model);
    u.model = model;
    u.cyl = null;
    u.hammer = null;
    u.trigger = null;
    u.flash.position.set(0, 0.02, 0.3);
    u.muzzle.position.set(0, 0.02, 0.29);
    u.flare.position.set(0, 0.02, 0.32);
  }

  addGun(id) {
    const gun = buildRevolver();
    gun.userData.basePos = new THREE.Vector3();
    gun.userData.baseQuat = new THREE.Quaternion();
    gun.userData.fx = null;
    this.scene.add(gun);
    this.guns.set(id, gun);
    if (this.gunTemplate) this.applyGunModel(gun);
    return gun;
  }

  removeGun(id) {
    const gun = this.guns.get(id);
    if (!gun) return;
    this.scene.remove(gun);
    this.guns.delete(id);
  }

  positionGuns() {
    for (const [id, gun] of this.guns) {
      if (gun.userData.fx) continue;
      const angle = this.seatAngles?.get(id);
      if (angle == null) continue;
      const r = 1.74;
      gun.position.set(Math.cos(angle) * r, this.tableY + 0.05, Math.sin(angle) * r);
      gun.lookAt(0, this.tableY, 0);
      gun.rotateZ(Math.PI / 2);
      gun.userData.basePos.copy(gun.position);
      gun.userData.baseQuat.copy(gun.quaternion);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Joueurs / sièges                                                    */
  /* ------------------------------------------------------------------ */
  syncPlayers(players) {
    const seated = (players || []).filter((p) => !p.spectator);
    const ids = new Set(seated.map((p) => p.id));
    for (const [id, ch] of this.chars) {
      if (!ids.has(id)) {
        this.scene.remove(ch);
        this.chars.delete(id);
        this.removeGun(id);
        const lab = this.labelsMap.get(id);
        if (lab) lab.remove();
        this.labelsMap.delete(id);
      }
    }
    this.seatAngles = new Map();
    const n = Math.max(2, seated.length);
    seated.forEach((p, i) => {
      let ch = this.chars.get(p.id);
      if (!ch) {
        ch = buildCharacter(p.avatar);
        this.chars.set(p.id, ch);
        this.scene.add(ch);
        const lab = document.createElement("div");
        lab.className = "p-label";
        this.labels.appendChild(lab);
        this.labelsMap.set(p.id, lab);
      }
      if (ch.userData.avatar !== p.avatar) {
        // Changement de personnage : reconstruit proprement le modèle.
        this.scene.remove(ch);
        const fresh = buildCharacter(p.avatar);
        this.chars.set(p.id, fresh);
        this.scene.add(fresh);
        ch = fresh;
      }
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      this.seatAngles.set(p.id, a);
      ch.userData.seatAngle = a;
      ch.position.set(Math.cos(a) * 3.02, 0, Math.sin(a) * 3.02);
      // Yaw seul : le regard vers la table sans incliner la chaise.
      ch.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0);
      ch.userData.index = i;
      ch.userData.isTurn = false;
      ch.scale.setScalar(1.1);
      ch.userData.cardsUp = p.raised !== false;
      if (!this.guns.has(p.id)) this.addGun(p.id);
      const lab = this.labelsMap.get(p.id);
      if (lab) {
        lab.innerHTML = `<span class="pl-av">${AVATARS[p.avatar]?.emoji || "🤠"}</span><span class="pl-name">${String(p.name).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))}</span><span class="pl-lives">${p.alive ? "❤️".repeat(Math.max(0, Math.min(5, p.lives))) : "💀"}</span>`;
        lab.classList.toggle("dead", !p.alive);
        lab.classList.toggle("off", !p.connected);
        lab.classList.toggle("me", p.id === this.ownId);
      }
      if (p.id === this.ownId) {
        this.ownAngle = a;
        this.ownSeated = true;
      }
    });
    if (!this.ownId || !this.seatAngles.has(this.ownId)) this.ownSeated = false;
    this.positionGuns();
  }

  setTurn(turnId) {
    this.turnId = turnId;
    for (const [id, ch] of this.chars) ch.userData.isTurn = id === turnId;
  }

  setAnim(id, name, dur = 1400) {
    const ch = this.chars.get(id);
    if (!ch) return;
    ch.userData.anim = { name, t0: performance.now(), dur };
    if (name === "laugh") sfx("laugh");
    if (name === "surprise") sfx("gasp");
  }

  setDead(id, dead) {
    const ch = this.chars.get(id);
    if (ch) ch.userData.dead = dead;
  }

  showLobby() {
    this.camMode = "lobby";
    this.lastState = null;
    this.lastRound = 0;
    this.lastTarget = "";
    this.targetHideAt = 0;
    this.clearTableCards();
    this.clearTarget();
    this.setHand([], [], false);
  }

  /* ------------------------------------------------------------------ */
  /* Synchronisation d'un état serveur                                   */
  /* ------------------------------------------------------------------ */
  sync(state) {
    if (!state) {
      this.showLobby();
      return;
    }
    this.ownId = state.you?.id || this.ownId;
    // Fin du dévoilement de la cible (5 s côté serveur) : la carte 3D reste
    // affichée exactement ce temps-là.
    const holdMs = state.roundAt
      ? Math.max(0, state.roundAt + 5000 - (state.serverNow || Date.now()))
      : 0;
    this.targetHideAt = holdMs > 0 ? performance.now() + holdMs : 0;
    this.syncPlayers(state.players || []);
    this.setTurn(state.turnId);
    for (const p of state.players || []) {
      this.setDead(p.id, !p.alive);
      const ch = this.chars.get(p.id);
      if (ch) ch.userData.cardsUp = p.raised !== false;
    }

    if (state.phase === "lobby") this.camMode = "lobby";
    else if (state.phase === "end") this.camMode = "end";
    else this.camMode = "game";

    const canPick = !!(
      state.phase === "claim" &&
      state.turnId === this.ownId &&
      state.you && state.you.alive && !state.you.spectator && !state.paused
    );
    const sel = [...this.sel].filter((i) => i >= 0 && i < (state.you?.hand || []).length);
    this.setHand(state.you?.hand || [], sel, canPick);

    const autoKey = `${state.phase}|${state.turnId === this.ownId}|${!!state.paused}`;
    if (autoKey !== this.autoKey) {
      this.autoKey = autoKey;
      if (state.phase === "claim" && state.turnId === this.ownId && !state.paused) this.setRaised(true, false);
      else if (state.phase === "reveal" || state.phase === "end" || state.paused) this.setRaised(false, false);
    }

    if (state.claim && state.claim.ts !== this.lastClaimTs) {
      this.lastClaimTs = state.claim.ts;
      this.setAnim(state.claim.by, "talk", 1600);
      this.showClaimCards(state.claim.count, null, false, state.claim.by);
      sfx("deal");
    }
    if (state.challenger && (!this.lastState || this.lastState.challenger !== state.challenger)) {
      this.setAnim(state.challenger, "point", 1200);
      sfx("point");
    }

    if (state.phase === "reveal" && state.reveal && state.reveal.ts !== this.lastRevealTs) {
      this.lastRevealTs = state.reveal.ts;
      this.showClaimCards(state.reveal.count, state.reveal.cards, true, state.reveal.shooter);
      this.playReveal(state.reveal);
    }

    // Nouvelle manche : mélange puis carte cible.
    if (
      state.phase === "claim" &&
      (state.round !== this.lastRound || state.target !== this.lastTarget)
    ) {
      this.lastRound = state.round;
      this.lastTarget = state.target;
      this.startRound(state.target);
    }

    if (state.phase === "end" && this.lastPhase !== "end") {
      for (const p of state.players || []) {
        if (p.id === state.winner) this.setAnim(p.id, "victory", 6000);
        else if (!p.alive) this.setAnim(p.id, "defeat", 3000);
      }
      sfx("win");
      this.lastRound = 0;
      this.lastTarget = "";
    }
    if (state.phase === "lobby") this.clearTableCards();
    this.lastPhase = state.phase;
    this.lastState = state;
  }

  /* ------------------------------------------------------------------ */
  /* Manche : mélange puis carte cible                                   */
  /* ------------------------------------------------------------------ */
  startRound(target) {
    this.clearTableCards();
    this.clearTarget();
    const now = performance.now();
    const cards = [];
    const n = this.low ? 10 : 18;
    for (let i = 0; i < n; i++) {
      const card = makeCard("", "", false);
      card.scale.setScalar(0.9);
      this.scene.add(card);
      cards.push({
        mesh: card,
        a0: (i / n) * Math.PI * 2 + Math.random() * 0.3,
        r0: 1.3 + Math.random() * 0.5,
        y0: 0.5 + Math.random() * 0.35,
        spin: Math.random() * Math.PI * 2,
      });
    }
    this.shuffleFx = { t0: now, cards, shown: false, target };
    sfx("shuffle");
  }

  updateShuffle(now) {
    const fx = this.shuffleFx;
    if (!fx) return;
    const dt = now - fx.t0;
    const k = Math.min(1, dt / 760);
    for (const c of fx.cards) {
      if (dt < 760) {
        const a = c.a0 + k * 4.6;
        const r = c.r0 * (1 - k * 0.86);
        const y = c.y0 + Math.sin(k * Math.PI) * 0.2;
        c.mesh.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        c.mesh.rotation.set(k * 6.5 + c.spin, k * 4.4, k * 5.2);
        c.mesh.scale.setScalar(0.9);
        c.mesh.visible = true;
      } else {
        const b = Math.min(1, (dt - 760) / 420);
        const a = c.a0 + 4.6 + b * 1.4;
        c.mesh.position.set(Math.cos(a) * (0.2 + b * 0.4), 0.42 + b * 0.16, Math.sin(a) * (0.2 + b * 0.4));
        c.mesh.rotation.z += 0.2;
        c.mesh.scale.setScalar(Math.max(0.001, 0.9 * (1 - b)));
        c.mesh.visible = b < 1;
      }
    }
    if (!fx.shown && dt > 900) {
      fx.shown = true;
      this.showTarget(fx.target);
      sfx("deal");
    }
    if (dt > 1250) {
      for (const c of fx.cards) this.scene.remove(c.mesh);
      this.shuffleFx = null;
    }
  }

  clearTarget() {
    if (!this.targetCard) return;
    const g = this.targetCard.group;
    this.scene.remove(g);
    this.targetCard = null;
  }

  showTarget(rank) {
    if (!rank) return;
    const now0 = performance.now();
    // Si le dévoilement est déjà terminé (rechargement en cours de manche),
    // on ne fait pas réapparaître la carte au centre : seul le badge suffit.
    const hideAt = this.targetHideAt > now0 ? this.targetHideAt : 0;
    if (!hideAt) return;
    const suits = ["♠", "♥", "♦", "♣"];
    const suit = suits[Math.max(0, (this.lastRound || 1) - 1) % 4];
    const group = new THREE.Group();
    // Juste au-dessus du feutre, inclinée vers le joueur : plus de carte
    // qui flotte à hauteur de visage.
    const baseY = this.tableY + 0.17;
    group.position.set(0, baseY, 0);
    const card = makeCard(rank, suit, true);
    card.rotation.x = -0.5;
    group.add(card);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.011, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcf6a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.14;
    group.add(ring);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dustSprite(), color: 0xffc45a, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.7);
    glow.position.y = 0.05;
    group.add(glow);
    group.scale.setScalar(0.4);
    this.scene.add(group);
    const now = performance.now();
    this.targetCard = {
      group, card, ring, glow, t0: now,
      baseY, baseScale: 0.95,
      // La cible reste affichée jusqu'à la fin des 5 s serveur, puis elle
      // disparaît (le petit badge HTML en bas à droite prend le relais).
      hideAt,
    };
  }

  updateTarget(now, t) {
    const tc = this.targetCard;
    if (!tc) return;
    if (now >= tc.hideAt) {
      const out = Math.min(1, (now - tc.hideAt) / 380);
      tc.group.scale.setScalar(Math.max(0.0001, tc.baseScale * (1 - out)));
      tc.group.position.y = tc.baseY + out * 0.05;
      tc.ring.material.opacity = 0.8 * (1 - out);
      tc.glow.material.opacity = 0.42 * (1 - out);
      if (out >= 1) this.clearTarget();
      return;
    }
    const left = tc.hideAt - now;
    const k = Math.min(1, (now - tc.t0) / 480);
    const ease = 1 - Math.pow(1 - k, 3);
    // Léger battement les 900 dernières ms pour annoncer le retrait.
    const warn = left < 900 ? 1 + Math.sin(now * 0.02) * 0.03 : 1;
    tc.group.scale.setScalar(tc.baseScale * (0.4 + 0.6 * ease) * warn);
    tc.group.position.y = tc.baseY + Math.sin(t * 1.6) * 0.012;
    const dx = this.camera.position.x - tc.group.position.x;
    const dz = this.camera.position.z - tc.group.position.z;
    tc.group.rotation.y = Math.atan2(dx, dz);
    tc.card.rotation.z = Math.sin(t * 0.9) * 0.03;
    tc.ring.rotation.z += 0.01;
    tc.ring.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.2;
    tc.glow.material.opacity = 0.32 + Math.sin(t * 2.1) * 0.1;
  }

  /* ------------------------------------------------------------------ */
  /* Cartes posées au centre de la table                                 */
  /* ------------------------------------------------------------------ */
  nextPattern(n) {
    const patterns = [
      // éventail incliné à droite
      (m) => Array.from({ length: m }, (_, i) => ({
        x: (i - (m - 1) / 2) * 0.15 + 0.04, z: -0.04 - i * 0.015,
        ry: 0.18 + (i - (m - 1) / 2) * 0.14, roll: -0.02,
      })),
      // éventail incliné à gauche
      (m) => Array.from({ length: m }, (_, i) => ({
        x: (i - (m - 1) / 2) * 0.15 - 0.05, z: 0.05 + i * 0.012,
        ry: -0.18 - (i - (m - 1) / 2) * 0.14, roll: 0.03,
      })),
      // tas dispersé
      (m) => Array.from({ length: m }, (_, i) => ({
        x: ((i % 2 ? 1 : -1) * (0.07 + i * 0.035)),
        z: -0.12 + (i % 3) * 0.1,
        ry: (i % 2 ? 1 : -1) * (0.2 + i * 0.08), roll: (i % 2 ? 1 : -1) * 0.05,
      })),
      // ligne propre mais décalée
      (m) => Array.from({ length: m }, (_, i) => ({
        x: (i - (m - 1) / 2) * 0.2, z: 0.08, ry: 0.32 - i * 0.05, roll: 0,
      })),
    ];
    const fn = patterns[this.patternIndex % patterns.length];
    this.patternIndex++;
    return fn(Math.max(1, n));
  }

  clearTableCards() {
    for (const c of this.tableCards) {
      this.claimGroup.remove(c.holder);
    }
    this.tableCards = [];
  }

  showClaimCards(count, cards, reveal, fromId) {
    this.clearTableCards();
    const n = Math.max(0, Math.min(6, count || 0));
    if (!n) return;
    const angle = (this.seatAngles && this.seatAngles.get(fromId)) ?? this.ownAngle ?? -Math.PI / 2;
    const layout = this.nextPattern(n);
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const src = cards && cards[i] ? cards[i] : { v: "", s: "" };
      const card = makeCard(reveal ? src.v : "", reveal ? src.s : "", !reveal);
      card.rotation.x = Math.PI / 2; // posée à plat, dos visible
      const holder = new THREE.Group();
      // Départ au ras du feutre, côté annonceur (plus de carte qui « vole »).
      holder.position.set(Math.cos(angle) * 1.86, 0.014 + i * 0.002, Math.sin(angle) * 1.86);
      holder.rotation.y = Math.random() * 0.4 - 0.2;
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.19, 18),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.004;
      shadow.scale.set(1.05, 1.45, 1);
      holder.add(shadow);
      holder.add(card);
      this.claimGroup.add(holder);
      const p = layout[i] || { x: 0, z: 0, ry: 0, roll: 0 };
      this.tableCards.push({
        holder, card,
        from: holder.position.clone(),
        to: new THREE.Vector3(p.x, 0.012 + i * 0.0015, p.z),
        fromRotY: holder.rotation.y,
        toRotY: p.ry,
        roll: p.roll || 0,
        t0: now + i * 70,
        dur: 380,
        flip: !!reveal,
        flipped: false,
        arc: 0.015 + Math.random() * 0.02,
      });
    }
    sfx("deal");
  }

  updateTableCards(now) {
    for (const c of this.tableCards) {
      const dt = now - c.t0;
      if (dt < 0) {
        c.holder.visible = false;
        continue;
      }
      c.holder.visible = true;
      const k = Math.min(1, dt / c.dur);
      const ease = 1 - Math.pow(1 - k, 2);
      c.holder.position.x = c.from.x + (c.to.x - c.from.x) * ease;
      c.holder.position.z = c.from.z + (c.to.z - c.from.z) * ease;
      c.holder.position.y = c.from.y + (c.to.y - c.from.y) * ease + Math.sin(k * Math.PI) * c.arc;
      c.holder.rotation.y = c.fromRotY + (c.toRotY - c.fromRotY) * ease;
      c.holder.rotation.z = c.roll * ease;
      if (c.flip && k >= 0.72) {
        const f = Math.min(1, (k - 0.72) / 0.28);
        c.card.rotation.x = Math.PI / 2 - f * Math.PI;
        if (f >= 1 && !c.flipped) {
          c.flipped = true;
          sfx("card");
        }
      } else if (!c.flip) {
        c.card.rotation.x = Math.PI / 2;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Révélation : le tireur prend SON revolver                            */
  /* ------------------------------------------------------------------ */
  playReveal(reveal) {
    const now = performance.now();
    this.revealFx = {
      t0: now,
      shooter: reveal.shooter,
      victim: reveal.victim,
      bullet: !!reveal.bullet,
      fired: false,
      spun: false,
      cocked: false,
      breathed: false,
      beat: 0,
    };
    this.setAnim(reveal.shooter, "draw", REVEAL_TIMING.draw);
    const victimCh = this.chars.get(reveal.victim);
    const target = new THREE.Vector3();
    if (victimCh) victimCh.getWorldPosition(target);
    target.y = 1.3;
    const gun = this.guns.get(reveal.shooter);
    if (gun) {
      const dummy = new THREE.Object3D();
      dummy.position.copy(gun.userData.basePos);
      dummy.lookAt(target);
      const aimQuat = dummy.quaternion.clone();
      const aimPos = gun.userData.basePos.clone();
      aimPos.y += 0.3;
      aimPos.x += (target.x - aimPos.x) * 0.12;
      aimPos.z += (target.z - aimPos.z) * 0.12;
      gun.userData.fx = {
        t0: now,
        aimQuat,
        aimPos,
        fireAt: REVEAL_TIMING.fire,
        endAt: REVEAL_TIMING.end,
        fired: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Main 3D à la première personne                                      */
  /* ------------------------------------------------------------------ */
  setHand(hand, selected, canPick) {
    if (!this.handGroup) return;
    this.canPick = !!canPick;
    this.sel = new Set(
      (selected || [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < hand.length),
    );
    const sig = hand.map((c) => (c.v || "") + (c.s || "")).join("|");
    this.hand = hand.map((c) => ({ v: c.v, s: c.s }));
    if (sig !== this.handSig) {
      this.handSig = sig;
      this.rebuildHand();
    }
    this.handGroup.visible = this.hand.length > 0 && this.camMode === "game";
    this.applyHandTransforms(true);
  }

  rebuildHand() {
    for (const card of this.handCards) {
      this.handGroup.remove(card);
    }
    this.handCards = [];
    const n = this.hand.length;
    for (let i = 0; i < n; i++) {
      const c = this.hand[i];
      const card = makeCard(c.v || "", c.s || "", true);
      card.userData.index = i;
      card.userData.base = { x: 0, y: 0, z: 0, rx: -0.04, ry: 0, rz: 0 };
      this.handGroup.add(card);
      this.handCards.push(card);
    }
    const spacing = n > 4 ? 0.13 : 0.15;
    const center = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const card = this.handCards[i];
      const dx = (i - center) * spacing;
      const a = center ? (i - center) / center : 0;
      card.userData.base.x = dx;
      card.userData.base.y = -Math.abs(dx) * 0.22;
      card.userData.base.z = -Math.abs(dx) * 0.12;
      card.userData.base.rx = -0.04 - Math.abs(a) * 0.03;
      card.userData.base.ry = a * 0.16;
      card.userData.base.rz = -a * 0.16;
      card.position.set(card.userData.base.x, card.userData.base.y, card.userData.base.z);
      card.rotation.set(card.userData.base.rx, card.userData.base.ry, card.userData.base.rz);
    }
  }

  applyHandTransforms(snap) {
    const k = snap ? 1 : 0.22;
    for (let i = 0; i < this.handCards.length; i++) {
      const card = this.handCards[i];
      const b = card.userData.base;
      const selected = this.sel.has(i);
      const hover = this.handHover === i && this.canPick;
      // Aucun déplacement au survol : sinon la carte se rapproche, passe
      // devant sa voisine et le raycast oscille -> clignotement.
      const ty = b.y + (selected ? 0.075 : 0);
      const tz = b.z + (selected ? 0.055 : 0);
      card.position.x += (b.x - card.position.x) * k;
      card.position.y += (ty - card.position.y) * k;
      card.position.z += (tz - card.position.z) * k;
      const s = selected ? 1.07 : 1;
      card.scale.x += (s - card.scale.x) * k;
      card.scale.y += (s - card.scale.y) * k;
      card.scale.z += (s - card.scale.z) * k;
      const mat = card.userData.front?.material;
      if (mat && mat.emissive) {
        mat.emissive.setHex(selected ? 0xffb020 : hover ? 0x6a4a10 : 0x000000);
        mat.emissiveIntensity = selected ? 0.55 : hover ? 0.3 : 0;
      }
      card.userData.selected = selected;
    }
  }

  setRaised(value, notify = true) {
    this.raised = !!value;
    if (notify && typeof this.onRaiseChange === "function") this.onRaiseChange(this.raised);
    return this.raised;
  }

  toggleRaise(force) {
    return this.setRaised(typeof force === "boolean" ? force : !this.raised, true);
  }

  updateHand(dt, t) {
    if (!this.handGroup || !this.handGroup.visible) return;
    const raised = this.raised;
    const ty = raised ? -0.14 : -0.4;
    const tz = raised ? -0.64 : -0.9;
    const trx = raised ? -0.32 : -0.75;
    const speed = 1 - Math.exp(-dt * 7);
    this.handGroup.position.y += (ty - this.handGroup.position.y) * speed;
    this.handGroup.position.z += (tz - this.handGroup.position.z) * speed;
    this.handGroup.rotation.x += (trx - this.handGroup.rotation.x) * speed;
    if (raised) {
      this.handGroup.position.x = Math.sin(t * 0.8) * 0.004;
      this.handGroup.rotation.z = Math.sin(t * 0.6) * 0.005;
    }
    this.applyHandTransforms(false);
  }

  handCardAt(e) {
    if (!this.handGroup || !this.handGroup.visible || !this.handCards.length) return -1;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.handCards, true);
    if (!hits.length) return -1;
    let obj = hits[0].object;
    while (obj && obj.parent !== this.handGroup) obj = obj.parent;
    return obj && Number.isInteger(obj.userData.index) ? obj.userData.index : -1;
  }

  onPointerDown(e) {
    if (!this.canPick) return;
    const i = this.handCardAt(e);
    if (i >= 0 && typeof this.onCardPick === "function") {
      e.preventDefault();
      this.onCardPick(i);
    }
  }

  onPointerMove(e) {
    const i = this.canPick ? this.handCardAt(e) : -1;
    if (i !== this.handHover) {
      this.handHover = i;
      this.canvas.style.cursor = i >= 0 ? "pointer" : "default";
    }
  }

  /* ------------------------------------------------------------------ */
  /* Révélation                                                          */
  /* ------------------------------------------------------------------ */
  updateReveal(now) {
    const fx = this.revealFx;
    if (!fx) return;
    const dt = now - fx.t0;
    if (!fx.spun && dt > REVEAL_TIMING.spin) {
      fx.spun = true;
      sfx("spin");
    }
    if (!fx.cocked && dt > REVEAL_TIMING.cock) {
      fx.cocked = true;
      sfx("cock");
    }
    if (!fx.breathed && dt > REVEAL_TIMING.breath) {
      fx.breathed = true;
      sfx("breath");
    }
    // Deux battements de cœur de plus en plus proches du tir.
    if (fx.beat === 0 && dt > 1500) {
      fx.beat = 1;
      sfx("heartbeat");
    }
    if (fx.beat === 1 && dt > 2880) {
      fx.beat = 2;
      sfx("heartbeat");
    }
    if (!fx.fired && dt >= REVEAL_TIMING.fire) {
      fx.fired = true;
      const isVictimMe = fx.victim === this.ownId;
      this.camShake = (fx.bullet ? 0.2 : 0.07) + (isVictimMe ? 0.12 : 0);
      sfx(fx.bullet ? "gunshot" : "empty");
      this.setAnim(fx.shooter, "shoot", 1500);
      this.setAnim(fx.victim, fx.bullet ? "hit" : "flinch", 2400);
      if (fx.bullet) setTimeout(() => sfx("gasp"), 260);
    } else if (!fx.fired && dt > REVEAL_TIMING.fire - 700) {
      // dernier petit clic de gâchette, juste avant le coup
      if (!fx.triggered) {
        fx.triggered = true;
        sfx("trigger");
      }
    }
    if (dt > REVEAL_TIMING.end) this.revealFx = null;
  }

  flashGun(gun, power) {
    const u = gun.userData;
    if (u.flash) u.flash.intensity = 9 * power;
    if (u.muzzle) {
      u.muzzle.material.opacity = 0.9 * power;
      u.muzzle.scale.setScalar(1 + (1 - power) * 2.4);
    }
    if (u.flare) {
      u.flare.material.opacity = power;
      u.flare.scale.setScalar(0.45 + (1 - power) * 1.6);
    }
  }

  updateGuns(now) {
    for (const gun of this.guns.values()) {
      const u = gun.userData;
      if (!u.basePos || !u.baseQuat) continue;
      const fx = u.fx;
      if (fx) {
        const dt = now - fx.t0;
        // Le bras monte lentement : 900 ms au lieu d'un mouvement sec.
        const aimK = 1 - Math.pow(1 - Math.min(1, dt / 900), 3);
        gun.quaternion.slerpQuaternions(u.baseQuat, fx.aimQuat, aimK);
        gun.position.lerpVectors(u.basePos, fx.aimPos, aimK);

        // Tremblement qui s'amplifie à mesure que la gâchette se rapproche.
        if (dt < fx.fireAt + 180) {
          const tension = Math.min(1, Math.max(0, (dt - 500) / (fx.fireAt - 500)));
          const tremble = 0.0025 + tension * 0.011;
          gun.position.x += Math.sin(dt * 0.028) * tremble;
          gun.position.y += Math.cos(dt * 0.034) * tremble * 0.8;
          // Hésitation au milieu du duel : le canon retombe puis se relève.
          const h = Math.max(0, 1 - Math.abs(dt - REVEAL_TIMING.hesitate) / 430);
          if (h > 0) {
            gun.position.y -= 0.11 * h;
            gun.rotateX(0.16 * h);
          }
        }

        if (u.cyl) {
          const spinK = Math.max(0, 1 - Math.abs(dt - REVEAL_TIMING.spin) / 320);
          u.cyl.rotation.z += 0.02 + spinK * 0.95;
        }
        if (u.hammer) {
          const cockK = Math.max(0, Math.min(1, (dt - (REVEAL_TIMING.cock - 350)) / 500));
          const back = dt > fx.fireAt ? Math.max(0, 1 - (dt - fx.fireAt) / 90) : cockK;
          u.hammer.rotation.x = -0.35 - back * 0.75;
        } else {
          // Le revolver GLB n'a pas de chien séparé : tout l'arme se relève
          // pendant l'armement, puis retombe avec le recul au moment du tir.
          const cockK = Math.max(0, Math.min(1, (dt - (REVEAL_TIMING.cock - 420)) / 420));
          const settle = dt >= fx.fireAt ? Math.min(1, (dt - fx.fireAt) / 260) : 0;
          if (cockK > 0) gun.rotateX(-0.2 * cockK * (1 - settle));
          if (dt >= fx.fireAt) {
            const recoil = Math.max(0, 1 - (dt - fx.fireAt) / 230);
            gun.rotateX(-0.4 * recoil);
          }
        }
        if (dt >= fx.fireAt && !fx.fired) {
          fx.fired = true;
          this.flashGun(gun, 1);
        }
        if (fx.fired) {
          const f = Math.max(0, 1 - (dt - fx.fireAt) / 230);
          this.flashGun(gun, f);
          gun.position.x += (Math.random() - 0.5) * 0.012 * f;
          gun.position.y += (Math.random() - 0.5) * 0.012 * f;
        }
        if (dt > fx.endAt) u.fx = null;
      } else {
        gun.quaternion.slerp(u.baseQuat, 0.08);
        gun.position.lerp(u.basePos, 0.08);
        if (u.cyl) u.cyl.rotation.z += 0.002;
        if (u.hammer) u.hammer.rotation.x += (-0.35 - u.hammer.rotation.x) * 0.1;
        this.flashGun(gun, 0);
        if (u.muzzle) u.muzzle.scale.setScalar(1);
        if (u.flare) u.flare.scale.setScalar(0.45);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Animation des personnages                                           */
  /* ------------------------------------------------------------------ */
  updateCharacter(id, ch, t, now) {
    const u = ch.userData;
    const anim = u.anim;
    let headX = 0;
    let headY = Math.sin(t * 0.5 + u.phase) * 0.07;
    let bodyX = 0;
    let bodyZ = 0;
    const up = u.cardsUp !== false;
    let armLX = up ? -1.16 : -1.0;
    let armRX = up ? -1.12 : -1.0;
    let armLZ = up ? -0.16 : -0.07;
    let armRZ = up ? 0.16 : 0.07;
    let foreLX = up ? -0.78 : -0.36;
    let foreRX = up ? -0.74 : -0.36;
    let bob = Math.sin(t * 1.5 + u.phase) * 0.01;
    let y = 0;
    let scaleY = 1;
    let rootX = 0;
    let rootZ = 0;

    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur);
      const env = Math.sin(Math.min(1, k) * Math.PI);
      if (anim.name === "talk") {
        headY = Math.sin(k * Math.PI * 6) * 0.18;
        armRX = -1.18;
        foreRX = -0.95;
        bodyX = 0.05;
      } else if (anim.name === "point") {
        armRX = -1.64;
        armRZ = 0.02;
        foreRX = -0.05;
        headY = 0.1;
        bodyX = 0.05;
      } else if (anim.name === "laugh") {
        headX = -0.28 * env;
        bodyX = -0.08 * env;
        armLX = -0.7;
        armRX = -0.7;
        foreLX = -0.9;
        foreRX = -0.9;
        bob += Math.sin(t * 18) * 0.016 * env;
      } else if (anim.name === "surprise") {
        headX = -0.3 * env;
        armLX = -1.95 * env;
        armRX = -1.95 * env;
        foreLX = -0.2;
        foreRX = -0.2;
        bob += 0.06 * env;
      } else if (anim.name === "draw") {
        // Il lève le revolver lentement puis tient la visée en tremblant.
        const rise = Math.min(1, k / 0.32);
        const hes = Math.max(0, 1 - Math.abs(k - 0.74) / 0.1);
        armRX = -1.45 * rise + 0.16 * hes + Math.sin(t * 24) * 0.012 * rise;
        foreRX = -0.3 + 0.1 * hes;
        headY = 0.08 - 0.05 * hes + Math.sin(t * 31) * 0.008 * rise;
        bodyX = 0.04;
      } else if (anim.name === "shoot") {
        armRX = -1.78 * env;
        foreRX = 0;
        armRZ = 0;
        bodyX = 0.1 * env;
        headY = -0.06;
      } else if (anim.name === "hit") {
        rootX = 0.52 * env;
        y = -0.12 * env;
        headX = 0.34 * env;
        armLX = -0.25;
        armRX = -0.25;
        foreLX = -0.05;
        foreRX = -0.05;
      } else if (anim.name === "flinch") {
        rootZ = Math.sin(k * Math.PI * 8) * 0.08 * env;
        headX = 0.16 * env;
        armLX = -0.45;
        armRX = -0.45;
      } else if (anim.name === "victory") {
        y = Math.abs(Math.sin(t * 4)) * 0.14 * env;
        armLX = -2.3 * env;
        armRX = -2.3 * env;
        foreLX = -0.15;
        foreRX = -0.15;
        headX = -0.14 * env;
        scaleY = 1 + 0.03 * env;
      } else if (anim.name === "defeat") {
        headX = 0.5 * env;
        bodyX = 0.22 * env;
        armLX = -0.3;
        armRX = -0.3;
        foreLX = -0.1;
        foreRX = -0.1;
      }
      if (k >= 1) u.anim = null;
    }

    if (u.dead) {
      rootX = 0.42;
      rootZ = 0.04;
      y = -0.18;
      headX = 0.55;
      armLX = -0.15;
      armRX = -0.15;
      foreLX = -0.05;
      foreRX = -0.05;
    } else {
      y += bob;
      if (u.isTurn) headY += Math.sin(t * 1.4) * 0.05;
    }

    // Le buste s'incline dans son propre groupe : la chaise ne bouge plus.
    const rig = u.rig || ch;
    rig.rotation.x += (rootX - rig.rotation.x) * 0.13;
    rig.rotation.z += (rootZ - rig.rotation.z) * 0.13;
    rig.position.y += (y - rig.position.y) * 0.18;
    rig.scale.y += (scaleY - rig.scale.y) * 0.15;

    // L'éventail de cartes suit les mains : levé devant le visage ou posé.
    if (u.fan) {
      const ty = u.dead ? 0.95 : up ? 1.22 : 1.06;
      const tz = up ? 0.42 : 0.48;
      const trx = up ? -0.5 : -1.05;
      u.fan.position.y += (ty - u.fan.position.y) * 0.14;
      u.fan.position.z += (tz - u.fan.position.z) * 0.14;
      u.fan.rotation.x += (trx - u.fan.rotation.x) * 0.14;
      u.fan.rotation.z = Math.sin(t * 0.9 + u.phase) * 0.02;
    }
    if (u.head) {
      u.head.rotation.x += (headX - u.head.rotation.x) * 0.16;
      u.head.rotation.y += (headY - u.head.rotation.y) * 0.16;
    }
    if (u.armL) {
      u.armL.rotation.x += (armLX - u.armL.rotation.x) * 0.16;
      u.armL.rotation.z += (armLZ - u.armL.rotation.z) * 0.16;
    }
    if (u.armR) {
      u.armR.rotation.x += (armRX - u.armR.rotation.x) * 0.16;
      u.armR.rotation.z += (armRZ - u.armR.rotation.z) * 0.16;
    }
    if (u.foreL) u.foreL.rotation.x += (foreLX - u.foreL.rotation.x) * 0.16;
    if (u.foreR) u.foreR.rotation.x += (foreRX - u.foreR.rotation.x) * 0.16;
    void id;
  }

  /* ------------------------------------------------------------------ */
  /* Caméra : première personne en jeu, orbite au salon / fin            */
  /* ------------------------------------------------------------------ */
  updateCamera(t, dt) {
    const mode = this.camMode;
    const mobile = window.innerWidth < 700;
    const target = new THREE.Vector3();
    const look = new THREE.Vector3(0, 1.1, 0);
    let speed = 3.4;

    if ((mode === "game" || mode === "reveal") && this.ownSeated) {
      const a = this.ownAngle;
      // Recul derrière sa chaise : les voisins de table entrent dans le champ.
      const r = 3.75;
      const bob = Math.sin(t * 1.3) * 0.006;
      target.set(Math.cos(a) * r, 1.72 + bob, Math.sin(a) * r);
      look.set(0, 0.98, 0);
      // très léger recul pendant la révélation pour voir le canon
      if (this.revealFx && this.revealFx.shooter === this.ownId) {
        target.y += 0.03;
      }
    } else if (mode === "end") {
      const wch = this.lastState ? this.chars.get(this.lastState.winner) : null;
      const focus = new THREE.Vector3(0, 1.25, 0);
      if (wch) {
        wch.getWorldPosition(focus);
        focus.y = 1.3;
      }
      const a = t * 0.16;
      target.set(Math.cos(a) * 6.3, 3.7, Math.sin(a) * 6.3);
      look.copy(focus);
      speed = 1.5;
    } else {
      const a = t * 0.1;
      target.set(Math.cos(a) * 7.5, 4.4, Math.sin(a) * 7.5);
      look.set(0, 1.25, 0);
      speed = 1.35;
    }
    if (mobile && mode !== "game") target.y += 0.45;

    const k = 1 - Math.exp(-dt * speed);
    this.camera.position.lerp(target, k);
    this.camLook.lerp(look, k);

    if (this.camShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camShake = Math.max(0, this.camShake - dt * 1.4);
    }
    this.camera.lookAt(this.camLook);
  }

  /* ------------------------------------------------------------------ */
  /* Boucle principale                                                   */
  /* ------------------------------------------------------------------ */
  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed = (this.elapsed || 0) + dt;
    const t = this.elapsed;
    const now = performance.now();

    if (this.dust) {
      const p = this.dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + dt * 0.07;
        if (y > 6.8) y = 0.2;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.2 + i) * dt * 0.02);
      }
      p.needsUpdate = true;
    }
    for (const l of this.lanterns) {
      const f = 0.6 + Math.sin(t * 7 + l.phase) * 0.05 + Math.sin(t * 13 + l.phase * 2) * 0.02;
      l.light.intensity = f;
      l.bulb.material.color.setRGB(1, 0.78 + f * 0.15, 0.4 + f * 0.1);
    }
    if (this.smoke) {
      this.smoke.children.forEach((sp, i) => {
        sp.position.y += dt * 0.025;
        sp.position.x += Math.sin(t * 0.3 + i) * dt * 0.012;
        if (sp.position.y > 6) sp.position.y = 2.4;
      });
    }

    this.updateShuffle(now);
    this.updateTarget(now, t);
    this.updateTableCards(now);
    this.updateGuns(now);
    this.updateReveal(now);
    this.updateHand(dt, t);

    const hideOwn = (this.camMode === "game" || this.camMode === "reveal") && this.ownSeated;
    for (const [id, ch] of this.chars) {
      ch.visible = !(hideOwn && id === this.ownId);
      this.updateCharacter(id, ch, t, now);
    }
    if (this.handGroup) {
      this.handGroup.visible = this.hand.length > 0 && this.camMode === "game";
    }
    this.updateCamera(t, dt);
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  updateLabels() {
    const v = new THREE.Vector3();
    const hiddenOwn = (this.camMode === "game" || this.camMode === "reveal") && this.ownSeated;
    for (const [id, ch] of this.chars) {
      const lab = this.labelsMap.get(id);
      if (!lab) continue;
      if (!ch.visible || (hiddenOwn && id === this.ownId)) {
        lab.style.display = "none";
        continue;
      }
      ch.getWorldPosition(v);
      v.y += 2.02;
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      const visible = v.z < 1 && x > -90 && x < window.innerWidth + 90 && y > 0 && y < window.innerHeight + 40;
      lab.style.display = visible ? "flex" : "none";
      lab.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
      lab.classList.toggle("turn", !!ch.userData.isTurn && !ch.userData.dead);
      lab.classList.toggle("dead", !!ch.userData.dead);
    }
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    if (this.fireTimer) clearTimeout(this.fireTimer);
    if (this.shuffleFx) for (const c of this.shuffleFx.cards) this.scene.remove(c.mesh);
    this.renderer.dispose();
  }
}




