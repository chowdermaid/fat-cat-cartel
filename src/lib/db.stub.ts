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

// Stub members keyed by lodestoneId (new canonical key)
const STUB_MEMBERS = {
  "11111001": { name: "Chow Chow",       server: "Sophia", avatarUrl: null, fcRank: "Boss", jobLevels: sampleJobLevels(), jobLevelsLastFetched: NOW - 900_000, tomestoneProfile: { datacenter: "Materia", achievementPoints: 21400, totalMounts: 192, totalMinions: 301 } },
  "11111002": { name: "Axo Lotl",        server: "Sophia", avatarUrl: null, fcRank: "Underpaw", jobLevels: { ...sampleJobLevels(), Paladin: null, Warrior: 100, Dragoon: 82, Carpenter: 12 }, jobLevelsLastFetched: NOW - 900_000 },
  "11111003": { name: "Sweet Potatoes",  server: "Sophia", avatarUrl: null, fcRank: "Underpaw" },
  "11111004": { name: "Zalka Tohka",     server: "Sophia", avatarUrl: null, fcRank: "Housecat" },
  "11111005": { name: "Astrid Gertrud",  server: "Sophia", avatarUrl: null, fcRank: "Housecat" },
  "11111006": { name: "Blue Belladonna", server: "Sophia", avatarUrl: null, fcRank: "Stray" },
  "11111007": { name: "Hane Miko",       server: "Sophia", avatarUrl: null, fcRank: "Stray" },
  "11111008": { name: "Jellyfish Cat",   server: "Sophia", avatarUrl: null, fcRank: "Friend" },
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
      quote: "git gud",
      mainJobs: ["Dark Knight", "Paladin"],
      pronouns: "they/them",
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
