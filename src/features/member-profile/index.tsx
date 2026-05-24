import { useRef, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import { User, ChevronLeft, Trophy, Mountain, Rabbit, Crown, Award, Swords, Cake, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemberProfile } from "./api/useMemberProfile";
import { percentileClass } from "@/features/raid-stats/constants";
import { COLLECTIBLE_KEYS } from "@/features/fc-collection/collectibleConfig";
import type { CollectibleKey } from "@/features/fc-collection/collectibleConfig";
import type { Collectible } from "@/features/fc-collection/types";
import type { ParseData } from "@/features/raid-stats/types";

const jobIconMap = import.meta.glob<string>("../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const JOB_ICON_SLUG: Record<string, string> = {
  "Paladin": "paladin", "Warrior": "warrior", "Dark Knight": "darkknight", "Gunbreaker": "gunbreaker",
  "White Mage": "whitemage", "Scholar": "scholar", "Astrologian": "astrologian", "Sage": "sage",
  "Monk": "monk", "Dragoon": "dragoon", "Ninja": "ninja", "Samurai": "samurai", "Reaper": "reaper", "Viper": "viper",
  "Bard": "bard", "Machinist": "machinist", "Dancer": "dancer",
  "Black Mage": "blackmage", "Summoner": "summoner", "Red Mage": "redmage", "Pictomancer": "pictomancer",
};

const JOB_NAME_ALIASES: Record<string, string> = {
  BlackMage: "Black Mage",
  DarkKnight: "Dark Knight",
  RedMage: "Red Mage",
  WhiteMage: "White Mage",
};

function displayJobName(jobName: string): string {
  return JOB_NAME_ALIASES[jobName] ?? jobName;
}

function jobIconSrc(fullName: string): string | null {
  const slug = JOB_ICON_SLUG[displayJobName(fullName)];
  return slug ? (jobIconMap[`../../assets/jobs/${slug}.png`] ?? null) : null;
}

const JOB_ABBR: Record<string, string> = {
  Paladin: "PLD", Warrior: "WAR", "Dark Knight": "DRK", Gunbreaker: "GNB",
  "White Mage": "WHM", Scholar: "SCH", Astrologian: "AST", Sage: "SGE",
  Monk: "MNK", Dragoon: "DRG", Ninja: "NIN", Samurai: "SAM", Reaper: "RPR", Viper: "VPR",
  Bard: "BRD", Machinist: "MCH", Dancer: "DNC",
  "Black Mage": "BLM", Summoner: "SMN", "Red Mage": "RDM", Pictomancer: "PCT",
};

const COLLECTIBLE_META: Record<CollectibleKey, { label: string; icon: React.ElementType }> = {
  mounts:       { label: "Mounts",       icon: Mountain },
  minions:      { label: "Minions",      icon: Rabbit   },
  titles:       { label: "Titles",       icon: Crown    },
  achievements: { label: "Achievements", icon: Award    },
};

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "owned" in value;
}

function findRarest(ownedIds: number[], collectiblesById: Record<string, Collectible>): Collectible | null {
  let rarest: Collectible | null = null;
  let lowestOwned = Infinity;
  for (const id of ownedIds) {
    const c = collectiblesById[String(id)];
    if (!isCollectible(c)) continue;
    const n = parseInt(c.owned, 10);
    if (!isNaN(n) && n < lowestOwned) {
      lowestOwned = n;
      rarest = c;
    }
  }
  return rarest;
}

function ownedPct(c: Collectible, allById: Record<string, Collectible>): number {
  const maxOwned = Math.max(
    ...Object.values(allById).filter(isCollectible).map((x) => parseInt(x.owned, 10)).filter((n) => !isNaN(n) && n > 0),
  );
  const n = parseInt(c.owned, 10);
  if (isNaN(n) || !isFinite(maxOwned) || maxOwned === 0) return 0;
  return Math.round((n / maxOwned) * 100);
}

