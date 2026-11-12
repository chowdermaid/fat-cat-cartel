import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const enabled = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
const require = createRequire(new URL("../functions/package.json", import.meta.url));
let admin, callable, legacyCallable, readCallable;
const originalFetch = globalThis.fetch;
let roles = ["test-boss"];

if (enabled) {
  process.env.FIREBASE_DATABASE_URL = "https://demo-fat-cat-cartel-default-rtdb.firebaseio.com";
  process.env.DISCORD_GUILD_ID = "test-guild";
  process.env.DISCORD_ADMIN_ROLE_IDS = "test-boss,test-underpaw";
  process.env.DISCORD_MEMBER_ROLE_IDS = "test-member";
  process.env.DISCORD_BOT_TOKEN = "test-token";
  admin = require("firebase-admin");
  const functions = require("./lib/index.js");
  callable = functions.mutateCartelGilRushEventAsia;
  legacyCallable = functions.mutateCartelGilRushEvent;
  readCallable = functions.readCartelGilRushEvent;
  globalThis.fetch = async (url, ...args) => {
    if (String(url).startsWith("https://discord.com/api/")) return new Response(JSON.stringify({ roles }), { status: 200 });
    return originalFetch(url, ...args);
  };
}
after(async () => { globalThis.fetch = originalFetch; if (enabled) await Promise.all(admin.apps.map(app => app.delete())); });

const token = "gil-rush-emulator-test-session-token-000000000000000000";
const hash = createHash("sha256").update(token).digest("hex");
const path = "events/cartelGilRush/current";
async function session(expired = false, lodestoneId = "test-player") {
  await admin.database().ref(`adminSessions/${hash}`).set({ discordUserId: "test-user", expiresAt: expired ? 1 : Date.now() + 60_000, lastSeenAt: Date.now() });
  await admin.database().ref("discordLinks/test-user").set({ lodestoneId });
  await admin.database().ref(`members/${lodestoneId}`).set({ name: "Host", fcRank: "Boss" });
}
const call = (action, expectedRevision, adminSessionToken = token) => callable.run({ data: { adminSessionToken, action, expectedRevision } });

test("public compatibility reads require no session while both mutation regions remain host-only", { skip: !enabled, timeout: 30_000 }, async () => {
  assert.deepEqual(readCallable.__endpoint.region, ["asia-southeast1"]);
  await admin.database().ref(path).set({ version: 1, revision: 7, phase: "setup", round: 1, players: [] });
  await admin.database().ref("cartelGilRushPrivate/current").set({ gameId: 7, choices: [{ id: "a", chest: 1 }], prizes: ["300k"] });
  for (const data of [{}, { adminSessionToken: "" }, { adminSessionToken: "invalid", isAdmin: true }]) {
    const result = await readCallable.run({ data });
    assert.equal(result.event.revision, 7);
    assert.doesNotMatch(JSON.stringify(result), /choices|prizes|adminSessionToken/);
  }
  roles = ["test-member"];
  await session(false, "test-player");
  for (const endpoint of [callable, legacyCallable]) {
    for (const action of [{ type: "reset" }, { type: "load-minority-assignments", gameId: 7 }]) {
      await assert.rejects(endpoint.run({ data: { action, expectedRevision: 7 } }), error => error.code === "unauthenticated");
      await assert.rejects(endpoint.run({ data: { adminSessionToken: token, action, expectedRevision: 7 } }), error => error.code === "permission-denied");
    }
  }
  assert.equal((await admin.database().ref(path).get()).val().revision, 7);
});

test("compatibility live reads wait for changes, time out without a snapshot and reject malformed revisions", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  await admin.database().ref(path).set({ version: 1, revision: 8, phase: "setup", round: 1, players: [] });
  const { waitForGilRushEvent } = require("./lib/cartel-gil-rush.js");
  assert.equal(await waitForGilRushEvent(8, 10), null);
  const pending = readCallable.run({ data: { adminSessionToken: token, afterRevision: 8 } });
  await admin.database().ref(`${path}/revision`).set(9);
  assert.equal((await pending).event.revision, 9);
  await assert.rejects(readCallable.run({ data: { adminSessionToken: token, afterRevision: "9" } }), error => error.code === "invalid-argument");
});

