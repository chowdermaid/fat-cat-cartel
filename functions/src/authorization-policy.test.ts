import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  authenticatedSessionRecordIsValid,
  type AdminSession,
} from "./admin-auth";
import { isGameServerAccessEntryActive } from "./game-servers";

function session(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    discordUserId: "123456789012345678",
    fcRank: null,
    avatarUrl: null,
    roleIds: [],
    createdAt: 1,
    expiresAt: 2_000,
    lastSeenAt: 1,
    ...overrides,
  };
}

test("base session requires Discord identity and future expiry", () => {
  assert.equal(authenticatedSessionRecordIsValid(session(), 1_000), true);
  assert.equal(
    authenticatedSessionRecordIsValid(session({ discordUserId: "" }), 1_000),
    false,
  );
  assert.equal(
    authenticatedSessionRecordIsValid(session({ expiresAt: 1_000 }), 1_000),
    false,
  );
});

test("client-style privilege fields do not make invalid session valid", () => {
  assert.equal(
    authenticatedSessionRecordIsValid(
      session({ discordUserId: "", isAdmin: true, isMember: true }),
      1_000,
    ),
    false,
  );
});

test("legacy enabled Palworld entry remains active without expiry", () => {
  assert.equal(
    isGameServerAccessEntryActive({
      discordUserId: "123456789012345678",
      displayName: "Legacy",
      enabled: true,
      expiresAt: null,
      notes: null,
      addedBy: "admin",
      addedAt: 1,
      updatedBy: "",
      updatedAt: 1,
    }),
    true,
  );
});

test("disabled and expired Palworld entries are denied", () => {
  const entry = {
    discordUserId: "123456789012345678",
    displayName: "Friend",
    enabled: true,
    expiresAt: 2_000,
    notes: null,
    addedBy: "admin",
    addedAt: 1,
    updatedBy: "admin",
    updatedAt: 1,
  };
  assert.equal(isGameServerAccessEntryActive(entry, 1_999), true);
  assert.equal(isGameServerAccessEntryActive(entry, 2_000), false);
  assert.equal(
    isGameServerAccessEntryActive({ ...entry, enabled: false }, 1_000),
    false,
  );
});
