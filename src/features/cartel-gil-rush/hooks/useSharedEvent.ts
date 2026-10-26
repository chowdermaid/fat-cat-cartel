import { useEffect, useRef, useState } from "react";
import { emptyGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import { mutateSharedEvent, subscribeSharedEvent } from "../api/sharedEvent";
import { LOCAL_EVENT_KEY, parseEvent } from "../utils/localEvent";
import type { EventController, SharedEvent, SharedEventAction } from "../types";

function localImport() {
  try {
    const saved = localStorage.getItem(LOCAL_EVENT_KEY);
    return saved ? parseEvent(saved) : null;
  } catch { return null; }
}

export function useSharedEvent(token: string | null): EventController {
  const [current, setCurrent] = useState(emptyGilRushEvent);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importable] = useState(localImport);
  const latest = useRef(current);
  const ready = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const active = ++generation.current;
    ready.current = false;
    busy.current = false;
    const unsubscribe = subscribeSharedEvent(event => {
      if (generation.current !== active) return;
      if (!ready.current || event.revision >= latest.current.revision) {
        latest.current = event;
        setCurrent(event);
      }
      ready.current = true;
      setLoading(false);
    }, cause => {
      if (generation.current !== active) return;
      ready.current = false;
      setError(cause.message);
      setLoading(false);
    });
    return () => { generation.current = active + 1; ready.current = false; unsubscribe(); };
  }, [token]);

  async function run(action: SharedEventAction, expectedRevision = current.revision): Promise<boolean> {
    if (busy.current) return false;
    if (!ready.current || !token) { setError("Shared event is unavailable. Reload before editing."); return false; }
    busy.current = true;
    setPending(true);
    setError(null);
    const active = generation.current;
    try {
      const event: SharedEvent = await mutateSharedEvent(token, action, expectedRevision);
      if (generation.current !== active) return false;
      if (event.revision >= latest.current.revision) {
        latest.current = event;
        setCurrent(event);
      }
      setError(null);
      return true;
    } catch (cause) {
      if (generation.current === active) setError(cause instanceof Error ? cause.message : "Could not save shared event. Review latest values before retrying.");
      return false;
    } finally {
      if (generation.current === active) { busy.current = false; setPending(false); }
    }
  }

  return { current, error, loading, pending, importable, run };
}
