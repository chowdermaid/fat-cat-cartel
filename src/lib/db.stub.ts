/**
 * In-memory stub that mirrors the Firebase Realtime Database API surface
 * used in this app. Seeded with fake data for local development.
 */

export interface StubRef {
  path: string;
}

interface StubSnapshot {
  val(): unknown;
  exists(): boolean;
}

type Unsubscribe = () => void;
type Callback = (snap: StubSnapshot) => void;

// ---------------------------------------------------------------------------
// Seeded data; edit freely for local testing
// ---------------------------------------------------------------------------
const NOW = Date.now();
const DAY = 86_400_000;

const ZONE_73_META = {
  id: 73,
  name: "AAC Heavyweight",
  shortName: "Heavyweight",
  contentType: "savage",
  tomestoneCategory: "raids",
  tomestoneZone: "aac-heavyweight-savage",
  tomestoneExpansion: "dawntrail",
  encounters: [
    { id: 101, key: "m9",    label: "M9S",     name: "Vamp Fatale",          tomestoneCanonicalName: "vamp-fatale" },
    { id: 102, key: "m10",   label: "M10S",    name: "Red Hot and Deep Blue", tomestoneCanonicalName: "red-hot-deep-blue" },
    { id: 103, key: "m11",   label: "M11S",    name: "The Tyrant",            tomestoneCanonicalName: "the-tyrant" },
    { id: 104, key: "m12",   label: "M12S",    name: "Lindwurm",              tomestoneCanonicalName: "lindwurm" },
    { id: 105, key: "m12s2", label: "M12S P2", name: "Lindwurm II",           tomestoneCanonicalName: "lindwurm-ii" },
  ],
};

function sampleJobLevels() {
  return {
    Paladin: 100,
    Warrior: 92,
    "Dark Knight": 100,
    Gunbreaker: 88,
    "White Mage": 74,
    Scholar: 100,
    Astrologian: 64,
    Sage: 100,
    Monk: 55,
    Dragoon: 100,
    Ninja: 47,
    Samurai: 90,
    Reaper: 100,
    Viper: 100,
    Bard: 61,
    Machinist: 82,
    Dancer: 100,
    "Black Mage": 30,
    Summoner: 100,
    "Red Mage": 91,
    Pictomancer: 96,
    "Blue Mage": 80,
    Carpenter: 100,
    Blacksmith: 84,
    Armorer: 82,
    Goldsmith: 100,
    Leatherworker: 79,
    Weaver: 100,
    Alchemist: 90,
    Culinarian: 100,
    Miner: 100,
    Botanist: 100,
    Fisher: 73,
  };
}

function maxedJobLevels() {
  return Object.fromEntries(
    Object.entries(sampleJobLevels()).map(([job]) => [job, job === "Blue Mage" ? 80 : 100]),
  );
}

// Stub members keyed by lodestoneId (new canonical key)
const STUB_MEMBERS = {
  "11111001": { name: "Chow Chow",       server: "Sophia", avatarUrl: "/favicon.svg", fcRank: "Boss", jobLevels: maxedJobLevels(), jobLevelsLastFetched: NOW - 900_000, tomestoneProfile: { datacenter: "Materia", portrait: "/icons.svg", achievementPoints: 21400, totalMounts: 192, totalMinions: 301 } },
  "11111002": { name: "Axo Lotl",        server: "Sophia", avatarUrl: null, fcRank: "Underpaw", jobLevels: { ...sampleJobLevels(), Paladin: null, Warrior: 100, Dragoon: 82, Carpenter: 12 }, jobLevelsLastFetched: NOW - 900_000, tomestoneProfile: { datacenter: "Materia", achievementPoints: 18620, totalMounts: 148, totalMinions: 226 } },
  "11111003": { name: "Sweet Potatoes",  server: "Sophia", avatarUrl: null, fcRank: "Underpaw", tomestoneProfile: { datacenter: "Materia", achievementPoints: 17310, totalMounts: 121, totalMinions: 204 } },
  "11111004": { name: "Zalka Tohka",     server: "Sophia", avatarUrl: null, fcRank: "Housecat", tomestoneProfile: { datacenter: "Materia", achievementPoints: 15480, totalMounts: 96, totalMinions: 171 } },
  "11111005": { name: "Astrid Gertrud",  server: "Sophia", avatarUrl: null, fcRank: "Housecat", tomestoneProfile: { datacenter: "Materia", achievementPoints: 20150, totalMounts: 174, totalMinions: 249 } },
  "11111006": { name: "Blue Belladonna", server: "Sophia", avatarUrl: null, fcRank: "Stray", tomestoneProfile: { datacenter: "Materia", achievementPoints: 13200, totalMounts: 83, totalMinions: 142 } },
  "11111007": { name: "Hane Miko",       server: "Sophia", avatarUrl: null, fcRank: "Stray", tomestoneProfile: { datacenter: "Materia", achievementPoints: 11940, totalMounts: 77, totalMinions: 133 } },
  "11111008": { name: "Jellyfish Cat",   server: "Sophia", avatarUrl: null, fcRank: "Friend", tomestoneProfile: { datacenter: "Materia", achievementPoints: 10110, totalMounts: 64, totalMinions: 118 } },
};

