import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emptyGilRushEvent, nextGilRushEvent, readGilRushEvent, type GilRushEvent } from "./cartel-gil-rush-model";

const add = (id: string) => ({ type: "add", player: { id, name: id, avatarUrl: null } });
const apply = (event: GilRushEvent, action: unknown) => nextGilRushEvent(event, action, event.revision, () => 0);
const live = () => apply(apply(emptyGilRushEvent(), add("Axo")), { type: "start" });

test("start needs players only; shuffles once and locks participants", () => {
  assert.throws(() => apply(emptyGilRushEvent(), { type: "start" }), /at least one/);
  let event = apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow"));
  const before = JSON.stringify(event);
  const started = apply(event, { type: "start" });
  assert.equal(JSON.stringify(event), before);
  assert.equal(started.mood, null);
  assert.deepEqual(started.players.map(p => p.id), ["Chow", "Axo"]);
  assert.equal(started.round, 1);
  event = started;
  for (const action of [add("Guest"), { type: "remove", id: "Axo" }, { type: "rename", id: "Axo", name: "New" }, { type: "start" }]) {
    assert.throws(() => apply(event, action), /locked/);
  }
});

test("manual mood applies and clears at any round; round and gil stay independent", () => {
  let event = apply(live(), { type: "set-mood", mood: "red" });
  event = apply(event, { type: "set-gil", id: "Axo", gilWon: 200_000 });
  const players = event.players;
  for (const round of [7, 2, 1, Number.MAX_SAFE_INTEGER]) {
    event = apply(event, { type: "set-round", round });
    assert.deepEqual(event.players, players);
    assert.equal(event.mood, "red");
  }
  event = apply(event, { type: "set-mood", mood: null });
  assert.equal(event.mood, null);
  assert.equal(event.players[0].gilWon, 200_000);
  for (const gilWon of [Number.MAX_SAFE_INTEGER, 100, 0]) {
    event = apply(event, { type: "set-gil", id: "Axo", gilWon });
    assert.equal(event.players[0].gilWon, gilWon);
  }
});

test("integer validation, identity validation and unknown actions fail closed", () => {
  const event = live();
  for (const gilWon of [-1, 1.2, NaN, Infinity, "200", null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => apply(event, { type: "set-gil", id: "Axo", gilWon }));
  for (const round of [0, -1, 1.5, "3", null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => apply(event, { type: "set-round", round }));
  assert.throws(() => apply(event, { type: "set-gil", id: "missing", gilWon: 10 }), /not found/);
  assert.throws(() => apply(event, { type: "set-mood", mood: "orange" }));
  assert.throws(() => apply(emptyGilRushEvent(), { type: "unknown" }));
  assert.throws(() => apply(apply(emptyGilRushEvent(), add("Axo")), add("axo")), /already/);
});

test("revision protects stale writes, reset, import and duplicate starts", () => {
  const event = live();
  const newer = apply(event, { type: "set-round", round: 2 });
  for (const action of [{ type: "set-gil", id: "Axo", gilWon: 100 }, { type: "reset" }, { type: "start" }]) {
    assert.throws(() => nextGilRushEvent(newer, action, event.revision), error => error instanceof Error && /another host/.test(error.message));
  }
  const reset = apply(newer, { type: "reset" });
  assert.equal(reset.revision, newer.revision + 1);
  assert.deepEqual(reset.players, []);
  assert.throws(() => nextGilRushEvent(reset, { type: "set-gil", id: "Axo", gilWon: 1 }, event.revision));
});

test("explicit import preserves legacy order and round, zeroes gil and strips extra fields", () => {
  const legacy = { ...live(), round: 7, mood: "blue", adminSessionToken: "never-public", players: [{ id: "Axo", name: "Axo", avatarUrl: null, gilWon: 900, privateNote: "secret" }] };
  const imported = apply(emptyGilRushEvent(), { type: "import", event: legacy });
  assert.equal(imported.round, 7);
  assert.equal(imported.mood, "blue");
  assert.equal(imported.players[0].gilWon, 0);
  assert.doesNotMatch(JSON.stringify(imported), /secret|never-public|privateNote|adminSessionToken/);
  assert.throws(() => apply(imported, { type: "import", event: legacy }), /empty shared event/);
  assert.deepEqual(readGilRushEvent({ version: 1, revision: 9, phase: "setup", round: 1 }), { ...emptyGilRushEvent(), revision: 9 });
});
