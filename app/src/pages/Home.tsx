import { useCallback, useEffect, useRef, useState } from "react";
import { useHubMusic } from "../hubAudio";

type HubSettings = {
  music: boolean;
  vol: number;
  anim: "off" | "light" | "full";
  theme: "light" | "dark";
};

const DEFAULT_SETTINGS: HubSettings = { music: true, vol: 35, anim: "light", theme: "light" };
const FLOATERS = ["🎉", "🤫", "✨", "🎭", "💛", "🎈", "🕹️", "⭐", "🎲", "🥂"];

function loadSettings(): HubSettings {
  try {
    const raw = localStorage.getItem("soiree:set") || localStorage.getItem("lpv:set") || localStorage.getItem("qdn:set") || "{}";
    const saved = JSON.parse(raw);
    return {
      music: typeof saved.music === "boolean" ? saved.music : DEFAULT_SETTINGS.music,
      vol: Number.isFinite(saved.vol) ? Math.min(100, Math.max(0, Math.round(saved.vol))) : DEFAULT_SETTINGS.vol,
      anim: ["off", "light", "full"].includes(saved.anim) ? saved.anim : DEFAULT_SETTINGS.anim,
      theme: ["light", "dark"].includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type Game = {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  path: string | null;
  players: string;
  duration: string;
  badge?: string;
  desc: string;
  color: string; // couleur principale de la jaquette
  tilt: number; // inclinaison de repos (deg)
  pattern: "dots" | "stripes" | "grid";
  locked?: boolean;
};

const GAMES: Game[] = [
  {
    id: "quidenous",
    title: "Qui de nous ?",
    tagline: "Le jeu qui grille tes potes",
    emoji: "🎉",
    path: "/quidenous/index.html",
    players: "3 – 12 joueurs",
    duration: "15 – 45 min",
    desc: "Votes express, anecdotes mystères, phrases à compléter et photos : chacun joue sur son écran, le plus drôle gagne.",
    color: "#ffc531",
    tilt: -2.4,
    pattern: "dots",
  },
  {
    id: "verites",
    title: "Les Petites Vérités",
    tagline: "Défends la vérité d'un autre",
    emoji: "🤫",
    path: "/verites/index.html",
    players: "4 – 20 joueurs",
    duration: "20 – 40 min",
    badge: "18+",
    desc: "Tout le monde confie une vérité… puis deux joueurs échangent les leurs en secret et doivent mentir sans se faire griller.",
    color: "#6a47ff",
    tilt: 1.8,
    pattern: "stripes",
  },
  {
    id: "photoroulette",
    title: "Photo Roulette",
    tagline: "À qui est cette photo ?",
    emoji: "📸",
    path: "/photoroulette/index.html",
    players: "3 – 10 joueurs",
    duration: "10 – 20 min",
    desc: "Une photo (ou vidéo) de la pellicule d'un joueur apparaît 5 secondes : devine à qui elle est, le plus rapide marque le plus.",
    color: "#ff4f8b",
    tilt: -1.6,
    pattern: "grid",
  },
  {
    id: "undercover",
    title: "Undercover",
    tagline: "Qui a un mot différent ?",
    emoji: "🕵️",
    path: "/undercover/index.html",
    players: "3 – 20 joueurs",
    duration: "15 – 40 min",
    desc: "Civils, Undercover et Mr. White : décris ton mot sans te trahir, débusque l'infiltré. Rôles spéciaux et mots 100 % personnalisables.",
    color: "#19c7b0",
    tilt: 2.1,
    pattern: "dots",
  },
  {
    id: "pokerface",
    title: "Poker Face",
    tagline: "Ne craque surtout pas",
    emoji: "🎭",
    path: "/pokerface/index.html",
    players: "2 – 8 joueurs",
    duration: "10 – 25 min",
    desc: "Regarde des vidéos et des photos sans la moindre réaction : la caméra surveille ton visage, et si tu craques, tu perds la manche.",
    color: "#ff2a4d",
    tilt: -2,
    pattern: "stripes",
  },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 20);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [sel, setSel] = useState(0);
  const [booted, setBooted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<HubSettings>(loadSettings);
  const trackRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const clock = useClock();
  useHubMusic(settings.music, settings.vol);

  useEffect(() => {
    document.documentElement.dataset.hubTheme = settings.theme;
    document.documentElement.dataset.hubAnim = settings.anim;
    try { localStorage.setItem("soiree:set", JSON.stringify(settings)); } catch { /* stockage indisponible */ }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<HubSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const open = useCallback((g: Game) => {
    if (!g.path || g.locked) return;
    window.location.href = g.path;
  }, []);

  const select = useCallback(
    (i: number) => {
      const n = GAMES.length;
      const next = ((i % n) + n) % n;
      lockUntil.current = performance.now() + 650; // le défilement animé ne doit pas réécrire la sélection
      setSel(next);
      const el = trackRef.current?.children[next] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) {
        if (e.key === "Escape") setSettingsOpen(false);
        return;
      }
      if (e.key === "ArrowRight") select(sel + 1);
      else if (e.key === "ArrowLeft") select(sel - 1);
      else if (e.key === "Enter") open(GAMES[sel]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, select, open, settingsOpen]);

  // Sur mobile : la sélection suit le défilement du carrousel
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      if (performance.now() < lockUntil.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let dist = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const el = child as HTMLElement;
          const c = el.offsetLeft + el.offsetWidth / 2;
          const d = Math.abs(c - mid);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        setSel((prev) => (prev === best ? prev : best));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const game = GAMES[sel];

  return (
    <div className="hub">
      <div className="hub-rings" aria-hidden="true" />
      <div className="hub-stickers" aria-hidden="true">
        <span className="sticker s1">✦</span>
        <span className="sticker s2">●</span>
        <span className="sticker s3">★</span>
        <span className="sticker s4">✦</span>
      </div>
      {settings.anim === "full" && (
        <div className="hub-floaters" aria-hidden="true">
          {FLOATERS.map((emoji, i) => (
            <span key={i} style={{ left: `${5 + (i * 9.7) % 90}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${16 + (i % 4) * 3}s` }}>{emoji}</span>
          ))}
        </div>
      )}

      <header className="hub-top">
        <div className="hub-brand">
          <span className="hub-logo" aria-hidden="true">🕹️</span>
          <span className="hub-name">Le Hub de Soirée</span>
        </div>
        <div className="hub-status">
          <span className="hub-pill" title="Jouez chacun sur votre écran">en ligne</span>
          <time className="hub-clock">{clock}</time>
          <span className="hub-avatar" aria-hidden="true">😎</span>
        </div>
      </header>

      <main className="hub-main">
        <h1 className="hub-title">
          À quoi on joue <span className="hub-title-tilt">ce soir&nbsp;?</span>
        </h1>

        <div
          className={`hub-track ${booted ? "is-booted" : ""}`}
          ref={trackRef}
          role="listbox"
          aria-label="Jeux disponibles"
          aria-activedescendant={`game-${game.id}`}
        >
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              id={`game-${g.id}`}
              role="option"
              aria-selected={i === sel}
              aria-disabled={g.locked || undefined}
              className={[
                "tile",
                `pattern-${g.pattern}`,
                i === sel ? "is-sel" : "",
                g.locked ? "is-locked" : "",
              ].join(" ")}
              style={{ ["--tile-color" as string]: g.color, ["--tile-tilt" as string]: `${g.tilt}deg`, ["--i" as string]: i }}
              onClick={() => (i === sel ? open(g) : select(i))}
            >
              {g.badge && <span className="tile-badge">{g.badge}</span>}
              {g.locked && <span className="tile-lock" aria-hidden="true">🔒</span>}
              <span className="tile-art" aria-hidden="true">{g.emoji}</span>
              <span className="tile-name">{g.title}</span>
              <span className="tile-tag">{g.tagline}</span>
              <span className="tile-shine" aria-hidden="true" />
            </button>
          ))}
        </div>

        <nav className="hub-dots" aria-label="Navigation entre les jeux">
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              className={`dot ${i === sel ? "is-sel" : ""}`}
              aria-label={`Sélectionner ${g.title}`}
              aria-current={i === sel}
              onClick={() => select(i)}
            />
          ))}
        </nav>

        <section className="hub-panel" key={game.id} aria-live="polite">
          <div className="hub-panel-info">
            <h2 className="hub-panel-title">
              {game.title}
              {game.badge && <span className="hub-panel-badge">{game.badge}</span>}
            </h2>
            <p className="hub-panel-desc">{game.desc}</p>
            <p className="hub-panel-meta">
              <span>{game.players}</span>
              <span aria-hidden="true">·</span>
              <span>{game.duration}</span>
            </p>
          </div>
          {game.locked ? (
          <span className="hub-play is-disabled" aria-disabled="true">Bientôt…</span>
          ) : (
          <button className="hub-play" onClick={() => open(game)}>
            Jouer
            <span aria-hidden="true">→</span>
          </button>
          )}
        </section>

        <p className="hub-hint">
          <kbd>←</kbd> <kbd>→</kbd> pour choisir · <kbd>Entrée</kbd> pour lancer — crée un salon, partage le code, et chacun joue sur son écran.
        </p>
      </main>

      <button className="hub-settings-button" onClick={() => setSettingsOpen(true)} aria-label="Réglages (affichage, musique et animations)" aria-haspopup="dialog">⚙️</button>
      {settingsOpen && (
        <div className="hub-settings-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
          <section className="hub-settings" role="dialog" aria-modal="true" aria-labelledby="hub-settings-title">
            <h2 id="hub-settings-title">⚙️ Réglages</h2>
            <div className="hub-setting-row"><strong>🌙 Affichage</strong></div>
            <div className="hub-setting-pills">
              <button className={settings.theme === "light" ? "is-active" : ""} onClick={() => updateSettings({ theme: "light" })}>☀️ Clair</button>
              <button className={settings.theme === "dark" ? "is-active" : ""} onClick={() => updateSettings({ theme: "dark" })}>🌙 Sombre</button>
            </div>
            <div className="hub-setting-row">
              <strong>🎵 Musique de fond</strong>
              <button className={`hub-music-toggle ${settings.music ? "is-active" : ""}`} onClick={() => updateSettings({ music: !settings.music })}>{settings.music ? "🔊 Activée" : "🔇 Coupée"}</button>
            </div>
            <label className="hub-setting-row" htmlFor="hub-volume"><span>Volume</span><output>{settings.vol} %</output></label>
            <input id="hub-volume" className="hub-volume" type="range" min="0" max="100" step="5" value={settings.vol} onChange={(e) => updateSettings({ vol: Number(e.target.value) })} />
            <div className="hub-setting-row"><strong>✨ Animations</strong></div>
            <div className="hub-setting-pills">
              <button className={settings.anim === "off" ? "is-active" : ""} onClick={() => updateSettings({ anim: "off" })}>Aucune</button>
              <button className={settings.anim === "light" ? "is-active" : ""} onClick={() => updateSettings({ anim: "light" })}>Légères</button>
              <button className={settings.anim === "full" ? "is-active" : ""} onClick={() => updateSettings({ anim: "full" })}>Complètes</button>
            </div>
            <p className="hub-settings-hint">Complètes : éléments flottants en fond et logo animé. Tes réglages sont aussi utilisés dans les jeux.</p>
            <button className="hub-settings-close" onClick={() => setSettingsOpen(false)}>Fermer</button>
          </section>
        </div>
      )}
    </div>
  );
}
