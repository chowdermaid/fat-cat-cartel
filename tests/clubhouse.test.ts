import { CLUBHOUSE_HATS, getClubhouseHat } from "../src/features/home/utils/clubhouseHats.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUBHOUSE } from "../src/features/home/constants.ts";
import {
  chooseClubhousePoint, clubhouseTravelMs, getClubhouseBounds, reconcileClubhouse,
  replaceClubhouseMember, replacementCandidate, shuffleMembers, toScenePoint,
  getClubhouseFootprint, getClubhouseHatCorners,
  getClubhouseGeometry, isInsideClubhousePolygon, clampClubhousePoint,
} from "../src/features/home/utils/clubhouse.ts";
import { stubGet, stubRef } from "../src/lib/db.stub.ts";

const roster = (count: number) => Array.from({ length: count }, (_, i) => String(i + 1));
const none = new Set<string>();
const empty = () => ({ visible: [] as string[], waiting: [] as string[] });

for (const count of [0, 1, 10, 15, 20]) {
  test(`roster of ${count}: bounded, unique, complete membership`, () => {
    const ids = roster(count);
    const queue = reconcileClubhouse(empty(), ids, 15, none);
    assert.equal(queue.visible.length, Math.min(15, count));
    assert.equal(new Set([...queue.visible, ...queue.waiting]).size, count);
    if (count <= 15) assert.equal(replacementCandidate(queue, none), undefined);
  });
}

test("every waiting member gets a turn before an outgoing member repeats", () => {
  for (const limit of [6, 10, 15]) {
    const ids = roster(20);
    let queue = reconcileClubhouse(empty(), ids, limit, none);
    const seen = new Set(queue.visible);
    for (let turn = 0; turn < 20 - limit; turn++) {
      const before = queue.visible;
      const candidate = replacementCandidate(queue, none)!;
      queue = replaceClubhouseMember(queue, candidate);
      const incoming = queue.visible.at(-1)!;
      assert.ok(!seen.has(incoming));
      seen.add(incoming);
      assert.equal(before.filter((id) => queue.visible.includes(id)).length, limit - 1);
      assert.equal(queue.visible.length, limit);
      assert.equal(new Set(queue.visible).size, limit);
    }
    assert.equal(seen.size, 20);
    for (let turn = 0; turn < 100; turn++) {
      queue = replaceClubhouseMember(queue, replacementCandidate(queue, none)!);
      assert.equal(new Set([...queue.visible, ...queue.waiting]).size, 20);
      assert.equal(queue.visible.length, limit);
    }
  }
});

test("hover, focus and tooltip protection defer eviction and responsive shrink", () => {
  const queue = reconcileClubhouse(empty(), roster(20), 10, none);
  const protectedIds = new Set(queue.visible.slice(0, 8));
  assert.ok(!protectedIds.has(replacementCandidate(queue, protectedIds)!));
  const narrow = reconcileClubhouse(queue, roster(20), 6, protectedIds);
  assert.equal(narrow.visible.length, 8);
  assert.deepEqual(new Set(narrow.visible), protectedIds);
  assert.equal(replacementCandidate(narrow, protectedIds), undefined);
  const released = reconcileClubhouse(narrow, roster(20), 6, none);
  assert.equal(released.visible.length, 6);
});

test("roster updates preserve survivors and purge removed IDs from both queues", () => {
  const queue = reconcileClubhouse(empty(), roster(20), 10, none);
  const removed = [queue.visible[0], queue.waiting[0]];
  const ids = [...roster(20).filter((id) => !removed.includes(id)), "new-member"];
  const updated = reconcileClubhouse(queue, ids, 10, none);
  assert.ok(queue.visible.slice(1).every((id) => updated.visible.includes(id)));
  assert.ok(removed.every((id) => ![...updated.visible, ...updated.waiting].includes(id)));
  assert.equal(updated.visible.length, 10);
  assert.equal(new Set([...updated.visible, ...updated.waiting]).size, ids.length);
  assert.deepEqual(reconcileClubhouse(updated, [], 10, none), empty());
});

test("configuration cannot increase initial visible count above fifteen", () => {
  assert.equal(reconcileClubhouse(empty(), roster(20), 50, none).visible.length, 15);
  assert.equal(shuffleMembers(["a", "a", "b"]).length, 2);
});

test("responsive bounds keep full hat, portrait, name and shadow inside scene", () => {
  for (const width of [240, 320, 639, 640, 900]) {
    const narrow = width < CLUBHOUSE.narrowWidth;
    const size = narrow ? CLUBHOUSE.narrowPortraitSize : CLUBHOUSE.portraitSize;
    const height = narrow ? CLUBHOUSE.narrowSceneHeight : CLUBHOUSE.sceneHeight;
    const bounds = getClubhouseBounds(width, height, size, CLUBHOUSE);
    for (const point of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: 2 }]) {
      const actual = toScenePoint(point, bounds);
      for (const hat of CLUBHOUSE_HATS) {
        for (const corner of getClubhouseHatCorners(size, hat)) {
          assert.ok(actual.x + corner.x >= CLUBHOUSE.edgeClearance - 0.001);
          assert.ok(actual.x + corner.x <= width - CLUBHOUSE.edgeClearance + 0.001);
          assert.ok(actual.y + corner.y - CLUBHOUSE.bobPx >= CLUBHOUSE.edgeClearance - 0.001);
          assert.ok(actual.y + corner.y <= height - CLUBHOUSE.edgeClearance + 0.001);
        }
      }
      assert.ok(actual.x + (size - CLUBHOUSE.nameWidth) / 2 >= CLUBHOUSE.edgeClearance);
      assert.ok(actual.x + (size + CLUBHOUSE.nameWidth) / 2 <= width - CLUBHOUSE.edgeClearance);
      assert.ok(actual.y + size + CLUBHOUSE.nameBottom <= height - CLUBHOUSE.edgeClearance);
    }
  }
});

