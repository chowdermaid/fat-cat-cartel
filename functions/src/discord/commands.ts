export const DISCORD_COMMANDS = [
  {
    name: "help",
    description: "Show Fat Cat Cartel Discord commands.",
  },
  {
    name: "link",
    description: "Link your Discord account to your Fat Cat Cartel profile.",
    options: [
      {
        name: "lodestone_id",
        description: "Your Lodestone character ID.",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "friend",
    description: "Sign up or check your Friend tracking status.",
    options: [
      {
        name: "signup",
        description: "Add yourself as a tracked Friend by Lodestone ID.",
        type: 1,
        options: [
          {
            name: "lodestone_id",
            description: "Your Lodestone character ID.",
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: "status",
        description: "Check your linked Friend tracking status.",
        type: 1,
      },
    ],
  },
  {
    name: "profile",
    description: "View your linked Fat Cat Cartel profile.",
    options: [
      {
        name: "view",
        description: "View your linked profile summary.",
        type: 1,
      },
    ],
  },
  {
    name: "clear-channel",
    description: "Clear recent messages from this channel.",
    dm_permission: false,
  },
] as const;
