import type { Request, Response } from "express";
import { hasAnyRole, parseRoleIds } from "../admin-auth";
import {
  linkDiscordUser,
  signupFriend,
  viewFriendStatus,
  viewProfile,
} from "./profile";
import { verifyDiscordRequest } from "./verify";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const CLEAR_CHANNEL_CUSTOM_ID_PREFIX = "clear-channel";
const RECENT_MESSAGE_MS = 14 * 24 * 60 * 60 * 1000;
const BULK_DELETE_SAFETY_MS = 10_000;

const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
} as const;

const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
} as const;

const MessageFlags = {
  Ephemeral: 64,
} as const;

const ComponentType = {
  ActionRow: 1,
  Button: 2,
} as const;

const ButtonStyle = {
  Secondary: 2,
  Danger: 4,
} as const;

type DiscordInteraction = {
  type: number;
  application_id?: string;
  token?: string;
  guild_id?: string;
  channel_id?: string;
  data?: {
    name?: string;
    custom_id?: string;
    options?: DiscordOption[];
  };
  member?: {
    roles?: unknown;
    user?: {
      id?: string;
    };
  };
  user?: {
    id?: string;
  };
};

type DiscordOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordOption[];
};

type DiscordInteractionConfig = {
  adminRoleIds: string;
  botToken: string;
};

type DiscordMessage = {
  id?: string;
  timestamp?: string;
};

type ClearChannelResult = {
  deleted: number;
  mayHaveOlderMessages: boolean;
};

class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function handleDiscordInteraction(
  req: Request & { rawBody?: Buffer },
  res: Response,
  publicKey: string,
  config: DiscordInteractionConfig,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    res.status(400).send("Missing raw request body");
    return;
  }

  const isValid = verifyDiscordRequest({
    publicKey,
    signature: req.headers["x-signature-ed25519"],
    timestamp: req.headers["x-signature-timestamp"],
    rawBody,
  });

  if (!isValid) {
    res.status(401).send("Invalid request signature");
    return;
  }

  const interaction = req.body as DiscordInteraction;

  if (interaction.type === InteractionType.Ping) {
    res.json({ type: InteractionResponseType.Pong });
    return;
  }

  if (
    interaction.type !== InteractionType.ApplicationCommand &&
    interaction.type !== InteractionType.MessageComponent
  ) {
    res.json(ephemeral("Unsupported interaction type."));
    return;
  }

  try {
    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!userId) {
      res.json(ephemeral("Could not identify your Discord user."));
      return;
    }

    if (interaction.type === InteractionType.MessageComponent) {
      await runComponent(interaction, userId, config, res);
      return;
    }

    const response = await runCommand(interaction, userId, config);
    res.json(response);
  } catch (error) {
    console.error("Discord interaction failed", error);
    res.json(ephemeral("Something went wrong while handling that command."));
  }
}

async function runCommand(
  interaction: DiscordInteraction,
  userId: string,
  config: DiscordInteractionConfig,
) {
  const commandName = interaction.data?.name;

  if (commandName === "help") {
    return ephemeral([
      "Fat Cat Cartel commands:",
      "/friend signup lodestone_id - Add yourself as a tracked Friend.",
      "/friend status - Check whether your collection and raid tracking have loaded.",
      "/link lodestone_id - Link your Discord account to your FC profile.",
      "/profile view - Show your linked profile summary.",
      "Profile edits now live on the website.",
    ].join("\n"));
  }

  if (commandName === "link") {
    const lodestoneId = stringOption(interaction.data?.options, "lodestone_id");
    if (!lodestoneId) return ephemeral("Please provide a Lodestone ID.");

    return ephemeral((await linkDiscordUser(userId, lodestoneId)).message);
  }

  if (commandName === "friend") {
    return ephemeral(await runFriendCommand(interaction.data?.options ?? [], userId));
  }

  if (commandName === "profile") {
    return ephemeral(await runProfileCommand(interaction.data?.options ?? [], userId));
  }

  if (commandName === "clear-channel") {
    return runClearChannelCommand(interaction, userId, config);
  }

  return ephemeral("Unknown command.");
}

async function runFriendCommand(options: DiscordOption[], userId: string): Promise<string> {
  const subcommand = options[0];
  if (!subcommand) return "Please choose signup or status.";

  if (subcommand.name === "signup") {
    const lodestoneId = stringOption(subcommand.options, "lodestone_id");
    if (!lodestoneId) return "Please provide a Lodestone ID.";

    return (await signupFriend(userId, lodestoneId)).message;
  }

  if (subcommand.name === "status") {
    return (await viewFriendStatus(userId)).message;
  }

  return "Unknown friend action.";
}

async function runProfileCommand(options: DiscordOption[], userId: string): Promise<string> {
  const subcommand = options[0];
  if (!subcommand) return "Please choose a profile action.";

  if (subcommand.name === "view") {
    return (await viewProfile(userId)).message;
  }

  return "Profile edits now live on the website. Use /profile view here, or edit from your member page.";
}

function stringOption(options: DiscordOption[] | undefined, name: string): string | null {
  const value = options?.find((option) => option.name === name)?.value;
  return typeof value === "string" ? value : null;
}

function runClearChannelCommand(
  interaction: DiscordInteraction,
  userId: string,
  config: DiscordInteractionConfig,
) {
  if (!interaction.guild_id || !interaction.channel_id) {
    return ephemeral("Use this command in a server channel.");
  }

  if (!hasAdminRole(interaction, config.adminRoleIds)) {
    return ephemeral("Boss or Underpaw Discord role required.");
  }

  return ephemeral(
    [
      "This will delete recent messages from this channel.",
      "Discord does not allow bulk deleting messages older than 14 days.",
      "Only you can confirm this action.",
    ].join("\n"),
    confirmClearChannelComponents(userId, interaction.channel_id),
  );
}

