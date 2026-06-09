import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MathTooltip } from "../MathTooltip";

export function SummaryCard({
  badge,
  detail,
  icon: Icon,
  label,
  tooltip,
  value,
  valueClassName,
}: {
  badge?: string;
  detail?: string;
  icon: React.ElementType;
  label: string;
  tooltip?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-32 items-start gap-3 pt-6">
        <div className="rounded-lg border bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            {badge ? <Badge variant="destructive">{badge}</Badge> : null}
          </div>
          <MathTooltip content={tooltip}>
            <p
              className={`truncate text-2xl font-semibold ${valueClassName ?? ""}`}
            >
              {value}
            </p>
          </MathTooltip>
          {detail ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {detail}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
