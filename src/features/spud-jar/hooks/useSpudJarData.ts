import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { db, onValue, ref } from "@/lib/db";
import {
  COMPLAINT_BATCH_DEBOUNCE_MS,
  MAX_COMPLAINT_BATCH,
  SPUD_JAR_CAPACITY,
  SPUD_JAR_COPY,
  SPUD_JAR_PATH,
} from "../constants";
import { mutateSpudJar } from "../api/spudJarApi";
import type { SpudJarAction, SpudJarRecord } from "../types";

function parseRecord(value: unknown): SpudJarRecord {
  if (value == null) return { total: 0, cycle: 0, updatedAt: 0, updatedBy: "" };
  if (typeof value !== "object") throw new Error("Spud Jar data is malformed.");
  const record = value as Partial<SpudJarRecord>;
  if (
    !Number.isSafeInteger(record.total) ||
    Number(record.total) < 0
  ) {
    throw new Error("Spud Jar total is malformed.");
  }
  const cycle = record.cycle ?? 0;
  if (!Number.isSafeInteger(cycle) || Number(cycle) < 0) {
    throw new Error("Spud Jar cycle is malformed.");
  }
  const carry = Math.floor(Number(record.total) / SPUD_JAR_CAPACITY);
  if (Number(cycle) > Number.MAX_SAFE_INTEGER - carry) {
    throw new Error("Spud Jar total is too large.");
  }
  const normalizedTotal = Number(record.total) % SPUD_JAR_CAPACITY;
  const normalizedCycle = Number(cycle) + carry;
  if (
    normalizedCycle >
    Math.floor((Number.MAX_SAFE_INTEGER - normalizedTotal) / SPUD_JAR_CAPACITY)
  ) {
    throw new Error("Spud Jar total is too large.");
  }
  return {
    total: normalizedTotal,
    cycle: normalizedCycle,
    updatedAt: Number(record.updatedAt) || 0,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : "",
  };
}

function mutationError(error: unknown): string {
  return error instanceof Error ? error.message : "Could not update the Spud Jar.";
}

