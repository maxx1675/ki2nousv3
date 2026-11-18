import { describe, it, expect } from "vitest";
import { MenteursEngine, MENTEURS_TARGETS, type MenteursConfig } from "./menteurs";

const CFG: Partial<MenteursConfig> = { max: 4, lives: 2, rounds: 5, think: 20, challenge: 10, special: true };

function setup(extra: Partial<MenteursConfig> = {}) {
  let t = 1000;
  let chamber = 1;
  const e = new MenteursEngine({
    now: () => t,
    roll: () => chamber,
    shuffle: (a) => [...a],
  });
  const create = e.create({ room: "ABCD", id: "a", name: "Alice", avatar: "sherif", config: { ...CFG, ...extra } });
  if (!create.ok) throw new Error(create.error);
  const join = e.join({ room: "ABCD", id: "b", name: "Bob", avatar: "bandit" });
  if (!join.ok) throw new Error(join.error);
  const adv = (ms: number) => {
    t += ms;
    e.sweep();
  };
  const setChamber = (n: number) => {
    chamber = n;
  };
  return { e, create, join, adv, setChamber, code: "ABCD", ta: create.token, tb: join.token };
}

function view(e: MenteursEngine, code: string, id: string, token: string) {
  const r = e.state(code, id, token);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

describe("La Table Des Menteurs — autorité serveur", () => {
  it("crée une table, distribue les mains et ne révèle jamais celles des autres", () => {
    const { e, adv, code, ta, tb } = setup();
    const st = e.action(code, "a", ta, { k: "start" });
    expect(st.ok).toBe(true);
    const a = view(e, code, "a", ta);
    const b = view(e, code, "b", tb);
    expect(a.phase).toBe("claim");
    expect(a.you.hand.length).toBeGreaterThan(0);
    expect(b.you.hand.length).toBeGreaterThan(0);
    expect(a.players.find((p) => p.id === "b")!.handCount).toBeGreaterThan(0);
    expect((a.players.find((p) => p.id === "b") as unknown as { hand?: unknown }).hand).toBeUndefined();
    // le serveur garde la pioche privée
    const room = e.rooms.get(code)!;
    expect(room.deck.length).toBeGreaterThan(0);
    expect((b.players.find((p) => p.id === "a") as unknown as { hand?: unknown }).hand).toBeUndefined();
    expect((a as unknown as { deck?: unknown }).deck).toBeUndefined();
    expect((a as unknown as { players: { hand?: unknown }[] }).players.every((p) => p.hand === undefined)).toBe(true);
    adv(25_000);
  });

  it("refuse une action de lancement à un invité et un claim hors tour", () => {
    const { e, code, tb } = setup();
    const bad = e.action(code, "b", tb, { k: "start" });
    expect(bad.ok).toBe(false);
    const st = e.action(code, "a", "a", { k: "start" });
    expect(st.ok).toBe(false);
  });

  it("valide le tour, les cartes et l'unicité des actions", () => {
    const { e, code, ta, tb, adv } = setup();
    e.action(code, "a", ta, { k: "start" });
    adv(5_100); // fin du dévoilement de la carte cible (5 s)
    e.rooms.get(code)!.turnId = "a";
    const room = e.rooms.get(code)!;
    room.target = "R";
    const a = room.players.find((p) => p.id === "a")!;
    a.hand = [{ v: "R", s: "" }, { v: "9", s: "" }, { v: "JOKER", s: "*" }];
    room.deck = [];
    const before = a.hand.length;
    const first = e.action(code, "a", ta, { k: "claim", cards: [0, 1] }, "same");
    expect(first.ok).toBe(true);
    const after = e.rooms.get(code)!.players.find((p) => p.id === "a")!.hand.length;
    expect(after).toBeLessThan(before);
    const dup = e.action(code, "a", ta, { k: "claim", cards: [0] }, "same");
    expect(dup.ok).toBe(true);
    expect(e.rooms.get(code)!.players.find((p) => p.id === "a")!.hand.length).toBe(after);
    const bad = e.action(code, "b", tb, { k: "claim", cards: [0] });
    expect(bad.ok).toBe(false);
  });

  it("révèle un mensonge et applique le revolver (1/6) côté serveur", () => {
    const { e, code, ta, tb, adv, setChamber } = setup();
    e.action(code, "a", ta, { k: "start" });
    adv(5_100);
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    room.target = "R";
    const a = room.players.find((p) => p.id === "a")!;
    a.hand = [{ v: "9", s: "" }, { v: "V", s: "" }];
    setChamber(1); // balle
    const claim = e.action(code, "a", ta, { k: "claim", cards: [0] });
    expect(claim.ok).toBe(true);
    const ch = e.action(code, "b", tb, { k: "challenge" });
    expect(ch.ok).toBe(true);
    const rv = view(e, code, "b", tb);
    expect(rv.phase).toBe("reveal");
    expect(rv.reveal?.liar).toBe(true);
    expect(rv.reveal?.victim).toBe("a");
    expect(rv.reveal?.shooter).toBe("b");
    expect(rv.reveal?.bullet).toBe(true);
    expect(rv.players.find((p) => p.id === "a")!.lives).toBe(1);
    adv(6000);
    expect(view(e, code, "a", ta).phase).toBe("claim");
  });

  it("tire sur l'accusateur quand l'annonce était vraie", () => {
    const { e, code, ta, tb, setChamber, adv } = setup();
    e.action(code, "a", ta, { k: "start" });
    adv(5_100);
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    room.target = "R";
    room.players.find((p) => p.id === "a")!.hand = [{ v: "R", s: "" }];
    setChamber(1);
    e.action(code, "a", ta, { k: "claim", cards: [0] });
    e.action(code, "b", tb, { k: "challenge" });
    const rv = view(e, code, "b", tb);
    expect(rv.reveal?.liar).toBe(false);
    expect(rv.reveal?.victim).toBe("b");
    expect(rv.reveal?.shooter).toBe("a");
    expect(rv.players.find((p) => p.id === "b")!.lives).toBe(1);
  });

  it("une chambre vide ne retire pas de vie", () => {
    const { e, code, ta, tb, setChamber, adv } = setup();
    e.action(code, "a", ta, { k: "start" });
    adv(5_100);
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    room.target = "R";
    room.players.find((p) => p.id === "a")!.hand = [{ v: "9", s: "" }];
    setChamber(3);
    e.action(code, "a", ta, { k: "claim", cards: [0] });
    e.action(code, "b", tb, { k: "challenge" });
    const rv = view(e, code, "b", tb);
    expect(rv.reveal?.bullet).toBe(false);
    expect(rv.players.find((p) => p.id === "a")!.lives).toBe(2);
  });

  it("élimine un joueur à 0 vie et termine la partie", () => {
    const { e, code, ta, tb, adv, setChamber } = setup({ lives: 1 });
    e.action(code, "a", ta, { k: "start" });
    adv(5_100);
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    room.target = "R";
    room.players.find((p) => p.id === "a")!.hand = [{ v: "9", s: "" }];
    setChamber(1);
    e.action(code, "a", ta, { k: "claim", cards: [0] });
    e.action(code, "b", tb, { k: "challenge" });
    let rv = view(e, code, "b", tb);
    expect(rv.reveal?.liar).toBe(true);
    expect(rv.players.find((p) => p.id === "a")!.alive).toBe(false);
    adv(6000);
    rv = view(e, code, "b", tb);
    expect(rv.phase).toBe("end");
    expect(rv.winner).toBe("b");
    expect(rv.endReason).toBe("last");
  });

  it("ne tire que des figures ou l'As comme carte cible", () => {
    const { e, code, ta } = setup();
    const st = e.action(code, "a", ta, { k: "start" });
    expect(st.ok).toBe(true);
    const v = view(e, code, "a", ta);
    expect(MENTEURS_TARGETS).toEqual(["V", "D", "R", "A"]);
    expect(["V", "D", "R", "A"]).toContain(v.target);
  });

  it("bloque toute annonce pendant les 5 s de la carte cible et publie les cartes levées", () => {
    const { e, code, ta, tb, adv } = setup();
    const st = e.action(code, "a", ta, { k: "start" });
    expect(st.ok).toBe(true);
    const v0 = view(e, code, "a", ta);
    expect(v0.roundAt).toBeGreaterThan(0);
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    // personne ne peut jouer avant la fin du dévoilement
    const early = e.action(code, "a", ta, { k: "claim", cards: [0] });
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error).toMatch(/carte cible/i);
    // l'état « cartes levées » est public
    expect(e.action(code, "b", tb, { k: "raise", v: false }).ok).toBe(true);
    expect(view(e, code, "a", ta).players.find((p) => p.id === "b")!.raised).toBe(false);
    expect(e.action(code, "b", tb, { k: "raise", v: true }).ok).toBe(true);
    expect(view(e, code, "a", ta).players.find((p) => p.id === "b")!.raised).toBe(true);
    adv(5_100);
    const late = e.action(code, "a", ta, { k: "claim", cards: [0] });
    expect(late.ok).toBe(true);
  });

  it("gère le chrono serveur, le passage automatique et la pause", () => {
    const { e, code, ta, adv } = setup();
    e.action(code, "a", ta, { k: "start" });
    const room = e.rooms.get(code)!;
    room.turnId = "a";
    room.target = "R";
    adv(25_000);
    const after = view(e, code, "a", ta);
    expect(after.phase).toBe("claim");
    expect(after.turnId).toBe("b");

    const paused = e.action(code, "a", ta, { k: "pause" });
    expect(paused.ok).toBe(true);
    const deadline = view(e, code, "a", ta).deadline;
    adv(10_000);
    expect(view(e, code, "a", ta).deadline).toBe(deadline);
    const resumed = e.action(code, "a", ta, { k: "resume" });
    expect(resumed.ok).toBe(true);
    expect(view(e, code, "a", ta).paused).toBe(false);
  });

  it("borne la table et refuse un joueur supplémentaire", () => {
    const { e } = setup({ max: 2 });
    const j = e.join({ room: "ABCD", id: "c", name: "Cara", avatar: "cowgirl" });
    expect(j.ok).toBe(false);
    if (!j.ok) expect(j.code).toBe("full");
  });

  it("exclut un joueur du salon mais pas l'hôte", () => {
    const { e, code, ta, tb } = setup();
    expect(e.action(code, "a", ta, { k: "kick", id: "a" }).ok).toBe(false);
    expect(e.action(code, "a", ta, { k: "kick", id: "b" }).ok).toBe(true);
    expect(e.state(code, "b", tb).ok).toBe(false);
  });

  it("transfère l'hôte selon le relais et réinitialise en revanche", () => {
    const { e, code, ta, tb } = setup();
    e.resolveHost = () => "b";
    const st = view(e, code, "b", tb);
    expect(st.hostId).toBe("b");
    expect(e.action(code, "b", tb, { k: "start" }).ok).toBe(true);
    e.action(code, "b", tb, { k: "end" });
    expect(view(e, code, "b", tb).phase).toBe("end");
    expect(e.action(code, "b", tb, { k: "rematch" }).ok).toBe(true);
    const after = view(e, code, "b", tb);
    expect(after.phase).toBe("lobby");
    expect(after.you.hand.length).toBe(0);
    void ta;
  });

  it("promeut un survivant quand l'hôte quitte en pleine partie", () => {
    const { e, code, ta, tb } = setup();
    e.resolveHost = () => "a";
    e.action(code, "a", ta, { k: "start" });
    expect(e.leave(code, "a", ta).ok).toBe(true);
    // Le relais peut encore désigner l'ancien hôte : il est déconnecté, donc
    // le moteur doit conserver la promotion locale.
    const st = view(e, code, "b", tb);
    expect(st.hostId).toBe("b");
    expect(st.phase).toBe("end");
    expect(st.winner).toBe("b");
    expect(st.endReason).toBe("last");
    expect(e.action(code, "b", tb, { k: "rematch" }).ok).toBe(true);
    expect(e.action(code, "b", tb, { k: "start" }).ok).toBe(true);
  });
});
