import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  JUMBO_CACTPOT_MESSAGE,
  scheduledDiscordNotificationAt,
  sendJumboCactpotReminder,
} from "./scheduled-discord-notifications";

test("dispatches birthdays at 7 AM Sydney time in AEST and AEDT", () => {
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-08-15T21:00:00.000Z")),
    "birthday",
  );
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-01-16T20:00:00.000Z")),
    "birthday",
  );
});

test("dispatches Jumbo Cactpot at Saturday 7 PM fixed AEST", () => {
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-08-15T09:00:00.000Z")),
    "jumbo-cactpot",
  );
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-01-17T09:00:00.000Z")),
    "jumbo-cactpot",
  );
});

test("returns no work for the unused DST trigger and other times", () => {
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-01-16T21:00:00.000Z")),
    null,
  );
  assert.equal(
    scheduledDiscordNotificationAt(new Date("2026-08-14T09:00:00.000Z")),
    null,
  );
});

test("opens the hardcoded DM and sends the exact reminder", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    if (calls.length === 1) {
      return {
        ok: true,
        json: async () => ({ id: "dm-channel-123" }),
      } as Response;
    }
    return { ok: true } as Response;
  }) as typeof fetch;

  await sendJumboCactpotReminder("test-token", fetchImpl);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].input, "https://discord.com/api/v10/users/@me/channels");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    recipient_id: "193778675483672577",
  });
  assert.equal(
    (calls[0].init?.headers as Record<string, string>).Authorization,
    "Bot test-token",
  );
  assert.equal(
    calls[1].input,
    "https://discord.com/api/v10/channels/dm-channel-123/messages",
  );
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    content: JUMBO_CACTPOT_MESSAGE,
    allowed_mentions: { parse: [] },
  });
});

test("reports bounded Discord errors", async () => {
  const responseBody = `blocked-${"x".repeat(250)}-not-included`;
  const fetchImpl = (async () =>
    ({
      ok: false,
      status: 403,
      text: async () => responseBody,
    }) as Response) as typeof fetch;

  await assert.rejects(
    sendJumboCactpotReminder("test-token", fetchImpl),
    (error: Error) => {
      assert.match(error.message, /Discord DM channel creation failed: 403/);
      assert.equal(error.message.includes("not-included"), false);
      return true;
    },
  );
});

test("reports Discord message failures after opening the DM", async () => {
  let callCount = 0;
  const fetchImpl = (async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        json: async () => ({ id: "dm-channel-123" }),
      } as Response;
    }
    return {
      ok: false,
      status: 429,
      text: async () => "rate limited",
    } as Response;
  }) as typeof fetch;

  await assert.rejects(
    sendJumboCactpotReminder("test-token", fetchImpl),
    /Discord Jumbo Cactpot message failed: 429 rate limited/,
  );
});
