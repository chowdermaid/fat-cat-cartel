export type DevCapability =
  | "calendar:event:create"
  | "calendar:eventRequest:create"
  | "calendar:eventRequest:review"
  | "admin:*";

export type DevPersonaId =
  | "guest"
  | "member"
  | "crafter"
  | "housecat"
  | "underpaw"
  | "boss"
  | "debug";

export type DevPersona = {
  id: DevPersonaId;
  label: string;
  description: string;
  authenticated: boolean;
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  roleIds: string[];
  isAdmin: boolean;
  isHousecat: boolean;
  capabilities: DevCapability[];
};

export const DEV_AUTH_LAYER_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_LAYER === "true";

export const DEV_SESSION_TOKEN = "local-dev-persona-session-token-00000001";

const PERSONA_KEY = "fcc_dev_persona";
const DEV_DATA_PREFIX = "fcc_dev_data_";
const DEV_EVENT = "fcc-dev-persona-change";

export const DEV_PERSONAS: DevPersona[] = [
  {
    id: "guest",
    label: "Guest",
    description: "Logged out visitor.",
    authenticated: false,
    discordUserId: "dev-guest",
    lodestoneId: "dev-guest",
    characterName: "Guest",
    fcRank: null,
    roleIds: [],
    isAdmin: false,
    isHousecat: false,
    capabilities: [],
  },
  {
    id: "member",
    label: "Member",
    description: "Logged-in member without event permissions.",
    authenticated: true,
    discordUserId: "dev-member",
    lodestoneId: "dev-member",
    characterName: "Mochi Member",
    fcRank: "Member",
    roleIds: ["dev-member-role"],
    isAdmin: false,
    isHousecat: false,
    capabilities: [],
  },
  {
    id: "crafter",
    label: "Crafter",
    description: "Second logged-in member for request handoff testing.",
    authenticated: true,
    discordUserId: "dev-crafter",
    lodestoneId: "dev-crafter",
    characterName: "Crispin Crafter",
    fcRank: "Member",
    roleIds: ["dev-member-role"],
    isAdmin: false,
    isHousecat: false,
    capabilities: [],
  },
  {
    id: "housecat",
    label: "Housecat",
    description: "Can submit event requests.",
    authenticated: true,
    discordUserId: "dev-housecat",
    lodestoneId: "dev-housecat",
    characterName: "Hazel Housecat",
    fcRank: "Housecat",
    roleIds: ["dev-member-role", "dev-housecat-role"],
    isAdmin: false,
    isHousecat: true,
    capabilities: ["calendar:eventRequest:create"],
  },
  {
    id: "underpaw",
    label: "Underpaw",
    description: "Admin reviewer and event creator.",
    authenticated: true,
    discordUserId: "dev-underpaw",
    lodestoneId: "dev-underpaw",
    characterName: "Uma Underpaw",
    fcRank: "Underpaw",
    roleIds: ["dev-member-role", "dev-underpaw-role"],
    isAdmin: true,
    isHousecat: false,
    capabilities: ["calendar:event:create", "calendar:eventRequest:review"],
  },
  {
    id: "boss",
    label: "Boss",
    description: "Full local admin persona.",
    authenticated: true,
    discordUserId: "dev-boss",
    lodestoneId: "dev-boss",
    characterName: "Biscuit Boss",
    fcRank: "Boss",
    roleIds: ["dev-member-role", "dev-boss-role"],
    isAdmin: true,
    isHousecat: false,
    capabilities: ["admin:*", "calendar:event:create", "calendar:eventRequest:review"],
  },
  {
    id: "debug",
    label: "Debug",
    description: "Admin plus Housecat capability mix.",
    authenticated: true,
    discordUserId: "dev-debug",
    lodestoneId: "dev-debug",
    characterName: "Debug Dev",
    fcRank: "Debug",
    roleIds: ["dev-member-role", "dev-housecat-role", "dev-admin-role"],
    isAdmin: true,
    isHousecat: true,
    capabilities: ["admin:*", "calendar:event:create", "calendar:eventRequest:create", "calendar:eventRequest:review"],
  },
];

export function getDevPersona(id: string | null | undefined): DevPersona {
  return DEV_PERSONAS.find((persona) => persona.id === id) ?? DEV_PERSONAS[0];
}

export function getSelectedDevPersona(): DevPersona {
  if (typeof window === "undefined") return DEV_PERSONAS[0];
  return getDevPersona(window.localStorage.getItem(PERSONA_KEY));
}

export function setSelectedDevPersona(id: DevPersonaId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERSONA_KEY, id);
  window.dispatchEvent(new Event(DEV_EVENT));
}

export function subscribeDevPersona(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DEV_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(DEV_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function devStorageKey(feature: string): string {
  return `${DEV_DATA_PREFIX}${feature}`;
}

export function resetDevMockData(feature?: string): void {
  if (typeof window === "undefined") return;
  if (feature) {
    window.localStorage.removeItem(devStorageKey(feature));
  } else {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(DEV_DATA_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  }
  window.dispatchEvent(new Event(DEV_EVENT));
}

export function devPersonaHasCapability(
  persona: DevPersona,
  capability: DevCapability,
): boolean {
  return persona.capabilities.includes("admin:*") || persona.capabilities.includes(capability);
}
