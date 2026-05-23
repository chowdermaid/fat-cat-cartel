import type { Request, Response } from "express";
import {
  addJob,
  linkDiscordUser,
  removeJob,
  signupFriend,
  updateBio,
  updateBirthday,
  viewFriendStatus,
  viewProfile,
} from "./profile";
import { verifyDiscordRequest } from "./verify";

const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
} as const;

const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
} as const;

const MessageFlags = {
  Ephemeral: 64,
} as const;

type DiscordInteraction = {
  type: number;
  data?: {
    name?: string;
    options?: DiscordOption[];
  };
  member?: {
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

export async function handleDiscordInteraction(
  req: Request & { rawBody?: Buffer },
  res: Response,
  publicKey: string,
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

  if (interaction.type !== InteractionType.ApplicationCommand) {
    res.json(ephemeral("Unsupported interaction type."));
    return;
  }

  try {
    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!userId) {
      res.json(ephemeral("Could not identify your Discord user."));
      return;
    }

    const message = await runCommand(interaction, userId);
    res.json(ephemeral(message));
  } catch (error) {
    console.error("Discord interaction failed", error);
    res.json(ephemeral("Something went wrong while handling that command."));
  }
}

async function runCommand(interaction: DiscordInteraction, userId: string): Promise<string> {
  const commandName = interaction.data?.name;

  if (commandName === "help") {
    return [
      "Fat Cat Cartel commands:",
      "/friend signup lodestone_id - Add yourself as a tracked Friend.",
      "/friend status - Check whether your collection and raid tracking have loaded.",
      "/link lodestone_id - Link your Discord account to your FC profile.",
      "/profile view - Show your linked profile summary.",
      "/profile bio text - Update your profile bio.",
      "/profile birthday month day - Update your birthday.",
      "/profile jobs add job - Add a main job.",
      "/profile jobs remove job - Remove a main job.",
    ].join("\n");
  }

  if (commandName === "link") {
    const lodestoneId = stringOption(interaction.data?.options, "lodestone_id");
    if (!lodestoneId) return "Please provide a Lodestone ID.";

    return (await linkDiscordUser(userId, lodestoneId)).message;
  }

  if (commandName === "friend") {
    return runFriendCommand(interaction.data?.options ?? [], userId);
  }

  if (commandName === "profile") {
    return runProfileCommand(interaction.data?.options ?? [], userId);
  }

  return "Unknown command.";
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

  if (subcommand.name === "bio") {
    const text = stringOption(subcommand.options, "text");
    if (!text) return "Please provide bio text.";

    return (await updateBio(userId, text)).message;
  }

  if (subcommand.name === "view") {
    return (await viewProfile(userId)).message;
  }

  if (subcommand.name === "birthday") {
    const month = numberOption(subcommand.options, "month");
    const day = numberOption(subcommand.options, "day");
    if (!month || !day) return "Please provide a month and day.";

    return (await updateBirthday(userId, month, day)).message;
  }

  if (subcommand.name === "jobs") {
    return runJobsCommand(subcommand.options ?? [], userId);
  }

  return "Unknown profile action.";
}

async function runJobsCommand(options: DiscordOption[], userId: string): Promise<string> {
  const subcommand = options[0];
  if (!subcommand) return "Please choose add or remove.";

  const job = stringOption(subcommand.options, "job");
  if (!job) return "Please choose a job.";

  if (subcommand.name === "add") {
    return (await addJob(userId, job)).message;
  }

  if (subcommand.name === "remove") {
    return (await removeJob(userId, job)).message;
  }

  return "Unknown jobs action.";
}

function stringOption(options: DiscordOption[] | undefined, name: string): string | null {
  const value = options?.find((option) => option.name === name)?.value;
  return typeof value === "string" ? value : null;
}

function numberOption(options: DiscordOption[] | undefined, name: string): number | null {
  const value = options?.find((option) => option.name === name)?.value;
  return typeof value === "number" ? value : null;
}

function ephemeral(content: string) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral,
    },
  };
}
