export type ContentType = "savage" | "trial" | "alliance" | "ultimate";

export interface ZoneEncounter {
  id: number;    // FFLogs encounter ID
  key: string;   // internal key used as RTDB / histogram key
  label: string; // short display label shown in UI
  name: string;  // full encounter name
}

export interface ZoneConfig {
  id: number;
  fflogsZoneId?: number; // if set, API queries use this instead of id; id is still the Firebase path key
  name: string;
  shortName: string;
  expansion: "dawntrail";
  contentType: ContentType;
  encounters: ZoneEncounter[];
}

export const ZONES: ZoneConfig[] = [
  // ── Dawntrail Savage ──────────────────────────────────────────────────────
  {
    id: 73, name: "AAC Heavyweight", shortName: "Heavyweight",
    expansion: "dawntrail", contentType: "savage",
    encounters: [
      { id: 101, key: "m9",    label: "M9S",     name: "Vamp Fatale"           },
      { id: 102, key: "m10",   label: "M10S",    name: "Red Hot and Deep Blue"  },
      { id: 103, key: "m11",   label: "M11S",    name: "The Tyrant"             },
      { id: 104, key: "m12",   label: "M12S",    name: "Lindwurm"               },
      { id: 105, key: "m12s2", label: "M12S P2", name: "Lindwurm II"            },
    ],
  },
  {
    id: 68, name: "AAC Cruiserweight", shortName: "Cruiserweight",
    expansion: "dawntrail", contentType: "savage",
    encounters: [
      { id: 97,  key: "m5", label: "M5S", name: "Dancing Green"     },
      { id: 98,  key: "m6", label: "M6S", name: "Sugar Riot"        },
      { id: 99,  key: "m7", label: "M7S", name: "Brute Abombinator" },
      { id: 100, key: "m8", label: "M8S", name: "Howling Blade"     },
    ],
  },
  {
    id: 62, name: "AAC Light-Heavyweight", shortName: "Light-Heavyweight",
    expansion: "dawntrail", contentType: "savage",
    encounters: [
      { id: 93, key: "m1", label: "M1S", name: "Black Cat"       },
      { id: 94, key: "m2", label: "M2S", name: "Honey B. Lovely" },
      { id: 95, key: "m3", label: "M3S", name: "Brute Bomber"    },
      { id: 96, key: "m4", label: "M4S", name: "Wicked Thunder"  },
    ],
  },

  // ── Dawntrail Extreme Trials ──────────────────────────────────────────────
  {
    id: 58, name: "Dawntrail Trials I", shortName: "Trials I",
    expansion: "dawntrail", contentType: "trial",
    encounters: [
      { id: 1071, key: "valigarmanda",  label: "Valigarmanda",   name: "Valigarmanda"  },
      { id: 1072, key: "zoraalja",      label: "Zoraal Ja",      name: "Zoraal Ja"     },
      { id: 1078, key: "queeneternal",  label: "Queen Eternal",  name: "Queen Eternal" },
    ],
  },
  {
    id: 67, name: "Dawntrail Trials II", shortName: "Trials II",
    expansion: "dawntrail", contentType: "trial",
    encounters: [
      { id: 1080, key: "zelenia",        label: "Zelenia",          name: "Zelenia"          },
      { id: 1081, key: "necron",          label: "Necron",           name: "Necron"            },
      { id: 1082, key: "guardianarkveld",label: "Guardian Arkveld", name: "Guardian Arkveld" },
    ],
  },
  {
    id: 72, name: "Dawntrail Trials III", shortName: "Trials III",
    expansion: "dawntrail", contentType: "trial",
    encounters: [
      { id: 1083, key: "doomtrain", label: "Doomtrain", name: "Doomtrain" },
      { id: 1084, key: "enuo",      label: "Enuo",      name: "Enuo"      },
    ],
  },

  // ── Dawntrail Alliance Raids (Echoes of Vana'diel) ────────────────────────
  {
    id: 63, name: "Jeuno: The First Walk", shortName: "Jeuno",
    expansion: "dawntrail", contentType: "alliance",
    encounters: [
      { id: 2057, key: "prishe",     label: "Prishe",      name: "Prishe of the Distant Chains" },
      { id: 2058, key: "fafnir",     label: "Fafnir",      name: "Fafnir the Forgotten"         },
      { id: 2059, key: "arkangels",  label: "Ark Angels",  name: "Ark Angels"                   },
      { id: 2060, key: "shadowlord", label: "Shadow Lord", name: "Shadow Lord"                  },
    ],
  },
  {
    id: 70, name: "San d'Oria: The Second Walk", shortName: "San d'Oria",
    expansion: "dawntrail", contentType: "alliance",
    encounters: [
      { id: 2067, key: "kirin",       label: "Kirin",       name: "Faithbound Kirin" },
      { id: 2068, key: "ultimaomega", label: "Ultima",      name: "Ultima and Omega" },
      { id: 2069, key: "kamlanaut",   label: "Kam'lanaut",  name: "Kam'lanaut"       },
      { id: 2070, key: "ealdnarche",  label: "Eald'narche", name: "Eald'narche"      },
    ],
  },
  {
    id: 75, name: "Windurst: The Third Walk", shortName: "Windurst",
    expansion: "dawntrail", contentType: "alliance",
    encounters: [
      { id: 2071, key: "shantotto",  label: "Shantotto",   name: "Shantotto the Demon"  },
      { id: 2072, key: "alexander",  label: "Alexander",   name: "Alexander Resurrected" },
      { id: 2073, key: "promathia",  label: "Promathia",   name: "Promathia"            },
      { id: 2074, key: "hollowking", label: "Hollow King", name: "Hollow King"          },
    ],
  },

  // ── Ultimates ─────────────────────────────────────────────────────────────
  // FRU has its own FFLogs zone. All pre-Dawntrail ultimates live under zone 59 "Ultimates (Legacy)"
  // on FFLogs but are stored in separate Firebase paths using their original zone IDs as virtual keys.
  {
    id: 19, fflogsZoneId: 59, name: "The Unending Coil of Bahamut", shortName: "UCOB",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1073, key: "ucob", label: "UCOB", name: "The Unending Coil of Bahamut" }],
  },
  {
    id: 23, fflogsZoneId: 59, name: "The Weapon's Refrain", shortName: "UWU",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1074, key: "uwu",  label: "UWU",  name: "The Weapon's Refrain"         }],
  },
  {
    id: 32, fflogsZoneId: 59, name: "The Epic of Alexander", shortName: "TEA",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1075, key: "tea",  label: "TEA",  name: "The Epic of Alexander"        }],
  },
  {
    id: 45, fflogsZoneId: 59, name: "Dragonsong's Reprise", shortName: "DSR",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1076, key: "dsr",  label: "DSR",  name: "Dragonsong's Reprise"         }],
  },
  {
    id: 53, fflogsZoneId: 59, name: "The Omega Protocol", shortName: "TOP",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1077, key: "top",  label: "TOP",  name: "The Omega Protocol"           }],
  },
  {
    id: 65, name: "Futures Rewritten", shortName: "FRU",
    expansion: "dawntrail", contentType: "ultimate",
    encounters: [{ id: 1079, key: "fru",  label: "FRU",  name: "Futures Rewritten"            }],
  },
];

export const ZONES_BY_CONTENT_TYPE = (type: ContentType) => ZONES.filter((z) => z.contentType === type);
