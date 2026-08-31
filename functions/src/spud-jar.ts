import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const SPUD_JAR_PATH = "tools/spudJar";

export type SpudJarAction = "add" | "undo" | "reset";
export const MAX_SPUD_JAR_BATCH = 1_000;
export const SPUD_JAR_CAPACITY = 105;

export interface SpudJarRecord {
  total: number;
  cycle: number;
  updatedAt: number;
  updatedBy: string;
}

function readCurrent(value: unknown): Pick<SpudJarRecord, "total" | "cycle"> {
  if (value == null) return { total: 0, cycle: 0 };
  if (typeof value !== "object") {
    throw new HttpsError("failed-precondition", "Spud Jar data is malformed.");
  }
  const record = value as { total?: unknown; cycle?: unknown };
  const total = record.total;
  const cycle = record.cycle ?? 0;
  if (
    !Number.isSafeInteger(total) ||
    Number(total) < 0
  ) {
    throw new HttpsError("failed-precondition", "Spud Jar total is malformed.");
  }
  if (!Number.isSafeInteger(cycle) || Number(cycle) < 0) {
    throw new HttpsError("failed-precondition", "Spud Jar cycle is malformed.");
  }
  const carry = Math.floor(Number(total) / SPUD_JAR_CAPACITY);
  if (Number(cycle) > Number.MAX_SAFE_INTEGER - carry) {
    throw new HttpsError("resource-exhausted", "Spud Jar total is too large.");
  }
  const normalizedTotal = Number(total) % SPUD_JAR_CAPACITY;
  const normalizedCycle = Number(cycle) + carry;
  if (
    normalizedCycle >
    Math.floor((Number.MAX_SAFE_INTEGER - normalizedTotal) / SPUD_JAR_CAPACITY)
  ) {
    throw new HttpsError("resource-exhausted", "Spud Jar total is too large.");
  }
  return { total: normalizedTotal, cycle: normalizedCycle };
}

export function nextSpudJarRecord(
  current: unknown,
  action: SpudJarAction,
  updatedBy: string,
  updatedAt: number,
  amount = 1,
): SpudJarRecord {
  const { total, cycle } = readCurrent(current);
  let nextTotal: number;
  let nextCycle = cycle;

  if (action === "add" || action === "undo") {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_SPUD_JAR_BATCH) {
      throw new HttpsError(
        "invalid-argument",
        `Complaint count must be between 1 and ${MAX_SPUD_JAR_BATCH}.`,
      );
    }
  }

  const lifetimeTotal = cycle * SPUD_JAR_CAPACITY + total;
  if (action === "add") {
    if (lifetimeTotal > Number.MAX_SAFE_INTEGER - amount) {
      throw new HttpsError("resource-exhausted", "Spud Jar total is too large.");
    }
    const nextLifetimeTotal = lifetimeTotal + amount;
    nextTotal = nextLifetimeTotal % SPUD_JAR_CAPACITY;
    nextCycle = Math.floor(nextLifetimeTotal / SPUD_JAR_CAPACITY);
  } else if (action === "undo") {
    if (amount > lifetimeTotal) {
      throw new HttpsError("failed-precondition", "Spud Jar is already empty.");
    }
    const nextLifetimeTotal = lifetimeTotal - amount;
    nextTotal = nextLifetimeTotal % SPUD_JAR_CAPACITY;
    nextCycle = Math.floor(nextLifetimeTotal / SPUD_JAR_CAPACITY);
  } else {
    nextTotal = 0;
    nextCycle = 0;
  }

  return { total: nextTotal, cycle: nextCycle, updatedAt, updatedBy };
}

export async function mutateSpudJar(
  action: SpudJarAction,
  updatedBy: string,
  amount = 1,
): Promise<{ ok: true; total: number; cycle: number }> {
  const jarRef = admin.database().ref(SPUD_JAR_PATH);
  const result = await jarRef.transaction((current) =>
    nextSpudJarRecord(current, action, updatedBy, Date.now(), amount),
  );
  if (!result.committed) {
    throw new HttpsError("aborted", "Spud Jar update was not committed.");
  }
  const value = result.snapshot.val() as SpudJarRecord;
  return { ok: true, total: value.total, cycle: value.cycle };
}

export function parseSpudJarBatchCount(data: unknown): number {
  const request = typeof data === "object" && data ? data as { count?: unknown } : {};
  const count = request.count;
  if (!Number.isSafeInteger(count) || Number(count) < 1 || Number(count) > MAX_SPUD_JAR_BATCH) {
    throw new HttpsError(
      "invalid-argument",
      `Complaint count must be between 1 and ${MAX_SPUD_JAR_BATCH}.`,
    );
  }
  return Number(count);
}
