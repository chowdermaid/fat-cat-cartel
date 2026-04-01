import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PointRule {
  label: string;
  points: string;
}

interface EventCardProps {
  emoji: string;
  title: string;
  duration: string;
  host: string;
  scoreboard: boolean;
  description: string;
  rules?: string[];
  pointRules?: PointRule[];
  notes?: string;
  link?: string;
  className?: string;
}

export function EventCard({
  emoji,
  title,
  duration,
  host,
  scoreboard,
  description,
  rules,
  pointRules,
  notes,
  link,
  className,
}: EventCardProps) {
  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <div>
              <CardTitle className="text-lg font-serif leading-tight">
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {duration} · Host: {host}
              </p>
            </div>
          </div>
          <Badge
            variant={scoreboard ? "default" : "secondary"}
            className="shrink-0"
          >
            {scoreboard ? "Scored" : "Standalone"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {rules && rules.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Rules
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="text-primary shrink-0 mt-0.5">✦</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pointRules && pointRules.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Points
            </p>
            <div className="space-y-1">
              {pointRules.map(({ label, points }) => (
                <div
                  key={label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums">{points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <p className="text-xs text-muted-foreground/70 italic border-t pt-3">
            {notes}
          </p>
        )}
      </CardContent>
      {link && (
        <CardFooter className="pt-0">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Play
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
