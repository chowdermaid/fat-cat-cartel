import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import ReactCountryFlag from "react-country-flag";
import {
  Activity,
  Award,
  BarChart3,
  Cake,
  ChevronLeft,
  Coffee,
  Crown,
  Fish,
  Gamepad2,
  Hammer,
  Heart,
  Home,
  Loader2,
  Map as MapIcon,
  MessageSquareQuote,
  Pencil,
  ExternalLink,
  Mountain,
  Palette,
  Rabbit,
  Sparkles,
  Star,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemberProfile, type CollectiblesData } from "./api/useMemberProfile";
import { db, ref, set } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { callAdminFunction } from "@/features/admin/lib/adminFunctions";
import { COLLECTIBLE_KEYS } from "@/features/fc-collection/collectibleConfig";
import type { CollectibleKey } from "@/features/fc-collection/collectibleConfig";
import type { Collectible, MemberCacheData } from "@/features/fc-collection/types";
import type { MemberProfile } from "./types";
import {
  FavoriteCollectiblePicker,
  type FavoriteCollectibleOption,
} from "./FavoriteCollectiblePicker";
import {
  FAVORITE_CONTENT_OPTIONS,
  PROFILE_TIMEZONES,
  timezoneCountryCode,
  timezoneLabel,
} from "./profileOptions";
import { JOB_ICONS } from "@/features/raid-stats/jobIcons";
import {
  formatJobName,
  percentileClass,
} from "@/features/raid-stats/constants";
import type {
  ContentType,
  ParseData,
  TomestoneActivity,
  ZoneData,
} from "@/features/raid-stats/types";

type ProfileParseType = "savage" | "trial" | "alliance";
type ActivityChartType =
  | "timeline"
  | "progress"
  | "jobs"
  | "heatmap";
const ACTIVITY_PAGE_SIZE = 10;

const jobIconMap = import.meta.glob<string>("../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const JOB_ICON_SLUG: Record<string, string> = {
  Paladin: "paladin",
  Warrior: "warrior",
  "Dark Knight": "darkknight",
  Gunbreaker: "gunbreaker",
  "White Mage": "whitemage",
  Scholar: "scholar",
  Astrologian: "astrologian",
  Sage: "sage",
  Monk: "monk",
  Dragoon: "dragoon",
  Ninja: "ninja",
  Samurai: "samurai",
  Reaper: "reaper",
  Viper: "viper",
  Bard: "bard",
  Machinist: "machinist",
  Dancer: "dancer",
  "Black Mage": "blackmage",
  Summoner: "summoner",
  "Red Mage": "redmage",
  Pictomancer: "pictomancer",
  "Blue Mage": "bluemage",
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
  Miner: "Miner",
  Botanist: "Botanist",
  Fisher: "Fisher",
};

const JOB_NAME_ALIASES: Record<string, string> = {
  BlackMage: "Black Mage",
  BlueMage: "Blue Mage",
  DarkKnight: "Dark Knight",
  RedMage: "Red Mage",
  WhiteMage: "White Mage",
};

function displayJobName(jobName: string): string {
  return JOB_NAME_ALIASES[jobName] ?? formatJobName(jobName);
}

function jobIconSrc(fullName: string): string | null {
  const slug = JOB_ICON_SLUG[displayJobName(fullName)];
  return slug ? (jobIconMap[`../../assets/jobs/${slug}.png`] ?? null) : null;
}

const JOB_ABBR: Record<string, string> = {
  Paladin: "PLD",
  Warrior: "WAR",
  "Dark Knight": "DRK",
  Gunbreaker: "GNB",
  "White Mage": "WHM",
  Scholar: "SCH",
  Astrologian: "AST",
  Sage: "SGE",
  Monk: "MNK",
  Dragoon: "DRG",
  Ninja: "NIN",
  Samurai: "SAM",
  Reaper: "RPR",
  Viper: "VPR",
  Bard: "BRD",
  Machinist: "MCH",
  Dancer: "DNC",
  "Black Mage": "BLM",
  Summoner: "SMN",
  "Red Mage": "RDM",
  Pictomancer: "PCT",
  "Blue Mage": "BLU",
  Carpenter: "CRP",
  Blacksmith: "BSM",
  Armorer: "ARM",
  Goldsmith: "GSM",
  Leatherworker: "LTW",
  Weaver: "WVR",
  Alchemist: "ALC",
  Culinarian: "CUL",
  Miner: "MIN",
  Botanist: "BTN",
  Fisher: "FSH",
};

const PROFILE_JOBS = [
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

const PROFILE_MONTHS = [
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
const PROFILE_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
  timezone: null,
  favoriteMountId: null,
  favoriteMinionId: null,
  favoriteContent: null,
};

const DEFAULT_MAX_JOB_LEVEL = 100;
const JOB_MAX_LEVELS: Partial<Record<string, number>> = {
  "Blue Mage": 80,
};

function maxLevelForJob(job: string) {
  return JOB_MAX_LEVELS[job] ?? DEFAULT_MAX_JOB_LEVEL;
}

const JOB_LEVEL_GROUPS = [
  {
    label: "Tank",
    jobs: ["Paladin", "Warrior", "Dark Knight", "Gunbreaker"],
  },
  {
    label: "Healer",
    jobs: ["White Mage", "Scholar", "Astrologian", "Sage"],
  },
  {
    label: "Melee DPS",
    jobs: ["Monk", "Dragoon", "Ninja", "Samurai", "Reaper", "Viper"],
  },
  {
    label: "Physical Ranged",
    jobs: ["Bard", "Machinist", "Dancer"],
  },
  {
    label: "Magical Ranged",
    jobs: ["Black Mage", "Summoner", "Red Mage", "Pictomancer"],
  },
  {
    label: "Limited",
    jobs: ["Blue Mage"],
  },
  {
    label: "Crafting",
    jobs: [
      "Carpenter",
      "Blacksmith",
      "Armorer",
      "Goldsmith",
      "Leatherworker",
      "Weaver",
      "Alchemist",
      "Culinarian",
    ],
  },
  {
    label: "Gathering",
    jobs: ["Miner", "Botanist", "Fisher"],
  },
] as const;

type JobLevelGroup = (typeof JOB_LEVEL_GROUPS)[number];

const COLLECTIBLE_META: Record<
  CollectibleKey,
  { label: string; icon: React.ElementType }
> = {
  mounts: { label: "Mounts", icon: Mountain },
  minions: { label: "Minions", icon: Rabbit },
  titles: { label: "Titles", icon: Crown },
  achievements: { label: "Achievements", icon: Award },
};

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "owned" in value;
}

