import { firebaseApp } from "@/lib/firebase";
import type { Functions } from "firebase/functions";
import { callDevAdminFunction } from "@/lib/dev/callables";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { REGION, USE_FUNCTIONS_EMULATOR } from "../constants";

const connectedToFunctionsEmulator = new WeakSet<Functions>();

function projectId(): string | null {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || null;
}

function functionsEmulatorOrigin(): string | null {
  const id = projectId();
  if (!id || !USE_FUNCTIONS_EMULATOR) return null;
  return `http://127.0.0.1:5001/${id}/${REGION}`;
}

export function adminOAuthStartUrl(returnTo?: string): string | null {
  const localOrigin = functionsEmulatorOrigin();
  const path = returnTo || `${window.location.pathname}${window.location.search}`;
  const query = new URLSearchParams({ returnTo: path });
  if (localOrigin) return `${localOrigin}/startDiscordAdminOAuth?${query.toString()}`;

  const id = projectId();
  if (!id) return null;
  return `https://${REGION}-${id}.cloudfunctions.net/startDiscordAdminOAuth?${query.toString()}`;
}

export async function callAdminFunction<T = unknown>(
  name: string,
  adminSessionToken: string,
  data: Record<string, unknown> = {},
  options?: { timeout?: number; region?: string },
): Promise<T> {
  if (DEV_AUTH_LAYER_ENABLED) {
    return callDevAdminFunction<T>(name, adminSessionToken, data);
  }
  if (!firebaseApp) throw new Error("Firebase is not available in local dev mode.");
  const { region = REGION, ...callableOptions } = options ?? {};
  const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions(firebaseApp, region);
  if (USE_FUNCTIONS_EMULATOR && !connectedToFunctionsEmulator.has(functions)) {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectedToFunctionsEmulator.add(functions);
  }
  const fn = httpsCallable<Record<string, unknown>, T>(
    functions,
    name,
    callableOptions,
  );
  const result = await fn({ ...data, adminSessionToken });
  return result.data;
}
