/**
 * Database abstraction. Import from here instead of "firebase/database".
 *
 *   VITE_USE_STUBS=true   -> in-memory stub, no Firebase needed
 *   VITE_USE_STUBS=false  -> Firebase Realtime Database or emulator
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

import { db as realDb } from "./firebase";
import {
  ref as fbRef,
  onValue as fbOnValue,
  get as fbGet,
  set as fbSet,
  push as fbPush,
  remove as fbRemove,
} from "firebase/database";

import {
  stubDb,
  stubRef,
  stubOnValue,
  stubGet,
  stubSet,
  stubPush,
  stubRemove,
} from "./db.stub";

const USE_STUBS = import.meta.env.VITE_USE_STUBS === "true";

// Re-export as `any` so call-sites stay identical to direct firebase/database usage.
// The real types are preserved where it matters, in the feature files themselves.
export const db: unknown = USE_STUBS ? stubDb : realDb;
export const ref: AnyFn = USE_STUBS ? stubRef : fbRef;
export const onValue: AnyFn = USE_STUBS ? stubOnValue : fbOnValue;
export const get: AnyFn = USE_STUBS ? stubGet : fbGet;
export const set: AnyFn = USE_STUBS ? stubSet : fbSet;
export const push: AnyFn = USE_STUBS ? stubPush : fbPush;
export const remove: AnyFn = USE_STUBS ? stubRemove : fbRemove;
