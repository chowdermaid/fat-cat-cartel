import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCORE_CATEGORIES } from "@/types";
import type { ScoreCategory } from "@/types";
import type { LocalParticipant } from "../../types";

type ParticipantCardProps = {
  participant: LocalParticipant;
  onUpdateScore: (id: string, category: ScoreCategory, value: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string, participantName: string) => void;
};

export function ParticipantCard({
  participant,
  onUpdateScore,
  onSave,
  onDelete,
}: ParticipantCardProps) {
  return (
    <Card className={participant.dirty ? "border-amber-400" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{participant.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-bold text-foreground">{participant.total}</span>
            </span>
            <Button
              size="sm"
              onClick={() => onSave(participant.id)}
              disabled={!participant.dirty || participant.saving}
            >
              {participant.saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(participant.id, participant.name)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-4">
          {SCORE_CATEGORIES.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`${participant.id}-${key}`} className="text-xs">
                {label}
              </Label>
              <Input
                id={`${participant.id}-${key}`}
                type="number"
                min={0}
                value={participant.scores[key]}
                onChange={(e) => onUpdateScore(participant.id, key, e.target.value)}
                className="text-center"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
