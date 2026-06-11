import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, ref, onValue, push, set, remove } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import type { Participant, Scores, ScoreCategory } from "@/types";
import type { LocalParticipant } from "../types";
import {
  deleteEasterParticipantAdmin,
  upsertEasterParticipantAdmin,
} from "../api/easterParticipants";

function calcTotal(scores: Scores): number {
  return scores.hideAndSeek + scores.trivia + scores.eorzoaGuessr;
}

export function useEasterParticipants(adminSessionToken: string | null) {
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
          data as Record<string, Omit<Participant, "id">>,
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
          }),
        );
        setLoading(false);
      },
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
      }),
    );
  }

  async function saveParticipant(id: string) {
    const participant = participants.find((p) => p.id === id);
    if (!participant) return;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saving: true } : p)),
    );
    try {
      if (firebaseApp) {
        if (!adminSessionToken) throw new Error("Admin session is required.");
        await upsertEasterParticipantAdmin(adminSessionToken, {
          id,
          name: participant.name,
          scores: participant.scores,
        });
      } else {
        await set(ref(db, `events/easter2026/participants/${id}`), {
          name: participant.name,
          scores: participant.scores,
          total: participant.total,
        });
      }
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, dirty: false, saving: false } : p)),
      );
      toast.success(`Saved scores for ${participant.name}.`);
    } catch (e) {
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, saving: false } : p)),
      );
      toast.error(e instanceof Error ? e.message : "Failed to save scores.");
    }
  }

  async function deleteParticipant(id: string, participantName: string) {
    if (!confirm(`Remove ${participantName}?`)) return;
    try {
      if (firebaseApp) {
        if (!adminSessionToken) throw new Error("Admin session is required.");
        await deleteEasterParticipantAdmin(adminSessionToken, id);
      } else {
        await remove(ref(db, `events/easter2026/participants/${id}`));
      }
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
      if (firebaseApp) {
        if (!adminSessionToken) throw new Error("Admin session is required.");
        await upsertEasterParticipantAdmin(adminSessionToken, {
          name,
          scores: defaultScores,
        });
      } else {
        await push(ref(db, "events/easter2026/participants"), {
          name,
          scores: defaultScores,
          total: 0,
        });
      }
      setNewName("");
      toast.success(`${name} added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add participant.");
    } finally {
      setAdding(false);
    }
  }

  return {
    participants,
    loading,
    newName,
    setNewName,
    adding,
    updateScore,
    saveParticipant,
    deleteParticipant,
    addParticipant,
  };
}