function formatBirthday(mmdd: string): string {
  const [month, day] = mmdd.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1] ?? "?"} ${day}`;
}

function JobIcon({ fullName, size = 20 }: { fullName: string; size?: number }) {
  const displayName = displayJobName(fullName);
  const src = jobIconSrc(fullName);
  const abbr = JOB_ABBR[displayName] ?? displayName;
  if (!src) return <span className="text-xs font-mono">{abbr}</span>;
  return <img src={src} alt={abbr} title={displayName} width={size} height={size} className="object-contain" />;
}

function fmtRdps(rdps: number): string {
  return rdps >= 1000 ? `${(rdps / 1000).toFixed(1)}k` : String(rdps);
}

function ParseRow({ label, parse }: { label: string; parse: ParseData }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-sm text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <JobIcon fullName={parse.job} size={18} />
        <span className="text-xs text-muted-foreground font-mono">{JOB_ABBR[displayJobName(parse.job)] ?? displayJobName(parse.job)}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">{fmtRdps(parse.rdps)}</span>
        <div className={`flex items-center gap-1 ${percentileClass(parse.percentile)}`}>
          <span className="text-sm font-bold tabular-nums">{parse.percentile.toFixed(1)}</span>
          <span className="text-xs opacity-60">%</span>
        </div>
      </div>
    </div>
  );
}

export function MemberProfilePage() {
  const { lodestoneId } = useParams({ strict: false }) as { lodestoneId: string };
  const { member, profile, collectionData, collectibles, parseEntry, zoneMeta, loading, notFound } = useMemberProfile(lodestoneId);
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="flex gap-6 items-start">
          <div className="w-24 h-24 rounded-full bg-muted shrink-0" />
          <div className="space-y-2 flex-1">
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
        <Link to="/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Members
        </Link>
        <p className="text-muted-foreground">Member not found.</p>
      </div>
    );
  }

  const mainJobs = profile?.mainJobs ?? [];
  const ownedCounts = COLLECTIBLE_KEYS.map((key) => ({
    key,
    count: collectionData?.owned?.[key]?.length ?? null,
  }));
  const hasCollection = ownedCounts.some((c) => c.count !== null);

  const rarestMount = collectibles ? findRarest(collectionData?.owned?.mounts ?? [], collectibles.mounts) : null;
  const rarestMinion = collectibles ? findRarest(collectionData?.owned?.minions ?? [], collectibles.minions) : null;

  const savageParses = parseEntry?.savage ?? {};
  const encounters = zoneMeta?.encounters ?? [];
  const parsedRows = encounters
    .map((enc) => ({ enc, parse: savageParses[enc.key] as ParseData | undefined }))
    .filter((r) => r.parse != null) as { enc: typeof encounters[number]; parse: ParseData }[];
  const hasParses = member.fflogsId != null && parsedRows.length > 0;
  const allStars = parseEntry?.allStars ?? null;

  return (
    <div ref={pageRef} className="space-y-8 max-w-2xl">

      {/* Header */}
      <div className="anim-section">
        <Link to="/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ChevronLeft className="h-4 w-4" />
          Members
        </Link>

        <div className="flex gap-5 items-start">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="w-24 h-24 rounded-full object-cover ring-2 ring-border shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center ring-2 ring-border shrink-0">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2 min-w-0 pt-1">
            <h1 className="text-3xl font-bold font-serif leading-tight">{member.name}</h1>
            {member.fcRank && (
              <p className="text-xs text-muted-foreground">{member.fcRank}</p>
            )}
            {mainJobs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mainJobs.map((job) => (
                  <div
                    key={job}
                    title={displayJobName(job)}
                    className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1"
                  >
                    <JobIcon fullName={job} size={16} />
                    <span className="text-xs font-mono">{JOB_ABBR[displayJobName(job)] ?? displayJobName(job)}</span>
                  </div>
                ))}
              </div>
            )}
            {profile?.birthday && (
              <Badge variant="secondary" className="gap-1.5 font-normal w-fit">
                <Cake className="h-3 w-3" />
                {formatBirthday(profile.birthday)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className="anim-section pl-1">
          <p className="text-sm leading-relaxed text-foreground/80 border-l-2 border-primary/40 pl-4 italic">
            {profile.bio}
          </p>
        </div>
      )}

      {/* Collection */}
      {hasCollection && (
        <div className="anim-section space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-serif flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Collection
            </h2>
            <Link
              to="/fc-collection"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ownedCounts.map(({ key, count }) => {
              const meta = COLLECTIBLE_META[key];
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-lg border bg-card p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{meta.label}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {count !== null ? count : <span className="text-muted-foreground text-sm">N/A</span>}
                  </p>
                </div>
              );
            })}
          </div>

          {(rarestMount || rarestMinion) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rarestMount && collectibles && (
                <div className="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3">
                  {rarestMount.icon ? (
                    <img src={rarestMount.icon} alt={rarestMount.name} className="w-10 h-10 object-contain shrink-0 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Mountain className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Rarest Mount</p>
                    <p className="text-sm font-medium truncate">{rarestMount.name}</p>
                    <p className="text-xs text-muted-foreground">{ownedPct(rarestMount, collectibles.mounts)}% of players</p>
                  </div>
                </div>
              )}
              {rarestMinion && collectibles && (
                <div className="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3">
                  {rarestMinion.icon ? (
                    <img src={rarestMinion.icon} alt={rarestMinion.name} className="w-10 h-10 object-contain shrink-0 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Rabbit className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Rarest Minion</p>
                    <p className="text-sm font-medium truncate">{rarestMinion.name}</p>
                    <p className="text-xs text-muted-foreground">{ownedPct(rarestMinion, collectibles.minions)}% of players</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Raid */}
      {hasParses && (
        <div className="anim-section space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-serif flex items-center gap-2">
              <Swords className="h-4 w-4 text-muted-foreground" />
              Raid
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-normal tabular-nums">
                {parsedRows.length}/{encounters.length} cleared
              </Badge>
              {zoneMeta && (
                <span className="text-xs text-muted-foreground">{zoneMeta.shortName} Savage</span>
              )}
              <Link to="/raid-stats" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                FC stats
              </Link>
            </div>
          </div>

          {allStars && (
            <div className="rounded-lg border bg-card px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  <span className="text-xs">All Stars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <JobIcon fullName={allStars.spec} size={16} />
                  <span className="text-xs text-muted-foreground">{JOB_ABBR[allStars.spec] ?? allStars.spec}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold tabular-nums">{allStars.points.toFixed(1)} pts</span>
                <span className={`text-sm font-semibold ${percentileClass(allStars.rankPercent)}`}>
                  Top {Math.max(0, 100 - allStars.rankPercent).toFixed(1)}%
                </span>
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground/70">#{allStars.worldRank.toLocaleString()}</span> World
                </span>
                <span>
                  <span className="font-semibold text-foreground/70">#{allStars.regionRank.toLocaleString()}</span> DC
                </span>
                <span>
                  <span className="font-semibold text-foreground/70">#{allStars.serverRank.toLocaleString()}</span> Server
                </span>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-card divide-y px-4">
            {parsedRows.map(({ enc, parse }) => (
              <ParseRow key={enc.key} label={enc.label} parse={parse} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
