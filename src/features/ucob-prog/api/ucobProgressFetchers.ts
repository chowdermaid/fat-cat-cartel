import { db, get, ref, set } from "@/lib/db";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { UCOB_PROGRESS_PATH, UCOB_USE_STUBS } from "../constants";
import type { UcobProgressData } from "../types";
import { createUcobProgressFixture } from "./ucobProgressFixtures";

export async function fetchUcobProgress(): Promise<UcobProgressData | null> {
  const snapshot = await get(ref(db, UCOB_PROGRESS_PATH));
  return snapshot.val() as UcobProgressData | null;
}

export async function triggerUcobProgressRefresh(adminSessionToken: string) {
  if (UCOB_USE_STUBS && !DEV_AUTH_LAYER_ENABLED) {
    const fixture = createUcobProgressFixture();
    await set(ref(db, UCOB_PROGRESS_PATH), fixture);
    return { ok: true, sourceStatus: fixture.sourceStatus };
  }
  const result = await callAdminFunction<{ ok: boolean; sourceStatus: UcobProgressData["sourceStatus"] }>(
    "triggerUcobProgressRefresh", adminSessionToken, {}, { timeout: 300_000 },
  );
  if (UCOB_USE_STUBS) {
    await set(ref(db, UCOB_PROGRESS_PATH), createUcobProgressFixture(result.sourceStatus.checkedAt));
  }
  return result;
}