async function runComponent(
  interaction: DiscordInteraction,
  userId: string,
  config: DiscordInteractionConfig,
  res: Response,
): Promise<void> {
  const customId = interaction.data?.custom_id;
  if (!customId?.startsWith(`${CLEAR_CHANNEL_CUSTOM_ID_PREFIX}:`)) {
    res.json(ephemeral("Unsupported button action."));
    return;
  }

  const [, action, requesterId, channelId] = customId.split(":");
  if (requesterId !== userId) {
    res.json(ephemeral("Only the admin who started this clear can confirm it."));
    return;
  }

  if (action === "cancel") {
    res.json(ephemeral("Clear cancelled."));
    return;
  }

  if (action !== "confirm" || !channelId || channelId !== interaction.channel_id) {
    res.json(ephemeral("That clear request is no longer valid."));
    return;
  }

  if (!hasAdminRole(interaction, config.adminRoleIds)) {
    res.json(ephemeral("Boss or Underpaw Discord role required."));
    return;
  }

  if (!interaction.application_id || !interaction.token) {
    res.json(ephemeral("Could not update the Discord confirmation message."));
    return;
  }

  res.json(deferredEphemeral());

  let content: string;
  try {
    const result = await clearRecentChannelMessages(channelId, config.botToken);
    content = clearChannelResultMessage(result);
  } catch (error) {
    content = clearChannelErrorMessage(error);
  }

  try {
    await editOriginalInteractionResponse(
      interaction.application_id,
      interaction.token,
      content,
    );
  } catch (error) {
    console.error("Discord clear-channel response update failed", error);
  }
}

function hasAdminRole(
  interaction: DiscordInteraction,
  adminRoleIds: string,
): boolean {
  const memberRoles = Array.isArray(interaction.member?.roles)
    ? interaction.member.roles.filter(
        (roleId): roleId is string => typeof roleId === "string",
      )
    : [];
  return hasAnyRole(memberRoles, parseRoleIds(adminRoleIds));
}

async function clearRecentChannelMessages(
  channelId: string,
  botToken: string,
): Promise<ClearChannelResult> {
  let deleted = 0;
  let mayHaveOlderMessages = false;
  const cutoff = Date.now() - RECENT_MESSAGE_MS + BULK_DELETE_SAFETY_MS;

  for (;;) {
    const messages = await discordRequest<DiscordMessage[]>(
      `channels/${channelId}/messages?limit=100`,
      { method: "GET" },
      botToken,
    );
    if (!messages.length) break;

    const eligibleIds = messages
      .filter((message) => {
        const sentAt = message.timestamp ? Date.parse(message.timestamp) : NaN;
        return message.id && Number.isFinite(sentAt) && sentAt > cutoff;
      })
      .map((message) => message.id as string);

    if (!eligibleIds.length) {
      mayHaveOlderMessages = true;
      break;
    }

    deleted += await deleteMessageBatch(channelId, eligibleIds, botToken);

    if (eligibleIds.length < messages.length) {
      mayHaveOlderMessages = true;
      break;
    }
  }

  return { deleted, mayHaveOlderMessages };
}

async function deleteMessageBatch(
  channelId: string,
  messageIds: string[],
  botToken: string,
): Promise<number> {
  if (messageIds.length === 1) {
    await discordRequest<void>(
      `channels/${channelId}/messages/${messageIds[0]}`,
      { method: "DELETE" },
      botToken,
    );
    return 1;
  }

  await discordRequest<void>(
    `channels/${channelId}/messages/bulk-delete`,
    {
      method: "POST",
      body: JSON.stringify({ messages: messageIds }),
    },
    botToken,
  );
  return messageIds.length;
}

async function discordRequest<T>(
  path: string,
  init: RequestInit,
  botToken: string,
): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new DiscordApiError(
      `Discord request failed: ${response.status} ${body.slice(0, 200)}`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function editOriginalInteractionResponse(
  applicationId: string,
  interactionToken: string,
  content: string,
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, components: [] }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord interaction update failed: ${response.status} ${body.slice(0, 200)}`,
    );
  }
}

function clearChannelResultMessage(result: ClearChannelResult): string {
  const suffix = result.mayHaveOlderMessages
    ? " Messages older than 14 days may remain."
    : "";
  return `Deleted ${result.deleted} recent message${result.deleted === 1 ? "" : "s"}.${suffix}`;
}

function clearChannelErrorMessage(error: unknown): string {
  if (error instanceof DiscordApiError && error.status === 403) {
    return "I do not have permission to manage messages in this channel.";
  }

  if (error instanceof DiscordApiError && error.status === 401) {
    return "Discord bot token was rejected.";
  }

  console.error("Discord clear-channel failed", error);
  return "Something went wrong while clearing recent messages.";
}

function confirmClearChannelComponents(userId: string, channelId: string) {
  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Danger,
          label: "Confirm",
          custom_id: `${CLEAR_CHANNEL_CUSTOM_ID_PREFIX}:confirm:${userId}:${channelId}`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          label: "Cancel",
          custom_id: `${CLEAR_CHANNEL_CUSTOM_ID_PREFIX}:cancel:${userId}:${channelId}`,
        },
      ],
    },
  ];
}

function deferredEphemeral() {
  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
    },
  };
}

function ephemeral(content: string, components: unknown[] = []) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral,
      components,
    },
  };
}
