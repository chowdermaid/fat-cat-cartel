import { firebaseApp } from "@/lib/firebase";

const REGION = "us-central1";
const USE_FUNCTIONS_EMULATOR = import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true";
let connectedToFunctionsEmulator = false;

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
  options?: { timeout?: number },
): Promise<T> {
  if (!firebaseApp) throw new Error("Firebase is not available in local dev mode.");
  const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions(firebaseApp);
  if (USE_FUNCTIONS_EMULATOR && !connectedToFunctionsEmulator) {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectedToFunctionsEmulator = true;
  }
  const fn = httpsCallable<Record<string, unknown>, T>(
    functions,
    name,
    options,
  );
  const result = await fn({ ...data, adminSessionToken });
  return result.data;
}
