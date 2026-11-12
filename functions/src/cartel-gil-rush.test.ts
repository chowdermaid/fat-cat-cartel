import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emptyGilRushEvent, lockMinorityAssignments, nextMinorityAssignments, readMinorityAssignments, publishTreasureAssignments, nextGilRushEvent, readGilRushEvent, splitPayouts, type GilRushEvent } from "./cartel-gil-rush-model";
import { drawNamazuEffect, drawNamazuTarget, NAMAZU_EFFECTS } from "./cartel-gil-rush-namazu";

const add = (id: string) => ({ type: "add", player: { id, name: id, avatarUrl: null } });
const apply = (event: GilRushEvent, action: unknown) => nextGilRushEvent(event, action, event.revision, () => 0);
const live = () => apply(apply(emptyGilRushEvent(), add("Axo")), { type: "start" });

function minorityDraw(placements: number[]) {
  let event = emptyGilRushEvent();
  placements.forEach((_, index) => { event = apply(event, add(`Player ${index + 1}`)); });
  event = apply(apply(event, { type: "start" }), { type: "start-minigame", kind: "minority-draw" });
  const gameId = event.minigame!.id;
  const choices = placements.map((chest, index) => ({ id: `Player ${index + 1}`, chest }));
  const saved = nextMinorityAssignments(null, event, { gameId, choices }, 0, () => { throw new Error("Minority Draw must not shuffle prizes."); });
  const locked = lockMinorityAssignments(saved, event, gameId);
  const reveal = (current: GilRushEvent, chest: number) => nextGilRushEvent(current, { type: "reveal-minority-chest", gameId, chest }, current.revision, Math.random, locked, 1000 + chest);
  return { event, gameId, choices, saved, locked, reveal };
}

test("Namazu effects occupy eight equal random buckets; player draws use the full roster", () => {
  assert.equal(NAMAZU_EFFECTS.length, 8);
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => drawNamazuEffect(() => (index + 0.5) / 8)), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const effect of [5, 6, 8]) {
    assert.deepEqual([0, 0.4, 0.999].map(value => drawNamazuTarget(effect, ["Axo", "Chow", "Third"], () => value)), ["Axo", "Chow", "Third"]);
  }
  assert.equal(drawNamazuTarget(6, ["Axo"]), null);
  assert.equal(drawNamazuTarget(5, ["Axo"]), "Axo");
  for (const effect of [1, 2, 3, 4, 7]) assert.equal(drawNamazuTarget(effect, ["Axo"], () => { throw new Error("No target draw expected"); }), null);
});

