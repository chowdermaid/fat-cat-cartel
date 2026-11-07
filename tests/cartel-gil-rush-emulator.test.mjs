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

test("internal reads verify live roles and the real character link; the invited viewer cannot host", { skip: !enabled, timeout: 30_000 }, async () => {
  assert.deepEqual(readCallable.__endpoint.region, ["asia-southeast1"]);
  const read = data => readCallable.run({ data: { adminSessionToken: token, afterRevision: null, ...data } });
  await assert.rejects(read({ adminSessionToken: "" }), error => error.code === "unauthenticated");
  await session(true);
  await assert.rejects(read(), error => error.code === "unauthenticated");
  await session();
  await admin.database().ref(path).set({ version: 1, revision: 7, phase: "setup", round: 1, players: [] });
  for (const role of ["test-boss", "test-underpaw"]) {
    roles = [role];
    assert.equal((await read()).event.revision, 7);
  }
  roles = ["test-member"];
  await assert.rejects(read({ lodestoneId: "51550870", isAdmin: true, isMember: true }), error => error.code === "permission-denied");
  await admin.database().ref(`adminSessions/${hash}`).update({ lodestoneId: "51550870", isAdmin: true });
  await assert.rejects(read(), error => error.code === "permission-denied");
  await session(false, "51550870");
  assert.equal((await read()).event.revision, 7);
  for (const endpoint of [callable, legacyCallable]) {
    for (const action of [{ type: "reset" }, { type: "load-minority-assignments", gameId: 7 }]) {
      await assert.rejects(endpoint.run({ data: { adminSessionToken: token, action, expectedRevision: 7 } }), error => error.code === "permission-denied");
    }
  }
  roles = [];
  await assert.rejects(read(), error => error.code === "permission-denied");
  roles = ["test-member"];
  await admin.database().ref("discordLinks/test-user").set({ lodestoneId: "test-player" });
  await assert.rejects(read(), error => error.code === "permission-denied");
  await session(false, "51550870");
  await admin.database().ref("members/51550870").remove();
  await assert.rejects(read());
  assert.equal((await admin.database().ref(path).get()).val().revision, 7);
});

