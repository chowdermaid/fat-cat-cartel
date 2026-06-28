import { db, get, ref } from "@/lib/db";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import type { DmuProgressData } from "../types";

export function fetchDmuProgress(): Promise<DmuProgressData | null> {
  return get(ref(db, "raidStats/dmuProgress")).then(
    (snap: { val(): DmuProgressData | null }) => snap.val(),
  );
}

export function triggerDmuProgressRefresh(adminSessionToken: string) {
  return callAdminFunction<{
    ok: boolean;
    sourceStatus: DmuProgressData["sourceStatus"];
  }>("triggerDmuProgressRefresh", adminSessionToken, {}, { timeout: 300_000 });
}
