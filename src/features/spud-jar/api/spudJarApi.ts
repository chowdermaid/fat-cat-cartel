import { db, ref, runTransaction } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import {
  MAX_COMPLAINT_BATCH,
  SPUD_JAR_CAPACITY,
  SPUD_JAR_PATH,
} from "../constants";
import type {
  SpudJarAction,
  SpudJarMutationResult,
  SpudJarRecord,
} from "../types";

const CALLABLE_BY_ACTION = {
  add: "addSpudJarComplaints",
  undo: "undoSpudJarComplaint",
  reset: "resetSpudJar",
} as const;

function localRecord(
  current: unknown,
  action: SpudJarAction,
  updatedBy: string,
  count: number,
): SpudJarRecord {
  const record = current as Partial<SpudJarRecord> | null;
  const total = record?.total ?? 0;
  const cycle = record?.cycle ?? 0;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("Spud Jar total is malformed.");
  }
  if (!Number.isSafeInteger(cycle) || cycle < 0) {
    throw new Error("Spud Jar cycle is malformed.");
  }
  const carry = Math.floor(total / SPUD_JAR_CAPACITY);
  if (cycle > Number.MAX_SAFE_INTEGER - carry) {
    throw new Error("Spud Jar total is too large.");
  }
  const normalizedTotal = total % SPUD_JAR_CAPACITY;
  const normalizedCycle = cycle + carry;
  if (
    normalizedCycle >
    Math.floor((Number.MAX_SAFE_INTEGER - normalizedTotal) / SPUD_JAR_CAPACITY)
  ) {
    throw new Error("Spud Jar total is too large.");
  }
  if (
    action !== "reset" &&
    (!Number.isSafeInteger(count) || count < 1 || count > MAX_COMPLAINT_BATCH)
  ) {
    throw new Error(`Complaint count must be between 1 and ${MAX_COMPLAINT_BATCH}.`);
  }
  const lifetimeTotal =
    normalizedCycle * SPUD_JAR_CAPACITY + normalizedTotal;
  if (action === "add" && lifetimeTotal > Number.MAX_SAFE_INTEGER - count) {
    throw new Error("Spud Jar total is too large.");
  }
  if (action === "undo" && count > lifetimeTotal) {
    throw new Error("Spud Jar is already empty.");
  }
  const nextLifetimeTotal = action === "add"
    ? lifetimeTotal + count
    : action === "undo"
      ? lifetimeTotal - count
      : 0;
  const nextTotal = nextLifetimeTotal % SPUD_JAR_CAPACITY;
  const nextCycle = Math.floor(nextLifetimeTotal / SPUD_JAR_CAPACITY);
  return { total: nextTotal, cycle: nextCycle, updatedAt: Date.now(), updatedBy };
}

export async function mutateSpudJar(
  action: SpudJarAction,
  sessionToken: string | null,
  updatedBy: string,
  count = 1,
): Promise<SpudJarMutationResult> {
  if (firebaseApp) {
    if (!sessionToken) throw new Error("Member session is required.");
    return callAdminFunction<SpudJarMutationResult>(
      CALLABLE_BY_ACTION[action],
      sessionToken,
      action === "reset" ? {} : { count },
    );
  }

  const result = (await runTransaction(
    ref(db, SPUD_JAR_PATH),
    (current: unknown) => localRecord(current, action, updatedBy, count),
  )) as { committed: boolean; snapshot: { val(): unknown } };
  if (!result.committed) throw new Error("Spud Jar update was not committed.");
  const record = result.snapshot.val() as SpudJarRecord;
  return { ok: true, total: record.total, cycle: record.cycle };
}
