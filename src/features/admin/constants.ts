import type { MemberProfile } from "@/features/member-profile/types";
import type { SyncSource } from "./types";

export const REGION = "us-central1";
export const USE_FUNCTIONS_EMULATOR =
  import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true";

export const SESSION_KEY = "admin_session_token";
export const SESSION_ADMIN_KEY = "admin_session_is_admin";
export const SESSION_EVENT = "admin-session-change";
export const LOGIN_TOAST_KEY = "admin_login_toast_pending";
export const LOCAL_DEV_ADMIN_SESSION_TOKEN = "local-dev-admin-session-token-00000001";
export const ADMIN_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_ADMIN_AUTH_BYPASS === "true";

export const FC_RANKS = ["Boss", "Underpaw", "Housecat", "Stray", "Friend"] as const;

export const SOURCE_LABEL: Record<SyncSource, string> = {
  collection: "Collection",
  tomestone: "Tomestone",
  fflogs: "FFLogs",
  lodestone: "Lodestone",
};

export const FRESHNESS_MS: Record<SyncSource, number> = {
  collection: 4 * 60 * 60 * 1000,
  tomestone: 3 * 60 * 60 * 1000,
  fflogs: 30 * 60 * 60 * 1000,
  lodestone: 7 * 24 * 60 * 60 * 1000,
};

export const RANK_ORDER = new Map<string, number>(
  FC_RANKS.map((rank, index) => [rank, index]),
);

export const JOBS: { abbr: string; full: string }[] = [
  { abbr: "PLD", full: "Paladin" },
  { abbr: "WAR", full: "Warrior" },
  { abbr: "DRK", full: "Dark Knight" },
  { abbr: "GNB", full: "Gunbreaker" },
  { abbr: "WHM", full: "White Mage" },
  { abbr: "SCH", full: "Scholar" },
  { abbr: "AST", full: "Astrologian" },
  { abbr: "SGE", full: "Sage" },
  { abbr: "MNK", full: "Monk" },
  { abbr: "DRG", full: "Dragoon" },
  { abbr: "NIN", full: "Ninja" },
  { abbr: "SAM", full: "Samurai" },
  { abbr: "RPR", full: "Reaper" },
  { abbr: "VPR", full: "Viper" },
  { abbr: "BRD", full: "Bard" },
  { abbr: "MCH", full: "Machinist" },
  { abbr: "DNC", full: "Dancer" },
  { abbr: "BLM", full: "Black Mage" },
  { abbr: "SMN", full: "Summoner" },
  { abbr: "RDM", full: "Red Mage" },
  { abbr: "PCT", full: "Pictomancer" },
];

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
  timezone: null,
  favoriteMountId: null,
  favoriteMinionId: null,
  favoriteContent: null,
};
