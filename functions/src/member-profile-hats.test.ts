import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, mock, test } from "node:test";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { CLUBHOUSE_HAT_IDS, updateMemberProfileAdmin, updateOwnMemberProfile } from "./admin-mutations";

const memberId = "11111009";
let writes: Record<string, unknown>[];
let stored: Record<string, unknown>;

beforeEach(() => {
  writes = [];
  stored = { [`memberProfiles/${memberId}/clubhouseHatId`]: "cartel-witch-hat" };
  mock.method(admin, "database", () => () => ({
    ref: (path: string) => ({
      update: async (changes: Record<string, unknown>) => {
        const flattened = Object.fromEntries(Object.entries(changes).map(([key, value]) => [path === "/" ? key : `${path}/${key}`, value]));
        writes.push(flattened);
        Object.assign(stored, flattened);
      },
    }),
  }), { getter: true });
});

afterEach(() => mock.restoreAll());

for (const mode of ["self", "admin"] as const) {
  const save = (profile: Record<string, unknown>) => mode === "self"
    ? updateOwnMemberProfile({ profile }, memberId)
    : updateMemberProfileAdmin({ lodestoneId: memberId, profile, fcRank: "Friend" });

  test(`${mode}: every hat is saved through one existing write`, async () => {
    for (const clubhouseHatId of CLUBHOUSE_HAT_IDS) {
      const before = writes.length;
      await save({ clubhouseHatId, bio: "  Hello  " });
      assert.equal(writes.length, before + 1);
      assert.equal(stored[`memberProfiles/${memberId}/clubhouseHatId`], clubhouseHatId);
      assert.equal(stored[`memberProfiles/${memberId}/bio`], "Hello");
      assert.ok(Object.keys(writes.at(-1)!).every((path) => path.startsWith(`memberProfiles/${memberId}/`) || (mode === "admin" && ["membersLastUpdated", `members/${memberId}/fcRank`].includes(path))));
    }
  });

  test(`${mode}: old clients preserve chosen hats and missing profiles need no backfill`, async () => {
    await save({ bio: "Changed bio" });
    assert.equal(stored[`memberProfiles/${memberId}/clubhouseHatId`], "cartel-witch-hat");
    assert.ok(!Object.prototype.hasOwnProperty.call(writes[0], `memberProfiles/${memberId}/clubhouseHatId`));
    stored = {};
    await save({});
    assert.ok(!Object.prototype.hasOwnProperty.call(stored, `memberProfiles/${memberId}/clubhouseHatId`));
  });

  test(`${mode}: null explicitly restores fedora`, async () => {
    await save({ clubhouseHatId: null });
    assert.equal(stored[`memberProfiles/${memberId}/clubhouseHatId`], CLUBHOUSE_HAT_IDS[0]);
  });

  test(`${mode}: malformed hat values fail before writing`, async () => {
    for (const clubhouseHatId of ["", "unknown", "../hat.svg", " cartel-flat-cap ", 1, false, {}, [], undefined]) {
      await assert.rejects(save({ clubhouseHatId }), (error) => error instanceof HttpsError && error.code === "invalid-argument");
    }
    assert.equal(writes.length, 0);
  });

  test(`${mode}: limited jobs, crafters and gatherers can be saved as main jobs`, async () => {
    const addedJobs = ["Blue Mage", "Beastmaster", "Fisher", "Miner", "Botanist", "Carpenter", "Blacksmith", "Armorer", "Goldsmith", "Leatherworker", "Weaver", "Alchemist", "Culinarian"];
    for (const job of addedJobs) {
      await save({ mainJobs: [job] });
      assert.deepEqual(stored[`memberProfiles/${memberId}/mainJobs`], [job]);
    }
    const mixedJobs = ["Paladin", "Blue Mage", "Beastmaster", "Fisher", "Miner", "Botanist", "Carpenter", "Culinarian"];
    await save({ mainJobs: mixedJobs });
    assert.deepEqual(stored[`memberProfiles/${memberId}/mainJobs`], mixedJobs);
    const before = writes.length;
    for (const mainJobs of [[...mixedJobs, "Weaver"], ["Unknown Job"], ["Fisher", 42]]) {
      await assert.rejects(save({ mainJobs }), (error) => error instanceof HttpsError && error.code === "invalid-argument");
    }
    assert.equal(writes.length, before);
  });
}

test("frontend catalogue and bundled SVGs match server allowlist", () => {
  const root = resolve(__dirname, "../..");
  const catalogue = readFileSync(resolve(root, "src/features/home/utils/clubhouseHats.ts"), "utf8");
  const ids = [...catalogue.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, [...CLUBHOUSE_HAT_IDS]);
  for (const id of ids) assert.ok(existsSync(resolve(root, `src/assets/clubhouse/hats/${id}.svg`)));
});
