import type { UcobPhaseId } from "./types";

export const UCOB_PAGE_TITLE = "The Unending Coil of Bahamut";
export const UCOB_STATIC_NAME = "The Coils Cartel";
export const UCOB_PROGRESS_PATH = "raidStats/ucobProgress";
export const UCOB_USE_STUBS = import.meta.env.VITE_USE_STUBS === "true";

export const UCOB_PHASES = [
  { id: "P1", name: "Twintania" },
  { id: "P2", name: "Nael" },
  { id: "P3", name: "Bahamut Prime" },
  { id: "P4", name: "Adds" },
  { id: "P5", name: "Golden Bahamut" },
] as const satisfies readonly { id: UcobPhaseId; name: string }[];