test("real callable authorizes sessions and transactions reject concurrent/stale hosts", { skip: !enabled, timeout: 30_000 }, async () => {
  assert.deepEqual(callable.__endpoint.region, ["asia-southeast1"]);
  assert.deepEqual(legacyCallable.__endpoint.region, ["us-central1"]);
  await admin.database().ref(path).remove();
  await assert.rejects(call({ type: "reset" }, 0, ""), error => error.code === "unauthenticated");
  await session(true);
  await assert.rejects(call({ type: "reset" }, 0), error => error.code === "unauthenticated");
  await session();
  roles = ["test-member"];
  await assert.rejects(call({ type: "reset" }, 0), error => error.code === "permission-denied");
  assert.equal((await admin.database().ref(path).get()).exists(), false);
  roles = ["test-underpaw"];
  const added = await call({ type: "add", player: { id: "player", name: "Long Guest Name", avatarUrl: null } }, 0);
  assert.equal(added.event.revision, 1);
  const races = await Promise.allSettled([call({ type: "start" }, 1), legacyCallable.run({ data: { adminSessionToken: token, action: { type: "start" }, expectedRevision: 1 } })]);
  assert.equal(races.filter(result => result.status === "fulfilled").length, 1, JSON.stringify(races));
  assert.equal(races.filter(result => result.status === "rejected").length, 1);
  assert.equal((await admin.database().ref(path).get()).val().revision, 2);
  const gil = await call({ type: "set-gil", id: "player", gilWon: 200_000 }, 2);
  assert.equal(gil.event.players[0].gilWon, 200_000);
  await assert.rejects(call({ type: "set-gil", id: "player", gilWon: 1 }, 2), error => error.code === "aborted");
  const reset = await call({ type: "reset" }, 3);
  assert.equal(reset.event.revision, 4);
  await assert.rejects(call({ type: "import", event: added.event }, 3), error => error.code === "aborted");
  assert.equal((await admin.database().ref(path).get()).val().revision, 4);
  await assert.rejects(call({ type: "set-gil", id: "player", gilWon: 10 }, 4));
});

test("every live field requires a current Boss/Underpaw role, ignoring client and cached privilege claims", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  await admin.database().ref(path).remove();
  let result = await call({ type: "add", player: { id: "player", name: "Live Player", avatarUrl: null } }, 0);
  result = await call({ type: "start" }, result.event.revision);
  for (const role of ["test-boss", "test-underpaw"]) {
    roles = [role];
    for (const action of [
      { type: "set-round", round: 5 },
      { type: "set-gil", id: "player", gilWon: 200_000 },
    ]) result = await call(action, result.event.revision);
  }
  const before = (await admin.database().ref(path).get()).val();
  const actions = [
    { type: "set-round", round: 99 },
    { type: "set-gil", id: "player", gilWon: 999_999 },
    { type: "load-minority-assignments", gameId: 1 },
    { type: "save-minority-assignments", gameId: 1, choices: [], prizes: [] },
    { type: "reveal-minority-chest", gameId: 1, chest: 1 },
    { type: "resolve-minority-draw", gameId: 1, chest: 1 },
    { type: "start-split" },
    { type: "set-split-players", challengeId: 1, challenger: "player", partner: null },
    { type: "reveal-split", challengeId: 1, challengerDecision: "split", partnerDecision: "steal" },
    { type: "clear-split" },
    { type: "start-namazu", tile: 16 },
    { type: "reroll-namazu-target", encounterId: 1 },
    { type: "award-namazu-gil", encounterId: 1, roll: 6 },
    { type: "clear-namazu", encounterId: 1 },
    { type: "shuffle-trivia", gameId: 1 },
    { type: "finalise-trivia", gameId: 1, winnings: { A: 100_000, B: 0 } },
    { type: "reset" },
  ];
  for (const action of actions) {
    await assert.rejects(call(action, before.revision, ""), error => error.code === "unauthenticated");
  }
  await session(true);
  for (const action of actions) {
    await assert.rejects(call(action, before.revision), error => error.code === "unauthenticated");
  }
  await session();
  // Existing admin session remains cached after the host loses the live Discord role.
  await admin.database().ref(`adminSessions/${hash}`).update({ isAdmin: true, roleIds: ["test-boss"], fcRank: "Boss" });
  for (const liveRoles of [["test-member"], [], ["test-discord-administrator"]]) {
    roles = liveRoles;
    for (const action of actions) {
      await assert.rejects(callable.run({ data: {
        adminSessionToken: token, action, expectedRevision: before.revision,
        isAdmin: true, fcRank: "Boss", roleIds: ["test-boss"],
      } }), error => error.code === "permission-denied");
    }
  }
  assert.deepEqual((await admin.database().ref(path).get()).val(), before);
});

