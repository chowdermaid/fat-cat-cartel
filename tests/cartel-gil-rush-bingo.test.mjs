import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
  plugins: [{ name: "bingo-local-only", enforce: "pre", load(id) {
    if (/\/(useAdminAuth|sharedEvent|firebase|db)\.[tj]sx?$/.test(id.replaceAll("\\", "/"))) throw new Error("Bingo must not load auth or Firebase modules");
  } }],
});
const { generateBingoCard, readBingoCard, toggleBingoMission, bingoReward } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/bingo.ts");
const { bingoMissions, BINGO_EVENT_ID } = await server.ssrLoadModule("/src/features/cartel-gil-rush/constants.ts");
const { BingoCard } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/bingo/BingoCard.tsx");
after(() => server.close());

test("cards use nine distinct missions from the exact 18-mission pool, including all added movement outcomes", () => {
  const expected = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 24, 25, 27];
  assert.deepEqual(bingoMissions.map(mission => mission.id), expected);
  const seen = new Set(), orders = new Set();
  let seed = 7531;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let index = 0; index < 500; index++) {
    const card = generateBingoCard(BINGO_EVENT_ID, random);
    assert.equal(card.missionIds.length, 9);
    assert.equal(new Set(card.missionIds).size, 9);
    assert.ok(card.missionIds.every(id => expected.includes(id)));
    assert.ok(!card.missionIds.includes(4));
    assert.deepEqual(card.completedIds, []);
    card.missionIds.forEach(id => seen.add(id));
    orders.add(card.missionIds.join(","));
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), expected);
  assert.equal(orders.size, 500);
});

test("saved card validation preserves grid order and completion, rejecting malformed, old-event and removed missions", () => {
  const card = generateBingoCard(BINGO_EVENT_ID, () => 0.3);
  card.completedIds = [card.missionIds[8], card.missionIds[0]];
  assert.deepEqual(readBingoCard(JSON.stringify(card)), card);
  assert.equal(readBingoCard(JSON.stringify(card), "next-event"), null);
  assert.equal(generateBingoCard("next-event").eventId, "next-event");
  const invalid = [
    null, "", "not json", "null", "[]", "{}",
    ...[
      { ...card, version: 2 }, { ...card, eventId: "old-event" },
      { ...card, missionIds: card.missionIds.slice(1) },
      { ...card, missionIds: [4, ...card.missionIds.slice(1)] },
      { ...card, missionIds: [card.missionIds[1], ...card.missionIds.slice(1)] },
      { ...card, missionIds: card.missionIds.map(String) },
      { ...card, completedIds: [4] }, { ...card, completedIds: [card.missionIds[0], card.missionIds[0]] },
      { ...card, completedIds: null }, { ...card, completedIds: ["1"] },
    ].map(JSON.stringify),
  ];
  for (const raw of invalid) assert.equal(readBingoCard(raw), null, String(raw));
});

test("missions toggle both ways without changing the card; payouts use completion count, never bingo lines", () => {
  let card = generateBingoCard();
  const ids = [...card.missionIds];
  const initial = card;
  card = toggleBingoMission(card, ids[4]);
  assert.deepEqual(initial.completedIds, []);
  assert.deepEqual(card.completedIds, [ids[4]]);
  card = toggleBingoMission(card, ids[4]);
  assert.deepEqual(card.completedIds, []);
  assert.equal(toggleBingoMission(card, 4), card);
  for (const index of [0, 4, 7]) card = toggleBingoMission(card, ids[index]);
  assert.equal(bingoReward(card.completedIds.length), 250_000);
  assert.deepEqual(card.missionIds, ids);
  for (const [count, reward] of [[0, 0], [2, 0], [3, 250_000], [5, 250_000], [6, 500_000], [8, 500_000], [9, 1_000_000]]) assert.equal(bingoReward(count), reward);
});

test("the public card has nine accessible toggle buttons, three reward tiers and no auth or event controls", () => {
  const card = generateBingoCard(BINGO_EVENT_ID, () => 0.5);
  card.completedIds = card.missionIds.slice(0, 3);
  const html = renderToStaticMarkup(createElement(BingoCard, { bingo: { card, storageUnavailable: false, toggle() {} } }));
  assert.equal((html.match(/data-bingo-mission=/g) ?? []).length, 9);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 6);
  for (const id of card.missionIds) assert.ok(html.includes(bingoMissions.find(mission => mission.id === id).text));
  for (const text of ["3 of 9 complete", "End-of-event reward", "3+ lines", "6+ lines", "9 lines", "250k gil", "500k gil", "1m gil", "Tick and screenshot to Chow at the end of the event"]) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /Guide|Reset|Event options|Log in|Loading|line-clamp|truncate|No reward|Any missions count/);
  const rewards = html.slice(html.indexOf('aria-label="End-of-event reward"'));
  assert.equal((rewards.match(/lucide-coins/g) ?? []).length, 3);
  const failed = renderToStaticMarkup(createElement(BingoCard, { bingo: { card, storageUnavailable: true, toggle() {} } }));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Progress cannot be saved/);
  assert.equal((failed.match(/data-bingo-mission=/g) ?? []).length, 9);
});
