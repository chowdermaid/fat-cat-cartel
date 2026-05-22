import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, ref, onValue, push, set, remove } from "@/lib/db";
import type { Participant, Scores, ScoreCategory } from "@/types";
import { SCORE_CATEGORIES } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

function calcTotal(scores: Scores): number {
  return scores.hideAndSeek + scores.trivia + scores.eorzoaGuessr;
}

interface LocalParticipant extends Participant {
  dirty: boolean;
  saving: boolean;
}

export function ParticipantManager() {
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const participantsRef = ref(db, "events/easter2026/participants");
    const unsubscribe = onValue(
      participantsRef,
      (snapshot: { val(): unknown }) => {
        const data = snapshot.val();
        if (!data) {
          setParticipants([]);
          setLoading(false);
          return;
        }
        const parsed: LocalParticipant[] = Object.entries(
          data as Record<string, Omit<Participant, "id">>
        ).map(([id, value]) => ({
          id,
          ...value,
          dirty: false,
          saving: false,
        }));

        parsed.sort((a, b) => b.total - a.total);

        setParticipants((prev) =>
          parsed.map((incoming) => {
            const existing = prev.find((p) => p.id === incoming.id);
            return existing?.dirty ? existing : incoming;
          })
        );
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  function updateScore(id: string, category: ScoreCategory, value: string) {
    const num = Math.max(0, parseInt(value) || 0);
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newScores = { ...p.scores, [category]: num };
        return { ...p, scores: newScores, total: calcTotal(newScores), dirty: true };
      })
    );
  }

  async function saveParticipant(id: string) {
    const participant = participants.find((p) => p.id === id);
    if (!participant) return;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saving: true } : p))
    );
    try {
      await set(ref(db, `events/easter2026/participants/${id}`), {
        name: participant.name,
        scores: participant.scores,
        total: participant.total,
      });
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, dirty: false, saving: false } : p))
      );
      toast.success(`Saved scores for ${participant.name}.`);
    } catch (e) {
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, saving: false } : p))
      );
      toast.error(e instanceof Error ? e.message : "Failed to save scores.");
    }
  }

  async function deleteParticipant(id: string, participantName: string) {
    if (!confirm(`Remove ${participantName}?`)) return;
    try {
      await remove(ref(db, `events/easter2026/participants/${id}`));
      toast.success(`${participantName} removed.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove participant.");
    }
  }

  async function addParticipant() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const defaultScores: Scores = {
      hideAndSeek: 0,
      trivia: 0,
      eorzoaGuessr: 0,
    };
    try {
      await push(ref(db, "events/easter2026/participants"), {
        name,
        scores: defaultScores,
        total: 0,
      });
      setNewName("");
      toast.success(`${name} added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add participant.");
    } finally {
      setAdding(false);
    }
  }

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
        <Card key={p.id} className={p.dirty ? "border-amber-400" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="font-bold text-foreground">{p.total}</span>
                </span>
                <Button
                  size="sm"
                  onClick={() => saveParticipant(p.id)}
                  disabled={!p.dirty || p.saving}
                >
                  {p.saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteParticipant(p.id, p.name)}
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
                  <Label htmlFor={`${p.id}-${key}`} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={`${p.id}-${key}`}
                    type="number"
                    min={0}
                    value={p.scores[key]}
                    onChange={(e) => updateScore(p.id, key, e.target.value)}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