test("minigame results round-trip through RTDB, including trivia finalisation and one-time reveals", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  await admin.database().ref(path).remove();
  let result = await call({ type: "add", player: { id: "a", name: "Axo", avatarUrl: null } }, 0);
  const step = async action => { result = await call(action, result.event.revision); return result.event; };
  await step({ type: "add", player: { id: "b", name: "Chow", avatarUrl: null } });
  await step({ type: "start" });
  await step({ type: "start-minigame", kind: "trivia" });
  const triviaId = result.event.minigame.id;
  await step({ type: "shuffle-trivia", gameId: triviaId });
  assert.equal(result.event.minigame.teams.length, 2);
  assert.deepEqual(result.event.players.map(player => player.gilWon), [0, 0]);
  const finalise = { type: "finalise-trivia", gameId: triviaId, winnings: { A: 100_000, B: 0 } };
  const finalisations = await Promise.allSettled([call(finalise, result.event.revision), call(finalise, result.event.revision)]);
  const committed = finalisations.filter(item => item.status === "fulfilled");
  assert.equal(committed.length, 1);
  assert.equal(finalisations.filter(item => item.status === "rejected").length, 1);
  result = committed[0].value;
  const winningId = result.event.minigame.teams.find(row => row.team === "A").id;
  assert.equal(result.event.players.find(player => player.id === winningId).gilWon, 100_000);
  assert.deepEqual(result.event.minigame.triviaWinnings, { A: 100_000, B: 0 });
  await assert.rejects(call(finalise, result.event.revision), /already finalised/);
  // Reset totals to isolate the remaining minigame payout checks.
  for (const id of ["a", "b"]) await step({ type: "set-gil", id, gilWon: 0 });
  await step({ type: "end-minigame" });
  await step({ type: "start-minigame", kind: "minority" });
  const gameId = result.event.minigame.id;
  const assignments = { type: "save-minority-assignments", gameId, choices: [{ id: "a", chest: 2 }, { id: "b", chest: 4 }], prizes: ["300k", "200k", "100k", "50k"] };
  let privateResult = await call(assignments, 0);
  assert.equal(privateResult.assignments.revision, 1);
  const publicBefore = (await admin.database().ref(path).get()).val();
  assert.equal(publicBefore.revision, result.event.revision + 1);
  assert.deepEqual(publicBefore.minigame.treasureAssignments, { revision: 1, choices: assignments.choices });
  assert.deepEqual(publicBefore.players.map(player => player.gilWon), [0, 0]);
  assert.equal(publicBefore.minigame.chests, undefined);
  assert.equal(publicBefore.minigame.chestReveals, undefined);
  assert.doesNotMatch(JSON.stringify(publicBefore.minigame), /prizes|300k|200k|100k|50k/);
  const saves = await Promise.allSettled([call(assignments, 1), call(assignments, 1)]);
  assert.equal(saves.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(saves.filter(item => item.status === "rejected").length, 1);
  privateResult = await call({ type: "load-minority-assignments", gameId }, 0);
  assert.equal(privateResult.assignments.revision, 2);
  const prizeMap = privateResult.assignments.prizes;
  const cashChest = prizeMap.indexOf("200k") + 1;
  const largestChest = prizeMap.indexOf("300k") + 1;
  privateResult = await call({ ...assignments, choices: [{ id: "a", chest: cashChest }, { id: "b", chest: largestChest }] }, 2);
  assert.deepEqual(privateResult.assignments.prizes, prizeMap);
  // Simulate a private save whose public publication was interrupted.
  await admin.database().ref(path + "/minigame/treasureAssignments").remove();
  const interruptedRevision = (await admin.database().ref(path).get()).val().revision;
  await call({ type: "load-minority-assignments", gameId });
  const recovered = (await admin.database().ref(path).get()).val();
  assert.equal(recovered.revision, interruptedRevision + 1);
  assert.deepEqual(recovered.minigame.treasureAssignments, { revision: 3, choices: privateResult.assignments.choices });
  assert.doesNotMatch(JSON.stringify(recovered.minigame), /prizes|300k|200k|100k|50k/);
  await call({ type: "load-minority-assignments", gameId });
  assert.equal((await admin.database().ref(path).get()).val().revision, recovered.revision);
  roles = ["test-member"];
  await assert.rejects(call({ type: "load-minority-assignments", gameId }, 0), error => error.code === "permission-denied");
  roles = ["test-boss"];
  result = { event: (await admin.database().ref(path).get()).val() };
  assert.deepEqual(result.event.minigame.treasureAssignments, { revision: 3, choices: privateResult.assignments.choices });
  const reveal = { type: "reveal-minority-chest", gameId, chest: cashChest };
  const chestRaces = await Promise.allSettled([call(reveal, result.event.revision), call(reveal, result.event.revision)]);
  const chestCommit = chestRaces.filter(item => item.status === "fulfilled");
  assert.equal(chestCommit.length, 1);
  assert.equal(chestRaces.filter(item => item.status === "rejected").length, 1);
  result = chestCommit[0].value;
  assert.deepEqual(result.event.minigame.chestReveals[0].playerIds, ["a"]);
  assert.equal(result.event.minigame.chestReveals[0].prize, prizeMap[cashChest - 1]);
  const cashAmount = { "300k": 300_000, "200k": 200_000, "100k": 100_000, "50k": 50_000 }[prizeMap[cashChest - 1]];
  assert.equal(result.event.players.find(player => player.id === "a").gilWon, cashAmount);
  assert.deepEqual(result.event.minigame.treasureAssignments.choices, privateResult.assignments.choices);
  assert.equal(result.event.players.find(player => player.id === "b").gilWon, 0);
  assert.equal(result.event.minigame.chestReveals.length, 1);
  await assert.rejects(call(reveal, result.event.revision), /no longer/);
  await assert.rejects(call(assignments, 2), /locked/);
  await step({ ...reveal, chest: largestChest });
  assert.equal(result.event.players.find(player => player.id === "b").gilWon, 300_000);
  const emptyChest = [1, 2, 3, 4].find(chest => chest !== cashChest && chest !== largestChest);
  await step({ ...reveal, chest: emptyChest });
  assert.deepEqual(result.event.minigame.chestReveals.find(row => row.chest === emptyChest).playerIds ?? [], []);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
  assert.equal(result.event.players.find(player => player.id === "b").gilWon, 300_000);
  await step({ type: "start-minigame", kind: "deathroll" });
  assert.equal(result.event.players.find(player => player.id === "b").bonusDie, undefined);
  await step({ type: "end-minigame" });
  for (const id of ["a", "b"]) await step({ type: "set-gil", id, gilWon: 0 });
  assert.equal(result.event.players.find(p => p.id === "a").bonusDie, undefined);
  await step({ type: "start-split" });
  const challengeId = result.event.splitChallenge.id;
  assert.equal(result.event.splitResult, undefined);
  await step({ type: "set-split-players", challengeId, challenger: "a", partner: "b" });
  const beforeReveal = (await admin.database().ref(path).get()).val();
  assert.equal(beforeReveal.splitResult, undefined);
  assert.doesNotMatch(JSON.stringify(beforeReveal.splitChallenge), /Decision/);
  const revealSplit = { type: "reveal-split", challengeId, challengerDecision: "steal", partnerDecision: "split" };
  const splits = await Promise.allSettled([call(revealSplit, result.event.revision), call(revealSplit, result.event.revision)]);
  const committedSplit = splits.filter(item => item.status === "fulfilled");
  assert.equal(committedSplit.length, 1);
  result = committedSplit[0].value;
  assert.equal(result.event.players.find(p => p.id === "a").gilWon, 200_000);
  const publicResult = (await admin.database().ref(path).get()).val().splitResult;
  assert.equal(publicResult.challengerDecision, "steal");
  assert.equal(publicResult.partnerDecision, "split");
  await step({ type: "clear-split" });
  assert.equal(result.event.splitChallenge, undefined);
  await step({ type: "start-split" });
  await assert.rejects(call({ type: "set-split-players", challengeId: result.event.splitChallenge.id, challenger: "a", partner: "b" }, result.event.revision), /already chosen/);

});


