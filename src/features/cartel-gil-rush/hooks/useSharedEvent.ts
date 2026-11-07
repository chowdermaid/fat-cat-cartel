import { useEffect, useRef, useState } from "react";
import { emptyGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import { mutateSharedEvent, subscribeSharedEvent } from "../api/sharedEvent";
import { LOCAL_EVENT_KEY, parseEvent } from "../utils/localEvent";
import { canQueueEdit, queuedActionKey, queuedEditContext } from "../utils/sharedEventQueue";
import type { EventController, SharedEvent, SharedEventAction } from "../types";

interface PendingMutation {
  action: SharedEventAction;
  revision: number;
  snapshot: SharedEvent;
  key: string;
  rebase: boolean;
  resolve: (saved: boolean) => void;
}

function localImport() {
  try {
    const saved = localStorage.getItem(LOCAL_EVENT_KEY);
    return saved ? parseEvent(saved) : null;
  } catch { return null; }
}

export function useSharedEvent(token: string | null, canEdit = true): EventController {
  const [current, setCurrent] = useState(emptyGilRushEvent);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [importable] = useState(localImport);
  const latest = useRef(current);
  const ready = useRef(false);
  const queue = useRef<PendingMutation[]>([]);
  const keys = useRef(new Set<string>());
  const ownRevisions = useRef(new Map<number, number>());
  const draining = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const active = ++generation.current;
    const activeQueue = queue.current;
    const activeKeys = keys.current;
    const revisions = ownRevisions.current;
    ready.current = false;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!activeKeys.size) return;
      event.preventDefault();
      event.returnValue = "";
    };
    if (typeof window !== "undefined") window.addEventListener("beforeunload", warnBeforeLeaving);
    const unsubscribe = subscribeSharedEvent(token, event => {
      if (generation.current !== active) return;
      if (!ready.current || event.revision >= latest.current.revision) {
        latest.current = event;
        setCurrent(event);
      }
      if (!ready.current && !keys.current.size) setPendingKeys([]);
      ready.current = true;
      setReadError(null);
      setLoading(false);
    }, cause => {
      if (generation.current !== active) return;
      ready.current = false;
      setReadError(cause.message);
      setError(cause.message);
      setLoading(false);
    });
    return () => {
      generation.current = active + 1;
      ready.current = false;
      activeQueue.splice(0).forEach(item => item.resolve(false));
      activeKeys.clear();
      revisions.clear();
      draining.current = false;
      if (typeof window !== "undefined") window.removeEventListener("beforeunload", warnBeforeLeaving);
      unsubscribe();
    };
  }, [token, canEdit]);

  async function drain(active: number) {
    if (draining.current) return;
    draining.current = true;
    try {
      while (queue.current.length && generation.current === active) {
        const item = queue.current[0];
        if (!ready.current) throw new Error("Shared event is unavailable. Reload before saving queued edits.");
        let revision = item.revision;
        if (item.rebase) {
          while (revision < latest.current.revision && ownRevisions.current.has(revision)) revision = ownRevisions.current.get(revision)!;
          if (revision !== latest.current.revision || queuedEditContext(item.action, item.snapshot) !== queuedEditContext(item.action, latest.current)) throw new Error("The event changed before a queued edit could save. Review the latest values and retry.");
        }
        const event = await mutateSharedEvent(token!, item.action, revision);
        if (generation.current !== active) return;
        if (event.revision === revision + 1) ownRevisions.current.set(revision, event.revision);
        if (event.revision >= latest.current.revision) {
          latest.current = event;
          setCurrent(event);
        }
        queue.current.shift();
        keys.current.delete(item.key);
        setPendingKeys([...keys.current]);
        item.resolve(true);
      }
    } catch (cause) {
      if (generation.current === active) {
        const detail = cause instanceof Error ? cause.message : "Could not save the shared event.";
        setError(detail + " Unsent queued edits were stopped; review and retry them.");
        queue.current.splice(0).forEach(item => item.resolve(false));
        keys.current.clear();
        setPendingKeys([]);
      }
    } finally {
      if (generation.current === active) {
        draining.current = false;
        ownRevisions.current.clear();
      }
    }
  }

  async function run(action: SharedEventAction, expectedRevision = current.revision): Promise<boolean> {
    if (!ready.current || !token || !canEdit) { setError("Shared event is unavailable. Reload before editing."); return false; }
    const key = queuedActionKey(action);
    if (keys.current.has(key)) return false;
    if (!canQueueEdit(action) && queue.current.length) return false;
    setError(null);
    return new Promise(resolve => {
      queue.current.push({ action, revision: expectedRevision, snapshot: current, key, rebase: canQueueEdit(action) && expectedRevision === current.revision, resolve });
      keys.current.add(key);
      setPendingKeys([...keys.current]);
      void drain(generation.current);
    });
  }

  return { current, error, readError, loading, pending: pendingKeys.length > 0, pendingKeys, importable, run, hostToken: canEdit ? token : null };
}