const STUB_PARSES = {
  "11111001": {
    savage: {
      m9: { percentile: 93.9, rdps: 38434, job: "Dragoon" },
      m10: { percentile: 82.8, rdps: 40483, job: "Dragoon" },
      m11: { percentile: 35.7, rdps: 38987, job: "Dragoon" },
      m12: { percentile: 80.0, rdps: 42899, job: "Dragoon" },
    },
    normal: {},
    allStars: { points: 403.5, worldRank: 5095, regionRank: 72, serverRank: 15, rankPercent: 53.5, spec: "Dragoon" },
  },
  "11111002": {
    savage: {
      m9: { percentile: 67.2, rdps: 31020, job: "Black Mage" },
      m10: { percentile: 71.5, rdps: 33100, job: "Black Mage" },
    },
    normal: {},
    allStars: null,
  },
  "11111008": {
    savage: {},
    normal: {
      m9: { percentile: 44.1, rdps: 17200, job: "Summoner" },
    },
    allStars: null,
  },
};

const STUB_HISTOGRAM = {
  m9: { savage: { grey: 1, green: 1, blue: 2, purple: 1, orange: 1, pink: 0, gold: 0 }, normal: { grey: 1, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 } },
  m10: { savage: { grey: 0, green: 1, blue: 1, purple: 1, orange: 0, pink: 0, gold: 0 }, normal: { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 } },
  m11: { savage: { grey: 1, green: 1, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 }, normal: { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 } },
  m12: { savage: { grey: 0, green: 0, blue: 0, purple: 1, orange: 0, pink: 0, gold: 0 }, normal: { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 } },
  m12s2: { savage: { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 }, normal: { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 } },
};

const STUB_COLLECTIBLES_MOUNTS = {
  "1":  { id: 1,  name: "Company Chocobo",    icon: "", patch: "2.0", owned: "10000", sources: [{ type: "Quest",       text: "" }] },
  "2":  { id: 2,  name: "Nightmare",           icon: "", patch: "2.0", owned: "5000",  sources: [{ type: "Trial",       text: "" }] },
  "3":  { id: 3,  name: "Aithon",              icon: "", patch: "2.2", owned: "4000",  sources: [{ type: "Trial",       text: "" }] },
  "4":  { id: 4,  name: "Xanthos",             icon: "", patch: "2.2", owned: "3800",  sources: [{ type: "Trial",       text: "" }] },
  "5":  { id: 5,  name: "Enbarr",              icon: "", patch: "2.3", owned: "3500",  sources: [{ type: "Trial",       text: "" }] },
  "6":  { id: 6,  name: "Markab",              icon: "", patch: "2.4", owned: "3200",  sources: [{ type: "Trial",       text: "" }] },
  "7":  { id: 7,  name: "Boreas",              icon: "", patch: "2.5", owned: "3000",  sources: [{ type: "Trial",       text: "" }] },
  "8":  { id: 8,  name: "Ravana",              icon: "", patch: "3.1", owned: "2800",  sources: [{ type: "Trial",       text: "" }] },
  "9":  { id: 9,  name: "Bismarck",            icon: "", patch: "3.2", owned: "2600",  sources: [{ type: "Trial",       text: "" }] },
  "10": { id: 10, name: "Sephirot",            icon: "", patch: "3.3", owned: "2400",  sources: [{ type: "Trial",       text: "" }] },
  "11": { id: 11, name: "Faust",               icon: "", patch: "3.4", owned: "900",   sources: [{ type: "Raid",        text: "" }] },
  "12": { id: 12, name: "Alte Roite",          icon: "", patch: "4.0", owned: "800",   sources: [{ type: "Raid",        text: "" }] },
};