test("Minority Draw keeps choices private and atomically settles unique and deathroll winners", { skip: !enabled, timeout: 30_000 }, async () => {
  await session();
  roles = ["test-boss"];
  await admin.database().ref(path).remove();
  await admin.database().ref("cartelGilRushPrivate/current").remove();
  let result = { event: { revision: 0 } };
  const step = async action => { result = await call(action, result.event.revision); return result; };
  for (const id of ["a", "b"]) await step({ type: "add", player: { id, name: id, avatarUrl: null } });
  await step({ type: "start" });
  await step({ type: "start-minigame", kind: "minority-draw" });
  let gameId = result.event.minigame.id;
  const choices = [{ id: "a", chest: 1 }, { id: "b", chest: 2 }];
  let saved = await call({ type: "save-minority-assignments", gameId, choices }, 0);
  assert.deepEqual(saved.assignments.prizes, []);
  assert.equal(saved.assignments.locked, false);
  const loaded = await call({ type: "load-minority-assignments", gameId }, 0);
  assert.deepEqual(loaded.assignments.prizes, [], "RTDB-omitted empty prizes normalise correctly");
  const before = (await admin.database().ref(path).get()).val();
  assert.equal(before.minigame.chestReveals, undefined);
  assert.equal(before.minigame.chests, undefined);
  assert.doesNotMatch(JSON.stringify(before.minigame), /choices|prizes|playerIds/);
  await assert.rejects(call({ type: "reveal-minority-chest", gameId, chest: 4 }, result.event.revision), /three chests/);
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).val().locked, false);
  await step({ type: "reveal-minority-chest", gameId, chest: 1 });
  assert.doesNotMatch(JSON.stringify(result.event.minigame), /"b"/);
  assert.ok(result.event.players.every(player => player.gilWon === 0 && !("bonusDie" in player)));
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 1 }, result.event.revision), /all three/);
  await assert.rejects(call({ type: "save-minority-assignments", gameId, choices }, saved.assignments.revision), /locked/);
  await step({ type: "reveal-minority-chest", gameId, chest: 2 });
  await step({ type: "reveal-minority-chest", gameId, chest: 3 });
  assert.equal(result.event.minigame.minorityDrawWinner, undefined);
  assert.ok(result.event.players.every(player => player.gilWon === 0 && !("bonusDie" in player)));
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 3 }, result.event.revision), /tied least-selected occupied/);
  roles = ["test-member"];
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 1 }, result.event.revision), error => error.code === "permission-denied");
  roles = ["test-boss"];
  const race = await Promise.allSettled([1, 2].map(chest => call({ type: "resolve-minority-draw", gameId, chest }, result.event.revision)));
  assert.equal(race.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(race.filter(item => item.status === "rejected").length, 1);
  result = race.find(item => item.status === "fulfilled").value;
  const winner = result.event.minigame.minorityDrawWinner;
  for (const player of result.event.players) {
    const wins = player.id === (winner === 1 ? "a" : "b");
    assert.equal(player.gilWon, wins ? 300_000 : 0);
    assert.ok(!("bonusDie" in player));
  }
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: winner }, result.event.revision), /already awarded/);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
  for (const id of ["a", "b"]) await step({ type: "set-gil", id, gilWon: 0 });
  await step({ type: "start-minigame", kind: "minority-draw" });
  assert.ok(result.event.players.every(player => !("bonusDie" in player)));
  gameId = result.event.minigame.id;
  saved = await call({ type: "save-minority-assignments", gameId, choices: [{ id: "a", chest: 2 }, { id: "b", chest: 2 }] }, 0);
  assert.deepEqual(saved.assignments.prizes, []);
  await step({ type: "reveal-minority-chest", gameId, chest: 1 });
  await step({ type: "reveal-minority-chest", gameId, chest: 2 });
  assert.ok(result.event.players.every(player => player.gilWon === 0));
  const unique = await Promise.allSettled([1, 2].map(() => call({ type: "reveal-minority-chest", gameId, chest: 3 }, result.event.revision)));
  assert.equal(unique.filter(item => item.status === "fulfilled").length, 1);
  result = unique.find(item => item.status === "fulfilled").value;
  assert.equal(result.event.minigame.minorityDrawWinner, 2);
  assert.ok(result.event.players.every(player => player.gilWon === 300_000 && !("bonusDie" in player)));
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 2 }, result.event.revision), /already awarded/);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
});


