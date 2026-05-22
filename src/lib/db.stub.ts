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
  encounters: [
    { id: 101, key: "m9",    label: "M9S",     name: "Vamp Fatale"            },
    { id: 102, key: "m10",   label: "M10S",    name: "Red Hot and Deep Blue"  },
    { id: 103, key: "m11",   label: "M11S",    name: "The Tyrant"             },
    { id: 104, key: "m12",   label: "M12S",    name: "Lindwurm"               },
    { id: 105, key: "m12s2", label: "M12S P2", name: "Lindwurm II"            },
  ],
};

// Stub members keyed by lodestoneId (new canonical key)
const STUB_MEMBERS = {
  "11111001": { name: "Chow Chow",       server: "Sophia", fflogsId: "20385598", avatarUrl: null, fcRank: "Boss"     },
  "11111002": { name: "Axo Lotl",        server: "Sophia", fflogsId: "19133850", avatarUrl: null, fcRank: "Underpaw" },
  "11111003": { name: "Sweet Potatoes",  server: "Sophia", fflogsId: "20806122", avatarUrl: null, fcRank: "Underpaw" },
  "11111004": { name: "Zalka Tohka",     server: "Sophia", fflogsId: "19039587", avatarUrl: null, fcRank: "Housecat" },
  "11111005": { name: "Astrid Gertrud",  server: "Sophia", fflogsId: "19746452", avatarUrl: null, fcRank: "Housecat" },
  "11111006": { name: "Blue Belladonna", server: "Sophia", fflogsId: "20962142", avatarUrl: null, fcRank: "Stray"    },
  "11111007": { name: "Hane Miko",       server: "Sophia", fflogsId: "18468313", avatarUrl: null, fcRank: "Stray"    },
  "11111008": { name: "Jellyfish Cat",   server: "Sophia", fflogsId: "20739994", avatarUrl: null, fcRank: "Friend"   },
};

