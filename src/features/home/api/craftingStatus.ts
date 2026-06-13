import {
  CRAFTING_REQUEST_PATHS,
} from "@/features/craftingboard/api/craftingRequests";
import { readDevCraftingRequestDashboard } from "@/lib/dev/craftingRequests";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { db, get, ref } from "@/lib/db";
import type { HomeCraftingStatus } from "../types";

type DbSnapshot<T> = {
  val(): T | null;
};

type DashboardIndexValue = Record<string, unknown>;

function countIndexRecords(value: DashboardIndexValue | null): number {
  return Object.values(value ?? {}).filter(Boolean).length;
}

export async function readHomeCraftingStatus(): Promise<HomeCraftingStatus> {
  if (DEV_AUTH_LAYER_ENABLED) {
    const dashboard = readDevCraftingRequestDashboard();
    return {
      inProgressCount: dashboard.inProgress.length,
      openCount: dashboard.open.length,
    };
  }

  const [openSnap, inProgressSnap] = await Promise.all([
    get(ref(db, CRAFTING_REQUEST_PATHS.openIndex)) as Promise<
      DbSnapshot<DashboardIndexValue>
    >,
    get(ref(db, CRAFTING_REQUEST_PATHS.inProgressIndex)) as Promise<
      DbSnapshot<DashboardIndexValue>
    >,
  ]);

  return {
    inProgressCount: countIndexRecords(inProgressSnap.val()),
    openCount: countIndexRecords(openSnap.val()),
  };
}