test("Namazu round-trips once per encounter, defers targets and retains any flat-gil award", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  await admin.database().ref(path).remove();
  let result = await call({ type: "add", player: { id: "a", name: "Axo", avatarUrl: null } }, 0);
  const step = async action => { result = await call(action, result.event.revision); return result.event; };
  await step({ type: "add", player: { id: "b", name: "Chow", avatarUrl: null } });
  await step({ type: "start" });
  await step({ type: "set-gil", id: "a", gilWon: 123_000 });
  const before = result.event.players;
  const race = await Promise.allSettled([call({ type: "start-namazu", tile: 16 }, result.event.revision), call({ type: "start-namazu", tile: 43 }, result.event.revision)]);
  const committed = race.filter(row => row.status === "fulfilled");
  assert.equal(committed.length, 1);
  result = committed[0].value;
  const encounter = result.event.namazu;
  assert.ok(encounter.effect >= 1 && encounter.effect <= 8);
  const expectedPlayers = before.map(player => ({ ...player, gilWon: player.gilWon + (encounter.effect === 3 ? 50_000 : 0) }));
  assert.deepEqual(result.event.players, expectedPlayers);
  assert.equal(encounter.target, undefined);
  assert.equal(encounter.targetDraw, 0);
  const read = await readCallable.run({ data: { adminSessionToken: token, afterRevision: null } });
  assert.equal(read.event.namazu.effect, encounter.effect);
  assert.equal(read.event.namazu.target, null);
  assert.equal(read.event.namazu.payout?.perPlayer ?? null, encounter.effect === 3 ? 50_000 : null);
  await assert.rejects(call({ type: "start-namazu", tile: 63 }, result.event.revision));
  if ([5, 6, 8].includes(encounter.effect)) {
    await step({ type: "reroll-namazu-target", encounterId: encounter.id });
    assert.equal(result.event.namazu.effect, encounter.effect);
    assert.equal(result.event.namazu.targetDraw, 1);
    assert.deepEqual(result.event.players, expectedPlayers);
  }
  roles = ["test-member"];
  await session(false, "51550870");
  assert.equal((await readCallable.run({ data: { adminSessionToken: token } })).event.namazu.id, encounter.id);
  for (const action of [{ type: "start-namazu", tile: 16 }, { type: "reroll-namazu-target", encounterId: encounter.id }, { type: "award-namazu-gil", encounterId: encounter.id, roll: 6 }, { type: "clear-namazu", encounterId: encounter.id }]) {
    await assert.rejects(call(action, result.event.revision), error => error.code === "permission-denied");
  }
  roles = ["test-boss"];
  await session();
  await step({ type: "clear-namazu", encounterId: encounter.id });
  assert.equal(result.event.namazu, undefined);
  assert.deepEqual(result.event.players, expectedPlayers);
  await assert.rejects(call({ type: "reroll-namazu-target", encounterId: encounter.id }, result.event.revision));
});


