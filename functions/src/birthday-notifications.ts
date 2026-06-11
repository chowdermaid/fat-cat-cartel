import * as admin from "firebase-admin";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const BIRTHDAY_TIME_ZONE = "Australia/Sydney";

type BirthdayNotificationConfig = {
  botToken: string;
  channelId: string;
};

type MemberProfileRecord = {
  birthday?: unknown;
};

type MemberRecord = {
  name?: unknown;
};

type DiscordMessageResponse = {
  id?: string;
  channel_id?: string;
};

type BirthdayTarget = {
  lodestoneId: string;
  birthday: string;
  firstName: string;
  fullName: string;
  discordUserId: string | null;
};

type BirthdayRunResult = {
  dateKey: string;
  checked: number;
  matched: number;
  sent: number;
  skipped: number;
  failed: number;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBirthday(value: unknown): string | null {
  const birthday = cleanText(value);
  const match = /^(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1) return null;

  const daysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysByMonth[month - 1]) return null;

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function sydneyDateParts(now = new Date()): {
  dateKey: string;
  birthdayKey: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BIRTHDAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  return {
    dateKey: `${year}-${month}-${day}`,
    birthdayKey: `${month}-${day}`,
  };
}

function firstNameFromFullName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

function birthdayMessage(target: BirthdayTarget): {
  content: string;
  allowed_mentions: { parse: never[]; users: string[] };
} {
  if (target.discordUserId) {
    return {
      content: `Happy birthday <@${target.discordUserId}>! Hope you have a wonderful day, ${target.firstName}!`,
      allowed_mentions: {
        parse: [],
        users: [target.discordUserId],
      },
    };
  }

  return {
    content: `Happy birthday ${target.firstName}! Hope you have a wonderful day!`,
    allowed_mentions: {
      parse: [],
      users: [],
    },
  };
}

async function sendDiscordBirthdayMessage(
  target: BirthdayTarget,
  config: BirthdayNotificationConfig,
): Promise<DiscordMessageResponse> {
  const botToken = cleanText(config.botToken);
  const channelId = cleanText(config.channelId);
  if (!botToken || !channelId) {
    throw new Error("Discord birthday notification is missing required configuration.");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(birthdayMessage(target)),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord birthday notification failed: ${response.status} ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<DiscordMessageResponse>;
}

async function claimBirthdayNotification(
  dateKey: string,
  target: BirthdayTarget,
): Promise<boolean> {
  const now = Date.now();
  const ref = admin
    .database()
    .ref(`birthdayNotifications/${dateKey}/${target.lodestoneId}`);
  const result = await ref.transaction((current) => {
    if (current !== null) return undefined;
    return {
      status: "claimed",
      birthday: target.birthday,
      lodestoneId: target.lodestoneId,
      firstName: target.firstName,
      fullName: target.fullName,
      discordUserId: target.discordUserId,
      claimedAt: now,
    };
  });

  return result.committed;
}

async function markBirthdayNotificationSent(
  dateKey: string,
  target: BirthdayTarget,
  channelId: string,
  message: DiscordMessageResponse,
): Promise<void> {
  await admin
    .database()
    .ref(`birthdayNotifications/${dateKey}/${target.lodestoneId}`)
    .update({
      status: "sent",
      sentAt: Date.now(),
      channelId: cleanText(message.channel_id) || channelId,
      messageId: cleanText(message.id) || null,
    });
}

async function markBirthdayNotificationFailed(
  dateKey: string,
  target: BirthdayTarget,
  error: unknown,
): Promise<void> {
  await admin
    .database()
    .ref(`birthdayNotifications/${dateKey}/${target.lodestoneId}`)
    .update({
      status: "failed",
      failedAt: Date.now(),
      error:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unknown birthday notification failure.",
    });
}

function findBirthdayTargets(
  profiles: Record<string, MemberProfileRecord>,
  members: Record<string, MemberRecord>,
  discordLinksByLodestone: Record<string, unknown>,
  birthdayKey: string,
): BirthdayTarget[] {
  return Object.entries(profiles).flatMap(([lodestoneId, profile]) => {
    const birthday = parseBirthday(profile?.birthday);
    if (birthday !== birthdayKey) return [];

    const fullName = cleanText(members[lodestoneId]?.name);
    if (!fullName) return [];

    const discordUserId = cleanText(discordLinksByLodestone[lodestoneId]) || null;
    return [
      {
        lodestoneId,
        birthday,
        firstName: firstNameFromFullName(fullName),
        fullName,
        discordUserId,
      },
    ];
  });
}

export async function runSendBirthdayWishes(
  config: BirthdayNotificationConfig,
  now = new Date(),
): Promise<BirthdayRunResult> {
  const { dateKey, birthdayKey } = sydneyDateParts(now);
  const db = admin.database();
  const [profilesSnap, membersSnap, linksSnap] = await Promise.all([
    db.ref("memberProfiles").get(),
    db.ref("members").get(),
    db.ref("discordLinksByLodestone").get(),
  ]);
  const profiles = (profilesSnap.val() ?? {}) as Record<
    string,
    MemberProfileRecord
  >;
  const members = (membersSnap.val() ?? {}) as Record<string, MemberRecord>;
  const discordLinksByLodestone = (linksSnap.val() ?? {}) as Record<
    string,
    unknown
  >;
  const targets = findBirthdayTargets(
    profiles,
    members,
    discordLinksByLodestone,
    birthdayKey,
  );
  const result: BirthdayRunResult = {
    dateKey,
    checked: Object.keys(profiles).length,
    matched: targets.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const target of targets) {
    const claimed = await claimBirthdayNotification(dateKey, target);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }

    try {
      const message = await sendDiscordBirthdayMessage(target, config);
      await markBirthdayNotificationSent(
        dateKey,
        target,
        cleanText(config.channelId),
        message,
      );
      result.sent += 1;
    } catch (error) {
      console.error("Birthday notification failed", {
        dateKey,
        lodestoneId: target.lodestoneId,
        error,
      });
      await markBirthdayNotificationFailed(dateKey, target, error);
      result.failed += 1;
    }
  }

  console.info("Birthday notification run complete", result);
  return result;
}
