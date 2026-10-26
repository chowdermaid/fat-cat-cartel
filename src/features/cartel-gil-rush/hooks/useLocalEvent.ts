import { useRef, useState } from "react";
import { emptyEvent, LOCAL_EVENT_KEY, parseEvent, updateEvent } from "../utils/localEvent";
import type { EventAction } from "../types";

function loadEvent() {
  try {
    const saved = localStorage.getItem(LOCAL_EVENT_KEY);
    return { event: saved ? parseEvent(saved) : emptyEvent(), saved, loadError: null };
  } catch {
    return { event: emptyEvent(), saved: null, loadError: "Saved event could not be loaded. Reset the event to start again." };
  }
}

export function useLocalEvent() {
  const [initial] = useState(loadEvent);
  const [event, setEvent] = useState(initial.event);
  const [error, setError] = useState<string | null>(initial.loadError);
  const current = useRef(initial.event);
  const lastSaved = useRef(initial.saved);
  const loadFailed = useRef(initial.loadError !== null);

  function run(action: EventAction): boolean {
    try {
      if (loadFailed.current && action.type !== "reset") throw new Error(initial.loadError ?? "Reset the event to continue.");
      if (!loadFailed.current && localStorage.getItem(LOCAL_EVENT_KEY) !== lastSaved.current) {
        throw new Error("This event changed in another tab. Reload this page before continuing.");
      }
      const next = updateEvent(current.current, action);
      const saved = JSON.stringify(next);
      try {
        localStorage.setItem(LOCAL_EVENT_KEY, saved);
      } catch {
        throw new Error("Browser storage is unavailable or full. No changes were made. Allow local storage and try again.");
      }
      current.current = next;
      lastSaved.current = saved;
      loadFailed.current = false;
      setEvent(next);
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the event.");
      return false;
    }
  }

  return { current: event, error, run };
}
