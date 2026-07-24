import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "fat-cat-cartel-rules-test",
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
  "gameServerAccess/123456789012345678",
  "gameServerAuditLog/palworld/example",
]) {
  test(`browser cannot read or write ${path}`, async () => {
    const database = environment.unauthenticatedContext().database();
    await assertFails(get(ref(database, path)));
    await assertFails(set(ref(database, path), { injected: true }));
    assert.ok(true);
  });
}
