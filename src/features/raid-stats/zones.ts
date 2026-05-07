import type { ContentType } from "./types";

export interface ZoneNav {
  id: number;
  name: string;
  shortName: string;
  contentType: ContentType;
}

export interface ZoneTab {
  type: ContentType;
  label: string;
  zones: ZoneNav[];
}

export const ZONE_TABS: ZoneTab[] = [
  {
    type: "savage",
    label: "Savage",
    zones: [
      { id: 73, name: "AAC Heavyweight",       shortName: "Heavyweight",       contentType: "savage" },
      { id: 68, name: "AAC Cruiserweight",      shortName: "Cruiserweight",     contentType: "savage" },
      { id: 62, name: "AAC Light-Heavyweight",  shortName: "Light-Heavyweight", contentType: "savage" },
    ],
  },
  {
    type: "trial",
    label: "Trials",
    zones: [
      { id: 58, name: "Dawntrail Trials I",   shortName: "Trials I",   contentType: "trial" },
      { id: 67, name: "Dawntrail Trials II",  shortName: "Trials II",  contentType: "trial" },
      { id: 72, name: "Dawntrail Trials III", shortName: "Trials III", contentType: "trial" },
    ],
  },
  {
    type: "alliance",
    label: "Alliance",
    zones: [
      { id: 63, name: "Jeuno: The First Walk",          shortName: "Jeuno",     contentType: "alliance" },
      { id: 70, name: "San d'Oria: The Second Walk",    shortName: "San d'Oria", contentType: "alliance" },
      { id: 75, name: "Windurst: The Third Walk",       shortName: "Windurst",  contentType: "alliance" },
    ],
  },
  {
    type: "ultimate",
    label: "Ultimates",
    zones: [
      { id: 19, name: "The Unending Coil of Bahamut", shortName: "UCOB", contentType: "ultimate" },
      { id: 23, name: "The Weapon's Refrain",          shortName: "UWU",  contentType: "ultimate" },
      { id: 32, name: "The Epic of Alexander",         shortName: "TEA",  contentType: "ultimate" },
      { id: 45, name: "Dragonsong's Reprise",          shortName: "DSR",  contentType: "ultimate" },
      { id: 53, name: "The Omega Protocol",            shortName: "TOP",  contentType: "ultimate" },
      { id: 65, name: "Futures Rewritten",             shortName: "FRU",  contentType: "ultimate" },
    ],
  },
];

export const DEFAULT_ZONE_ID = 73;
export const DEFAULT_TAB: ContentType = "savage";
