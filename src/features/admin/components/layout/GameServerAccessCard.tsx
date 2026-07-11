import { Server, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GameServerAccessCardProps = {
  onManage: () => void;
};

export function GameServerAccessCard({ onManage }: GameServerAccessCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-lg font-serif leading-tight">
                Game Server Access
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Discord whitelist
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manage Discord IDs allowed to use game server dashboards.
        </p>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" onClick={onManage}>
          <Settings className="h-3.5 w-3.5" />
          Manage Access
        </Button>
      </CardFooter>
    </Card>
  );
}