// Parses keyed by lodestoneId (matching STUB_MEMBERS keys)
const STUB_PARSES = {
  "11111001": {
    savage: {
      m9:  { percentile: 93.9, rdps: 38434, job: "Dragoon" },
      m10: { percentile: 82.8, rdps: 40483, job: "Dragoon" },
      m11: { percentile: 35.7, rdps: 38987, job: "Dragoon" },
      m12: { percentile: 80.0, rdps: 42899, job: "Dragoon" },
    },
    normal: {
      m9:  { percentile: 40.9, rdps: 26625, job: "Dragoon" },
      m12: { percentile: 91.7, rdps: 36395, job: "Dragoon" },
    },
    allStars: { points: 403.5, worldRank: 5095, regionRank: 72, serverRank: 15, rankPercent: 53.5, spec: "Dragoon" },
  },
  "11111002": {
    savage: {
      m9:  { percentile: 67.2, rdps: 31020, job: "Black Mage" },
      m10: { percentile: 71.5, rdps: 33100, job: "Black Mage" },
      m11: { percentile: 58.3, rdps: 29800, job: "Black Mage" },
      m12: { percentile: 55.0, rdps: 30200, job: "Black Mage" },
    },
    normal: {
      m9:  { percentile: 52.1, rdps: 22300, job: "Black Mage" },
    },
    allStars: { points: 280.0, worldRank: 8200, regionRank: 115, serverRank: 22, rankPercent: 40.2, spec: "Black Mage" },
  },
  "11111003": {
    savage: {
      m9:  { percentile: 99.1, rdps: 19800, job: "White Mage" },
      m10: { percentile: 97.3, rdps: 20100, job: "White Mage" },
      m12: { percentile: 95.8, rdps: 21200, job: "White Mage" },
    },
    normal: {
      m9:  { percentile: 88.4, rdps: 15600, job: "White Mage" },
    },
    allStars: { points: 512.0, worldRank: 1840, regionRank: 28, serverRank: 5, rankPercent: 84.1, spec: "White Mage" },
  },
  "11111004": {
    savage: {
      m9:  { percentile: 78.4, rdps: 22100, job: "Dark Knight" },
      m11: { percentile: 61.2, rdps: 20800, job: "Dark Knight" },
      m12: { percentile: 74.5, rdps: 23400, job: "Dark Knight" },
    },
    normal: {},
    allStars: { points: 330.0, worldRank: 6800, regionRank: 98, serverRank: 18, rankPercent: 46.0, spec: "Dark Knight" },
  },
  "11111005": {
    savage: {
      m9:  { percentile: 55.6, rdps: 29500, job: "Reaper" },
      m10: { percentile: 48.2, rdps: 28100, job: "Reaper" },
    },
    normal: {
      m9:  { percentile: 61.0, rdps: 21800, job: "Reaper" },
      m10: { percentile: 70.3, rdps: 23400, job: "Reaper" },
    },
    allStars: null,
  },
  "11111006": {
    savage: {
      m9:  { percentile: 100,  rdps: 45200, job: "Samurai" },
      m10: { percentile: 98.5, rdps: 47300, job: "Samurai" },
      m11: { percentile: 96.2, rdps: 44100, job: "Samurai" },
      m12: { percentile: 99.2, rdps: 49800, job: "Samurai" },
    },
    normal: {
      m12: { percentile: 97.1, rdps: 38900, job: "Samurai" },
    },
    allStars: { points: 580.0, worldRank: 420, regionRank: 8, serverRank: 1, rankPercent: 96.2, spec: "Samurai" },
  },
  "11111007": {
    savage: {
      m9:  { percentile: 82.3, rdps: 18900, job: "Scholar" },
      m10: { percentile: 76.5, rdps: 19400, job: "Scholar" },
      m11: { percentile: 69.8, rdps: 17800, job: "Scholar" },
    },
    normal: {},
    allStars: { points: 350.0, worldRank: 5500, regionRank: 80, serverRank: 14, rankPercent: 50.3, spec: "Scholar" },
  },
  "11111008": {
    savage: {},
    normal: {
      m9:  { percentile: 44.1, rdps: 17200, job: "Summoner" },
      m10: { percentile: 38.7, rdps: 16800, job: "Summoner" },
    },
    allStars: null,
  },
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
    zones: {
      73: {
        meta: ZONE_73_META,
        lastUpdated: NOW - 15 * 60_000,
        recentKill: {
          encounterName: "Lindwurm",
          encounterKey: "m12",
          difficulty: "Savage",
          date: NOW - 2 * DAY,
          reportCode: "stubcode",
        },
        firstKills: {
          m9:    { encounterName: "Vamp Fatale",           date: NOW - 90 * DAY, reportCode: "fk1abc" },
          m10:   { encounterName: "Red Hot and Deep Blue", date: NOW - 80 * DAY, reportCode: "fk2abc" },
          m11:   { encounterName: "The Tyrant",            date: NOW - 62 * DAY, reportCode: "fk3abc" },
          m12:   { encounterName: "Lindwurm",              date: NOW - 41 * DAY, reportCode: "fk4abc" },
          m12s2: { encounterName: "Lindwurm II",           date: NOW - 14 * DAY, reportCode: "fk5abc" },
        },
        histogram: {
          m9:    { savage: { grey:1, green:3, blue:5, purple:8, orange:3, pink:1, gold:0 }, normal: { grey:2, green:6, blue:5, purple:4, orange:2, pink:1, gold:0 } },
          m10:   { savage: { grey:2, green:4, blue:4, purple:6, orange:2, pink:1, gold:0 }, normal: { grey:3, green:5, blue:5, purple:3, orange:2, pink:0, gold:0 } },
          m11:   { savage: { grey:3, green:5, blue:4, purple:4, orange:1, pink:1, gold:0 }, normal: { grey:4, green:6, blue:4, purple:3, orange:1, pink:0, gold:0 } },
          m12:   { savage: { grey:2, green:3, blue:3, purple:4, orange:2, pink:1, gold:0 }, normal: { grey:2, green:4, blue:5, purple:3, orange:2, pink:1, gold:0 } },
          m12s2: { savage: { grey:5, green:3, blue:2, purple:1, orange:0, pink:0, gold:0 }, normal: { grey:0, green:0, blue:0, purple:0, orange:0, pink:0, gold:0 } },
        },
        parses: STUB_PARSES,
      },
    },
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
