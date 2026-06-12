import {
  CRAFTING_REQUEST_PATHS,
} from "@/features/craftingboard/api/craftingRequests";
import type { CraftingRequestDashboardRecord } from "@/features/craftingboard/types";
import { readDevCraftingRequestDashboard } from "@/lib/dev/craftingRequests";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { db, get, ref } from "@/lib/db";

type DbSnapshot<T> = {
  val(): T | null;
};

type OpenRequestIndexValue = Record<
  string,
  CraftingRequestDashboardRecord | null
>;

export async function readHomeOpenErrands(): Promise<
  CraftingRequestDashboardRecord[]
> {
  if (DEV_AUTH_LAYER_ENABLED) {
    return readDevCraftingRequestDashboard().open;
  }

  const snap = (await get(ref(db, CRAFTING_REQUEST_PATHS.openIndex))) as DbSnapshot<
    OpenRequestIndexValue
  >;

  return Object.values(snap.val() ?? {})
    .filter((record): record is CraftingRequestDashboardRecord =>
      Boolean(record),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
