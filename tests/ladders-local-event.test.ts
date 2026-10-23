import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyEvent, parseEvent, updateEvent } from "../src/features/ladders-and-backstabbers/utils/localEvent.ts";

function attendees(count: number) {
  let history = emptyEvent();
  for (let index = 0; index < count; index++) history = updateEvent(history, { type: "add", id: `person-${index}`, name: `Player ${index}` });
  return history;
}

function started(count = 6) {
  return updateEvent(updateEvent(attendees(count), { type: "shuffle" }, () => 0), { type: "start" }, () => 0);
}

test("pairing assigns every attendee exactly once, with one trio for odd attendance", () => {
  for (let count = 2; count <= 15; count++) {
    const history = updateEvent(attendees(count), { type: "shuffle" }, () => 0.4);
    const crews = history.current.crews;
    const members = crews.flatMap((crew) => crew.memberIds);
    assert.equal(members.length, count);
    assert.equal(new Set(members).size, count);
    assert.equal(crews.filter((crew) => crew.memberIds.length === 3).length, count % 2);
    assert.ok(crews.every((crew) => [2, 3].includes(crew.memberIds.length)));
    assert.deepEqual(new Set(members), new Set(history.current.attendees.map((person) => person.id)));
  }
  assert.throws(() => updateEvent(attendees(1), { type: "shuffle" }), /at least two/);
});

test("names are normalized, duplicates rejected and editing invalidates an unconfirmed preview", () => {
  let history = updateEvent(emptyEvent(), { type: "add", id: "a", name: "  Chow   Meow " });
  assert.equal(history.current.attendees[0].name, "Chow Meow");
  assert.throws(() => updateEvent(history, { type: "add", id: "b", name: "chow meow" }), /already on the list/);
  assert.throws(() => updateEvent(history, { type: "add", id: "b", name: "  " }), /Enter a character name/);
  history = updateEvent(history, { type: "add", id: "b", name: "Axo" });
  history = updateEvent(history, { type: "shuffle" });
  assert.throws(() => updateEvent(history, { type: "rename", id: "b", name: "CHOW MEOW" }), /already on the list/);
  assert.equal(updateEvent(history, { type: "rename", id: "b", name: "Axo" }), history);
  const edited = updateEvent(history, { type: "rename", id: "b", name: "Axo Meow" });
  assert.equal(edited.current.phase, "setup");
  assert.deepEqual(edited.current.crews, []);
});

test("preview swaps preserve crew sizes and confirmation locks all pairing changes", () => {
  const preview = updateEvent(attendees(5), { type: "shuffle" }, () => 0);
  const first = preview.current.crews[0].memberIds[0];
  const second = preview.current.crews[1].memberIds[0];
  const swapped = updateEvent(preview, { type: "swap", first, second });
  assert.equal(swapped.current.crews[0].memberIds[0], second);
  assert.equal(swapped.current.crews[1].memberIds[0], first);
  assert.deepEqual(swapped.current.crews.map((crew) => crew.memberIds.length), [2, 3]);
  const live = updateEvent(swapped, { type: "start" });
  assert.throws(() => updateEvent(live, { type: "shuffle" }), /cannot be reshuffled/);
  assert.throws(() => updateEvent(live, { type: "swap", first, second }), /only available/);
  assert.throws(() => updateEvent(live, { type: "add", id: "new", name: "New" }), /locked/);
  assert.throws(() => updateEvent(live, { type: "remove", id: first }), /locked/);
  assert.throws(() => updateEvent(live, { type: "rename", id: first, name: "New" }), /locked/);
  assert.throws(() => updateEvent(live, { type: "start" }), /Preview pairings/);
});

test("starting deals one card each, duplicates across crews allowed, hands cap at two distinct cards", () => {
  const live = started();
  assert.ok(live.current.crews.every((crew) => crew.hand.length === 1 && crew.hand[0] === "Tall Poppy"));
  const crewId = live.current.crews[0].id;
  const dealt = updateEvent(live, { type: "deal", crewId }, () => 0);
  assert.deepEqual(dealt.current.crews[0].hand, ["Tall Poppy", "Cut the Brakes"]);
  assert.throws(() => updateEvent(dealt, { type: "deal", crewId }), /already holds two/);
  const discarded = updateEvent(dealt, { type: "discard", crewId, card: "Tall Poppy" });
  assert.deepEqual(discarded.current.crews[0].hand, ["Cut the Brakes"]);
  assert.deepEqual(updateEvent(discarded, { type: "undo" }).current, dealt.current);
  assert.throws(() => updateEvent(discarded, { type: "discard", crewId, card: "Tall Poppy" }), /no longer holds/);
  assert.deepEqual(dealt.current.crews[0].hand, ["Tall Poppy", "Cut the Brakes"]);
  assert.throws(() => updateEvent(attendees(2), { type: "deal", crewId }), /Confirm crews/);
});

test("refresh restores phase, hands and one undo; reset is undoable", () => {
  const live = started(7);
  const reset = updateEvent(live, { type: "reset" });
  const restored = parseEvent(JSON.stringify(reset));
  assert.deepEqual(restored.current, emptyEvent().current);
  const undone = updateEvent(restored, { type: "undo" });
  assert.deepEqual(undone.current, live.current);
  assert.equal(undone.previous, null);
  assert.deepEqual(parseEvent(JSON.stringify(live)), live);
});

test("invalid stored versions, duplicate membership and unknown or duplicate cards fail closed", () => {
  assert.throws(() => parseEvent("invalid JSON"));
  assert.throws(() => parseEvent(JSON.stringify({ ...emptyEvent(), version: 2 })));
  for (const corrupt of [
    (history: ReturnType<typeof started>) => { history.current.crews[0].hand = ["Unknown"]; },
    (history: ReturnType<typeof started>) => { history.current.crews[0].hand = ["Tall Poppy", "Tall Poppy"]; },
    (history: ReturnType<typeof started>) => { history.current.crews[0].memberIds[0] = history.current.crews[1].memberIds[0]; },
    (history: ReturnType<typeof started>) => { history.current.attendees[0].name = history.current.attendees[1].name; },
  ]) {
    const history = started();
    corrupt(history);
    assert.throws(() => parseEvent(JSON.stringify(history)), /invalid/);
  }
});
