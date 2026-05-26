import { useEffect, useState } from "react";
import { toast } from "sonner";
import { firebaseApp } from "@/lib/firebase";
import { adminOAuthStartUrl, callAdminFunction } from "../lib/adminFunctions";

const SESSION_KEY = "admin_session_token";
const SESSION_ADMIN_KEY = "admin_session_is_admin";
const SESSION_EVENT = "admin-session-change";
const LOGIN_TOAST_KEY = "admin_login_toast_pending";
const ADMIN_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_ADMIN_AUTH_BYPASS === "true";

let handledOAuthHash = false;

type AdminAuthState = "checking" | "authed" | "login" | "unauthorized";

export interface AdminSession {
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl?: string | null;
  roleIds: string[];
  isAdmin: boolean;
  expiresAt: number;
}

interface AuthSnapshot {
  state: AdminAuthState;
  sessionToken: string | null;
  session: AdminSession | null;
  error: string | null;
}

const subscribers = new Set<() => void>();

const localDevSession: AdminSession = {
  discordUserId: "local-dev",
  lodestoneId: "local-dev",
  characterName: "Local Admin",
  fcRank: "Dev",
  avatarUrl: null,
  roleIds: ["local-dev"],
  isAdmin: true,
  expiresAt: Number.MAX_SAFE_INTEGER,
};

function storedSessionToken(): string | null {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(SESSION_KEY);
}

function storedSessionIsAdmin(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem(SESSION_ADMIN_KEY) === "true"
  );
}

let authSnapshot: AuthSnapshot = {
  state:
    ADMIN_AUTH_BYPASS || !firebaseApp
      ? "authed"
      : storedSessionToken()
        ? "checking"
        : "login",
  sessionToken: ADMIN_AUTH_BYPASS ? null : storedSessionToken(),
  session: ADMIN_AUTH_BYPASS || !firebaseApp ? localDevSession : null,
  error: null,
};

function updateAuthSnapshot(next: Partial<AuthSnapshot>): void {
  authSnapshot = { ...authSnapshot, ...next };
  subscribers.forEach((subscriber) => subscriber());
}

function errorMessage(code: string | null): string | null {
  if (code === "unauthorized") return "Allowed Discord role required.";
  if (code === "not_linked")
    return "Link your Lodestone profile first with the Discord /link command, or /friend signup if you are not in the FC.";
  if (code === "missing_member")
    return "Your linked character is no longer tracked.";
  if (code === "invalid_state")
    return "Discord login expired. Please try again.";
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
    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        state: "authed",
        sessionToken: null,
        session: localDevSession,
        error: null,
      });
      return;
    }

    if (!firebaseApp) {
      updateAuthSnapshot({
        state: "authed",
        session: localDevSession,
        error: null,
      });
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const returnedToken = hash.get("admin_session");
    const returnedError = hash.get("admin_error");

    if (returnedToken && !handledOAuthHash) {
      handledOAuthHash = true;
      localStorage.setItem(SESSION_KEY, returnedToken);
      sessionStorage.setItem(LOGIN_TOAST_KEY, "1");
      updateAuthSnapshot({
        sessionToken: returnedToken,
        state: "checking",
        error: null,
      });
      window.dispatchEvent(new Event(SESSION_EVENT));
      removeAdminHashParams();
      return;
    }

    if (returnedError && !handledOAuthHash) {
      handledOAuthHash = true;
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_ADMIN_KEY);
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
      updateAuthSnapshot({
        sessionToken: effectiveSessionToken,
        state: "checking",
      });
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
        localStorage.setItem(
          SESSION_ADMIN_KEY,
          adminSession.isAdmin ? "true" : "false",
        );
        updateAuthSnapshot({
          session: adminSession,
          error: null,
          state: "authed",
        });
        if (sessionStorage.getItem(LOGIN_TOAST_KEY) === "1") {
          sessionStorage.removeItem(LOGIN_TOAST_KEY);
          toast.success(`Welcome, ${adminSession.characterName}.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_ADMIN_KEY);
        updateAuthSnapshot({ sessionToken: null });
        window.dispatchEvent(new Event(SESSION_EVENT));
        const message =
          err instanceof Error
            ? err.message
            : "Boss or Underpaw Discord role required.";
        const knownMessage = message.includes("Boss or Underpaw")
          ? "Boss or Underpaw Discord role required."
          : message.includes("Allowed Discord role")
            ? "Allowed Discord role required."
            : message.includes("Link your Lodestone")
              ? "Link your Lodestone profile first with the Discord /link command, or /friend signup if you are not in the FC."
              : message.includes("no longer tracked")
                ? "Your linked character is no longer tracked."
                : message;
        updateAuthSnapshot({
          session: null,
          error: knownMessage,
          state: "unauthorized",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  function login() {
    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        state: "authed",
        session: localDevSession,
        error: null,
      });
      return;
    }

    if (!firebaseApp) {
      updateAuthSnapshot({
        state: "authed",
        session: localDevSession,
        error: null,
      });
      return;
    }
    const loginUrl = adminOAuthStartUrl();
    if (!loginUrl) {
      updateAuthSnapshot({
        error: "Firebase project ID is missing.",
        state: "login",
      });
      return;
    }
    window.location.assign(loginUrl);
  }

  async function logout() {
    const token = sessionToken;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_ADMIN_KEY);
    sessionStorage.removeItem(LOGIN_TOAST_KEY);
    updateAuthSnapshot({ sessionToken: null });
    window.dispatchEvent(new Event(SESSION_EVENT));
    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        session: localDevSession,
        error: null,
        state: "authed",
      });
      toast.success("Local admin bypass is active.");
      return;
    }
    updateAuthSnapshot({
      session: null,
      error: null,
      state: firebaseApp ? "login" : "authed",
    });
    if (token && firebaseApp) {
      try {
        await callAdminFunction("logoutAdminSession", token);
      } catch {
        toast.warning(
          "Signed out locally, but the server session could not be revoked.",
        );
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
    sessionWasAdmin:
      session?.isAdmin === true ||
      (state === "checking" && storedSessionIsAdmin()),
  };
}

export type AdminAuth = ReturnType<typeof useAdminAuth>;