test("Namazu payouts are atomic across both regional hosts and never repeat on read or retry", { skip: !enabled, timeout: 30_000 }, async () => {
  roles = ["test-boss"];
  await session();
  const seed = { version: 1, revision: 100, phase: "live", round: 6, players: [
    { id: "a", name: "Axo", avatarUrl: null, gilWon: 123_000 },
    { id: "b", name: "Chow", avatarUrl: null, gilWon: 456_000 },
  ] };
  await admin.database().ref(path).set(seed);
  const random = Math.random;
  let flat;
  try {
    Math.random = () => 2.5 / 8;
    flat = await Promise.allSettled([
      call({ type: "start-namazu", tile: 16 }, 100),
      legacyCallable.run({ data: { adminSessionToken: token, action: { type: "start-namazu", tile: 16 }, expectedRevision: 100 } }),
    ]);
  } finally { Math.random = random; }
  assert.equal(flat.filter(row => row.status === "fulfilled").length, 1);
  let saved = (await admin.database().ref(path).get()).val();
  assert.equal(saved.namazu.effect, 3);
  assert.deepEqual(saved.players.map(player => player.gilWon), [173_000, 506_000]);
  await readCallable.run({ data: { adminSessionToken: token } });
  assert.deepEqual((await admin.database().ref(path).get()).val().players, saved.players);
  await admin.database().ref(path).set({ ...seed, namazu: { id: 99, tile: 43, effect: 7, targetDraw: 0 } });
  const action = { type: "award-namazu-gil", encounterId: 99, roll: 3 };
  const race = await Promise.allSettled([
    call(action, 100),
    legacyCallable.run({ data: { adminSessionToken: token, action, expectedRevision: 100 } }),
  ]);
  assert.equal(race.filter(row => row.status === "fulfilled").length, 1);
  saved = (await admin.database().ref(path).get()).val();
  assert.deepEqual(saved.players.map(player => player.gilWon), [153_000, 486_000]);
  assert.equal(saved.namazu.payout.roll, 3);
  assert.equal(saved.namazu.payout.perPlayer, 30_000);
  await assert.rejects(call(action, saved.revision), error => error.code === "invalid-argument");
  const read = await readCallable.run({ data: { adminSessionToken: token } });
  assert.equal(read.event.namazu.payout.perPlayer, 30_000);
  assert.deepEqual(read.event.players.map(player => player.gilWon), [153_000, 486_000]);
  await call({ type: "clear-namazu", encounterId: 99 }, saved.revision);
  assert.deepEqual((await admin.database().ref(path).get()).val().players.map(player => player.gilWon), [153_000, 486_000]);
});
