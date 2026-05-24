export type ContentType = "savage" | "trial" | "alliance" | "ultimate";

export interface ZoneEncounter {
  id: number;
  key: string;
  label: string;
  name: string;
  tomestoneCanonicalName: string;
}

export interface ZoneConfig {
  id: number;
  fflogsZoneId?: number;
  name: string;
  shortName: string;
  expansion: "dawntrail";
  contentType: ContentType;
  tomestoneCategory: string;
  tomestoneZone: string;
  tomestoneExpansion: string;
  encounters: ZoneEncounter[];
}

export const ZONES: ZoneConfig[] = [
  // ── Dawntrail Savage ──────────────────────────────────────────────────────
  {
    id: 73, name: "AAC Heavyweight", shortName: "Heavyweight",
    expansion: "dawntrail", contentType: "savage",
    tomestoneCategory: "raids", tomestoneZone: "aac-heavyweight-savage", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 101, key: "m9",    label: "M9S",     name: "Vamp Fatale",          tomestoneCanonicalName: "vamp-fatale" },
      { id: 102, key: "m10",   label: "M10S",    name: "Red Hot and Deep Blue", tomestoneCanonicalName: "red-hot-deep-blue" },
      { id: 103, key: "m11",   label: "M11S",    name: "The Tyrant",            tomestoneCanonicalName: "the-tyrant" },
      { id: 104, key: "m12",   label: "M12S",    name: "Lindwurm",              tomestoneCanonicalName: "lindwurm" },
      { id: 105, key: "m12s2", label: "M12S P2", name: "Lindwurm II",           tomestoneCanonicalName: "lindwurm-ii" },
    ],
  },
  {
    id: 68, name: "AAC Cruiserweight", shortName: "Cruiserweight",
    expansion: "dawntrail", contentType: "savage",
    tomestoneCategory: "raids", tomestoneZone: "aac-cruiserweight-savage", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 97,  key: "m5", label: "M5S", name: "Dancing Green",     tomestoneCanonicalName: "dancing-green" },
      { id: 98,  key: "m6", label: "M6S", name: "Sugar Riot",        tomestoneCanonicalName: "sugar-riot" },
      { id: 99,  key: "m7", label: "M7S", name: "Brute Abombinator", tomestoneCanonicalName: "brute-abombinator" },
      { id: 100, key: "m8", label: "M8S", name: "Howling Blade",     tomestoneCanonicalName: "howling-blade" },
    ],
  },
  {
    id: 62, name: "AAC Light-Heavyweight", shortName: "Light-Heavyweight",
    expansion: "dawntrail", contentType: "savage",
    tomestoneCategory: "raids", tomestoneZone: "aac-light-heavyweight-savage", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 93, key: "m1", label: "M1S", name: "Black Cat",       tomestoneCanonicalName: "black-cat" },
      { id: 94, key: "m2", label: "M2S", name: "Honey B. Lovely", tomestoneCanonicalName: "honey-b-lovely" },
      { id: 95, key: "m3", label: "M3S", name: "Brute Bomber",    tomestoneCanonicalName: "brute-bomber" },
      { id: 96, key: "m4", label: "M4S", name: "Wicked Thunder",  tomestoneCanonicalName: "wicked-thunder" },
    ],
  },

  // ── Dawntrail Extreme Trials ──────────────────────────────────────────────
  {
    id: 58, name: "Dawntrail Trials I", shortName: "Trials I",
    expansion: "dawntrail", contentType: "trial",
    tomestoneCategory: "trials", tomestoneZone: "trials-extreme", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 1071, key: "valigarmanda",  label: "Valigarmanda",  name: "Valigarmanda",  tomestoneCanonicalName: "valigarmanda" },
      { id: 1072, key: "zoraalja",      label: "Zoraal Ja",     name: "Zoraal Ja",     tomestoneCanonicalName: "zoraal-ja" },
      { id: 1078, key: "queeneternal",  label: "Queen Eternal", name: "Queen Eternal", tomestoneCanonicalName: "queen-eternal" },
    ],
  },
  {
    id: 67, name: "Dawntrail Trials II", shortName: "Trials II",
    expansion: "dawntrail", contentType: "trial",
    tomestoneCategory: "trials", tomestoneZone: "trials-extreme", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 1080, key: "zelenia",         label: "Zelenia",          name: "Zelenia",          tomestoneCanonicalName: "zelenia" },
      { id: 1081, key: "necron",          label: "Necron",           name: "Necron",           tomestoneCanonicalName: "necron" },
      { id: 1082, key: "guardianarkveld", label: "Guardian Arkveld", name: "Guardian Arkveld", tomestoneCanonicalName: "guardian-arkveld" },
    ],
  },
  {
    id: 72, name: "Dawntrail Trials III", shortName: "Trials III",
    expansion: "dawntrail", contentType: "trial",
    tomestoneCategory: "trials", tomestoneZone: "trials-extreme", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 1083, key: "doomtrain", label: "Doomtrain", name: "Doomtrain", tomestoneCanonicalName: "doom-train" },
      { id: 1084, key: "enuo",      label: "Enuo",      name: "Enuo",      tomestoneCanonicalName: "enuo" },
    ],
  },

  // ── Dawntrail Alliance Raids (Echoes of Vana'diel) ────────────────────────
  {
    id: 63, name: "Jeuno: The First Walk", shortName: "Jeuno",
    expansion: "dawntrail", contentType: "alliance",
    tomestoneCategory: "alliance-raids", tomestoneZone: "echoes-of-vanadiel", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 2057, key: "prishe",     label: "Prishe",      name: "Prishe of the Distant Chains", tomestoneCanonicalName: "prishe-of-the-distant-chains" },
      { id: 2058, key: "fafnir",     label: "Fafnir",      name: "Fafnir the Forgotten",         tomestoneCanonicalName: "fafnir-the-forgotten" },
      { id: 2059, key: "arkangels",  label: "Ark Angels",  name: "Ark Angels",                   tomestoneCanonicalName: "ark-angels" },
      { id: 2060, key: "shadowlord", label: "Shadow Lord", name: "Shadow Lord",                  tomestoneCanonicalName: "shadow-lord" },
    ],
  },
  {
    id: 70, name: "San d'Oria: The Second Walk", shortName: "San d'Oria",
    expansion: "dawntrail", contentType: "alliance",
    tomestoneCategory: "alliance-raids", tomestoneZone: "echoes-of-vanadiel", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 2067, key: "kirin",       label: "Kirin",       name: "Faithbound Kirin", tomestoneCanonicalName: "faithbound-kirin" },
      { id: 2068, key: "ultimaomega", label: "Ultima",      name: "Ultima and Omega", tomestoneCanonicalName: "ultima-and-omega" },
      { id: 2069, key: "kamlanaut",   label: "Kam'lanaut",  name: "Kam'lanaut",       tomestoneCanonicalName: "kamlanaut" },
      { id: 2070, key: "ealdnarche",  label: "Eald'narche", name: "Eald'narche",      tomestoneCanonicalName: "ealdnarche" },
    ],
  },
  {
    id: 75, name: "Windurst: The Third Walk", shortName: "Windurst",
    expansion: "dawntrail", contentType: "alliance",
    tomestoneCategory: "alliance-raids", tomestoneZone: "echoes-of-vanadiel", tomestoneExpansion: "dawntrail",
    encounters: [
      { id: 2071, key: "shantotto",  label: "Shantotto",   name: "Shantotto the Demon",  tomestoneCanonicalName: "shantotto-the-demon" },
      { id: 2072, key: "alexander",  label: "Alexander",   name: "Alexander Resurrected", tomestoneCanonicalName: "alexander-resurrected" },
      { id: 2073, key: "promathia",  label: "Promathia",   name: "Promathia",            tomestoneCanonicalName: "promathia" },
      { id: 2074, key: "hollowking", label: "Hollow King", name: "Hollow King",          tomestoneCanonicalName: "hollow-king" },
    ],
  },

  // ── Ultimates ─────────────────────────────────────────────────────────────
  {
    id: 19, fflogsZoneId: 59, name: "The Unending Coil of Bahamut", shortName: "UCOB",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "stormblood",
    encounters: [{ id: 1073, key: "ucob", label: "UCOB", name: "The Unending Coil of Bahamut", tomestoneCanonicalName: "the-unending-coil-of-bahamut-ultimate" }],
  },
  {
    id: 23, fflogsZoneId: 59, name: "The Weapon's Refrain", shortName: "UWU",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "stormblood",
    encounters: [{ id: 1074, key: "uwu", label: "UWU", name: "The Weapon's Refrain", tomestoneCanonicalName: "the-weapons-refrain-ultimate" }],
  },
  {
    id: 32, fflogsZoneId: 59, name: "The Epic of Alexander", shortName: "TEA",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "shadowbringers",
    encounters: [{ id: 1075, key: "tea", label: "TEA", name: "The Epic of Alexander", tomestoneCanonicalName: "the-epic-of-alexander-ultimate" }],
  },
  {
    id: 45, fflogsZoneId: 59, name: "Dragonsong's Reprise", shortName: "DSR",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "endwalker",
    encounters: [{ id: 1076, key: "dsr", label: "DSR", name: "Dragonsong's Reprise", tomestoneCanonicalName: "dragonsongs-reprise-ultimate" }],
  },
  {
    id: 53, fflogsZoneId: 59, name: "The Omega Protocol", shortName: "TOP",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "endwalker",
    encounters: [{ id: 1077, key: "top", label: "TOP", name: "The Omega Protocol", tomestoneCanonicalName: "the-omega-protocol-ultimate" }],
  },
  {
    id: 65, name: "Futures Rewritten", shortName: "FRU",
    expansion: "dawntrail", contentType: "ultimate",
    tomestoneCategory: "ultimates", tomestoneZone: "ultimates", tomestoneExpansion: "dawntrail",
    encounters: [{ id: 1079, key: "fru", label: "FRU", name: "Futures Rewritten", tomestoneCanonicalName: "futures-rewritten-ultimate" }],
  },
];

export const ZONES_BY_CONTENT_TYPE = (type: ContentType) => ZONES.filter((z) => z.contentType === type);
