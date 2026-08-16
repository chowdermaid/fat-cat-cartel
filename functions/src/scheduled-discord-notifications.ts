import { runSendBirthdayWishes } from "./birthday-notifications";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const JUMBO_CACTPOT_RECIPIENT_ID = "193778675483672577";

export const JUMBO_CACTPOT_MESSAGE =
  "MAKO JUMBO CACTPOT HAS RESET YALLAH HABIBZ";

type ScheduledDiscordNotificationConfig = {
  botToken: string;
  channelId: string;
};

export type ScheduledDiscordNotification = "birthday" | "jumbo-cactpot" | null;

type LocalTimeParts = {
  weekday: string;
  hour: string;
  minute: string;
};

type DiscordDmChannel = {
  id?: unknown;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function localTimeParts(now: Date, timeZone: string): LocalTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: getPart("weekday"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

export function scheduledDiscordNotificationAt(
  now: Date,
): ScheduledDiscordNotification {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Scheduled Discord notification received an invalid time.");
  }

  const sydney = localTimeParts(now, "Australia/Sydney");
  if (sydney.hour === "07" && sydney.minute === "00") {
    return "birthday";
  }

  const brisbane = localTimeParts(now, "Australia/Brisbane");
  if (
    brisbane.weekday === "Sat" &&
    brisbane.hour === "19" &&
    brisbane.minute === "00"
  ) {
    return "jumbo-cactpot";
  }

  return null;
}

async function discordError(
  response: Response,
  action: string,
): Promise<Error> {
  const body = await response.text().catch(() => "");
  return new Error(
    `Discord ${action} failed: ${response.status} ${body.slice(0, 200)}`.trim(),
  );
}

export async function sendJumboCactpotReminder(
  botToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const token = cleanText(botToken);
  if (!token) {
    throw new Error("Jumbo Cactpot reminder is missing the Discord bot token.");
  }

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json; charset=utf-8",
  };
  const dmResponse = await fetchImpl(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ recipient_id: JUMBO_CACTPOT_RECIPIENT_ID }),
  });
  if (!dmResponse.ok) {
    throw await discordError(dmResponse, "DM channel creation");
  }

  const dmChannel = (await dmResponse.json()) as DiscordDmChannel;
  const channelId = cleanText(dmChannel.id);
  if (!channelId) {
    throw new Error("Discord DM channel creation returned no channel ID.");
  }

  const messageResponse = await fetchImpl(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: JUMBO_CACTPOT_MESSAGE,
        allowed_mentions: { parse: [] },
      }),
    },
  );
  if (!messageResponse.ok) {
    throw await discordError(messageResponse, "Jumbo Cactpot message");
  }
}

export async function runScheduledDiscordNotifications(
  config: ScheduledDiscordNotificationConfig,
  scheduledAt: Date,
): Promise<void> {
  const notification = scheduledDiscordNotificationAt(scheduledAt);
  if (notification === "birthday") {
    await runSendBirthdayWishes(config, scheduledAt);
    return;
  }

  if (notification === "jumbo-cactpot") {
    await sendJumboCactpotReminder(config.botToken);
    console.info("Jumbo Cactpot reminder sent", {
      recipientId: JUMBO_CACTPOT_RECIPIENT_ID,
      scheduledAt: scheduledAt.toISOString(),
    });
    return;
  }

  console.info("Scheduled Discord notification trigger had no work", {
    scheduledAt: scheduledAt.toISOString(),
  });
}
