import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair } from "lucide-react";
import { percentileBadgeClass } from "../constants";
import type { MemberData, ZoneEncounter, ContentType } from "../types";

interface Props {
  member: MemberData | null;
  encounters: ZoneEncounter[];
  contentType: ContentType;
}

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 88;
const LABEL_R = R + 22;

function coord(radius: number, angle: number) {
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
}

function polygonPath(radius: number, angles: number[]): string {
  return angles
    .map((a, i) => {
      const p = coord(radius, a);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ") + "Z";
}

export function MemberRadarChart({ member, encounters, contentType }: Props) {
  const groupRef = useRef<SVGGElement>(null);
  const n = encounters.length;
  const angles = encounters.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const parses = member ? (contentType === "savage" ? (member.savage ?? {}) : (member.normal ?? {})) : {};
  const percentiles = encounters.map((e) => parses[e.key]?.percentile ?? 0);
  const dataPoints = percentiles.map((pct, i) => coord((pct / 100) * R, angles[i]));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + "Z";

  useEffect(() => {
    if (!groupRef.current) return;
    animate(groupRef.current, { opacity: [0, 1], duration: 350, easing: "easeOutQuad" });
  }, [member?.name]);

  const hasData = percentiles.some((p) => p > 0);
  const showChart = n >= 2;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Crosshair className="h-4 w-4 text-muted-foreground" />
          {member ? (
            <div className="flex items-center gap-2 min-w-0">
              {member.avatarUrl && (
                <img src={member.avatarUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
              )}
              <span className="truncate">{member.name}</span>
            </div>
          ) : (
            "Radar Chart"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center pt-0 min-h-0">
        {!member ? (
          <p className="text-sm text-muted-foreground py-10 text-center px-4">
            Click a row in the table to see this member's parse radar.
          </p>
        ) : !showChart ? (
          <div className="py-8 text-center space-y-3">
            {percentiles.map((pct, i) => (
              <div key={encounters[i].key} className="flex items-center justify-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">{encounters[i].label}</span>
                {pct > 0 ? (
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${percentileBadgeClass(pct)}`}>
                    {Math.round(pct)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">-</span>
                )}
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground py-10 text-center px-4">
            No parses found for this member in this zone.
          </p>
        ) : (
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="overflow-visible max-w-full"
          >
            {/* Grid rings */}
            {[25, 50, 75, 100].map((v) => (
              <path
                key={v}
                d={polygonPath((v / 100) * R, angles)}
                fill="none"
                stroke="currentColor"
                strokeOpacity={v === 100 ? 0.18 : 0.08}
                strokeWidth={1}
              />
            ))}
            {/* Axis lines */}
            {angles.map((a, i) => {
              const edge = coord(R, a);
              return (
                <line
                  key={i}
                  x1={CX}
                  y1={CY}
                  x2={edge.x.toFixed(2)}
                  y2={edge.y.toFixed(2)}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
              );
            })}
            {/* Data polygon + dots */}
            <g ref={groupRef}>
              <path
                d={dataPath}
                fill="#60a5fa"
                fillOpacity={0.18}
                stroke="#60a5fa"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {dataPoints.map((p, i) =>
                percentiles[i] > 0 ? (
                  <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={3.5} fill="#60a5fa" />
                ) : null,
              )}
            </g>
            {/* Encounter labels + percentile values */}
            {angles.map((a, i) => {
              const lp = coord(LABEL_R, a);
              const pct = percentiles[i];
              const vp = coord((pct / 100) * R + 12, a);
              return (
                <g key={i}>
                  <text
                    x={lp.x.toFixed(2)}
                    y={lp.y.toFixed(2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 9, fontWeight: 600, fontFamily: "inherit" }}
                    fill="currentColor"
                    fillOpacity={0.6}
                  >
                    {encounters[i].label}
                  </text>
                  {pct > 0 && (
                    <text
                      x={vp.x.toFixed(2)}
                      y={vp.y.toFixed(2)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 8, fontWeight: 700, fontFamily: "inherit" }}
                      fill="#60a5fa"
                    >
                      {Math.round(pct)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </CardContent>
    </Card>
  );
}
