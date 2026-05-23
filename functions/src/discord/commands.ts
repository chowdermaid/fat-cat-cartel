export const FFXIV_JOBS = [
  "Paladin",
  "Warrior",
  "Dark Knight",
  "Gunbreaker",
  "White Mage",
  "Scholar",
  "Astrologian",
  "Sage",
  "Monk",
  "Dragoon",
  "Ninja",
  "Samurai",
  "Reaper",
  "Viper",
  "Bard",
  "Machinist",
  "Dancer",
  "Black Mage",
  "Summoner",
  "Red Mage",
  "Pictomancer",
] as const;

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
    description: "View or update your Fat Cat Cartel profile.",
    options: [
      {
        name: "bio",
        description: "Update your profile bio.",
        type: 1,
        options: [
          {
            name: "text",
            description: "A short bio for your member profile.",
            type: 3,
            required: true,
            max_length: 500,
          },
        ],
      },
      {
        name: "view",
        description: "View your linked profile summary.",
        type: 1,
      },
      {
        name: "birthday",
        description: "Update your profile birthday.",
        type: 1,
        options: [
          {
            name: "month",
            description: "Birthday month.",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 12,
          },
          {
            name: "day",
            description: "Birthday day.",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 31,
          },
        ],
      },
      {
        name: "jobs",
        description: "Update your main jobs.",
        type: 2,
        options: [
          {
            name: "add",
            description: "Add a main job.",
            type: 1,
            options: [
              {
                name: "job",
                description: "The job to add.",
                type: 3,
                required: true,
                choices: jobChoices(),
              },
            ],
          },
          {
            name: "remove",
            description: "Remove a main job.",
            type: 1,
            options: [
              {
                name: "job",
                description: "The job to remove.",
                type: 3,
                required: true,
                choices: jobChoices(),
              },
            ],
          },
        ],
      },
    ],
  },
] as const;

function jobChoices() {
  return FFXIV_JOBS.map((job) => ({ name: job, value: job }));
}
