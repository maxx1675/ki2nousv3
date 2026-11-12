import { describe, it, expect } from "vitest";
import { Relay, type Sink } from "./relay";

const mkSink = () => {
  const got: { event: string; data: any }[] = [];
  const sink: Sink = { send: (event, data) => got.push({ event, data }), close: () => {} };
  return { sink, got, last: (ev: string) => [...got].reverse().find((g) => g.event === ev)?.data };
};
function setup(opts = {}) {
  let t = 1000;
  const r = new Relay({ now: () => t, hostGraceMs: 20000, roomTtlMs: 600000, ...opts });
  const adv = (ms: number) => { t += ms; r.sweep(); };
  const enter = (room: string, cid: string, extra: any = {}) => {
    const j: any = r.join({ room, cid, ...extra });
    if (!j.ok) return { j, s: null as any, o: null as any };
    const s = mkSink();
    const o: any = r.open(room, cid, j.conn, s.sink);
    return { j, s, o };
  };
  return { r, adv, enter };
}

describe("salons", () => {
  it("refuse un salon inexistant sans create", () => {
    const { r } = setup();
    const j: any = r.join({ room: "uc-ABCD", cid: "a" });
    expect(j.ok).toBe(false);
    expect(j.status).toBe(404);
  });
  it("le créateur est hôte, les autres non", () => {
    const { enter } = setup();
    expect(enter("uc-ABCD", "a", { create: true }).j.host).toBe(true);
    expect(enter("uc-ABCD", "b").j.host).toBe(false);
  });
  it("relaie à tous sauf l'émetteur, ou à l'hôte seulement", () => {
    const { r, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    const c = enter("uc-ABCD", "c");
    const res: any = r.event({ room: "uc-ABCD", conn: b.j.conn, topic: "act", data: 1, to: "host" });
    expect(res.delivered).toBe(1);
    expect(a.s.got.filter((g: any) => g.event === "evt")).toHaveLength(1);
    expect(c.s.got.filter((g: any) => g.event === "evt")).toHaveLength(0);
    const all: any = r.event({ room: "uc-ABCD", conn: a.j.conn, topic: "st", data: 2 });
    expect(all.delivered).toBe(2);
  });
  it("refuse un émetteur qui n'est pas dans le salon", () => {
    const { r, enter } = setup();
    enter("uc-ABCD", "a", { create: true });
    const res: any = r.event({ room: "uc-ABCD", conn: "intrus", topic: "x", data: 1 });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("noconn");
  });
});

describe("passage de relais de l'hôte", () => {
  it("promeut le plus ancien joueur après le délai et lui envoie le snapshot", () => {
    const { r, adv, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    const c = enter("uc-ABCD", "c");
    expect((r.setSnap("uc-ABCD", a.j.conn, { ph: "vote" }) as any).ok).toBe(true);
    a.o.close();
    adv(10000);
    expect(b.s.last("host").cid).toBe("a"); // pas encore
    adv(11000);
    expect(b.s.last("host")).toEqual({ cid: "b", epoch: 1, snap: { ph: "vote" } });
    expect(c.s.last("host")).toEqual({ cid: "b", epoch: 1 });
    // un message « vers l'hôte » arrive maintenant à b
    const res: any = r.event({ room: "uc-ABCD", conn: c.j.conn, topic: "act", data: 1, to: "host" });
    expect(res.delivered).toBe(1);
  });
  it("une coupure courte ne change pas d'hôte", () => {
    const { adv, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    a.o.close();
    adv(8000);
    const a2 = enter("uc-ABCD", "a", { resume: true });
    expect(a2.j.host).toBe(true);
    adv(30000);
    expect(b.s.last("host").cid).toBe("a");
  });
  it("l'ancien hôte qui revient est un simple joueur", () => {
    const { adv, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    enter("uc-ABCD", "b");
    a.o.close();
    adv(25000);
    const a2 = enter("uc-ABCD", "a", { resume: true, wasHost: true });
    expect(a2.j.host).toBe(false);
    expect(a2.j.hostCid).toBe("b");
  });
  it("seul l'hôte peut poster un snapshot", () => {
    const { r, enter } = setup();
    enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    expect((r.setSnap("uc-ABCD", b.j.conn, { x: 1 }) as any).ok).toBe(false);
  });
});

describe("reprise après tout le monde parti", () => {
  it("garde le salon et le snapshot, l'hôte revient avec", () => {
    const { r, adv, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    r.setSnap("uc-ABCD", a.j.conn, { ph: "describe" });
    a.o.close(); b.o.close();
    adv(5 * 60000);
    expect(r.rooms.has("uc-ABCD")).toBe(true);
    const a2 = enter("uc-ABCD", "a", { resume: true, wasHost: true });
    expect(a2.j.host).toBe(true);
    expect(a2.j.snap).toEqual({ ph: "describe" });
    const b2 = enter("uc-ABCD", "b", { resume: true });
    expect(b2.j.host).toBe(false);
  });
  it("supprime le salon après le TTL", () => {
    const { r, adv, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    a.o.close();
    adv(11 * 60000);
    expect(r.rooms.has("uc-ABCD")).toBe(false);
  });
  it("salon recréé après redémarrage serveur : l'ancien hôte reprend, sinon promotion", () => {
    const { adv, enter } = setup();
    const b = enter("uc-ZZZZ", "b", { resume: true });
    expect(b.j.host).toBe(false);
    adv(21000);
    expect(b.s.last("host").cid).toBe("b");
  });
});

describe("classement de soirée", () => {
  const sc = (cid: string, s: number) => ({ cid, n: cid.toUpperCase(), e: "😎", c: "#ff0000", s });
  it("attribue des points selon le rang, additionne et ignore les doublons", () => {
    const { r, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    enter("uc-ABCD", "b"); enter("uc-ABCD", "c");
    const res: any = r.score({ room: "uc-ABCD", conn: a.j.conn, sid: "s1", game: "uc", scores: [sc("a", 5), sc("b", 9), sc("c", 9)] });
    expect(res.ok).toBe(true);
    const rows = Object.fromEntries(res.board.rows.map((x: any) => [x.cid, x]));
    expect(rows.b.total).toBe(10); // ex æquo : même rang
    expect(rows.c.total).toBe(10);
    expect(rows.a.total).toBe(5);
    expect(rows.b.wins).toBe(1);
    const dup: any = r.score({ room: "uc-ABCD", conn: a.j.conn, sid: "s1", game: "uc", scores: [sc("a", 5), sc("b", 9)] });
    expect(dup.dup).toBe(true);
    expect(r.board("ABCD").rows.find((x) => x.cid === "b")!.total).toBe(10);
    r.score({ room: "pf-ABCD", conn: "x", sid: "s2", game: "pf", scores: [] });
  });
  it("le classement se cumule entre jeux (même code) et réservé à l'hôte", () => {
    const { r, enter } = setup();
    const a = enter("uc-ABCD", "a", { create: true });
    const b = enter("uc-ABCD", "b");
    expect((r.score({ room: "uc-ABCD", conn: b.j.conn, sid: "s1", game: "uc", scores: [sc("a", 1), sc("b", 2)] }) as any).ok).toBe(false);
    r.score({ room: "uc-ABCD", conn: a.j.conn, sid: "s1", game: "uc", scores: [sc("a", 1), sc("b", 2)] });
    const a2 = enter("pf-ABCD", "a", { create: true });
    enter("pf-ABCD", "b");
    r.score({ room: "pf-ABCD", conn: a2.j.conn, sid: "s2", game: "pf", scores: [sc("a", 3), sc("b", 1)] });
    const board = r.board("ABCD");
    expect(board.games).toBe(2);
    expect(board.rows.find((x) => x.cid === "a")!.total).toBe(7 + 10);
  });
});
