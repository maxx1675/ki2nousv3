import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type RoomState = {
  clone: <T>(value: T) => T;
  sanitize: (value: unknown) => unknown;
  applyPatch: (target: Record<string, unknown>, partial: Record<string, unknown>) => Record<string, unknown>;
  allowedGuestPatch: (playerId: string, partial: Record<string, unknown>) => Record<string, unknown>;
};

const source = fs.readFileSync(path.resolve(import.meta.dirname, "../../public/makeitmeme/room-state.js"), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const api = (context as unknown as { MimRoomState: RoomState }).MimRoomState;

describe("Make It Meme room state", () => {
  it("applique les chemins imbriqués comme Firestore", () => {
    const state: Record<string, unknown> = { players: { a: { score: 0 } } };
    api.applyPatch(state, {
      "players.a.score": 120,
      "players.b.name": "Nouveau",
      status: "voting",
    });
    expect(state).toEqual({
      players: { a: { score: 120 }, b: { name: "Nouveau" } },
      status: "voting",
    });
  });

  it("n'autorise un invité qu'à modifier son joueur et son vote", () => {
    const safe = api.allowedGuestPatch("alice", {
      "players.alice.selectedMemeId": "drake",
      "players.alice.hasSubmitted": true,
      "players.bob.score": 999,
      "votes.bob.alice": 100,
      "votes.bob.bob": 100,
      status: "results",
      hostId: "alice",
    });
    expect(safe).toEqual({
      "players.alice.selectedMemeId": "drake",
      "players.alice.hasSubmitted": true,
      "votes.bob.alice": 100,
    });
  });

  it("nettoie les valeurs non sérialisables", () => {
    expect(api.sanitize({ a: 1, b: undefined, c: () => 1, d: { e: "ok" } })).toEqual({ a: 1, d: { e: "ok" } });
  });
});
