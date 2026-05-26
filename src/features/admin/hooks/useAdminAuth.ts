import { useEffect, useState } from "react";
import { toast } from "sonner";
import { firebaseApp } from "@/lib/firebase";
import { adminOAuthStartUrl, callAdminFunction } from "../lib/adminFunctions";

const SESSION_KEY = "admin_session_token";
const SESSION_EVENT = "admin-session-change";
const LOGIN_TOAST_KEY = "admin_login_toast_pending";

let handledOAuthHash = false;

type AdminAuthState = "checking" | "authed" | "login" | "unauthorized";

export interface AdminSession {
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl?: string | null;
  roleIds: string[];
  expiresAt: number;
}

interface AuthSnapshot {
  state: AdminAuthState;
  sessionToken: string | null;
  session: AdminSession | null;
  error: string | null;
}

const subscribers = new Set<() => void>();

function storedSessionToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(SESSION_KEY);
}

let authSnapshot: AuthSnapshot = {
  state: firebaseApp ? (storedSessionToken() ? "checking" : "login") : "authed",
  sessionToken: storedSessionToken(),
  session: null,
  error: null,
};

function updateAuthSnapshot(next: Partial<AuthSnapshot>): void {
  authSnapshot = { ...authSnapshot, ...next };
  subscribers.forEach((subscriber) => subscriber());
}

function errorMessage(code: string | null): string | null {
  if (code === "unauthorized") return "Boss or Underpaw Discord role required.";
  if (code === "not_linked") return "Link your Lodestone profile first with the Discord /link command.";
  if (code === "missing_member") return "Your linked character is no longer tracked.";
  if (code === "invalid_state") return "Discord login expired. Please try again.";
  if (code === "oauth_failed") return "Discord login failed. Please try again.";
  return null;
}

function removeAdminHashParams(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url.toString());
}

function redirectHomeSoon(): void {
  window.setTimeout(() => {
    window.location.assign("/");
  }, 650);
}

export function useAdminAuth() {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(authSnapshot);
  const { state, sessionToken, session, error } = snapshot;

  useEffect(() => {
    function syncSnapshot() {
      setSnapshot(authSnapshot);
    }
    function syncSessionToken() {
      updateAuthSnapshot({ sessionToken: storedSessionToken() });
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === SESSION_KEY) syncSessionToken();
    }
    subscribers.add(syncSnapshot);
    syncSnapshot();
    window.addEventListener(SESSION_EVENT, syncSessionToken);
    window.addEventListener("storage", syncStorage);
    return () => {
      subscribers.delete(syncSnapshot);
      window.removeEventListener(SESSION_EVENT, syncSessionToken);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    if (!firebaseApp) return;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const returnedToken = hash.get("admin_session");
    const returnedError = hash.get("admin_error");

    if (returnedToken && !handledOAuthHash) {
      handledOAuthHash = true;
      localStorage.setItem(SESSION_KEY, returnedToken);
      sessionStorage.setItem(LOGIN_TOAST_KEY, "1");
      updateAuthSnapshot({ sessionToken: returnedToken, state: "checking", error: null });
      window.dispatchEvent(new Event(SESSION_EVENT));
      removeAdminHashParams();
      return;
    }

    if (returnedError && !handledOAuthHash) {
      handledOAuthHash = true;
      localStorage.removeItem(SESSION_KEY);
      updateAuthSnapshot({ sessionToken: null });
      window.dispatchEvent(new Event(SESSION_EVENT));
      const message = errorMessage(returnedError) ?? "Discord login failed.";
      toast.error(message);
      updateAuthSnapshot({
        session: null,
        error: message,
        state: returnedError === "unauthorized" ? "unauthorized" : "login",
      });
      removeAdminHashParams();
      return;
    }

    const effectiveSessionToken = sessionToken ?? storedSessionToken();
    if (!sessionToken && effectiveSessionToken) {
      updateAuthSnapshot({ sessionToken: effectiveSessionToken, state: "checking" });
      return;
    }

    if (!effectiveSessionToken) {
      updateAuthSnapshot({ state: "login", session: null });
      return;
    }

    let cancelled = false;
    updateAuthSnapshot({ state: "checking" });
    callAdminFunction<AdminSession>("getAdminSession", effectiveSessionToken)
      .then((adminSession) => {
        if (cancelled) return;
        updateAuthSnapshot({ session: adminSession, error: null, state: "authed" });
        if (sessionStorage.getItem(LOGIN_TOAST_KEY) === "1") {
          sessionStorage.removeItem(LOGIN_TOAST_KEY);
          toast.success(`Welcome, ${adminSession.characterName}.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        localStorage.removeItem(SESSION_KEY);
        updateAuthSnapshot({ sessionToken: null });
        window.dispatchEvent(new Event(SESSION_EVENT));
        const message = err instanceof Error ? err.message : "Boss or Underpaw Discord role required.";
        const knownMessage = message.includes("Boss or Underpaw")
          ? "Boss or Underpaw Discord role required."
          : message.includes("Link your Lodestone")
            ? "Link your Lodestone profile first with the Discord /link command."
            : message.includes("no longer tracked")
              ? "Your linked character is no longer tracked."
              : message;
        updateAuthSnapshot({ session: null, error: knownMessage, state: "unauthorized" });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  function login() {
    if (!firebaseApp) {
      updateAuthSnapshot({ state: "authed" });
      return;
    }
    const loginUrl = adminOAuthStartUrl();
    if (!loginUrl) {
      updateAuthSnapshot({ error: "Firebase project ID is missing.", state: "login" });
      return;
    }
    window.location.assign(loginUrl);
  }

  async function logout() {
    const token = sessionToken;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LOGIN_TOAST_KEY);
    updateAuthSnapshot({ sessionToken: null });
    window.dispatchEvent(new Event(SESSION_EVENT));
    updateAuthSnapshot({ session: null, error: null, state: firebaseApp ? "login" : "authed" });
    if (token && firebaseApp) {
      try {
        await callAdminFunction("logoutAdminSession", token);
      } catch {
        toast.warning("Signed out locally, but the server session could not be revoked.");
        redirectHomeSoon();
        return;
      }
    }
    toast.success("Logged out.");
    redirectHomeSoon();
  }

  return {
    authed: state === "authed",
    checking: state === "checking",
    unauthorized: state === "unauthorized",
    error,
    login,
    logout,
    session,
    sessionToken,
  };
}

export type AdminAuth = ReturnType<typeof useAdminAuth>;
