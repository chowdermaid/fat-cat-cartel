import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/db";
import type { Participant } from "@/types";

interface UseScoreboardResult {
  participants: Participant[];
  loading: boolean;
  error: string | null;
}

export function useScoreboard(): UseScoreboardResult {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const parsed: Participant[] = Object.entries(
          data as Record<string, Omit<Participant, "id">>
        ).map(([id, value]) => ({ id, ...value }));

        parsed.sort((a, b) => b.total - a.total);

        setParticipants(parsed);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { participants, loading, error };
}
