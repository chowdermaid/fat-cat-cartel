import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { formatJobName } from "../constants";
import { JOB_ICONS } from "../jobIcons";
import type { MemberData, ContentType } from "../types";

interface Props {
  members: Record<string, MemberData>;
  contentType: ContentType;
}

const ROLE_ORDER = ["Tank", "Healer", "Melee", "Ranged", "Caster"];

const JOB_ROLES: Record<string, string> = {
  "Paladin": "Tank", "Warrior": "Tank", "DarkKnight": "Tank", "Gunbreaker": "Tank",
  "WhiteMage": "Healer", "Scholar": "Healer", "Astrologian": "Healer", "Sage": "Healer",
  "Monk": "Melee", "Dragoon": "Melee", "Ninja": "Melee", "Samurai": "Melee", "Reaper": "Melee", "Viper": "Melee",
  "Bard": "Ranged", "Machinist": "Ranged", "Dancer": "Ranged",
  "BlackMage": "Caster", "Summoner": "Caster", "RedMage": "Caster", "Pictomancer": "Caster",
};

const ROLE_COLORS: Record<string, string> = {
  Tank:   "bg-blue-500",
  Healer: "bg-green-500",
  Melee:  "bg-red-500",
  Ranged: "bg-yellow-500",
  Caster: "bg-purple-500",
};

export function JobDistributionCard({ members, contentType }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const jobCounts: Record<string, number> = {};
  for (const m of Object.values(members)) {
    const parses = Object.values(contentType === "savage" ? (m.savage ?? {}) : (m.normal ?? {})).filter(Boolean);
    if (parses.length === 0) continue;
    const best = parses.reduce((a, b) => ((a?.percentile ?? 0) >= (b?.percentile ?? 0) ? a : b));
    if (best?.job) jobCounts[best.job] = (jobCounts[best.job] ?? 0) + 1;
  }

  const total = Object.values(jobCounts).reduce((s, n) => s + n, 0);

  const byRole: Record<string, { job: string; count: number; pct: number }[]> = {};
  for (const [job, count] of Object.entries(jobCounts)) {
    const role = JOB_ROLES[job] ?? "Other";
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push({ job, count, pct: total > 0 ? (count / total) * 100 : 0 });
  }

  const roles = ROLE_ORDER.filter((r) => byRole[r]?.length);

  useEffect(() => {
    if (!contentRef.current) return;

    animate(contentRef.current.querySelectorAll(".job-row"), {
      opacity: [0, 1],
      translateY: [6, 0],
      delay: stagger(30),
      duration: 240,
      easing: "easeOutQuad",
    });

    const fills = Array.from(contentRef.current.querySelectorAll<HTMLElement>(".job-fill"));
    fills.forEach((el, i) => {
      animate(el, {
        width: ["0%", el.dataset.width ?? "0%"],
        duration: 550,
        delay: i * 30,
        easing: "easeOutQuart",
      });
    });
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Job Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={contentRef} className="space-y-3">
          {roles.map((role) => (
            <div key={role} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{role}</div>
              <div className="space-y-1">
                {byRole[role].sort((a, b) => b.count - a.count).map(({ job, count, pct }) => (
                  <div key={job} className="job-row flex items-center gap-2">
                    <div className="w-32 flex items-center gap-2 shrink-0">
                      {JOB_ICONS[job] ? (
                        <img src={JOB_ICONS[job]} alt={job} className="w-5 h-5 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 shrink-0" />
                      )}
                      <span className="text-xs text-foreground truncate">{formatJobName(job)}</span>
                    </div>
                    <div className="flex-1 h-3.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`job-fill h-full rounded-full ${ROLE_COLORS[role] ?? "bg-zinc-500"} opacity-80`}
                        style={{ width: "0%" }}
                        data-width={`${pct}%`}
                      />
                    </div>
                    <span className="w-4 text-xs text-muted-foreground tabular-nums text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {total === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No parse data yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