export function useSpudJarData(
  sessionToken: string | null,
  updatedBy: string,
  canManage: boolean,
) {
  const [record, setRecord] = useState<SpudJarRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<SpudJarAction | null>(null);
  const [pendingDelta, setPendingDelta] = useState(0);
  const [inFlightDelta, setInFlightDelta] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef(0);
  const inFlightRef = useRef(0);
  const recordRef = useRef<SpudJarRecord | null>(null);
  const updatedByRef = useRef(updatedBy);
  const activeActionRef = useRef<SpudJarAction | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isFlushingRef = useRef(false);
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const storageKey = `fcc_spud_jar_pending_${updatedBy}`;
  updatedByRef.current = updatedBy;

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, SPUD_JAR_PATH),
      (snapshot: { val(): unknown }) => {
        try {
          const nextRecord = parseRecord(snapshot.val());
          const previousRecord = recordRef.current;
          const previousUnits = previousRecord
            ? previousRecord.cycle * SPUD_JAR_CAPACITY + previousRecord.total
            : undefined;
          const nextUnits = nextRecord.cycle * SPUD_JAR_CAPACITY + nextRecord.total;
          const persistedDelta = previousUnits === undefined
            ? 0
            : nextUnits - previousUnits;
          if (
            persistedDelta !== 0 &&
            nextRecord.updatedBy === updatedByRef.current &&
            inFlightRef.current !== 0 &&
            Math.sign(persistedDelta) === Math.sign(inFlightRef.current)
          ) {
            const acknowledged = Math.min(
              Math.abs(persistedDelta),
              Math.abs(inFlightRef.current),
            );
            inFlightRef.current += inFlightRef.current > 0
              ? -acknowledged
              : acknowledged;
            setInFlightDelta(inFlightRef.current);
          }
          recordRef.current = nextRecord;
          setRecord(nextRecord);
          setError(null);
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not read the Spud Jar.",
          );
        }
      },
      () => setError("Could not connect to the Spud Jar."),
    );
    return () => unsubscribe();
  }, []);

  const clearFlushTimers = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const updatePendingDelta = useCallback(
    (delta: number) => {
      const bounded = Math.min(
        Math.max(-MAX_COMPLAINT_BATCH, delta),
        MAX_COMPLAINT_BATCH,
      );
      pendingRef.current = bounded;
      setPendingDelta(bounded);
      try {
        if (bounded !== 0) window.sessionStorage.setItem(storageKey, String(bounded));
        else window.sessionStorage.removeItem(storageKey);
      } catch {
        return;
      }
    },
    [storageKey],
  );

  const scheduleFlush = useCallback(() => {
    if (pendingRef.current === 0) return;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void flushRef.current();
    }, COMPLAINT_BATCH_DEBOUNCE_MS);
  }, []);

  const flushPendingChanges = useCallback(async () => {
    if (!canManage || pendingRef.current === 0) return;
    if (isFlushingRef.current || activeActionRef.current) {
      scheduleFlush();
      return;
    }
    const delta = pendingRef.current;
    const action: SpudJarAction = delta > 0 ? "add" : "undo";
    const count = Math.abs(delta);
    clearFlushTimers();
    isFlushingRef.current = true;
    setSubmitting(true);
    inFlightRef.current = delta;
    setInFlightDelta(delta);
    updatePendingDelta(0);
    try {
      const result = await mutateSpudJar(action, sessionToken, updatedBy, count);
      const resultUnits = result.cycle * SPUD_JAR_CAPACITY + result.total;
      const recordUnits = recordRef.current
        ? recordRef.current.cycle * SPUD_JAR_CAPACITY + recordRef.current.total
        : -1;
      const resultMovesInExpectedDirection = action === "add"
        ? resultUnits > recordUnits
        : resultUnits < recordUnits;
      if (!recordRef.current || resultMovesInExpectedDirection) {
        const confirmedRecord: SpudJarRecord = {
          total: result.total,
          cycle: result.cycle,
          updatedAt: Date.now(),
          updatedBy,
        };
        recordRef.current = confirmedRecord;
        setRecord(confirmedRecord);
      }
      inFlightRef.current = 0;
      setInFlightDelta(0);
    } catch (nextError) {
      inFlightRef.current = 0;
      setInFlightDelta(0);
      updatePendingDelta(delta + pendingRef.current);
      scheduleFlush();
      toast.error(mutationError(nextError));
    } finally {
      isFlushingRef.current = false;
      setSubmitting(false);
      if (pendingRef.current !== 0 && debounceTimerRef.current === null) {
        scheduleFlush();
      }
    }
  }, [
    canManage,
    clearFlushTimers,
    scheduleFlush,
    sessionToken,
    updatePendingDelta,
    updatedBy,
  ]);
  flushRef.current = flushPendingChanges;

  useEffect(() => {
    clearFlushTimers();
    const loadTimer = window.setTimeout(() => {
      if (!canManage) {
        pendingRef.current = 0;
        inFlightRef.current = 0;
        setPendingDelta(0);
        setInFlightDelta(0);
        return;
      }
      let restored = 0;
      try {
        const stored = Number(window.sessionStorage.getItem(storageKey));
        if (Number.isSafeInteger(stored)) {
          restored = Math.min(
            Math.max(-MAX_COMPLAINT_BATCH, stored),
            MAX_COMPLAINT_BATCH,
          );
        }
      } catch {
        restored = 0;
      }
      pendingRef.current = restored;
      setPendingDelta(restored);
      if (restored !== 0) scheduleFlush();
    }, 0);
    return () => {
      window.clearTimeout(loadTimer);
      clearFlushTimers();
    };
  }, [canManage, clearFlushTimers, scheduleFlush, storageKey]);

  const queueComplaint = useCallback(() => {
    if (!canManage || activeActionRef.current) return;
    const next = Math.min(pendingRef.current + 1, MAX_COMPLAINT_BATCH);
    updatePendingDelta(next);
    scheduleFlush();
  }, [canManage, scheduleFlush, updatePendingDelta]);

  const queueRemoval = useCallback(() => {
    if (!canManage || activeActionRef.current) return;
    const persistedTotal = recordRef.current
      ? recordRef.current.cycle * SPUD_JAR_CAPACITY + recordRef.current.total
      : 0;
    if (persistedTotal + pendingRef.current + inFlightRef.current <= 0) return;
    const next = Math.max(pendingRef.current - 1, -MAX_COMPLAINT_BATCH);
    updatePendingDelta(next);
    scheduleFlush();
  }, [canManage, scheduleFlush, updatePendingDelta]);

  const runAction = useCallback(
    async (action: SpudJarAction) => {
      if (!canManage || activeActionRef.current) return;
      if (action === "add") {
        queueComplaint();
        return;
      }
      if (action === "undo") {
        queueRemoval();
        return;
      }
      if (action === "reset") {
        clearFlushTimers();
        updatePendingDelta(0);
      }

      activeActionRef.current = action;
      setActiveAction(action);
      try {
        await mutateSpudJar(action, sessionToken, updatedBy);
        if (action === "reset") toast.success(SPUD_JAR_COPY.resetSuccess);
      } catch (nextError) {
        toast.error(mutationError(nextError));
      } finally {
        activeActionRef.current = null;
        setActiveAction(null);
      }
    },
    [
      canManage,
      clearFlushTimers,
      queueComplaint,
      queueRemoval,
      sessionToken,
      updatePendingDelta,
      updatedBy,
    ],
  );

  const persistedTotal = record === null
    ? null
    : record.cycle * SPUD_JAR_CAPACITY + record.total;
  const displayTotal = persistedTotal === null
    ? null
    : Math.max(0, persistedTotal + pendingDelta + inFlightDelta);
  const displayCycle = displayTotal === null
    ? null
    : Math.floor(displayTotal / SPUD_JAR_CAPACITY);
  const displayJarTotal = displayTotal === null
    ? null
    : displayTotal % SPUD_JAR_CAPACITY;

  return {
    record,
    total: record?.total ?? null,
    displayTotal,
    displayJarTotal,
    displayCycle,
    loading: record === null && error === null,
    error,
    activeAction,
    submitting,
    runAction,
  };
}
