import { useEffect, useRef } from "react";

type AudioEngine = {
  ctx: AudioContext;
  master: GainNode;
  timer: number | null;
  next: number;
  step: number;
};

const NOTES = [48, 52, 55, 59, 45, 48, 52, 55, 41, 45, 48, 52, 43, 47, 50, 53];
const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

export function useHubMusic(enabled: boolean, volume: number) {
  const engine = useRef<AudioEngine | null>(null);
  const preferences = useRef({ enabled, volume });
  const syncRef = useRef<() => void>(() => {});
  preferences.current = { enabled, volume };

  useEffect(() => {
    const applyVolume = () => {
      const e = engine.current;
      if (!e) return;
      const target = preferences.current.enabled ? (preferences.current.volume / 100) * 0.55 : 0;
      e.master.gain.setTargetAtTime(target, e.ctx.currentTime, 0.08);
    };

    const schedule = () => {
      const e = engine.current;
      if (!e) return;
      while (e.next < e.ctx.currentTime + 0.35) {
        const note = NOTES[e.step % NOTES.length];
        const osc = e.ctx.createOscillator();
        const gain = e.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = frequency(note + 12);
        gain.gain.setValueAtTime(0.0001, e.next);
        gain.gain.linearRampToValueAtTime(0.12, e.next + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, e.next + 1.1);
        osc.connect(gain);
        gain.connect(e.master);
        osc.start(e.next);
        osc.stop(e.next + 1.15);
        if (e.step % 4 === 0) {
          const bass = e.ctx.createOscillator();
          const bassGain = e.ctx.createGain();
          bass.type = "sine";
          bass.frequency.value = frequency(note - 12);
          bassGain.gain.setValueAtTime(0.18, e.next);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, e.next + 1.7);
          bass.connect(bassGain);
          bassGain.connect(e.master);
          bass.start(e.next);
          bass.stop(e.next + 1.75);
        }
        e.step++;
        e.next += 0.48;
      }
    };

    const start = () => {
      if (!preferences.current.enabled || preferences.current.volume === 0 || document.hidden) return;
      if (!engine.current) {
        const AudioContextClass = window.AudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        engine.current = { ctx, master, timer: null, next: ctx.currentTime + 0.08, step: 0 };
      }
      const e = engine.current;
      void e.ctx.resume();
      if (e.timer === null) {
        e.next = Math.max(e.next, e.ctx.currentTime + 0.08);
        e.timer = window.setInterval(schedule, 100);
        schedule();
      }
      applyVolume();
    };

    const stop = () => {
      const e = engine.current;
      if (!e) return;
      if (e.timer !== null) window.clearInterval(e.timer);
      e.timer = null;
      e.master.gain.setTargetAtTime(0, e.ctx.currentTime, 0.08);
    };

    const sync = () => {
      if (preferences.current.enabled && preferences.current.volume > 0 && !document.hidden) start();
      else stop();
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else sync();
    };

    syncRef.current = sync;
    window.addEventListener("pointerdown", sync, { passive: true });
    window.addEventListener("keydown", sync);
    document.addEventListener("visibilitychange", onVisibility);
    syncRef.current();

    return () => {
      window.removeEventListener("pointerdown", sync);
      window.removeEventListener("keydown", sync);
      document.removeEventListener("visibilitychange", onVisibility);
      const e = engine.current;
      if (e) {
        if (e.timer !== null) window.clearInterval(e.timer);
        void e.ctx.close();
        engine.current = null;
      }
    };
  }, []);

  useEffect(() => {
    syncRef.current();
  }, [enabled, volume]);
}