const STUB_COLLECTIBLES_MINIONS = {
  "1":  { id: 1,  name: "Slime",            icon: "", patch: "2.0", owned: "9000" },
  "2":  { id: 2,  name: "Cait Sith Doll",   icon: "", patch: "2.0", owned: "7000" },
  "3":  { id: 3,  name: "Poro Roggo",       icon: "", patch: "2.1", owned: "4500" },
  "4":  { id: 4,  name: "Wind-up Edvya",    icon: "", patch: "2.2", owned: "1200" },
  "5":  { id: 5,  name: "Wind-up Scathach", icon: "", patch: "4.1", owned: "320"  },
  "6":  { id: 6,  name: "Accompaniment Node", icon: "", patch: "3.0", owned: "850" },
};

const STUB_MEMBER_DATA: Record<string, unknown> = {
  "11111001": {
    avatar: "",
    owned: { mounts: [1, 2, 3], minions: [1, 2, 4], titles: [], achievements: [] },
    previousOwned: { mounts: { count: 2, asOf: Date.now() - 86_400_000 }, minions: { count: 0, asOf: 0 }, titles: { count: 0, asOf: 0 }, achievements: { count: 0, asOf: 0 } },
    lastFetched: Date.now() - 900_000,
  },
  "11111002": {
    avatar: "",
    owned: { mounts: [1, 2, 4, 11], minions: [1, 3, 5], titles: [], achievements: [] },
    previousOwned: { mounts: { count: 3, asOf: Date.now() - 86_400_000 }, minions: { count: 0, asOf: 0 }, titles: { count: 0, asOf: 0 }, achievements: { count: 0, asOf: 0 } },
    lastFetched: Date.now() - 900_000,
  },
  "11111003": {
    avatar: "",
    owned: { mounts: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12], minions: [1, 2, 3, 4, 5, 6], titles: [], achievements: [] },
    previousOwned: { mounts: { count: 9, asOf: Date.now() - 86_400_000 }, minions: { count: 0, asOf: 0 }, titles: { count: 0, asOf: 0 }, achievements: { count: 0, asOf: 0 } },
    lastFetched: Date.now() - 900_000,
  },
};

function progress(
  cleared: boolean,
  latestActivityAt: number | null,
  job: string | null,
  clearCount: number,
  wipeCount: number,
  bestProgress: number | null,
) {
  return {
    cleared,
    firstClearAt: cleared ? (latestActivityAt ?? NOW) - 7 * DAY : null,
    latestClearAt: cleared ? latestActivityAt : null,
    latestActivityAt,
    job,
    jobAbbr: job ? job.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase() : null,
    clearCount,
    wipeCount,
    bestProgress,
    bestKillDuration: cleared ? "8:52" : null,
    latestKillDuration: cleared ? "8:52" : null,
  };
}

