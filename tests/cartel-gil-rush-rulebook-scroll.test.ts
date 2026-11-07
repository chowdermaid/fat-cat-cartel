import assert from "node:assert/strict";
import { test } from "node:test";
import { getActiveChapter, getChapterScrollTop } from "../src/features/cartel-gil-rush/utils/rulebookScroll.ts";

const positions = [
  { id: "board-overview", top: 16 },
  { id: "quick-start", top: 800 },
  { id: "special-tiles", top: 1600 },
  { id: "group-minigames", top: 2400 },
  { id: "bingo", top: 3200 },
  { id: "rewards", top: 4000 },
] as const;

test("reading position selects chapters at the 24px boundary, in either direction", () => {
  assert.equal(getActiveChapter(positions, 0, 600, 4800), "board-overview");
  assert.equal(getActiveChapter(positions, 775, 600, 4800), "board-overview");
  assert.equal(getActiveChapter(positions, 776, 600, 4800), "quick-start");
  assert.equal(getActiveChapter(positions, 2500, 600, 4800), "group-minigames");
  assert.equal(getActiveChapter(positions, 1700, 600, 4800), "special-tiles");
  assert.equal(getActiveChapter([], 0, 600, 4800), "board-overview");
});

test("bottom selects the last chapter even when it cannot reach the top", () => {
  assert.equal(getActiveChapter(positions, 3799, 600, 4400), "rewards");
  assert.equal(getActiveChapter(positions, 0, 5000, 4800), "board-overview");
});

test("navigation leaves 16px above headings and stays within the reading pane", () => {
  assert.equal(getChapterScrollTop(800, 600, 4000), 784);
  assert.equal(getChapterScrollTop(0, 600, 4000), 0);
  assert.equal(getChapterScrollTop(3900, 600, 4000), 3400);
  assert.equal(getChapterScrollTop(200, 1000, 500), 0);
});

test("reading space lets Group minigames, Bingo and Rewards activate separately", () => {
  const viewportHeight = 1200, scrollHeight = 5184;
  const moodTop = getChapterScrollTop(2400, viewportHeight, scrollHeight);
  const bingoTop = getChapterScrollTop(3200, viewportHeight, scrollHeight);
  const rewardsTop = getChapterScrollTop(4000, viewportHeight, scrollHeight);
  assert.equal(moodTop, 2384);
  assert.equal(getActiveChapter(positions, moodTop, viewportHeight, scrollHeight), "group-minigames");
  assert.equal(bingoTop, 3184);
  assert.equal(getActiveChapter(positions, bingoTop, viewportHeight, scrollHeight), "bingo");
  assert.equal(rewardsTop, 3984);
  assert.equal(getActiveChapter(positions, rewardsTop, viewportHeight, scrollHeight), "rewards");
});
