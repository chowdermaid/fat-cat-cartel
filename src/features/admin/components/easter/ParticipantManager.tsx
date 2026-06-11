import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useEasterParticipants } from "../../hooks/useEasterParticipants";
import { ParticipantCard } from "./ParticipantCard";

interface ParticipantManagerProps {
  adminSessionToken: string | null;
}

export function ParticipantManager({ adminSessionToken }: ParticipantManagerProps) {
  const {
    participants,
    loading,
    newName,
    setNewName,
    adding,
    updateScore,
    saveParticipant,
    deleteParticipant,
    addParticipant,
  } = useEasterParticipants(adminSessionToken);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add participant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Participant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Player name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <Button
              onClick={addParticipant}
              disabled={adding || !newName.trim()}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {participants.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No participants yet. Add one above.
        </p>
      )}

      {participants.map((p) => (
        <ParticipantCard
          key={p.id}
          participant={p}
          onUpdateScore={updateScore}
          onSave={saveParticipant}
          onDelete={deleteParticipant}
        />
      ))}
    </div>
  );
}