function findRarest(
  ownedIds: number[],
  collectiblesById: Record<string, Collectible>,
): Collectible | null {
  let rarest: Collectible | null = null;
  let lowestOwned = Infinity;
  for (const id of ownedIds) {
    const collectible = collectiblesById[String(id)];
    if (!isCollectible(collectible)) continue;
    const owned = parseInt(collectible.owned, 10);
    if (!isNaN(owned) && owned < lowestOwned) {
      lowestOwned = owned;
      rarest = collectible;
    }
  }
  return rarest;
}

function ownedPct(
  collectible: Collectible,
  allById: Record<string, Collectible>,
): number {
  const maxOwned = Math.max(
    ...Object.values(allById)
      .filter(isCollectible)
      .map((item) => parseInt(item.owned, 10))
      .filter((owned) => !isNaN(owned) && owned > 0),
  );
  const owned = parseInt(collectible.owned, 10);
  if (isNaN(owned) || !isFinite(maxOwned) || maxOwned === 0) return 0;
  return (owned / maxOwned) * 100;
}

function favoriteOptions(
  ownedIds: number[] | undefined,
  collectiblesById: Record<string, Collectible> | undefined,
): FavoriteCollectibleOption[] {
  if (!collectiblesById) return [];
  return (ownedIds ?? [])
    .map((id) => collectiblesById[String(id)])
    .filter(isCollectible)
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function favoriteById(
  id: number | null | undefined,
  collectiblesById: Record<string, Collectible> | undefined,
): Collectible | null {
  if (!id || !collectiblesById) return null;
  const item = collectiblesById[String(id)];
  return isCollectible(item) ? item : null;
}

function favoriteContentIcon(content: string): React.ElementType {
  if (content.includes("Savage") || content.includes("Ultimate")) return Swords;
  if (content.includes("Extreme")) return Sparkles;
  if (content.includes("Alliance")) return Users;
  if (content.includes("Dungeon")) return Mountain;
  if (content.includes("Field")) return MapIcon;
  if (content.includes("Treasure")) return MapIcon;
  if (content.includes("Crafting")) return Hammer;
  if (content.includes("Fishing")) return Fish;
  if (content.includes("Housing")) return Home;
  if (content.includes("Gold Saucer")) return Gamepad2;
  if (content.includes("Glamour")) return Palette;
  if (content.includes("Mount")) return Mountain;
  if (content.includes("Minion")) return Rabbit;
  if (content.includes("Achievement")) return Trophy;
  if (content.includes("Blue Mage")) return Sparkles;
  if (content.includes("PvP")) return Swords;
  if (content.includes("Roleplay")) return Star;
  if (content.includes("AFK")) return Coffee;
  if (content.includes("Social")) return Heart;
  return Heart;
}

function formatBirthday(mmdd: string): string {
  const [month, day] = mmdd.split("-").map(Number);
  const months = [
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
  return `${months[month - 1] ?? "?"} ${day}`;
}

function parseBirthday(mmdd: string | null): { month: number; day: number } {
  if (!mmdd) return { month: 0, day: 0 };
  const [month, day] = mmdd.split("-").map(Number);
  return { month: month || 0, day: day || 0 };
}

function validBirthday(month: number, day: number): boolean {
  if (!month && !day) return true;
  if (month < 1 || month > 12 || day < 1) return false;
  const daysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysByMonth[month - 1];
}

function encodeBirthday(month: number, day: number): string | null {
  if (!month && !day) return null;
  if (!validBirthday(month, day)) return null;
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDate(ms: number | null): string {
  if (!ms) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

function timeAgo(ms: number | null): string {
  if (!ms) return "never";
  const hours = Math.floor((Date.now() - ms) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function JobIcon({ fullName, size = 20 }: { fullName: string; size?: number }) {
  const displayName = displayJobName(fullName);
  const src =
    JOB_ICONS[fullName] ??
    JOB_ICONS[displayName.replace(/\s/g, "")] ??
    jobIconSrc(fullName);
  const abbr = JOB_ABBR[displayName] ?? displayName;
  if (!src) return <span className="font-mono text-xs">{abbr}</span>;
  return (
    <img
      src={src}
      alt={abbr}
      title={displayName}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

function parseMode(contentType: ContentType): "savage" | "normal" {
  return contentType === "savage" ? "savage" : "normal";
}

function ParseTabs({
  zones,
  lodestoneId,
}: {
  zones: ZoneData[];
  lodestoneId: string;
}) {
  const [activeType, setActiveType] = useState<ProfileParseType>("savage");

  const grouped = useMemo(() => {
    return {
      savage: zones.filter((zone) => zone.meta.contentType === "savage"),
      trial: zones.filter((zone) => zone.meta.contentType === "trial"),
      alliance: zones.filter((zone) => zone.meta.contentType === "alliance"),
    } satisfies Record<ProfileParseType, ZoneData[]>;
  }, [zones]);

  const availableTypes = (
    ["savage", "trial", "alliance"] as ProfileParseType[]
  ).filter((type) => grouped[type]?.length);

  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0]);
    }
  }, [activeType, availableTypes]);

  const activeZones = grouped[activeType] ?? [];
  const rows = activeZones.flatMap((zone) => {
    const mode = parseMode(zone.meta.contentType);
    const parses = zone.parses?.[lodestoneId]?.[mode] ?? {};
    return zone.meta.encounters
      .map((encounter) => ({
        zone,
        encounter,
        parse: parses[encounter.key] as ParseData | undefined,
      }))
      .filter(
        (row): row is typeof row & { parse: ParseData } => row.parse != null,
      );
  });

  if (availableTypes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeType === type
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {type === "trial"
              ? "Trials"
              : type === "alliance"
                ? "Alliance"
                : "Savage"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No parses loaded for this category yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y px-4">
          {rows.map(({ zone, encounter, parse }) => (
            <div
              key={`${zone.meta.id}-${encounter.key}`}
              className="grid grid-cols-[minmax(4.75rem,6.5rem)_4.25rem_minmax(7rem,1fr)_auto] items-center gap-4 py-2.5"
            >
              <span className="truncate text-xs text-muted-foreground">
                {zone.meta.shortName}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {encounter.label}
              </span>
              <div className="min-w-0 flex items-center gap-2">
                <JobIcon fullName={parse.job} size={18} />
                <span className="truncate text-xs text-muted-foreground">
                  {displayJobName(parse.job)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {fmtRdps(parse.rdps)}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${percentileClass(parse.percentile)}`}
                >
                  {parse.percentile.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function activityLabel(activity: TomestoneActivity): string {
  if (activity.clearCount > 0)
    return `${activity.clearCount} clear${activity.clearCount === 1 ? "" : "s"}`;
  if (activity.bestProgress != null)
    return `${activity.bestProgress.toFixed(1)}% best`;
  return "activity";
}

function fmtRdps(rdps: number): string {
  return rdps >= 1000 ? `${(rdps / 1000).toFixed(1)}k` : String(rdps);
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function compactContentType(type: string): string {
  if (type === "alliance") return "Alliance";
  if (type === "trial") return "Trial";
  if (type === "savage") return "Savage";
  return type;
}

function activityImpact(activity: TomestoneActivity): number {
  return activity.clearCount + activity.wipeCount;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function buildActivitySummary(activities: TomestoneActivity[]) {
  const clears = activities.reduce(
    (sum, activity) => sum + activity.clearCount,
    0,
  );
  const wipes = activities.reduce(
    (sum, activity) => sum + activity.wipeCount,
    0,
  );
  const jobs = new Map<string, number>();
  for (const activity of activities) {
    if (activity.job) jobs.set(activity.job, (jobs.get(activity.job) ?? 0) + 1);
  }
  const topJob =
    [...jobs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No job yet";
  return { clears, wipes, topJob, latest: activities[0]?.startedAt ?? null };
}

function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function JobLevelGroupCard({
  group,
  jobLevels,
  columns = "grid-cols-2",
}: {
  group: JobLevelGroup;
  jobLevels?: Record<string, number | null>;
  columns?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {group.label}
      </span>
      <div className={`grid gap-1.5 ${columns}`}>
        {group.jobs.map((job) => {
          const level = jobLevels?.[job] ?? null;
          const isMax = level === maxLevelForJob(job);
          const displayName = displayJobName(job);
          return (
            <div
              key={job}
              title={displayName}
              className="flex min-w-0 items-center gap-1.5 rounded-md border border-transparent bg-muted/40 px-1.5 py-1"
            >
              <JobIcon fullName={job} size={15} />
              <span className="truncate text-[11px] text-muted-foreground">
                {displayName}
              </span>
              <span
                className={`ml-auto rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                  isMax
                    ? "bg-amber-500 text-amber-950"
                    : "bg-background/80 text-muted-foreground"
                }`}
              >
                {level ?? "--"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobLevels({ jobLevels }: { jobLevels?: Record<string, number | null> }) {
  const hasLevels = jobLevels && Object.keys(jobLevels).length > 0;
  const groupByLabel = Object.fromEntries(
    JOB_LEVEL_GROUPS.map((group) => [group.label, group]),
  ) as Record<JobLevelGroup["label"], JobLevelGroup>;

  return (
    <div className="anim-section space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Award className="h-4 w-4 text-muted-foreground" />
          Job Levels
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Synced from Lodestone profile data.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <JobLevelGroupCard group={groupByLabel.Tank} jobLevels={jobLevels} />
            <JobLevelGroupCard group={groupByLabel.Healer} jobLevels={jobLevels} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <JobLevelGroupCard group={groupByLabel["Melee DPS"]} jobLevels={jobLevels} />
            <JobLevelGroupCard group={groupByLabel["Magical Ranged"]} jobLevels={jobLevels} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[3fr_1fr]">
            <JobLevelGroupCard group={groupByLabel["Physical Ranged"]} jobLevels={jobLevels} columns="grid-cols-2 lg:grid-cols-3" />
            <JobLevelGroupCard group={groupByLabel.Limited} jobLevels={jobLevels} columns="grid-cols-1" />
          </div>
          <JobLevelGroupCard group={groupByLabel.Crafting} jobLevels={jobLevels} columns="grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4" />
          <JobLevelGroupCard group={groupByLabel.Gathering} jobLevels={jobLevels} columns="grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4" />
          {!hasLevels && (
            <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              No Lodestone job level sync has run for this member yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ActivityTooltipContent({
  activity,
}: {
  activity: TomestoneActivity;
}) {
  return (
    <TooltipContent className="max-w-64 text-xs">
      <div className="space-y-1">
        <p className="font-medium text-popover-foreground">
          {activity.encounterName}
        </p>
        <p>{activity.zoneName}</p>
        <p>{activity.job ? displayJobName(activity.job) : "Unknown job"}</p>
        <p>
          {activity.clearCount} clears, {activity.wipeCount} wipes
        </p>
        <p>
          Best progress:{" "}
          {activity.bestProgress == null
            ? "N/A"
            : `${activity.bestProgress.toFixed(1)}%`}
        </p>
        <p>{formatDate(activity.startedAt)}</p>
      </div>
    </TooltipContent>
  );
}

function ActivityTimelineChart({
  activities,
}: {
  activities: TomestoneActivity[];
}) {
  if (activities.length === 0) {
    return (
      <EmptyChart message="No recent Tomestone activity has been stored for this member yet." />
    );
  }
  const data = [...activities].sort((a, b) => a.startedAt - b.startedAt);
  const minTime = data[0]?.startedAt ?? 0;
  const maxTime = data[data.length - 1]?.startedAt ?? minTime;
  const span = Math.max(1, maxTime - minTime);
  const maxImpact = Math.max(1, ...data.map(activityImpact));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="h-64 rounded-lg border bg-background/30 p-3">
        <div className="relative h-52 border-b border-l border-border/70">
          <div className="absolute inset-x-0 top-1/4 border-t border-border/30" />
          <div className="absolute inset-x-0 top-1/2 border-t border-border/30" />
          <div className="absolute inset-x-0 top-3/4 border-t border-border/30" />
          {data.map((activity) => {
            const left = ((activity.startedAt - minTime) / span) * 100;
            const impact = Math.max(1, activityImpact(activity));
            const bottom = (impact / maxImpact) * 82 + 6;
            const size = Math.min(22, 8 + impact * 2);
            const clear = activity.clearCount > 0;
            return (
              <Tooltip key={activity.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`absolute rounded-full border border-background shadow-sm transition-transform hover:scale-125 ${
                      clear ? "bg-yellow-400" : "bg-red-500"
                    }`}
                    style={{
                      left: `${left}%`,
                      bottom: `${bottom}%`,
                      width: size,
                      height: size,
                      transform: "translate(-50%, 50%)",
                    }}
                    aria-label={`${activity.encounterName} ${formatDate(activity.startedAt)}`}
                  />
                </TooltipTrigger>
                <ActivityTooltipContent activity={activity} />
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formatDate(minTime)}</span>
          <span>Bubble size = clears + wipes</span>
          <span>{formatDate(maxTime)}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function JobUsageDonut({ activities }: { activities: TomestoneActivity[] }) {
  if (activities.length === 0) return <EmptyChart message="No job data yet." />;
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const job = activity.job ? displayJobName(activity.job) : "Unknown";
    counts.set(job, (counts.get(job) ?? 0) + 1);
  }
  const data = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  const colors = [
    "#facc15",
    "#22c55e",
    "#38bdf8",
    "#f97316",
    "#a78bfa",
    "#f472b6",
    "#94a3b8",
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;
  const segments = data.map((item, index) => {
    const percent = (item.value / total) * 100;
    const dashArray = `${percent} ${100 - percent}`;
    const currentOffset = offset;
    offset -= percent;
    return {
      ...item,
      color: colors[index % colors.length],
      currentOffset,
      dashArray,
      percent,
    };
  });

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid min-h-64 gap-4 sm:grid-cols-2 sm:items-center">
        <div className="relative mx-auto h-52 w-52">
          <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-muted"
            />
            {segments.map((segment) => (
              <Tooltip key={segment.name}>
                <TooltipTrigger asChild>
                  <g
                    tabIndex={0}
                    role="button"
                    aria-label={`${segment.name} ${segment.value} activities`}
                    className="cursor-default outline-none"
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="9"
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.currentOffset}
                      strokeOpacity="0"
                    />
                    <circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="7"
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.currentOffset}
                      className="transition-opacity hover:opacity-80"
                    />
                  </g>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <div className="flex items-center gap-2">
                    {segment.name !== "Unknown" && (
                      <JobIcon fullName={segment.name} size={18} />
                    )}
                    <p className="font-medium text-popover-foreground">
                      {segment.name}
                    </p>
                  </div>
                  <p>
                    {segment.value} activities ({Math.round(segment.percent)}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold tabular-nums">{total}</span>
            <span className="text-[11px] text-muted-foreground">activities</span>
          </div>
        </div>
        <ScrollArea className="h-48 pr-3">
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {item.name !== "Unknown" && (
                  <JobIcon fullName={item.name} size={18} />
                )}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

function RaidActivityHeatmap({
  activities,
}: {
  activities: TomestoneActivity[];
}) {
  if (activities.length === 0) {
    return (
      <EmptyChart message="No recent Tomestone activity has been stored for this member yet." />
    );
  }
  const buckets = new Map<
    string,
    { clears: number; wipes: number; count: number }
  >();
  for (const activity of activities) {
    const key = dayKey(activity.startedAt);
    const existing = buckets.get(key) ?? { clears: 0, wipes: 0, count: 0 };
    existing.clears += activity.clearCount;
    existing.wipes += activity.wipeCount;
    existing.count += 1;
    buckets.set(key, existing);
  }
  const sortedKeys = [...buckets.keys()].sort();
  const data = sortedKeys.map((key) => ({ key, ...buckets.get(key)! }));
  const maxValue = Math.max(
    1,
    ...data.map((row) => row.clears + row.wipes),
  );
  const first = new Date(`${sortedKeys[0]}T00:00:00`);
  const last = new Date(`${sortedKeys[sortedKeys.length - 1]}T00:00:00`);
  const calendarStart = new Date(first);
  calendarStart.setDate(first.getDate() - first.getDay());
  const calendarEnd = new Date(last);
  calendarEnd.setDate(last.getDate() + (6 - last.getDay()));
  const days: Array<{ key: string; date: Date; inRange: boolean }> = [];
  for (
    let cursor = new Date(calendarStart);
    cursor <= calendarEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const date = new Date(cursor);
    days.push({
      key: dayKey(date.getTime()),
      date,
      inRange: date >= first && date <= last,
    });
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <TooltipProvider delayDuration={100}>
      <ScrollArea className="h-64 rounded-lg border bg-background/30 p-3">
        <div className="min-w-[21rem] pr-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {new Intl.DateTimeFormat(undefined, {
                month: "short",
                year: "numeric",
              }).format(first)}
            </span>
            <span>
              {new Intl.DateTimeFormat(undefined, {
                month: "short",
                year: "numeric",
              }).format(last)}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const row = buckets.get(day.key);
              const total = row ? row.clears + row.wipes : 0;
              const alpha = total === 0 ? 0.06 : 0.18 + (total / maxValue) * 0.72;
              const backgroundColor =
                total === 0
                  ? "rgba(255, 255, 255, 0.04)"
                  : row?.clears
                    ? `rgba(250, 204, 21, ${alpha})`
                    : `rgba(239, 68, 68, ${alpha})`;
              return (
                <Tooltip key={day.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`aspect-square rounded-md border text-[10px] transition-transform hover:scale-105 ${
                        day.inRange
                          ? "border-border/60 text-foreground"
                          : "border-border/20 text-muted-foreground/40"
                      }`}
                      style={{ backgroundColor }}
                      aria-label={`${day.key} ${total} events`}
                    >
                      {day.date.getDate()}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-medium text-popover-foreground">
                      {day.key}
                    </p>
                    <p>{row?.count ?? 0} activities</p>
                    <p>{row?.clears ?? 0} clears</p>
                    <p>{row?.wipes ?? 0} wipes</p>
                    <p>{total} total events</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" />
              Clear day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
              Wipe-only day
            </span>
          </div>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

function BestProgressByEncounter({
  activities,
}: {
  activities: TomestoneActivity[];
}) {
  if (activities.length === 0) {
    return (
      <EmptyChart message="No recent Tomestone activity has been stored for this member yet." />
    );
  }
  const grouped = new Map<
    string,
    {
      encounterName: string;
      zoneName: string;
      contentType: string;
      clears: number;
      wipes: number;
      bestProgress: number | null;
      latest: number;
    }
  >();
  for (const activity of activities) {
    const key = `${activity.zoneId}:${activity.encounterKey}`;
    const existing = grouped.get(key) ?? {
      encounterName: activity.encounterName,
      zoneName: activity.zoneName,
      contentType: activity.contentType,
      clears: 0,
      wipes: 0,
      bestProgress: null,
      latest: activity.startedAt,
    };
    existing.clears += activity.clearCount;
    existing.wipes += activity.wipeCount;
    existing.latest = Math.max(existing.latest, activity.startedAt);
    if (activity.bestProgress != null) {
      existing.bestProgress =
        existing.bestProgress == null
          ? activity.bestProgress
          : Math.min(existing.bestProgress, activity.bestProgress);
    }
    grouped.set(key, existing);
  }
  const rows = [...grouped.values()].sort((a, b) => b.latest - a.latest);

  return (
    <TooltipProvider delayDuration={100}>
      <ScrollArea className="h-64 pr-3">
        <div className="space-y-3">
          {rows.map((row) => {
            const cleared = row.clears > 0;
            const hp = cleared ? 0 : row.bestProgress;
            const hpWidth = hp == null ? 0 : clampPercent(hp);
            return (
              <Tooltip key={`${row.zoneName}-${row.encounterName}`}>
                <TooltipTrigger asChild>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.encounterName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.zoneName} - {compactContentType(row.contentType)}
                        </p>
                      </div>
                      <span
                        className={
                          cleared
                            ? "text-xs font-medium text-yellow-400"
                            : "text-xs tabular-nums text-muted-foreground"
                        }
                      >
                        {cleared
                          ? "Cleared"
                          : hp == null
                            ? "N/A"
                            : `${hp.toFixed(1)}% HP`}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-red-500/70 ring-1 ring-border">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${hpWidth}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p className="font-medium text-popover-foreground">
                    {row.encounterName}
                  </p>
                  <p>{row.zoneName}</p>
                  <p>
                    {row.clears} clears, {row.wipes} wipes
                  </p>
                  <p>
                    Best boss HP:{" "}
                    {hp == null ? "Unknown" : `${hp.toFixed(1)}%`}
                  </p>
                  <p>Latest: {formatDate(row.latest)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

function RaidActivityInsights({
  activities,
}: {
  activities: TomestoneActivity[];
}) {
  const [activeChart, setActiveChart] = useState<ActivityChartType>("timeline");
  const chartTabs: Array<{ id: ActivityChartType; label: string }> = [
    { id: "timeline", label: "Timeline" },
    { id: "progress", label: "Progress" },
    { id: "jobs", label: "Jobs" },
    { id: "heatmap", label: "Heatmap" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Raid Activity Insights
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Built from stored Tomestone activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
          {chartTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveChart(tab.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeChart === tab.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {activeChart === "timeline" && (
          <ActivityTimelineChart activities={activities} />
        )}
        {activeChart === "progress" && (
          <BestProgressByEncounter activities={activities} />
        )}
        {activeChart === "jobs" && <JobUsageDonut activities={activities} />}
        {activeChart === "heatmap" && (
          <RaidActivityHeatmap activities={activities} />
        )}
      </div>
    </div>
  );
}

function ProfileEditorDialog({
  open,
  onOpenChange,
  lodestoneId,
  profile,
  collectionData,
  collectibles,
  sessionToken,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lodestoneId: string;
  profile: MemberProfile | null;
  collectionData: MemberCacheData | null;
  collectibles: CollectiblesData | null;
  sessionToken: string | null;
  onSaved: (profile: MemberProfile) => void;
}) {
  const [draft, setDraft] = useState<MemberProfile>(EMPTY_PROFILE);
  const [{ month, day }, setBirthday] = useState({ month: 0, day: 0 });
  const [saving, setSaving] = useState(false);
  const mountOptions = useMemo(
    () => favoriteOptions(collectionData?.owned?.mounts, collectibles?.mounts),
    [collectionData, collectibles],
  );
  const minionOptions = useMemo(
    () => favoriteOptions(collectionData?.owned?.minions, collectibles?.minions),
    [collectionData, collectibles],
  );

  useEffect(() => {
    if (!open) return;
    const nextProfile = profile ?? EMPTY_PROFILE;
    setDraft({
      bio: nextProfile.bio ?? null,
      birthday: nextProfile.birthday ?? null,
      mainJobs: Array.isArray(nextProfile.mainJobs) ? nextProfile.mainJobs : [],
      timezone: nextProfile.timezone ?? null,
      favoriteMountId: nextProfile.favoriteMountId ?? null,
      favoriteMinionId: nextProfile.favoriteMinionId ?? null,
      favoriteContent: nextProfile.favoriteContent ?? null,
    });
    setBirthday(parseBirthday(nextProfile.birthday ?? null));
  }, [open, profile]);

  function toggleJob(job: string) {
    setDraft((current) => {
      const jobs = current.mainJobs ?? [];
      const nextJobs = jobs.includes(job)
        ? jobs.filter((currentJob) => currentJob !== job)
        : jobs.length >= 8
          ? jobs
          : [...jobs, job];
      return { ...current, mainJobs: nextJobs };
    });
  }

  async function saveProfile() {
    if (!validBirthday(month, day)) {
      toast.error("Please provide a valid birthday.");
      return;
    }

    const nextProfile: MemberProfile = {
      bio: draft.bio?.trim() || null,
      birthday: encodeBirthday(month, day),
      mainJobs: draft.mainJobs ?? [],
      timezone: draft.timezone ?? null,
      favoriteMountId: draft.favoriteMountId ?? null,
      favoriteMinionId: draft.favoriteMinionId ?? null,
      favoriteContent: draft.favoriteContent ?? null,
    };

    setSaving(true);
    try {
      if (firebaseApp) {
        if (!sessionToken) throw new Error("Login is required.");
        await callAdminFunction("updateOwnMemberProfile", sessionToken, {
          profile: nextProfile,
        });
      } else {
        await set(ref(db, `memberProfiles/${lodestoneId}`), nextProfile);
      }
      onSaved(nextProfile);
      onOpenChange(false);
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Bio</Label>
            <textarea
              id="profile-bio"
              value={draft.bio ?? ""}
              maxLength={500}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bio: event.target.value || null,
                }))
              }
              rows={4}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {(draft.bio ?? "").length}/500
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Birthday</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={month ? String(month) : "0"}
                onValueChange={(value) =>
                  setBirthday((current) => ({ ...current, month: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No month</SelectItem>
                  {PROFILE_MONTHS.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={day ? String(day) : "0"}
                onValueChange={(value) =>
                  setBirthday((current) => ({ ...current, day: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No day</SelectItem>
                  {PROFILE_DAYS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select
                value={draft.timezone ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    timezone: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No timezone</SelectItem>
                  {PROFILE_TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezoneLabel(timezone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Favorite Content</Label>
              <Select
                value={draft.favoriteContent ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    favoriteContent: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Favorite content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No favorite</SelectItem>
                  {FAVORITE_CONTENT_OPTIONS.map((content) => (
                    <SelectItem key={content} value={content}>
                      {content}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FavoriteCollectiblePicker
              label="Favorite Mount"
              emptyText="No synced owned mounts yet."
              options={mountOptions}
              value={draft.favoriteMountId}
              onChange={(value) =>
                setDraft((current) => ({ ...current, favoriteMountId: value }))
              }
            />

            <FavoriteCollectiblePicker
              label="Favorite Minion"
              emptyText="No synced owned minions yet."
              options={minionOptions}
              value={draft.favoriteMinionId}
              onChange={(value) =>
                setDraft((current) => ({ ...current, favoriteMinionId: value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Main Jobs</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {PROFILE_JOBS.map((job) => {
                const selected = draft.mainJobs.includes(job);
                const icon = jobIconSrc(job);
                const abbr = JOB_ABBR[job] ?? job;
                return (
                  <button
                    key={job}
                    type="button"
                    title={job}
                    onClick={() => toggleJob(job)}
                    className={`flex aspect-square items-center justify-center rounded-md border text-xs transition-colors ${
                      selected
                        ? "border-primary bg-primary/15 text-primary"
                        : "bg-muted/30 hover:bg-muted"
                    }`}
                  >
                    {icon ? (
                      <img src={icon} alt={abbr} className="h-6 w-6 object-contain" />
                    ) : (
                      abbr
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {draft.mainJobs.length}/8 selected
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MemberProfilePage() {
  const { lodestoneId } = useParams({ strict: false }) as {
    lodestoneId: string;
  };
  const {
    member,
    profile,
    collectionData,
    collectibles,
    raidZones,
    recentActivity,
    loading,
    notFound,
  } = useMemberProfile(lodestoneId);
  const auth = useAdminAuth();
  const [activityPage, setActivityPage] = useState(1);
  const [profileOverride, setProfileOverride] = useState<{
    lodestoneId: string;
    profile: MemberProfile;
  } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !pageRef.current) return;
    animate(pageRef.current.querySelectorAll(".anim-section"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 380,
      easing: "easeOutQuart",
    });
  }, [loading]);

  const sortedActivity = useMemo(
    () => [...recentActivity].sort((a, b) => b.startedAt - a.startedAt),
    [recentActivity],
  );
  const activitySummary = useMemo(
    () => buildActivitySummary(sortedActivity),
    [sortedActivity],
  );
  const totalActivityPages = Math.max(
    1,
    Math.ceil(sortedActivity.length / ACTIVITY_PAGE_SIZE),
  );
  const pagedActivity = sortedActivity.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE,
  );

  useEffect(() => {
    setActivityPage(1);
  }, [lodestoneId, recentActivity.length]);

  useEffect(() => {
    if (activityPage > totalActivityPages) {
      setActivityPage(totalActivityPages);
    }
  }, [activityPage, totalActivityPages]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="space-y-4">
        <Link
          to="/members"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Members
        </Link>
        <p className="text-muted-foreground">Member not found.</p>
      </div>
    );
  }

  const effectiveProfile =
    profileOverride?.lodestoneId === lodestoneId ? profileOverride.profile : profile;
  const canEditProfile = auth.authed && auth.session?.lodestoneId === lodestoneId;
  const mainJobs = effectiveProfile?.mainJobs ?? [];
  const ownedCounts = COLLECTIBLE_KEYS.map((key) => ({
    key,
    count: collectionData?.owned?.[key]?.length ?? null,
  }));
  const hasCollection = ownedCounts.some((count) => count.count !== null);
  const rarestMount = collectibles
    ? findRarest(collectionData?.owned?.mounts ?? [], collectibles.mounts)
    : null;
  const rarestMinion = collectibles
    ? findRarest(collectionData?.owned?.minions ?? [], collectibles.minions)
    : null;
  const favoriteMount = favoriteById(
    effectiveProfile?.favoriteMountId,
    collectibles?.mounts,
  );
  const favoriteMinion = favoriteById(
    effectiveProfile?.favoriteMinionId,
    collectibles?.minions,
  );
  const hasPersonalDetails = Boolean(
    effectiveProfile?.favoriteContent ||
      favoriteMount ||
      favoriteMinion,
  );
  const FavoriteContentIcon = effectiveProfile?.favoriteContent
    ? favoriteContentIcon(effectiveProfile.favoriteContent)
    : Heart;
  const avatar = member.avatarUrl ?? null;
  return (
    <div ref={pageRef} className="space-y-8">
      <div className="anim-section">
        <Link
          to="/members"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Members
        </Link>

        <div className="flex items-start gap-5">
          {avatar ? (
            <img
              src={avatar}
              alt={member.name}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-border">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl font-bold leading-tight">
                {member.name}
              </h1>
              {canEditProfile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[
                member.fcRank,
                member.fcRank === "Friend" ? member.server : null,
              ]
                .filter(Boolean)
                .join(" - ")}
            </p>
            {mainJobs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mainJobs.map((job) => (
                  <div
                    key={job}
                    title={displayJobName(job)}
                    className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1"
                  >
                    <JobIcon fullName={job} size={16} />
                    <span className="text-xs">
                      {displayJobName(job)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(effectiveProfile?.birthday || effectiveProfile?.timezone) && (
              <div className="flex flex-wrap gap-2">
                {effectiveProfile?.birthday && (
                  <Badge
                    variant="secondary"
                    className="h-7 w-fit gap-1.5 px-3 font-normal"
                  >
                    <Cake className="h-3.5 w-3.5" />
                    {formatBirthday(effectiveProfile.birthday)}
                  </Badge>
                )}
                {effectiveProfile?.timezone && (
                  <Badge
                    variant="secondary"
                    className="h-7 w-fit gap-1.5 px-3 font-normal"
                  >
                    <ReactCountryFlag
                      countryCode={timezoneCountryCode(effectiveProfile.timezone)}
                      svg
                      aria-hidden="true"
                      className="text-sm leading-none"
                    />
                    {timezoneLabel(effectiveProfile.timezone)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasPersonalDetails && (
        <div className="anim-section flex max-w-5xl flex-wrap items-center gap-2">
          {effectiveProfile?.favoriteContent && (
            <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border bg-card px-2.5 py-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60">
                <FavoriteContentIcon className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 pr-1">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Favorite Content
                </p>
                <p className="max-w-44 truncate text-xs font-medium">
                  {effectiveProfile.favoriteContent}
                </p>
              </div>
            </div>
          )}
          {favoriteMount && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-2.5 py-1.5">
              <img
                src={favoriteMount.icon}
                alt={favoriteMount.name}
                className="h-7 w-7 shrink-0 rounded object-contain"
              />
              <div className="min-w-0 pr-1">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Favorite Mount
                </p>
                <p className="max-w-40 truncate text-xs font-medium">
                  {favoriteMount.name}
                </p>
              </div>
            </div>
          )}
          {favoriteMinion && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-2.5 py-1.5">
              <img
                src={favoriteMinion.icon}
                alt={favoriteMinion.name}
                className="h-7 w-7 shrink-0 rounded object-contain"
              />
              <div className="min-w-0 pr-1">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Favorite Minion
                </p>
                <p className="max-w-40 truncate text-xs font-medium">
                  {favoriteMinion.name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {effectiveProfile?.bio && (
        <div className="anim-section max-w-3xl pl-1">
          <p className="inline-flex items-start gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground/90">
            <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {effectiveProfile.bio}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <main className="min-w-0 space-y-6 xl:basis-[46%] xl:shrink-0">
          <JobLevels jobLevels={member.jobLevels} />
          {hasCollection && (
            <div className="anim-section space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  Collection
                </h2>
                <Link
                  to="/fc-collection"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ownedCounts.map(({ key, count }) => {
                  const meta = COLLECTIBLE_META[key];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-1 rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs">{meta.label}</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {count !== null ? (
                          count
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              {(rarestMount || rarestMinion) && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {rarestMount && collectibles && (
                    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                      {rarestMount.icon ? (
                        <img
                          src={rarestMount.icon}
                          alt={rarestMount.name}
                          className="h-10 w-10 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                          <Mountain className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Rarest Mount
                        </p>
                        <p className="truncate text-sm font-medium">
                          {rarestMount.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ownedPct(rarestMount, collectibles.mounts).toFixed(1)}% of
                          players
                        </p>
                      </div>
                    </div>
                  )}
                  {rarestMinion && collectibles && (
                    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                      {rarestMinion.icon ? (
                        <img
                          src={rarestMinion.icon}
                          alt={rarestMinion.name}
                          className="h-10 w-10 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                          <Rabbit className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Rarest Minion
                        </p>
                        <p className="truncate text-sm font-medium">
                          {rarestMinion.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ownedPct(rarestMinion, collectibles.minions).toFixed(1)}% of
                          players
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="anim-section space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                <Swords className="h-4 w-4 text-muted-foreground" />
                Best Performance (Dawntrail)
              </h2>
              <Link
                to="/raid-stats"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                FC stats
              </Link>
            </div>
            <ParseTabs zones={raidZones} lodestoneId={lodestoneId} />
          </div>
        </main>

        <aside className="min-w-0 flex-1 space-y-6">
          <div className="anim-section space-y-3">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Recent Raid Activity
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {sortedActivity.length} stored activit
                {sortedActivity.length === 1 ? "y" : "ies"} - only past 30 days.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <ProfileValue
                  label="Latest"
                  value={timeAgo(activitySummary.latest)}
                />
                <ProfileValue
                  label="Top Job"
                  value={
                    activitySummary.topJob === "No job yet" ? (
                      activitySummary.topJob
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <JobIcon fullName={activitySummary.topJob} size={16} />
                        {displayJobName(activitySummary.topJob)}
                      </span>
                    )
                  }
                />
                <ProfileValue
                  label="Recent Clears"
                  value={activitySummary.clears}
                />
                <ProfileValue label="Wipes" value={activitySummary.wipes} />
              </div>
              <RaidActivityInsights activities={sortedActivity} />
            </div>
          </div>

          <div className="anim-section space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                {sortedActivity.length === 0
                  ? 0
                  : (activityPage - 1) * ACTIVITY_PAGE_SIZE + 1}
                -
                {Math.min(
                  activityPage * ACTIVITY_PAGE_SIZE,
                  sortedActivity.length,
                )}{" "}
                of {sortedActivity.length}
              </p>
              {totalActivityPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActivityPage((page) => Math.max(1, page - 1))
                    }
                    disabled={activityPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {activityPage}/{totalActivityPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActivityPage((page) =>
                        Math.min(totalActivityPages, page + 1),
                      )
                    }
                    disabled={activityPage === totalActivityPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-card">
              {sortedActivity.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No recent Tomestone activity has been stored for this member
                  yet.
                </div>
              ) : (
                <div className="divide-y">
                  {pagedActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-2">
                        {activity.job ? (
                          <JobIcon fullName={activity.job} size={20} />
                        ) : (
                          <Swords className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {activity.encounterName} - {activity.zoneName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {activity.job
                              ? displayJobName(activity.job)
                              : "Unknown job"}{" "}
                            - {activityLabel(activity)}
                            {activity.wipeCount > 0
                              ? `, ${activity.wipeCount} wipes`
                              : ""}{" "}
                            - {formatDate(activity.startedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center justify-end">
                        {activity.reportUrl && (
                          <a
                            href={activity.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Log
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ProfileEditorDialog
        open={editingProfile}
        onOpenChange={setEditingProfile}
        lodestoneId={lodestoneId}
        profile={effectiveProfile}
        collectionData={collectionData}
        collectibles={collectibles}
        sessionToken={auth.sessionToken}
        onSaved={(nextProfile) => setProfileOverride({ lodestoneId, profile: nextProfile })}
      />
    </div>
  );
}