const STUB_ZONE_MEMBERS = {
  "11111001": {
    encounters: {
      m9: progress(true, NOW - 2 * DAY, "Dragoon", 2, 1, 0),
      m10: progress(true, NOW - 2 * DAY, "Dragoon", 2, 0, 0),
      m11: progress(true, NOW - 2 * DAY, "Dragoon", 1, 4, 0),
      m12: progress(true, NOW - 2 * DAY, "Dragoon", 1, 2, 0),
      m12s2: progress(false, NOW - DAY, "Dragoon", 0, 6, 33.2),
    },
    latestActivityAt: NOW - DAY,
    clearCount: 6,
    wipeCount: 13,
    mostPlayedJob: "Dragoon",
  },
  "11111002": {
    encounters: {
      m9: progress(true, NOW - 3 * DAY, "Black Mage", 1, 2, 0),
      m10: progress(true, NOW - 3 * DAY, "Black Mage", 1, 1, 0),
      m11: progress(false, NOW - 3 * DAY, "Black Mage", 0, 5, 51.2),
      m12: progress(false, null, null, 0, 0, null),
      m12s2: progress(false, null, null, 0, 0, null),
    },
    latestActivityAt: NOW - 3 * DAY,
    clearCount: 2,
    wipeCount: 8,
    mostPlayedJob: "Black Mage",
  },
  "11111008": {
    encounters: {
      m9: progress(true, NOW - 5 * DAY, "Summoner", 1, 0, 0),
      m10: progress(false, NOW - 5 * DAY, "Summoner", 0, 3, 62.4),
      m11: progress(false, null, null, 0, 0, null),
      m12: progress(false, null, null, 0, 0, null),
      m12s2: progress(false, null, null, 0, 0, null),
    },
    latestActivityAt: NOW - 5 * DAY,
    clearCount: 1,
    wipeCount: 3,
    mostPlayedJob: "Summoner",
  },
};

const STUB_RECENT_ACTIVITY = [
  {
    id: "stub-a1",
    lodestoneId: "11111001",
    encounterKey: "m12s2",
    encounterName: "Lindwurm II",
    zoneId: 73,
    zoneName: "AAC Heavyweight",
    contentType: "savage",
    job: "Dragoon",
    jobAbbr: "DRG",
    startedAt: NOW - DAY,
    endedAt: NOW - DAY + 540_000,
    clearCount: 0,
    wipeCount: 6,
    bestProgress: 33.2,
    killDuration: null,
    reportUrl: null,
    participantCount: 8,
  },
  {
    id: "stub-a2",
    lodestoneId: "11111001",
    encounterKey: "m12",
    encounterName: "Lindwurm",
    zoneId: 73,
    zoneName: "AAC Heavyweight",
    contentType: "savage",
    job: "Dragoon",
    jobAbbr: "DRG",
    startedAt: NOW - 2 * DAY,
    endedAt: NOW - 2 * DAY + 520_000,
    clearCount: 1,
    wipeCount: 2,
    bestProgress: 0,
    killDuration: "8:52",
    reportUrl: null,
    participantCount: 8,
  },
  {
    id: "stub-a3",
    lodestoneId: "11111002",
    encounterKey: "m11",
    encounterName: "The Tyrant",
    zoneId: 73,
    zoneName: "AAC Heavyweight",
    contentType: "savage",
    job: "Black Mage",
    jobAbbr: "BLM",
    startedAt: NOW - 3 * DAY,
    endedAt: NOW - 3 * DAY + 600_000,
    clearCount: 0,
    wipeCount: 5,
    bestProgress: 51.2,
    killDuration: null,
    reportUrl: null,
    participantCount: 8,
  },
];

const STUB_CRAFTING_MEMBER_CHOW = {
  lodestoneId: "11111001",
  discordUserId: "stub-discord-chow",
  characterName: "Chow Chow",
  fcRank: "Boss",
  avatarUrl: "/favicon.svg",
};

const STUB_CRAFTING_MEMBER_AXO = {
  lodestoneId: "11111002",
  discordUserId: "stub-discord-axo",
  characterName: "Axo Lotl",
  fcRank: "Underpaw",
  avatarUrl: null,
};

const STUB_CRAFTING_MEMBER_ZALKA = {
  lodestoneId: "11111004",
  discordUserId: "stub-discord-zalka",
  characterName: "Zalka Tohka",
  fcRank: "Housecat",
  avatarUrl: null,
};

