import { CalendarDays, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EasterEventCardProps = {
  onManage: () => void;
};

export function EasterEventCard({ onManage }: EasterEventCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-lg font-serif leading-tight">
                Easter Social 2026
              </CardTitle>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                26 April 2026
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Archived
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manage participants and scores for the Easter 2026 event.
        </p>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" onClick={onManage}>
          <Settings className="h-3.5 w-3.5" />
          Manage Easter Social
        </Button>
      </CardFooter>
    </Card>
  );
}
