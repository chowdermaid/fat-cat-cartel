import { useEffect, useState } from "react";
import { db, ref, onValue, push, remove } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus } from "lucide-react";
import type { FCMember } from "@/features/fc-collection/types";

export function FCMembersManager() {
  const [members, setMembers] = useState<FCMember[]>([]);
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, "fcCollection/members"), (snap: any) => {
      const val = snap.val();
      setMembers(
        val
          ? Object.entries(val).map(([id, data]) => ({
              id,
              ...(data as Omit<FCMember, "id">),
            }))
          : []
      );
    });
    return unsub;
  }, []);

  function handleAdd() {
    if (!name.trim() || !lodestoneId.trim()) return;
    push(ref(db, "fcCollection/members"), {
      name: name.trim(),
      lodestoneId: lodestoneId.trim(),
    });
    setName("");
    setLodestoneId("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="fc-member-name">Character Name</Label>
          <Input
            id="fc-member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chow Chow"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fc-lodestone-id">Lodestone ID</Label>
          <Input
            id="fc-lodestone-id"
            value={lodestoneId}
            onChange={(e) => setLodestoneId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="12345678"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!name.trim() || !lodestoneId.trim()}
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Find Lodestone IDs at{" "}
        <a
          href="https://na.finalfantasyxiv.com/lodestone/character/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          na.finalfantasyxiv.com/lodestone/character
        </a>
      </p>

      <div className="rounded-lg border divide-y">
        {members.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No members added yet.
          </p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {m.lodestoneId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(ref(db, `fcCollection/members/${m.id}`))}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