test("private live reads wait for changes, time out without a snapshot and reject malformed revisions", { skip: !enabled, timeout: 30_000 }, async () => {
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
      { type: "set-bonus-die", id: "player", sides: 10 },
      { type: "set-gil", id: "player", gilWon: 200_000 },
    ]) result = await call(action, result.event.revision);
  }
  const before = (await admin.database().ref(path).get()).val();
  const actions = [
    { type: "set-round", round: 99 },
    { type: "set-bonus-die", id: "player", sides: null },
    { type: "set-gil", id: "player", gilWon: 999_999 },
    { type: "load-minority-assignments", gameId: 1 },
    { type: "save-minority-assignments", gameId: 1, choices: [], prizes: [] },
    { type: "reveal-minority-chest", gameId: 1, chest: 1 },
    { type: "resolve-minority-draw", gameId: 1, chest: 1 },
    { type: "start-split" },
    { type: "set-split-players", challengeId: 1, challenger: "player", partner: null },
    { type: "reveal-split", challengeId: 1, challengerDecision: "split", partnerDecision: "steal" },
    { type: "clear-split" },
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
  const assignments = { type: "save-minority-assignments", gameId, choices: [{ id: "a", chest: 2 }, { id: "b", chest: 4 }], prizes: ["200k", "100k", "golden-dice", "50k"] };
  let privateResult = await call(assignments, 0);
  assert.equal(privateResult.assignments.revision, 1);
  const publicBefore = (await admin.database().ref(path).get()).val();
  assert.equal(publicBefore.revision, result.event.revision + 1);
  assert.deepEqual(publicBefore.minigame.treasureAssignments, { revision: 1, choices: assignments.choices });
  assert.deepEqual(publicBefore.players.map(player => player.gilWon), [0, 0]);
  assert.equal(publicBefore.minigame.chests, undefined);
  assert.equal(publicBefore.minigame.chestReveals, undefined);
  assert.doesNotMatch(JSON.stringify(publicBefore.minigame), /prizes|200k|100k|golden-dice|50k/);
  const saves = await Promise.allSettled([call(assignments, 1), call(assignments, 1)]);
  assert.equal(saves.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(saves.filter(item => item.status === "rejected").length, 1);
  privateResult = await call({ type: "load-minority-assignments", gameId }, 0);
  assert.equal(privateResult.assignments.revision, 2);
  const prizeMap = privateResult.assignments.prizes;
  const cashChest = prizeMap.findIndex(prize => prize !== "golden-dice") + 1;
  const goldenChest = prizeMap.indexOf("golden-dice") + 1;
  privateResult = await call({ ...assignments, choices: [{ id: "a", chest: cashChest }, { id: "b", chest: goldenChest }] }, 2);
  assert.deepEqual(privateResult.assignments.prizes, prizeMap);
  // Simulate a private save whose public publication was interrupted.
  await admin.database().ref(path + "/minigame/treasureAssignments").remove();
  const interruptedRevision = (await admin.database().ref(path).get()).val().revision;
  await call({ type: "load-minority-assignments", gameId });
  const recovered = (await admin.database().ref(path).get()).val();
  assert.equal(recovered.revision, interruptedRevision + 1);
  assert.deepEqual(recovered.minigame.treasureAssignments, { revision: 3, choices: privateResult.assignments.choices });
  assert.doesNotMatch(JSON.stringify(recovered.minigame), /prizes|200k|100k|golden-dice|50k/);
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
  const cashAmount = { "200k": 200_000, "100k": 100_000, "50k": 50_000 }[prizeMap[cashChest - 1]];
  assert.equal(result.event.players.find(player => player.id === "a").gilWon, cashAmount);
  assert.deepEqual(result.event.minigame.treasureAssignments.choices, privateResult.assignments.choices);
  assert.equal(result.event.players.find(player => player.id === "b").gilWon, 0);
  assert.equal(result.event.minigame.chestReveals.length, 1);
  await assert.rejects(call(reveal, result.event.revision), /no longer/);
  await assert.rejects(call(assignments, 2), /locked/);
  await step({ ...reveal, chest: goldenChest });
  assert.equal(result.event.players.find(player => player.id === "b").bonusDie, 10);
  const emptyChest = [1, 2, 3, 4].find(chest => chest !== cashChest && chest !== goldenChest);
  await step({ ...reveal, chest: emptyChest });
  assert.deepEqual(result.event.minigame.chestReveals.find(row => row.chest === emptyChest).playerIds ?? [], []);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
  assert.equal(result.event.players.find(player => player.id === "b").bonusDie, 10);
  await step({ type: "start-minigame", kind: "deathroll" });
  assert.equal(result.event.players.find(player => player.id === "b").bonusDie, undefined);
  await step({ type: "end-minigame" });
  for (const id of ["a", "b"]) await step({ type: "set-gil", id, gilWon: 0 });
  await step({ type: "set-bonus-die", id: "a", sides: 10 });
  await step({ type: "set-bonus-die", id: "a", sides: null });
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
  assert.ok(result.event.players.every(player => player.gilWon === 0 && !player.bonusDie));
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 1 }, result.event.revision), /all three/);
  await assert.rejects(call({ type: "save-minority-assignments", gameId, choices }, saved.assignments.revision), /locked/);
  await step({ type: "reveal-minority-chest", gameId, chest: 2 });
  await step({ type: "reveal-minority-chest", gameId, chest: 3 });
  assert.equal(result.event.minigame.minorityDrawWinner, undefined);
  assert.ok(result.event.players.every(player => player.gilWon === 0 && !player.bonusDie));
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
    assert.equal(player.gilWon, wins ? 200_000 : 0);
    assert.equal(player.bonusDie, wins ? 10 : undefined);
  }
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: winner }, result.event.revision), /already awarded/);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
  for (const id of ["a", "b"]) await step({ type: "set-gil", id, gilWon: 0 });
  await step({ type: "start-minigame", kind: "minority-draw" });
  assert.ok(result.event.players.every(player => !player.bonusDie));
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
  assert.ok(result.event.players.every(player => player.gilWon === 200_000 && player.bonusDie === 10));
  await assert.rejects(call({ type: "resolve-minority-draw", gameId, chest: 2 }, result.event.revision), /already awarded/);
  await step({ type: "end-minigame" });
  assert.equal((await admin.database().ref("cartelGilRushPrivate/current").get()).exists(), false);
});