test("Namazu opens once per landing, defers player selection and only effect 3 pays immediately", () => {
  let base = apply(apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow")), { type: "start" });
  for (let effect = 1; effect <= 8; effect++) {
    const opened = nextGilRushEvent(base, { type: "start-namazu", tile: 16 }, base.revision, () => (effect - 0.5) / 8);
    assert.equal(opened.namazu?.effect, effect);
    const expectedPlayers = base.players.map(player => ({ ...player, gilWon: player.gilWon + (effect === 3 ? 50_000 : 0) }));
    assert.deepEqual(opened.players, expectedPlayers);
    assert.equal(opened.namazu!.target, null);
    assert.equal(opened.namazu!.targetDraw, 0);
    assert.equal(opened.namazu!.payout?.perPlayer ?? null, effect === 3 ? 50_000 : null);
    assert.equal(opened.round, base.round);
    assert.equal(opened.minigame, base.minigame);
    assert.deepEqual(readGilRushEvent(JSON.parse(JSON.stringify(opened))), opened);
    assert.throws(() => apply(opened, { type: "start-namazu", tile: 43 }), /Clear/);
    const cleared = apply(opened, { type: "clear-namazu", encounterId: opened.namazu!.id });
    assert.equal(cleared.namazu, null);
    assert.deepEqual(cleared.players, expectedPlayers);
  }
});

test("Namazu rerolls change only the target and reject stale, closed or non-random encounters", () => {
  const base = apply(apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow")), { type: "start" });
  for (const effect of [5, 6, 8]) {
    const opened = nextGilRushEvent(base, { type: "start-namazu", tile: 43 }, base.revision, () => (effect - 0.5) / 8);
    assert.equal(opened.namazu!.target, null);
    const action = { type: "reroll-namazu-target", encounterId: opened.namazu!.id };
    const selected = nextGilRushEvent(opened, action, opened.revision, () => 0);
    assert.equal(selected.namazu!.target, base.players[0].id);
    assert.equal(selected.namazu!.targetDraw, 1);
    const rerolled = nextGilRushEvent(selected, action, selected.revision, () => 0.999);
    assert.equal(rerolled.namazu!.target, base.players[1].id);
    assert.equal(rerolled.namazu!.effect, effect);
    assert.equal(rerolled.namazu!.targetDraw, 2);
    assert.deepEqual(rerolled.players, base.players);
    assert.throws(() => nextGilRushEvent(rerolled, action, opened.revision), /changed/);
    assert.throws(() => apply(rerolled, { ...action, encounterId: 999 }), /no longer active/);
    const closed = apply(rerolled, { type: "clear-namazu", encounterId: opened.namazu!.id });
    assert.throws(() => apply(closed, action), /no longer active/);
  }
  const opened = apply(base, { type: "start-namazu", tile: 63 });
  assert.throws(() => apply(opened, { type: "reroll-namazu-target", encounterId: opened.namazu!.id }), /no player selection/);
  assert.equal(apply(opened, { type: "reset" }).namazu, null);
  assert.equal(readGilRushEvent({ ...base, namazu: undefined }).namazu, null);
  assert.equal(readGilRushEvent(opened, true).namazu, null);
  assert.throws(() => apply(base, { type: "start-namazu", tile: 17 }), /Namazu tile/);
  assert.throws(() => apply(emptyGilRushEvent(), { type: "start-namazu", tile: 16 }), /Start the event/);
  const soloSwap = nextGilRushEvent(live(), { type: "start-namazu", tile: 63 }, live().revision, () => 5.5 / 8);
  assert.equal(soloSwap.namazu!.effect, 6);
  assert.equal(soloSwap.namazu!.target, null);
  assert.deepEqual(readGilRushEvent(soloSwap), soloSwap);
  assert.throws(() => readGilRushEvent({ ...soloSwap, namazu: { ...soloSwap.namazu, effect: 9 } }), /effect/);
});

test("Namazu roll payouts credit everyone once, validate 1-6 and preserve awards after closing", () => {
  const base = apply(apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow")), { type: "start" });
  for (const roll of [1, 6]) {
    const opened = nextGilRushEvent(base, { type: "start-namazu", tile: 63 }, base.revision, () => 6.5 / 8);
    const action = { type: "award-namazu-gil", encounterId: opened.namazu!.id, roll };
    const paid = apply(opened, action);
    assert.deepEqual(paid.players.map(player => player.gilWon), [roll * 10_000, roll * 10_000]);
    assert.deepEqual(paid.namazu!.payout, { perPlayer: roll * 10_000, roll });
    assert.throws(() => apply(paid, action), /already been awarded/);
    assert.throws(() => nextGilRushEvent(paid, action, opened.revision), /changed/);
    assert.deepEqual(apply(paid, { type: "clear-namazu", encounterId: paid.namazu!.id }).players, paid.players);
    for (const invalid of [0, 7, 1.5, NaN, "6"]) assert.throws(() => apply(opened, { ...action, roll: invalid }));
    assert.throws(() => apply(opened, { ...action, encounterId: 999 }), /no longer active/);
  }
  const manual = nextGilRushEvent(base, { type: "start-namazu", tile: 43 }, base.revision, () => 1.5 / 8);
  assert.equal(manual.namazu!.effect, 2);
  assert.deepEqual(manual.players, base.players);
  assert.throws(() => apply(manual, { type: "award-namazu-gil", encounterId: manual.namazu!.id, roll: 1 }), /Only/);
});

test("Namazu rejects payout overflow atomically and does not infer payment for legacy active effects", () => {
  const base = apply(apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow")), { type: "start" });
  const maxed = apply(base, { type: "set-gil", id: "Axo", gilWon: Number.MAX_SAFE_INTEGER });
  const before = JSON.stringify(maxed);
  assert.throws(() => nextGilRushEvent(maxed, { type: "start-namazu", tile: 16 }, maxed.revision, () => 2.5 / 8), /Resulting gil/);
  const opened = nextGilRushEvent(maxed, { type: "start-namazu", tile: 16 }, maxed.revision, () => 6.5 / 8);
  assert.throws(() => apply(opened, { type: "award-namazu-gil", encounterId: opened.namazu!.id, roll: 1 }), /Resulting gil/);
  assert.equal(JSON.stringify(maxed), before);
  const legacy = readGilRushEvent({ ...base, namazu: { id: 7, tile: 16, effect: 3, targetDraw: 0 } });
  assert.equal(legacy.namazu!.payout, null);
  assert.deepEqual(legacy.players, base.players);
});

test("start needs players only; shuffles once and locks participants", () => {
  assert.throws(() => apply(emptyGilRushEvent(), { type: "start" }), /at least one/);
  let event = apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow"));
  const before = JSON.stringify(event);
  const started = apply(event, { type: "start" });
  assert.equal(JSON.stringify(event), before);
  assert.equal(started.minigame, null);
  assert.deepEqual(started.players.map(p => p.id), ["Chow", "Axo"]);
  assert.equal(started.round, 1);
  event = started;
  for (const action of [add("Guest"), { type: "remove", id: "Axo" }, { type: "rename", id: "Axo", name: "New" }, { type: "start" }]) {
    assert.throws(() => apply(event, action), /locked/);
  }
});

test("round and gil stay independent", () => {
  let event = live();
  event = apply(event, { type: "set-gil", id: "Axo", gilWon: 200_000 });
  const players = event.players;
  for (const round of [7, 2, 1, Number.MAX_SAFE_INTEGER]) {
    event = apply(event, { type: "set-round", round });
    assert.deepEqual(event.players, players);
  }
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
  assert.equal("mood" in imported, false);
  assert.ok(!("bonusDie" in imported.players[0]));
  assert.equal(imported.players[0].gilWon, 0);
  assert.doesNotMatch(JSON.stringify(imported), /secret|never-public|privateNote|adminSessionToken/);
  assert.throws(() => apply(imported, { type: "import", event: legacy }), /empty shared event/);
  assert.deepEqual(readGilRushEvent({ version: 1, revision: 9, phase: "setup", round: 1 }), { ...emptyGilRushEvent(), revision: 9 });
});

const twoPlayers = () => apply(apply(apply(emptyGilRushEvent(), add("Axo")), add("Chow")), { type: "start" });

test("retired dice are discarded, old assignment actions fail, and unopened legacy prizes become gil", () => {
  let event = apply(twoPlayers(), { type: "start-minigame", kind: "minority" });
  event = readGilRushEvent({ ...event, players: event.players.map(player => ({ ...player, bonusDie: 10 })) });
  assert.ok(event.players.every(player => !("bonusDie" in player)));
  assert.throws(() => apply(event, { type: "set-bonus-die", id: "Axo", sides: 10 }));
  const gameId = event.minigame!.id;
  const legacy = { gameId, revision: 1, locked: true, choices: [{ id: "Axo", chest: 3 }, { id: "Chow", chest: 4 }], prizes: ["200k", "100k", "golden-dice", "50k"] };
  const assignments = readMinorityAssignments(legacy, event, gameId)!;
  assert.deepEqual(assignments.prizes, ["200k", "100k", "300k", "50k"]);
  const action = { type: "reveal-minority-chest", gameId, chest: 3 };
  const paid = nextGilRushEvent(event, action, event.revision, Math.random, assignments);
  assert.equal(paid.players.find(player => player.id === "Axo")!.gilWon, 300_000);
  assert.throws(() => nextGilRushEvent(paid, action, paid.revision, Math.random, assignments), /no longer/);
  const alreadyOpened = readGilRushEvent({ ...event, minigame: { ...event.minigame, chestReveals: [{ chest: 3, playerIds: ["Axo"], prize: "golden-dice", revealedAt: 0 }] } });
  assert.equal(alreadyOpened.minigame!.chestReveals[0].prize, null);
  assert.ok(alreadyOpened.players.every(player => player.gilWon === 0));
  assert.throws(() => nextGilRushEvent(alreadyOpened, action, alreadyOpened.revision, Math.random, assignments), /no longer/);
});

test("trivia shuffle balances even and odd rosters without moving turn order or awarding gil", () => {
  for (const count of [2, 3, 10, 11, 12]) {
    let event = emptyGilRushEvent();
    for (let index = 0; index < count; index++) event = apply(event, add(String(index)));
    event = apply(apply(event, { type: "start" }), { type: "start-minigame", kind: "trivia" });
    const players = event.players;
    const gameId = event.minigame!.id;
    event = apply(event, { type: "shuffle-trivia", gameId });
    const teams = event.minigame!.teams;
    assert.equal(teams.filter(row => row.team === "A").length, Math.ceil(count / 2));
    assert.equal(teams.filter(row => row.team === "B").length, Math.floor(count / 2));
    assert.equal(new Set(teams.map(row => row.id)).size, count);
    assert.deepEqual(event.players, players);
    assert.equal(event.minigame!.triviaWinnings, null);
    event = apply(event, { type: "shuffle-trivia", gameId });
    assert.deepEqual(event.players, players);
    assert.throws(() => apply(event, { type: "shuffle-trivia", gameId: gameId + 1 }), /no longer active/);
  }
  const solo = apply(live(), { type: "start-minigame", kind: "trivia" });
  assert.throws(() => apply(solo, { type: "shuffle-trivia", gameId: solo.minigame!.id }), /at least two/);
});

test("finalising trivia pays each teammate once, including finished racers, and locks the result", () => {
  let event = apply(apply(apply(twoPlayers(), { type: "reset" }), add("Axo")), add("Chow"));
  event = apply(apply(apply(event, add("Finished Racer")), { type: "start" }), { type: "start-minigame", kind: "trivia" });
  const gameId = event.minigame!.id;
  event = apply(event, { type: "shuffle-trivia", gameId });
  event = apply(event, { type: "set-gil", id: "Axo", gilWon: 50_000 });
  const before = event;
  const action = { type: "finalise-trivia", gameId, winnings: { A: 200_000, B: 100_000 } };
  event = apply(event, action);
  for (const row of event.minigame!.teams) {
    assert.equal(event.players.find(player => player.id === row.id)!.gilWon, before.players.find(player => player.id === row.id)!.gilWon + action.winnings[row.team]);
  }
  assert.deepEqual(event.minigame!.triviaWinnings, action.winnings);
  assert.throws(() => apply(event, action), /already finalised/);
  assert.throws(() => apply(event, { type: "shuffle-trivia", gameId }), /already finalised/);
  assert.throws(() => nextGilRushEvent(event, action, before.revision), /another host/);
  const ended = apply(event, { type: "end-minigame" });
  assert.deepEqual(ended.players, event.players);
  const another = apply(ended, { type: "start-minigame", kind: "trivia" });
  assert.throws(() => apply(another, action), /no longer active/);
});

test("trivia finalisation validates both amounts and teams and rejects unsafe payouts atomically", () => {
  let event = apply(twoPlayers(), { type: "start-minigame", kind: "trivia" });
  const gameId = event.minigame!.id;
  const action = { type: "finalise-trivia", gameId, winnings: { A: 10, B: 0 } };
  assert.throws(() => apply(event, action), /Shuffle players/);
  event = apply(event, { type: "shuffle-trivia", gameId });
  for (const value of [-1, 1.2, "100", undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const team of ["A", "B"]) assert.throws(() => apply(event, { ...action, winnings: { ...action.winnings, [team]: value } }));
  }
  assert.throws(() => apply(event, { ...action, winnings: null }));
  assert.throws(() => apply(event, { ...action, gameId: gameId + 1 }), /no longer active/);
  const maxed = apply(event, { type: "set-gil", id: event.minigame!.teams[0].id, gilWon: Number.MAX_SAFE_INTEGER });
  const snapshot = JSON.stringify(maxed);
  assert.throws(() => apply(maxed, { ...action, winnings: { A: 1, B: 1 } }), /Resulting gil/);
  assert.equal(JSON.stringify(maxed), snapshot);
  const zero = apply(event, { ...action, winnings: { A: 0, B: 0 } });
  assert.deepEqual(zero.players, event.players);
  assert.throws(() => apply(zero, action), /already finalised/);
  const nonTrivia = apply(twoPlayers(), { type: "start-minigame", kind: "minority" });
  assert.throws(() => apply(nonTrivia, { ...action, gameId: nonTrivia.minigame!.id }), /Start Group Trivia/);
  assert.throws(() => apply(emptyGilRushEvent(), action), /Start/);
  for (const type of ["set-trivia-team", "set-trivia-winner"]) assert.throws(() => apply(event, { type, id: "Axo", team: "A", question: 0 }));
});

test("legacy question payouts load as already finalised to avoid paying them twice", () => {
  const event = apply(twoPlayers(), { type: "start-minigame", kind: "trivia" });
  const legacy = { ...event, minigame: { ...event.minigame, teams: [{ id: "Axo", team: "A" }, { id: "Chow", team: "B" }], questionWins: { "2": "A" } } };
  assert.deepEqual(event.minigame!.questionWins, [null, null, null, null, null]);
  const loaded = readGilRushEvent(legacy);
  assert.deepEqual(loaded.minigame!.questionWins, [null, null, "A", null, null]);
  assert.deepEqual(loaded.minigame!.triviaWinnings, { A: 100_000, B: 0 });
  assert.throws(() => apply(loaded, { type: "finalise-trivia", gameId: loaded.minigame!.id, winnings: { A: 100_000, B: 0 } }), /already finalised/);
  const fiveQuestions = readGilRushEvent({ ...legacy, minigame: { ...legacy.minigame, questionWins: { "2": "A", "3": "A", "4": "B" } } });
  assert.deepEqual(fiveQuestions.minigame!.questionWins, [null, null, "A", "A", "B"]);
  assert.deepEqual(fiveQuestions.minigame!.triviaWinnings, { A: 200_000, B: 100_000 });
  for (const questionWins of [{ "5": "A" }, Array(6).fill(null), "A", { unknown: "A" }]) assert.throws(() => readGilRushEvent({ ...legacy, minigame: { ...legacy.minigame, questionWins } }));
  assert.deepEqual(readGilRushEvent({ ...loaded, minigame: { ...loaded.minigame, triviaWinnings: { A: 0, B: 0 } } }).minigame!.triviaWinnings, { A: 0, B: 0 });
});

test("Treasure Draw publishes all players but only the selected chest prize", () => {
  let event = apply(twoPlayers(), { type: "start-minigame", kind: "minority" });
  const gameId = event.minigame!.id;
  const input = { gameId, choices: [{ id: "Axo", chest: 2 }, { id: "Chow", chest: 4 }], prizes: ["300k", "200k", "100k", "50k"] };
  const saved = nextMinorityAssignments(null, event, input, 0, () => 0.999);
  assert.equal(event.minigame!.chestReveals.length, 0);
  assert.equal(event.minigame!.chests, null);
  assert.deepEqual(readMinorityAssignments(saved, event, gameId), saved);
  const reveal = { type: "reveal-minority-chest", gameId, chest: 2 };
  assert.throws(() => nextGilRushEvent(event, reveal, event.revision), /Save and lock/);
  const locked = lockMinorityAssignments(saved, event, gameId);
  assert.throws(() => nextMinorityAssignments(locked, event, input, locked.revision), /locked/);
  event = nextGilRushEvent(event, reveal, event.revision, Math.random, locked, 1000);
  assert.deepEqual(event.minigame!.chestReveals, [{ chest: 2, playerIds: ["Axo"], prize: "200k", revealedAt: 1000 }]);
  assert.equal(event.minigame!.chests, null);
  assert.deepEqual(event.minigame!.treasureAssignments, { revision: saved.revision, choices: saved.choices });
  assert.doesNotMatch(JSON.stringify(event.minigame), /300k|100k|50k|prizes/);
  assert.throws(() => nextGilRushEvent(event, reveal, event.revision, Math.random, locked), /no longer/);
  assert.throws(() => nextMinorityAssignments(saved, event, input, saved.revision), /locked/);
  for (const chest of [1, 3, 4]) event = nextGilRushEvent(event, { ...reveal, chest }, event.revision, Math.random, locked, 2000);
  assert.equal(event.minigame!.chestReveals.length, 4);
  assert.deepEqual(event.minigame!.chestReveals.find(row => row.chest === 1)!.playerIds, []);
  assert.equal(event.players.find(player => player.id === "Axo")!.gilWon, 200_000);
  assert.equal(event.players.find(player => player.id === "Chow")!.gilWon, 50_000);
  assert.ok(event.players.every(player => !("bonusDie" in player)));
});

test("Treasure Draw assignment publication is prize-free, monotonic and recovers interrupted saves", () => {
  const initial = apply(twoPlayers(), { type: "start-minigame", kind: "minority" });
  const gameId = initial.minigame!.id;
  const first = nextMinorityAssignments(null, initial, { gameId, choices: [{ id: "Axo", chest: 1 }, { id: "Chow", chest: 4 }] }, 0);
  const second = nextMinorityAssignments(first, initial, { gameId, choices: [{ id: "Axo", chest: 2 }, { id: "Chow", chest: 4 }] }, 1);
  const published = publishTreasureAssignments(initial, second);
  assert.equal(published.revision, initial.revision + 1);
  assert.deepEqual(published.players, initial.players);
  assert.deepEqual(published.minigame!.chestReveals, []);
  assert.deepEqual(published.minigame!.treasureAssignments, { revision: 2, choices: second.choices });
  assert.doesNotMatch(JSON.stringify(published), /prizes|200k|100k|golden-dice|50k|locked/);
  assert.deepEqual(publishTreasureAssignments(published, first), published);
  assert.deepEqual(publishTreasureAssignments(published, second), published);
  const locked = lockMinorityAssignments(second, initial, gameId);
  const revealed = nextGilRushEvent(initial, { type: "reveal-minority-chest", gameId, chest: 2 }, initial.revision, Math.random, locked);
  assert.deepEqual(revealed.minigame!.treasureAssignments, published.minigame!.treasureAssignments);
  assert.deepEqual(publishTreasureAssignments(revealed, first), revealed);
  const poisoned = { ...published, minigame: { ...published.minigame!, treasureAssignments: { ...published.minigame!.treasureAssignments!, prizes: first.prizes, choices: second.choices.map(choice => ({ ...choice, prize: first.prizes[0] })) } } };
  assert.deepEqual(readGilRushEvent(poisoned), published);
  assert.throws(() => publishTreasureAssignments(apply(published, { type: "end-minigame" }), second), /no longer active/);
  const draw = minorityDraw([1, 2]);
  assert.throws(() => publishTreasureAssignments(draw.event, draw.saved), /Treasure Draw/);
  assert.equal(readGilRushEvent({ ...draw.event, minigame: { ...draw.event.minigame, treasureAssignments: published.minigame!.treasureAssignments } }).minigame!.treasureAssignments, undefined);
});

test("minority private saves reject stale hosts and invalid assignments/prizes; old games cannot overwrite new ones", () => {
  const event = apply(twoPlayers(), { type: "start-minigame", kind: "minority" });
  const gameId = event.minigame!.id;
  const input = { gameId, choices: [{ id: "Axo", chest: 2 }, { id: "Chow", chest: 4 }], prizes: ["300k", "200k", "100k", "50k"] };
  for (const choices of [[], [{ id: "Axo", chest: 1 }], [{ id: "Axo", chest: 1 }, { id: "Axo", chest: 2 }], [{ id: "Axo", chest: 5 }, { id: "Chow", chest: 1 }], [{ id: "unknown", chest: 1 }, { id: "Chow", chest: 2 }]]) assert.throws(() => nextMinorityAssignments(null, event, { ...input, choices }, 0));
  for (const prizes of [[], ["300k", "300k", "100k", "50k"], ["nope", "200k", "100k", "50k"]]) assert.throws(() => readMinorityAssignments({ gameId, revision: 1, locked: false, choices: input.choices, prizes }, event, gameId));
  const saved = nextMinorityAssignments(null, event, input, 0, () => 0.999);
  assert.throws(() => nextMinorityAssignments(saved, event, input, 0), /another host/);
  const next = nextMinorityAssignments(saved, event, { ...input, choices: [{ id: "Axo", chest: 1 }, { id: "Chow", chest: 4 }] }, 1);
  assert.equal(next.revision, 2);
  assert.deepEqual(next.prizes, saved.prizes);
  const shuffled = nextMinorityAssignments(null, event, input, 0, () => 0);
  assert.notDeepEqual(shuffled.prizes, input.prizes);
  assert.deepEqual([...shuffled.prizes].sort(), [...input.prizes].sort());
  assert.throws(() => nextMinorityAssignments({ ...saved, gameId: gameId + 1 }, event, input, 0), /newer minigame/);
  const locked = lockMinorityAssignments(saved, event, gameId);
  for (const chest of [0, 5, 1.5]) assert.throws(() => nextGilRushEvent(event, { type: "reveal-minority-chest", gameId, chest }, event.revision, Math.random, locked));
  assert.throws(() => nextGilRushEvent(event, { type: "reveal-minority-chest", gameId: gameId + 1, chest: 1 }, event.revision, Math.random, locked), /no longer active/);
  const later = apply(apply(event, { type: "end-minigame" }), { type: "start-minigame", kind: "minority" });
  assert.equal(readMinorityAssignments(saved, later, later.minigame!.id), null);
  assert.throws(() => apply(event, { type: "reveal-minority", gameId, choices: input.choices }));
});

test("Split or Steal opens a public challenge, hides decisions until reveal and awards each outcome once", () => {
  for (const [first, second, payouts] of [["split", "split", [100_000, 100_000]], ["steal", "split", [200_000, 0]], ["split", "steal", [0, 200_000]], ["steal", "steal", [0, 0]]] as const) {
    const start = twoPlayers();
    let event = apply(start, { type: "start-split" });
    assert.deepEqual(event.splitChallenge, { id: event.revision, challenger: null, partner: null });
    assert.equal(event.splitResult, null);
    assert.throws(() => apply(event, { type: "start-split" }), /Clear the previous/);
    const challengeId = event.splitChallenge!.id;
    event = apply(event, { type: "set-split-players", challengeId, challenger: "Axo", partner: "Chow", challengerDecision: first });
    assert.doesNotMatch(JSON.stringify(event), /challengerDecision|partnerDecision/);
    assert.deepEqual(event.players.map(player => player.gilWon), [0, 0]);
    const action = { type: "reveal-split", challengeId, challengerDecision: first, partnerDecision: second };
    event = apply(event, action);
    assert.deepEqual(splitPayouts(event.splitResult!), payouts);
    assert.deepEqual([event.players.find(p => p.id === "Axo")!.gilWon, event.players.find(p => p.id === "Chow")!.gilWon], payouts);
    assert.throws(() => apply(event, action), /Clear the previous/);
    event = apply(event, { type: "clear-split" });
    assert.equal(event.splitResult, null);
    assert.equal(event.splitChallenge, null);
    assert.throws(() => apply(event, action), /no longer active/);
    event = apply(event, { type: "start-split" });
    const nextId = event.splitChallenge!.id;
    assert.throws(() => apply(event, { type: "set-split-players", challengeId: nextId, challenger: "Axo", partner: "Chow" }), /already chosen/);
    event = apply(event, { type: "set-split-players", challengeId: nextId, challenger: "Chow", partner: "Axo" });
    event = apply(event, { ...action, challengeId: nextId });
    assert.equal(event.splitPartners.length, 2);
    assert.throws(() => nextGilRushEvent(event, action, start.revision), /another host/);
    const reset = apply(event, { type: "reset" });
    assert.deepEqual(reset.splitPartners, []);
    assert.equal(reset.splitResult, null);
    assert.equal(reset.splitChallenge, null);
  }
});

test("Split or Steal rejects missing players, invalid decisions and old challenge IDs; cancelling is unpaid", () => {
  assert.throws(() => apply(live(), { type: "start-split" }), /at least two/);
  assert.throws(() => apply(emptyGilRushEvent(), { type: "start-split" }), /Start/);
  let event = apply(twoPlayers(), { type: "start-split" });
  const challengeId = event.splitChallenge!.id;
  const action = { type: "reveal-split", challengeId, challengerDecision: "split", partnerDecision: "steal" };
  assert.throws(() => apply(event, action), /Choose both/);
  for (const pair of [{ challenger: "Axo", partner: "Axo" }, { challenger: "Axo", partner: "unknown" }, { challenger: null, partner: "Chow" }]) assert.throws(() => apply(event, { type: "set-split-players", challengeId, ...pair }));
  assert.throws(() => apply(event, { type: "set-split-players", challengeId: challengeId + 1, challenger: "Axo", partner: "Chow" }), /no longer active/);
  event = apply(event, { type: "set-split-players", challengeId, challenger: "Axo", partner: null });
  assert.throws(() => apply(event, action), /Choose both/);
  event = apply(event, { type: "set-split-players", challengeId, challenger: "Axo", partner: "Chow" });
  assert.throws(() => apply(event, { type: "set-split-players", challengeId }), /explicitly clear/);
  for (const extra of [{ challengerDecision: null }, { partnerDecision: "" }, { challengeId: challengeId + 1 }]) assert.throws(() => apply(event, { ...action, ...extra }));
  const maxed = apply(event, { type: "set-gil", id: "Chow", gilWon: Number.MAX_SAFE_INTEGER });
  assert.throws(() => apply(maxed, action), /Resulting gil/);
  const cancelled = apply(event, { type: "clear-split" });
  assert.deepEqual(cancelled.players, event.players);
  assert.deepEqual(cancelled.splitPartners, []);
  const another = apply(cancelled, { type: "start-split" });
  assert.throws(() => apply(another, action), /no longer active/);
});

test("new minigames validate kind and phase; older snapshots discard moods and do not invent hidden assignments", () => {
  assert.throws(() => apply(live(), { type: "start-minigame", kind: "unknown" }));
  assert.throws(() => apply(emptyGilRushEvent(), { type: "start-minigame", kind: "trivia" }), /Start/);
  const event = apply(live(), { type: "start-minigame", kind: "deathroll" });
  assert.throws(() => apply(event, { type: "start-minigame", kind: "trivia" }), /End the current/);
  const old = readGilRushEvent({ version: 1, revision: 3, phase: "live", players: [{ id: "a", name: "A", gilWon: 5 }], round: 4, mood: "red", privateChoices: [{ id: "a", chest: 4 }] });
  assert.equal(old.minigame, null);
  assert.ok(!("bonusDie" in old.players[0]));
  assert.doesNotMatch(JSON.stringify(old), /mood|privateChoices/);
});

test("all four cash chests pay every recipient once and reject overflow atomically", () => {
  let event = emptyGilRushEvent();
  for (const id of ["Axo", "Chow", "Finished", "Cash", "Fifty", "AlsoCash"]) event = apply(event, add(id));
  event = apply(apply(event, { type: "start" }), { type: "start-minigame", kind: "minority" });
  event = apply(event, { type: "set-gil", id: "Axo", gilWon: 50_000 });
  const gameId = event.minigame!.id;
  const saved = nextMinorityAssignments(null, event, { gameId, choices: [{ id: "Axo", chest: 1 }, { id: "Chow", chest: 1 }, { id: "Finished", chest: 2 }, { id: "Cash", chest: 3 }, { id: "Fifty", chest: 4 }, { id: "AlsoCash", chest: 3 }] }, 0, () => 0.999);
  assert.deepEqual(saved.prizes, ["300k", "200k", "100k", "50k"]);
  const locked = lockMinorityAssignments(saved, event, gameId);
  const maxed = apply(event, { type: "set-gil", id: "Chow", gilWon: Number.MAX_SAFE_INTEGER });
  const before = JSON.stringify(maxed);
  assert.throws(() => nextGilRushEvent(maxed, { type: "reveal-minority-chest", gameId, chest: 1 }, maxed.revision, Math.random, locked), /Resulting gil/);
  assert.equal(JSON.stringify(maxed), before);
  for (const chest of [1, 2, 3, 4]) {
    const action = { type: "reveal-minority-chest", gameId, chest };
    event = nextGilRushEvent(event, action, event.revision, Math.random, locked);
    assert.throws(() => nextGilRushEvent(event, action, event.revision, Math.random, locked), /no longer/);
  }
  const totals = event.players.map(player => ({ Axo: 350_000, Chow: 300_000, Finished: 200_000, Cash: 100_000, Fifty: 50_000, AlsoCash: 100_000 })[player.id]);
  assert.deepEqual(event.players.map(player => player.gilWon), totals);
  assert.ok(event.players.every(player => !("bonusDie" in player)));
  event = apply(event, { type: "end-minigame" });
  event = apply(event, { type: "start-minigame", kind: "trivia" });
  assert.deepEqual(event.players.map(player => player.gilWon), totals);
});

test("Minority Draw privately validates exactly three chests without random prizes", () => {
  const { event, saved, gameId, choices } = minorityDraw([1, 2, 3]);
  assert.equal(event.minigame!.minorityDrawWinner, null);
  assert.deepEqual(saved.prizes, []);
  assert.deepEqual(readMinorityAssignments({ ...saved, prizes: undefined }, event, gameId), saved);
  assert.throws(() => nextMinorityAssignments(null, event, { gameId, choices: choices.map((choice, index) => index === 0 ? { ...choice, chest: 4 } : choice) }, 0), /three chests/);
  assert.throws(() => readMinorityAssignments({ ...saved, prizes: ["300k", "200k", "100k", "50k"] }, event, gameId), /does not use random/);
  assert.deepEqual(event.minigame!.chestReveals, []);
  assert.equal(event.minigame!.chests, null);
});

test("Minority Draw excludes empty chests and awards the whole smallest group only after all reveals", () => {
  const fixture = minorityDraw([1, 1, 1, 2, 2]);
  let event = fixture.event;
  const order = event.players.map(player => player.id);
  event = apply(event, { type: "set-gil", id: "Player 4", gilWon: 50_000 });
  event = fixture.reveal(event, 2);
  assert.doesNotMatch(JSON.stringify(event.minigame), /Player 1|Player 2|Player 3/);
  assert.equal(event.minigame!.minorityDrawWinner, null);
  assert.equal(event.players.find(player => player.id === "Player 4")!.gilWon, 50_000);
  event = fixture.reveal(event, 1);
  assert.ok(event.players.every(player => !("bonusDie" in player)));
  assert.throws(() => apply(event, { type: "resolve-minority-draw", gameId: fixture.gameId, chest: 2 }), /all three/);
  event = fixture.reveal(event, 3);
  assert.equal(event.minigame!.minorityDrawWinner, 2);
  assert.deepEqual(event.players.map(player => player.id), order);
  for (const player of event.players) {
    const winner = ["Player 4", "Player 5"].includes(player.id);
    assert.equal(player.gilWon, player.id === "Player 4" ? 350_000 : winner ? 300_000 : 0);
    assert.ok(!("bonusDie" in player));
  }
  assert.deepEqual(readGilRushEvent(event), event);
  assert.throws(() => fixture.reveal(event, 3), /no longer available/);
  assert.throws(() => apply(event, { type: "resolve-minority-draw", gameId: fixture.gameId, chest: 2 }), /already awarded/);
  assert.throws(() => readGilRushEvent({ ...event, minigame: { ...event.minigame, minorityDrawWinner: 3 } }), /Winning chest/);
  const next = apply(apply(event, { type: "end-minigame" }), { type: "start-minigame", kind: "trivia" });
  assert.ok(next.players.every(player => !("bonusDie" in player)));
  assert.deepEqual(next.players.map(player => player.gilWon), event.players.map(player => player.gilWon));
});

test("Minority Draw ties wait for Chow's champion deathroll and only allow one eligible winning chest", () => {
  for (const placements of [[1, 2, 3], [1, 1, 2, 2, 3, 3, 3], [1, 2]]) {
    const fixture = minorityDraw(placements);
    let event = fixture.event;
    for (const chest of [1, 2, 3]) event = fixture.reveal(event, chest);
    assert.equal(event.minigame!.minorityDrawWinner, null);
    assert.ok(event.players.every(player => player.gilWon === 0 && !("bonusDie" in player)));
    const action = { type: "resolve-minority-draw", gameId: fixture.gameId, chest: 1 };
    if (placements.length !== 3) assert.throws(() => apply(event, { ...action, chest: 3 }), /tied least-selected occupied/);
    assert.throws(() => apply(event, { ...action, chest: 4 }), /tied least-selected occupied/);
    assert.throws(() => apply(event, { ...action, gameId: fixture.gameId + 1 }), /no longer active/);
    const revision = event.revision;
    event = apply(event, action);
    assert.equal(event.minigame!.minorityDrawWinner, 1);
    event.players.forEach(player => {
      const winner = fixture.choices.some(choice => choice.id === player.id && choice.chest === 1);
      assert.equal(player.gilWon, winner ? 300_000 : 0);
      assert.ok(!("bonusDie" in player));
    });
    assert.throws(() => nextGilRushEvent(event, action, revision), /another host/);
    assert.throws(() => apply(event, { ...action, chest: 2 }), /already awarded/);
  }
});

test("Minority Draw payout overflow rejects the whole final reveal or deathroll result", () => {
  for (const placements of [[1, 2, 2], [1, 2]]) {
    const fixture = minorityDraw(placements);
    let event = apply(fixture.event, { type: "set-gil", id: "Player 1", gilWon: Number.MAX_SAFE_INTEGER });
    event = fixture.reveal(fixture.reveal(event, 1), 2);
    if (placements.length === 2) event = fixture.reveal(event, 3);
    const before = JSON.stringify(event);
    const action = placements.length === 2 ? { type: "resolve-minority-draw", gameId: fixture.gameId, chest: 1 } : { type: "reveal-minority-chest", gameId: fixture.gameId, chest: 3 };
    assert.throws(() => nextGilRushEvent(event, action, event.revision, Math.random, fixture.locked), /Resulting gil/);
    assert.equal(JSON.stringify(event), before);
    assert.equal(event.minigame!.minorityDrawWinner, null);
    assert.ok(event.players.every(player => !("bonusDie" in player)));
    event = apply(event, { type: "set-gil", id: "Player 1", gilWon: 0 });
    event = nextGilRushEvent(event, action, event.revision, Math.random, fixture.locked);
    assert.equal(event.players.find(player => player.id === "Player 1")!.gilWon, 300_000);
    assert.ok(!("bonusDie" in event.players.find(player => player.id === "Player 1")!));
  }
});