const STUB_CRAFTING_RECIPE_SNAPSHOT = {
  recipeId: 35209,
  itemId: 36044,
  itemName: "Classical Longsword",
  amountResult: 1,
  crafter: "Blacksmith",
  recipeLevel: 90,
  ingredients: [
    { itemId: 36040, name: "Classical Ingot", amount: 3 },
    { itemId: 36041, name: "Classical Rivets", amount: 1 },
  ],
  crystals: [
    { itemId: 8, name: "Fire Crystal", amount: 8 },
  ],
  clusters: [
    { itemId: 14, name: "Earth Cluster", amount: 2 },
  ],
  precrafts: [
    {
      itemId: 36040,
      itemName: "Classical Ingot",
      quantity: 3,
      recipeId: 35188,
      crafter: "Blacksmith",
      recipeLevel: 90,
    },
  ],
  eligibleCrafters: [
    {
      ...STUB_CRAFTING_MEMBER_CHOW,
      job: "Blacksmith",
      level: 100,
    },
  ],
  snapshottedAt: NOW - 2 * DAY,
  source: "xivapi",
};

function craftingDashboardRecord(
  request: Record<string, unknown>,
): Record<string, unknown> {
  const items = request.items as Array<{ itemName: string }> | undefined;
  return {
    id: request.id,
    status: request.status,
    materialStatus: request.materialStatus,
    requester: request.requester,
    acceptedBy: request.acceptedBy ?? null,
    commission: request.commission ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt,
    itemCount: items?.length ?? 0,
    itemNames: items?.map((item) => item.itemName) ?? [],
    items,
  };
}

const STUB_CRAFTING_REQUESTS: Record<string, Record<string, unknown>> = {
  "stub-craft-open": {
    id: "stub-craft-open",
    status: "open",
    materialStatus: "requester_has_some_materials",
    requester: STUB_CRAFTING_MEMBER_ZALKA,
    commission: {
      offered: true,
      gil: 250000,
    },
    items: [
      {
        itemId: 36044,
        itemName: "Classical Longsword",
        quantity: 1,
        selectedRecipeId: 35209,
        recipeSnapshot: STUB_CRAFTING_RECIPE_SNAPSHOT,
      },
    ],
    discordMessage: {
      channelId: "stub-crafting-channel",
      messageId: "stub-craft-open-message",
      url: "https://discord.com/channels/stub/stub-crafting-channel/stub-craft-open-message",
    },
    createdAt: NOW - 2 * DAY,
    updatedAt: NOW - 2 * DAY,
    completedAt: null,
  },
  "stub-craft-progress": {
    id: "stub-craft-progress",
    status: "in_progress",
    materialStatus: "crafter_to_provide_materials",
    requester: STUB_CRAFTING_MEMBER_ZALKA,
    commission: null,
    acceptedBy: {
      ...STUB_CRAFTING_MEMBER_CHOW,
      acceptedAt: NOW - DAY,
    },
    items: [
      {
        itemId: 36044,
        itemName: "Classical Longsword",
        quantity: 2,
        selectedRecipeId: 35209,
        recipeSnapshot: STUB_CRAFTING_RECIPE_SNAPSHOT,
      },
    ],
    discordMessage: {
      channelId: "stub-crafting-channel",
      messageId: "stub-craft-progress-message",
      url: "https://discord.com/channels/stub/stub-crafting-channel/stub-craft-progress-message",
    },
    createdAt: NOW - 2 * DAY,
    updatedAt: NOW - DAY,
    completedAt: null,
  },
  "stub-craft-completed-recent": {
    id: "stub-craft-completed-recent",
    status: "completed",
    materialStatus: "requester_has_all_materials",
    requester: STUB_CRAFTING_MEMBER_AXO,
    commission: {
      offered: true,
      gil: null,
    },
    acceptedBy: {
      ...STUB_CRAFTING_MEMBER_CHOW,
      acceptedAt: NOW - 4 * DAY,
    },
    items: [
      {
        itemId: 36044,
        itemName: "Classical Longsword",
        quantity: 1,
        selectedRecipeId: 35209,
        recipeSnapshot: STUB_CRAFTING_RECIPE_SNAPSHOT,
      },
    ],
    discordMessage: {
      channelId: "stub-crafting-channel",
      messageId: "stub-craft-completed-message",
      url: "https://discord.com/channels/stub/stub-crafting-channel/stub-craft-completed-message",
    },
    createdAt: NOW - 5 * DAY,
    updatedAt: NOW - 3 * DAY,
    completedAt: NOW - 3 * DAY,
  },
  "stub-craft-completed-old": {
    id: "stub-craft-completed-old",
    status: "completed",
    materialStatus: "requester_has_all_materials",
    requester: STUB_CRAFTING_MEMBER_AXO,
    commission: null,
    acceptedBy: {
      ...STUB_CRAFTING_MEMBER_CHOW,
      acceptedAt: NOW - 42 * DAY,
    },
    items: [
      {
        itemId: 36044,
        itemName: "Classical Longsword",
        quantity: 1,
        selectedRecipeId: 35209,
        recipeSnapshot: STUB_CRAFTING_RECIPE_SNAPSHOT,
      },
    ],
    discordMessage: null,
    createdAt: NOW - 45 * DAY,
    updatedAt: NOW - 40 * DAY,
    completedAt: NOW - 40 * DAY,
  },
  "stub-craft-cancelled": {
    id: "stub-craft-cancelled",
    status: "cancelled",
    materialStatus: "requester_has_some_materials",
    requester: STUB_CRAFTING_MEMBER_ZALKA,
    items: [
      {
        itemId: 36044,
        itemName: "Classical Longsword",
        quantity: 1,
        selectedRecipeId: 35209,
        recipeSnapshot: STUB_CRAFTING_RECIPE_SNAPSHOT,
      },
    ],
    discordMessage: null,
    createdAt: NOW - 6 * DAY,
    updatedAt: NOW - 6 * DAY,
    completedAt: null,
    cancelledAt: NOW - 6 * DAY,
  },
};

