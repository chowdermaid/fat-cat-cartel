import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fat-cat-cartel",
    database: {
      rules: await readFile("database.rules.json", "utf8"),
    },
  });
});

after(async () => {
  await environment.cleanup();
});

for (const path of [
  "adminOAuthStates/example",
  "adminSessions/example",
  "discordLinks/123456789012345678",
  "fcCollectionRetryQueue/11111009",
  "gameServerAccess/123456789012345678",
  "dragonwildsServerAccess/123456789012345678",
  "gameServerAuditLog/palworld/example",
]) {
  test(`browser cannot read or write ${path}`, async () => {
    const database = environment.unauthenticatedContext().database();
    await assertFails(get(ref(database, path)));
    await assertFails(set(ref(database, path), { injected: true }));
    assert.ok(true);
  });
}

for (const identity of ["member", "claimed-admin"]) {
  test(`${identity} cannot access the collection retry queue`, async () => {
    const db = environment.authenticatedContext(identity, identity === "claimed-admin" ? { admin: true } : {}).database();
    await assertFails(get(ref(db, "fcCollectionRetryQueue")));
    await assertFails(set(ref(db, "fcCollectionRetryQueue/11111009"), { attempts: 0, nextAttemptAt: 1 }));
  });
}

test("public can read Spud Jar but cannot write it", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "tools/spudJar"), {
      total: 7,
      updatedAt: 1,
      updatedBy: "member-1",
    });
  });
  const database = environment.unauthenticatedContext().database();
  await assertSucceeds(get(ref(database, "tools/spudJar")));
  await assertFails(set(ref(database, "tools/spudJar"), { total: 8 }));
});

test("authenticated browser cannot write Spud Jar", async () => {
  const database = environment.authenticatedContext("member-1").database();
  await assertFails(set(ref(database, "tools/spudJar"), { total: 8 }));
});

test("Keybound Brawler is public-readable and browser writes always fail", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "keyboundBrawler"), { scores: { "111": 0, "222": 42 }, updatedAt: 1 });
  });
  const contexts = [environment.unauthenticatedContext(), environment.authenticatedContext("member"), environment.authenticatedContext("claimed-admin", { admin: true, isAdmin: true, role: "Boss" })];
  for (const context of contexts) {
    const database = context.database();
    assert.equal((await assertSucceeds(get(ref(database, "keyboundBrawler/scores/111")))).val(), 0);
    await assertSucceeds(get(ref(database, "keyboundBrawler")));
    await assertFails(set(ref(database, "keyboundBrawler"), { scores: { "111": 999 } }));
    await assertFails(set(ref(database, "keyboundBrawler/scores/111"), 999));
    await assertFails(set(ref(database, "keyboundBrawler/scores/111"), null));
    await assertFails(set(ref(database, "keyboundBrawler/updatedAt"), 999));
  }
});

test("shared Gil Rush is public-readable but never browser-writable", async () => {
  const path = "events/cartelGilRush/current";
  await environment.withSecurityRulesDisabled(async context => {
    await set(ref(context.database(), path), { version: 1, revision: 1, phase: "setup", round: 1 });
  });
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext("member"), environment.authenticatedContext("claimed-admin", { isAdmin: true, role: "Boss" })]) {
    await assertSucceeds(get(ref(context.database(), path)));
    await assertFails(set(ref(context.database(), path), { revision: 99 }));
    await assertFails(set(ref(context.database(), `${path}/round`), 99));
  }
});

for (const root of ["gameServerAccess", "dragonwildsServerAccess"]) {
  for (const claims of [{}, { admin: true, isAdmin: true, role: "Boss" }]) {
    test(`authenticated browser claims ${JSON.stringify(claims)} cannot access ${root}`, async () => {
      const db = environment.authenticatedContext("member-1", claims).database();
      for (const path of [root, `${root}/123456789012345678`]) {
        await assertFails(get(ref(db, path)));
        await assertFails(set(ref(db, path), { enabled: true }));
      }
    });
  }
}

for (const serverId of ["palworld", "dragonwilds"]) {
  for (const identity of ["anonymous", "member", "claimed-admin"]) {
    test(`${identity} cannot read or write ${serverId} operational data`, async () => {
      const db = identity === "anonymous" ? environment.unauthenticatedContext().database()
        : environment.authenticatedContext(identity, identity === "claimed-admin" ? { admin: true, isAdmin: true, role: "Boss" } : {}).database();
      for (const [root, leaf] of [
        ["gameServerSettings", "enabled"],
        ["gameServerIdleState", "idleSince"],
        ["gameServerCost", "monthly/2026-09"],
        ["gameServerAuditLog", "example"],
      ]) {
        for (const path of [root, `${root}/${serverId}`, `${root}/${serverId}/${leaf}`]) {
          await assertFails(get(ref(db, path)));
          await assertFails(set(ref(db, path), { injected: true }));
        }
      }
    });
  }
}

for (const identity of ["anonymous", "member"]) {
  test(`${identity} can still read public app data but cannot write it`, async () => {
    const paths = ["members/fixture", "membersLastUpdated", "memberProfiles/fixture", "raidStats/fixture",
      "fcCollection/collectibles/fixture", "fcCollection/memberData/fixture", "memberActivity/fixture",
      "calendarEvents/fixture", "calendarSync", "craftingRequests/fixture", "events/easter2026/participants/fixture"];
    await environment.withSecurityRulesDisabled(async (context) => {
      for (const path of paths) await set(ref(context.database(), path), { testValue: "public-fixture" });
    });
    const db = identity === "anonymous" ? environment.unauthenticatedContext().database() : environment.authenticatedContext("member").database();
    for (const path of paths) {
      const value = await assertSucceeds(get(ref(db, path)));
      assert.equal(value.val().testValue, "public-fixture");
      await assertFails(set(ref(db, path), { testValue: "injected" }));
    }
  });
}
