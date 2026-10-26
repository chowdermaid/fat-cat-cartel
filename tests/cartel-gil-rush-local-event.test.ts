import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyEvent, LOCAL_EVENT_KEY, parseEvent, updateEvent } from "../src/features/cartel-gil-rush/utils/localEvent.ts";
import type { LocalEvent } from "../src/features/cartel-gil-rush/types.ts";

function players(count: number) {
  let event = emptyEvent();
  for (let index = 0; index < count; index++) event = updateEvent(event, { type: "add", player: { id: `p-${index}`, name: `Player ${index}`, avatarUrl: null } });
  return event;
}

function started(count = 8) {
  return updateEvent(updateEvent(players(count), { type: "set-mood", mood: "violet" }), { type: "start" }, () => 0);
}

test("names, guest editing and roster identities reject duplicates and invalid details", () => {
  let event = updateEvent(emptyEvent(), { type: "add", player: { id: "a", name: "  Chow   Meow ", avatarUrl: null, rosterId: "123" } });
  assert.equal(event.players[0].name, "Chow Meow");
  for (const player of [
    { id: "b", name: "chow meow", avatarUrl: null },
    { id: "a", name: "Different name", avatarUrl: null },
    { id: "b", name: "Different name", avatarUrl: null, rosterId: "123" },
    { id: "b", name: " ", avatarUrl: null },
    { id: "b", name: "x".repeat(81), avatarUrl: null },
    { id: "b", name: "Axo", avatarUrl: "javascript:alert(1)" },
    { id: "", name: "Axo", avatarUrl: null },
  ]) assert.throws(() => updateEvent(event, { type: "add", player }));
  assert.throws(() => updateEvent(event, { type: "rename", id: "a", name: "Other" }), /Roster names/);
  event = updateEvent(event, { type: "add", player: { id: "b", name: "Guest", avatarUrl: null } });
  assert.throws(() => updateEvent(event, { type: "rename", id: "b", name: "CHOW MEOW" }), /already/);
  event = updateEvent(event, { type: "rename", id: "b", name: " New   Guest " });
  assert.equal(event.players[1].name, "New Guest");
  assert.equal(updateEvent(event, { type: "rename", id: "b", name: "New Guest" }), event);
  assert.throws(() => updateEvent(event, { type: "remove", id: "missing" }), /not found/);
  assert.equal(updateEvent(event, { type: "remove", id: "b" }).players.length, 1);
});

test("starting requires a player and opening mood; supports one and odd counts", () => {
  assert.throws(() => updateEvent(emptyEvent(), { type: "start" }), /at least one/);
  assert.throws(() => updateEvent(players(1), { type: "start" }), /opening mood/);
  for (let count = 1; count <= 15; count++) {
    const event = started(count);
    assert.equal(event.phase, "live");
    assert.equal(event.round, 1);
    assert.equal(event.mood, "violet");
    assert.deepEqual(new Set(event.players.map((player) => player.id)), new Set(players(count).players.map((player) => player.id)));
    assert.equal(event.players.length, count);
    if (count > 1) assert.notDeepEqual(event.players, players(count).players);
  }
});

test("order and players lock after a single start, without mutating setup", () => {
  const setup = updateEvent(players(3), { type: "set-mood", mood: "blue" });
  const before = JSON.stringify(setup);
  const live = updateEvent(setup, { type: "start" }, () => 0);
  assert.equal(JSON.stringify(setup), before);
  for (const action of [
    { type: "start" } as const,
    { type: "add", player: { id: "new", name: "New", avatarUrl: null } } as const,
    { type: "rename", id: live.players[0].id, name: "Other" } as const,
    { type: "remove", id: live.players[0].id } as const,
  ]) assert.throws(() => updateEvent(live, action), /locked/);
});

test("mood and round are independent and never change order", () => {
  const live = started();
  const nextRound = updateEvent(live, { type: "set-round", round: 9 });
  assert.equal(nextRound.mood, "violet");
  assert.deepEqual(nextRound.players, live.players);
  const nextMood = updateEvent(nextRound, { type: "set-mood", mood: "red" });
  assert.equal(nextMood.round, 9);
  assert.deepEqual(nextMood.players, live.players);
  assert.equal(updateEvent(nextMood, { type: "set-mood", mood: "red" }), nextMood);
  assert.equal(updateEvent(nextMood, { type: "set-round", round: 9 }), nextMood);
  assert.equal(updateEvent(nextMood, { type: "set-round", round: 1 }).round, 1);
  for (const round of [0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => updateEvent(live, { type: "set-round", round }), /positive whole/);
  }
  assert.throws(() => updateEvent(players(1), { type: "set-round", round: 2 }), /Start/);
});

test("refresh preserves snapshots, order, mood and round; reset has no history", () => {
  let event = updateEvent(emptyEvent(), { type: "add", player: { id: "a", rosterId: "123", name: "Axo", avatarUrl: "https://example.com/avatar.png" } });
  event = updateEvent(event, { type: "set-mood", mood: "yellow" });
  event = updateEvent(event, { type: "start" });
  event = updateEvent(event, { type: "set-round", round: 42 });
  assert.deepEqual(parseEvent(JSON.stringify(event)), event);
  assert.deepEqual(parseEvent(JSON.stringify(updateEvent(event, { type: "reset" }))), emptyEvent());
  assert.equal("previous" in event, false);
  assert.equal(LOCAL_EVENT_KEY, "fcc_cartel_gil_rush_event_v1");
  const localAvatar = updateEvent(emptyEvent(), { type: "add", player: { id: "stub", name: "Stub Chow", avatarUrl: "/favicon.svg" } });
  assert.equal(parseEvent(JSON.stringify(localAvatar)).players[0].avatarUrl, "/favicon.svg");
});

test("corrupt saves fail closed", () => {
  for (const saved of ["invalid JSON", "null", "[]", JSON.stringify({ current: {}, previous: null, version: 1 })]) assert.throws(() => parseEvent(saved));
  const corruptions: ((event: LocalEvent) => void)[] = [
    (event) => { event.version = 2 as 1; },
    (event) => { event.mood = "green" as "red"; },
    (event) => { event.mood = null; },
    (event) => { event.players = []; },
    (event) => { event.players[1].id = event.players[0].id; },
    (event) => { event.players[1].name = event.players[0].name.toUpperCase(); },
    (event) => { event.players[0].rosterId = "123"; event.players[1].rosterId = "123"; },
    (event) => { event.players[0].name = " Not normalized "; },
    (event) => { event.players[0].avatarUrl = "data:bad"; },
    (event) => { event.round = 0; },
    (event) => { event.round = 1.5; },
    (event) => { event.phase = "setup"; event.round = 2; },
  ];
  for (const corrupt of corruptions) {
    const event = started();
    corrupt(event);
    assert.throws(() => parseEvent(JSON.stringify(event)), /invalid/);
  }
});