const STUB_CRAFTING_INDEXES = {
  open: {
    "stub-craft-open": craftingDashboardRecord(STUB_CRAFTING_REQUESTS["stub-craft-open"]),
  },
  inProgress: {
    "stub-craft-progress": craftingDashboardRecord(STUB_CRAFTING_REQUESTS["stub-craft-progress"]),
  },
  completedRecent: {
    "stub-craft-completed-recent": craftingDashboardRecord(STUB_CRAFTING_REQUESTS["stub-craft-completed-recent"]),
    "stub-craft-completed-old": craftingDashboardRecord(STUB_CRAFTING_REQUESTS["stub-craft-completed-old"]),
  },
  cancelled: {
    "stub-craft-cancelled": craftingDashboardRecord(STUB_CRAFTING_REQUESTS["stub-craft-cancelled"]),
  },
};

let store: Record<string, unknown> = {
  members: STUB_MEMBERS,
  fcCollection: {
    collectibles: {
      lastFetched: Date.now() - 900_000,
      mounts: STUB_COLLECTIBLES_MOUNTS,
      minions: STUB_COLLECTIBLES_MINIONS,
      titles: {},
      achievements: {},
    },
    memberData: STUB_MEMBER_DATA,
  },
    memberProfiles: {
      "11111001": {
        bio: "Main tank of the FC. Chow is basically holding the group together with their bare hands.",
        birthday: "03-15",
        timezone: "Australia/Sydney",
      favoriteMountId: 2,
      favoriteMinionId: 4,
      favoriteContent: "Savage Raids",
        mainJobs: ["Dark Knight", "Paladin"],
        pronouns: "they/them",
      },
      "11111002": {
        bio: "Raid night regular with a suspiciously detailed spreadsheet for every plan, pull, and snack break.",
        birthday: "07-02",
        timezone: "Australia/Brisbane",
        favoriteMountId: 5,
        favoriteMinionId: 2,
        favoriteContent: "Extreme Trials",
        mainJobs: ["Black Mage", "Warrior"],
      },
      "11111003": {
        bio: "Quiet until treasure maps appear, then somehow already has markers, routes, and a party formed.",
        birthday: "11-19",
        timezone: "Asia/Singapore",
        favoriteMountId: 3,
        favoriteMinionId: 1,
        favoriteContent: "Treasure Maps",
        mainJobs: ["Scholar", "Summoner"],
      },
      "11111004": {
        bio: "Usually found helping newer members clear roulettes, unlock duties, or recover from questionable queue choices.",
        birthday: "01-28",
        timezone: "Australia/Melbourne",
        favoriteMountId: 4,
        favoriteMinionId: 3,
        favoriteContent: "Duty Roulettes",
        mainJobs: ["White Mage", "Dancer"],
      },
      "11111005": {
        bio: "Crafting board menace in the best way; turns vague requests into finished gear before anyone has blinked.",
        birthday: "05-09",
        timezone: "Asia/Tokyo",
        favoriteMountId: 6,
        favoriteMinionId: 4,
        favoriteContent: "Crafting",
        mainJobs: ["Weaver", "Goldsmith"],
      },
      "11111006": {
        bio: "Known for glamour experiments, casual chaos, and showing up with exactly the job the party forgot it needed.",
        birthday: "09-23",
        timezone: "Pacific/Auckland",
        favoriteMountId: 7,
        favoriteMinionId: 2,
        favoriteContent: "Glamour",
        mainJobs: ["Red Mage", "Viper"],
      },
      "11111007": {
        bio: "Keeps the FC chat alive with screenshots, callouts, and a sixth sense for when someone needs a queue buddy.",
        birthday: "12-04",
        timezone: "America/Los_Angeles",
        favoriteMountId: 1,
        favoriteMinionId: 1,
        favoriteContent: "Social Events",
        mainJobs: ["Bard", "Machinist"],
      },
      "11111008": {
        bio: "Friend of the FC with excellent timing, questionable teleport habits, and a strong commitment to joining late.",
        birthday: "04-17",
        timezone: "Europe/London",
        favoriteMountId: 2,
        favoriteMinionId: 3,
        favoriteContent: "Casual Raids",
        mainJobs: ["Summoner", "Sage"],
      },
    },
  raidStats: {
    lastUpdated: NOW - 15 * 60_000,
    sourceStatus: {
      source: "tomestone",
      checkedAt: NOW - 15 * 60_000,
      requestsThisRefresh: 16,
      trackedMembers: 8,
      failedMembers: 0,
    },
    zones: {
      73: {
        meta: ZONE_73_META,
        lastUpdated: NOW - 15 * 60_000,
        parses: STUB_PARSES,
        histogram: STUB_HISTOGRAM,
        recentKill: {
          encounterName: "Lindwurm",
          encounterKey: "m12",
          difficulty: "Savage",
          date: NOW - 2 * DAY,
          reportCode: "stubcode",
        },
        firstKills: {
          m9: { encounterName: "Vamp Fatale", date: NOW - 25 * DAY, reportCode: "fk1abc" },
          m10: { encounterName: "Red Hot and Deep Blue", date: NOW - 20 * DAY, reportCode: "fk2abc" },
        },
        members: STUB_ZONE_MEMBERS,
        recentActivity: STUB_RECENT_ACTIVITY,
      },
    },
  },
  memberActivity: {
    "11111001": { tomestone: { recent: STUB_RECENT_ACTIVITY.filter((activity) => activity.lodestoneId === "11111001") } },
    "11111002": { tomestone: { recent: STUB_RECENT_ACTIVITY.filter((activity) => activity.lodestoneId === "11111002") } },
  },
  calendarEvents: {
    "discordPlanner_stub-event": {
      title: "Mount Farm Night",
      description: "Bring your wish list and we will rotate through everyone.",
      startAt: NOW + 3 * DAY,
      endAt: NOW + 3 * DAY + 2 * 60 * 60_000,
      location: "Discord voice",
      source: "discordPlanner",
      sourceUrl: "https://discord.com/channels/stub/stub/stub",
      plannerMessageId: "stub-event",
      lastSyncedAt: NOW - 15 * 60_000,
      updatedAt: NOW - 15 * 60_000,
      status: "scheduled",
    },
  },
  calendarSync: {
    discordPlanner: {
      lastStartedAt: NOW - 15 * 60_000,
      lastSucceededAt: NOW - 15 * 60_000,
      importedCount: 1,
      skippedCount: 0,
      lastError: null,
      recentFailures: [],
    },
  },
  craftingRequests: STUB_CRAFTING_REQUESTS,
  craftingRequestIndexes: STUB_CRAFTING_INDEXES,
  craftingRequestStats: {
    completedTotal: 12,
  },
  events: {
    easter2026: {
      participants: {
        "stub-alice": {
          name: "Chow Chow",
          scores: { hideAndSeek: 10, trivia: 7, eorzoaGuessr: 9 },
          total: 26,
        },
        "stub-bob": {
          name: "Axo Lotl",
          scores: { hideAndSeek: 6, trivia: 9, eorzoaGuessr: 7 },
          total: 22,
        },
        "stub-charlie": {
          name: "Sweet Potatoes",
          scores: { hideAndSeek: 8, trivia: 10, eorzoaGuessr: 6 },
          total: 24,
        },
        "stub-david": {
          name: "Zalka Tohka",
          scores: { hideAndSeek: 8, trivia: 10, eorzoaGuessr: 6 },
          total: 24,
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
const listeners = new Map<string, Set<Callback>>();

function getAtPath(path: string): unknown {
  if (!path) return store;
  const parts = path.split("/").filter(Boolean);
  let node: unknown = store;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[part];
  }
  return node ?? null;
}

function setAtPath(path: string, value: unknown): void {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    store = value as Record<string, unknown>;
    return;
  }
  let node = store as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] == null) node[parts[i]] = {};
    node = node[parts[i]] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (value == null) {
    delete node[last];
  } else {
    node[last] = value;
  }
}

function makeSnapshot(path: string): StubSnapshot {
  const value = getAtPath(path);
  return {
    val: () => value,
    exists: () => value != null,
  };
}

function notifyPath(path: string): void {
  listeners.get(path)?.forEach((cb) => cb(makeSnapshot(path)));
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (parent !== path) {
    listeners.get(parent)?.forEach((cb) => cb(makeSnapshot(parent)));
  }
}

// ---------------------------------------------------------------------------
// Exported stub functions (same call signatures as firebase/database exports)
// ---------------------------------------------------------------------------
export const stubDb = {};

export function stubRef(_db: unknown, path: string): StubRef {
  return { path };
}

export function stubOnValue(
  r: StubRef,
  callback: Callback,
  _onError?: (e: Error) => void,
): Unsubscribe {
  void _onError;
  if (!listeners.has(r.path)) listeners.set(r.path, new Set());
  listeners.get(r.path)!.add(callback);
  setTimeout(() => callback(makeSnapshot(r.path)), 0);
  return () => listeners.get(r.path)?.delete(callback);
}

export function stubGet(r: StubRef): Promise<StubSnapshot> {
  return Promise.resolve(makeSnapshot(r.path));
}

export function stubSet(r: StubRef, value: unknown): Promise<void> {
  setAtPath(r.path, value);
  notifyPath(r.path);
  return Promise.resolve();
}

export function stubUpdate(r: StubRef, values: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    const path = r.path ? `${r.path}/${key}` : key;
    setAtPath(path, value);
    notifyPath(path);
  }
  return Promise.resolve();
}

let counter = 0;
export function stubPush(r: StubRef, value: unknown): Promise<{ key: string }> {
  const key = `stub-${++counter}-${Date.now()}`;
  setAtPath(`${r.path}/${key}`, value);
  notifyPath(r.path);
  return Promise.resolve({ key });
}

export function stubRemove(r: StubRef): Promise<void> {
  setAtPath(r.path, null);
  const parent = r.path.includes("/")
    ? r.path.slice(0, r.path.lastIndexOf("/"))
    : "";
  notifyPath(parent);
  return Promise.resolve();
}