test("destination sampling favors open space and duration scales with distance", () => {
  const bounds = { left: 0, top: 0, width: 200, height: 200 };
  const values = [0.1, 0.1, 0.9, 0.9, 0.3, 0.3];
  const destination = chooseClubhousePoint([{ x: 0, y: 0 }], bounds, 3, { width: 144, height: 130 }, () => values.shift()!);
  assert.deepEqual(destination, { x: 0.9, y: 0.9 });
  assert.equal(clubhouseTravelMs({ x: 0, y: 0 }, { x: 1, y: 0 }, bounds, 20), 10000);
  assert.equal(clubhouseTravelMs({ x: 0, y: 0 }, { x: 0.1, y: 0 }, bounds, 20), 1000);
});

test("hat defaults and fixed footprints cover every choice at both portrait sizes", () => {
  for (const value of [undefined, null, "unknown", 12]) assert.equal(getClubhouseHat(value).id, "fat-cat-cartel-fedora");
  for (const size of [44, 52]) {
    const overall = getClubhouseFootprint(size, CLUBHOUSE);
    for (const hat of CLUBHOUSE_HATS) {
      assert.equal(getClubhouseHat(hat.id), hat);
      assert.equal(hat.rotation, hat.id === "fat-cat-cartel-fedora" ? 10 : 0);
      const own = getClubhouseFootprint(size, CLUBHOUSE, hat);
      assert.ok(own.left >= overall.left && own.right <= overall.right);
      assert.ok(own.top >= overall.top && own.bottom <= overall.bottom);
      for (const corner of getClubhouseHatCorners(size, hat)) {
        assert.ok(corner.x >= own.left && corner.x <= own.right);
        assert.ok(corner.y >= own.top && corner.y <= own.bottom);
      }
    }
  }
});

test("spacing scores prefer room for permanent labels over small center gaps", () => {
  const bounds = { left: 0, top: 0, width: 300, height: 300 };
  const footprint = getClubhouseFootprint(64, CLUBHOUSE);
  const spacing = { width: footprint.right - footprint.left, height: footprint.bottom - footprint.top };
  const values = [0.7, 0.5, 0.5, 1];
  const destination = chooseClubhousePoint([{ x: 0.5, y: 0.5 }], bounds, 2, spacing, () => values.shift()!);
  assert.deepEqual(destination, { x: 0.5, y: 1 });
  assert.ok(spacing.width >= CLUBHOUSE.nameWidth);
});

test("shared stub supplies 20 members, refreshed cache version and empty/long biographies", async () => {
  const members = (await stubGet(stubRef(null, "members"))).val() as Record<string, { name: string }>;
  const profiles = (await stubGet(stubRef(null, "memberProfiles"))).val() as Record<string, { bio?: string | null; clubhouseHatId?: string }>;
  const version = (await stubGet(stubRef(null, "membersLastUpdated"))).val();
  assert.deepEqual(new Set(Object.values(profiles).map((profile) => profile.clubhouseHatId).filter(Boolean)), new Set(CLUBHOUSE_HATS.map((hat) => hat.id)));
  assert.ok(Object.values(profiles).some((profile) => profile.clubhouseHatId === undefined));
  assert.equal(Object.keys(members).length, 20);
  assert.equal(version, Date.UTC(2026, 8, 9));
  assert.ok(Object.entries(members).filter(([id]) => Number(id) > 11111008).every(([, member]) => member.name.startsWith("Stub ")));
  assert.ok(Object.values(profiles).some((profile) => !profile.bio));
  assert.ok(Object.values(profiles).some((profile) => (profile.bio?.length ?? 0) > 400));
  const queue = reconcileClubhouse(empty(), Object.keys(members), 15, none);
  assert.equal(queue.waiting.length, 5);
});

test("carpet destinations and their full ground shadows stay on the artwork at every scene size", () => {
  for (const width of [200, 240, 320, 639, 640, 800, 1280, 2000]) {
    const size = width < CLUBHOUSE.narrowWidth ? CLUBHOUSE.narrowPortraitSize : CLUBHOUSE.portraitSize;
    const geometry = getClubhouseGeometry(width, size, CLUBHOUSE);
    assert.ok(geometry.height >= (width < 640 ? 480 : 520));
    assert.ok(geometry.walkPolygon.length >= 3, `usable carpet at ${width}px`);
    assert.ok(isInsideClubhousePolygon(geometry.carpetEntry, geometry.walkPolygon));
    assert.ok(!isInsideClubhousePolygon(geometry.door, geometry.walkPolygon));
    for (let i = 0; i < 100; i++) {
      const point = chooseClubhousePoint([], geometry.bounds, 32, { width: 144, height: 130 }, Math.random, geometry.walkPolygon);
      const actual = toScenePoint(point, geometry.bounds);
      assert.ok(isInsideClubhousePolygon(point, geometry.walkPolygon));
      for (const x of [size * 0.1 - 3, size * 0.9 + 3]) {
        for (const y of [size - 7, size + 11]) {
          assert.ok(isInsideClubhousePolygon({ x: actual.x + x, y: actual.y + y }, geometry.carpet));
        }
      }
    }
    for (const old of [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.5 }]) {
      assert.ok(isInsideClubhousePolygon(clampClubhousePoint(old, geometry.walkPolygon), geometry.walkPolygon));
    }
  }
});
