/**
 * In-memory stub that mirrors the Firebase Realtime Database API surface
 * used in this app. Seeded with fake participants for local development.
 */

export interface StubRef {
  path: string;
}

interface StubSnapshot {
  val(): unknown;
  exists(): boolean;
}

type Unsubscribe = () => void;
type Callback = (snap: StubSnapshot) => void;

// ---------------------------------------------------------------------------
// Seeded data — edit freely for local testing
// ---------------------------------------------------------------------------
let store: Record<string, unknown> = {
  participants: {
    "stub-alice": {
      name: "Chow Chow",
      scores: { hideAndSeek: 10, trivia: 7, eorzoaGuessr: 9 },
      total: 26,
    },
    "stub-bob": {
      name: "Axo Lotl",
      scores: { hideAndSeek: 6, trivia: 9, eorzoaGuessr: 7 },
      total: 22,
    },
    "stub-charlie": {
      name: "Sweet Potatoes",
      scores: { hideAndSeek: 8, trivia: 10, eorzoaGuessr: 6 },
      total: 24,
    },
    "stub-david": {
      name: "Zalka Tohka",
      scores: { hideAndSeek: 8, trivia: 10, eorzoaGuessr: 6 },
      total: 24,
    },
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
const listeners = new Map<string, Set<Callback>>();

function getAtPath(path: string): unknown {
  if (!path) return store;
  const parts = path.split("/").filter(Boolean);
  let node: unknown = store;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[part];
  }
  return node ?? null;
}

function setAtPath(path: string, value: unknown): void {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    store = value as Record<string, unknown>;
    return;
  }
  let node = store as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] == null) node[parts[i]] = {};
    node = node[parts[i]] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (value == null) {
    delete node[last];
  } else {
    node[last] = value;
  }
}

function makeSnapshot(path: string): StubSnapshot {
  const value = getAtPath(path);
  return {
    val: () => value,
    exists: () => value != null,
  };
}

function notifyPath(path: string): void {
  listeners.get(path)?.forEach((cb) => cb(makeSnapshot(path)));
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (parent !== path) {
    listeners.get(parent)?.forEach((cb) => cb(makeSnapshot(parent)));
  }
}

// ---------------------------------------------------------------------------
// Exported stub functions (same call signatures as firebase/database exports)
// ---------------------------------------------------------------------------
export const stubDb = {};

export function stubRef(_db: unknown, path: string): StubRef {
  return { path };
}

export function stubOnValue(
  r: StubRef,
  callback: Callback,
  _onError?: (e: Error) => void,
): Unsubscribe {
  if (!listeners.has(r.path)) listeners.set(r.path, new Set());
  listeners.get(r.path)!.add(callback);
  setTimeout(() => callback(makeSnapshot(r.path)), 0);
  return () => listeners.get(r.path)?.delete(callback);
}

export function stubSet(r: StubRef, value: unknown): Promise<void> {
  setAtPath(r.path, value);
  notifyPath(r.path);
  return Promise.resolve();
}

let counter = 0;
export function stubPush(r: StubRef, value: unknown): Promise<{ key: string }> {
  const key = `stub-${++counter}-${Date.now()}`;
  setAtPath(`${r.path}/${key}`, value);
  notifyPath(r.path);
  return Promise.resolve({ key });
}

export function stubRemove(r: StubRef): Promise<void> {
  setAtPath(r.path, null);
  const parent = r.path.includes("/")
    ? r.path.slice(0, r.path.lastIndexOf("/"))
    : "";
  notifyPath(parent);
  return Promise.resolve();
}
