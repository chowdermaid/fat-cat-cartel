import { useEffect, useState } from "react";
import { toast } from "sonner";
import { firebaseApp } from "@/lib/firebase";
import {
  DEV_AUTH_LAYER_ENABLED,
  DEV_SESSION_TOKEN,
  getSelectedDevPersona,
  subscribeDevPersona,
} from "@/lib/dev/personas";
import {
  ADMIN_AUTH_BYPASS,
  LOCAL_DEV_ADMIN_SESSION_TOKEN,
  SESSION_KEY,
  SESSION_EVENT,
} from "../constants";
import { adminOAuthStartUrl, callAdminFunction } from "../api/adminFunctions";
import type { AdminSession, AuthSnapshot } from "../types";
import {
  clearLoginToastPending,
  clearStoredAdminSession,
  consumeLoginToastPending,
  markLoginToastPending,
  storedSessionIsAdmin,
  storedSessionToken,
  storeSessionIsAdmin,
  storeSessionToken,
} from "../utils/adminAuthStorage";
import {
  adminAuthErrorMessage,
  normalizeAdminAuthError,
} from "../utils/adminErrors";

let handledOAuthHash = false;

const subscribers = new Set<() => void>();

const localDevSession: AdminSession = {
  discordUserId: "local-dev",
  discordUsername: "local-dev",
  discordDisplayName: "Local Admin",
  discordAvatarUrl: null,
  lodestoneId: "local-dev",
  characterName: "Local Admin",
  fcRank: "Dev",
  avatarUrl: null,
  roleIds: ["local-dev"],
  isMember: true,
  isAdmin: true,
  isHousecat: false,
  capabilities: ["admin:*"],
  expiresAt: Number.MAX_SAFE_INTEGER,
};

function devSessionFromPersona(): AdminSession | null {
  const persona = getSelectedDevPersona();
  if (!persona.authenticated) return null;
  return {
    discordUserId: persona.discordUserId,
    discordUsername: persona.characterName,
    discordDisplayName: persona.characterName,
    discordAvatarUrl: null,
    lodestoneId: persona.lodestoneId,
    characterName: persona.characterName,
    fcRank: persona.fcRank,
    avatarUrl: null,
    roleIds: persona.roleIds,
    isMember: true,
    isAdmin: persona.isAdmin,
    isHousecat: persona.isHousecat,
    capabilities: persona.capabilities,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}

function devAuthSnapshot(): AuthSnapshot {
  const session = devSessionFromPersona();
  return {
    state: session ? "authed" : "login",
    sessionToken: session ? DEV_SESSION_TOKEN : null,
    session,
    error: null,
    errorCode: null,
  };
}

let authSnapshot: AuthSnapshot = DEV_AUTH_LAYER_ENABLED
  ? devAuthSnapshot()
  : {
      state:
        ADMIN_AUTH_BYPASS || !firebaseApp
          ? "authed"
          : storedSessionToken()
            ? "checking"
            : "login",
      sessionToken: ADMIN_AUTH_BYPASS
        ? LOCAL_DEV_ADMIN_SESSION_TOKEN
        : storedSessionToken(),
      session: ADMIN_AUTH_BYPASS || !firebaseApp ? localDevSession : null,
      error: null,
      errorCode: null,
    };

function updateAuthSnapshot(next: Partial<AuthSnapshot>): void {
  authSnapshot = { ...authSnapshot, ...next };
  subscribers.forEach((subscriber) => subscriber());
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
  const { state, sessionToken, session, error, errorCode } = snapshot;

  useEffect(() => {
    function syncSnapshot() {
      setSnapshot(authSnapshot);
    }
    subscribers.add(syncSnapshot);
    syncSnapshot();

    if (DEV_AUTH_LAYER_ENABLED) {
      function syncDevPersona() {
        updateAuthSnapshot(devAuthSnapshot());
      }
      syncDevPersona();
      const unsubscribeDevPersona = subscribeDevPersona(syncDevPersona);
      return () => {
        subscribers.delete(syncSnapshot);
        unsubscribeDevPersona();
      };
    }

    function syncSessionToken() {
      updateAuthSnapshot({ sessionToken: storedSessionToken() });
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === SESSION_KEY) syncSessionToken();
    }
    window.addEventListener(SESSION_EVENT, syncSessionToken);
    window.addEventListener("storage", syncStorage);
    return () => {
      subscribers.delete(syncSnapshot);
      window.removeEventListener(SESSION_EVENT, syncSessionToken);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    if (DEV_AUTH_LAYER_ENABLED) {
      updateAuthSnapshot(devAuthSnapshot());
      return;
    }

    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        state: "authed",
        sessionToken: LOCAL_DEV_ADMIN_SESSION_TOKEN,
        session: localDevSession,
        error: null,
        errorCode: null,
      });
      return;
    }

    if (!firebaseApp) {
      updateAuthSnapshot({
        state: "authed",
        session: localDevSession,
        error: null,
        errorCode: null,
      });
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const returnedToken = hash.get("admin_session");
    const returnedError = hash.get("admin_error");

    if (returnedToken && !handledOAuthHash) {
      handledOAuthHash = true;
      storeSessionToken(returnedToken);
      markLoginToastPending();
      updateAuthSnapshot({
        sessionToken: returnedToken,
        state: "checking",
        error: null,
        errorCode: null,
      });
      window.dispatchEvent(new Event(SESSION_EVENT));
      removeAdminHashParams();
      return;
    }

    if (returnedError && !handledOAuthHash) {
      handledOAuthHash = true;
      clearStoredAdminSession();
      updateAuthSnapshot({ sessionToken: null });
      window.dispatchEvent(new Event(SESSION_EVENT));
      const message = adminAuthErrorMessage(returnedError) ?? "Discord login failed.";
      if (returnedError !== "not_linked") toast.error(message);
      updateAuthSnapshot({
        session: null,
        error: message,
        errorCode: returnedError,
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
      updateAuthSnapshot({ state: "login", session: null, errorCode: null });
      return;
    }

    let cancelled = false;
    updateAuthSnapshot({ state: "checking" });
    callAdminFunction<AdminSession>("getAdminSession", effectiveSessionToken)
      .then((adminSession) => {
        if (cancelled) return;
        storeSessionIsAdmin(adminSession.isAdmin);
        updateAuthSnapshot({
          session: adminSession,
          error: null,
          errorCode: null,
          state: "authed",
        });
        if (consumeLoginToastPending()) {
          toast.success(`Welcome, ${adminSession.characterName}.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        clearStoredAdminSession();
        updateAuthSnapshot({ sessionToken: null });
        window.dispatchEvent(new Event(SESSION_EVENT));
        const { message: knownMessage, errorCode: knownErrorCode } =
          normalizeAdminAuthError(err);
        updateAuthSnapshot({
          session: null,
          error: knownMessage,
          errorCode: knownErrorCode,
          state: "unauthorized",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  function login() {
    if (DEV_AUTH_LAYER_ENABLED) {
      updateAuthSnapshot(devAuthSnapshot());
      return;
    }

    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        state: "authed",
        sessionToken: LOCAL_DEV_ADMIN_SESSION_TOKEN,
        session: localDevSession,
        error: null,
        errorCode: null,
      });
      return;
    }

    if (!firebaseApp) {
      updateAuthSnapshot({
        state: "authed",
        session: localDevSession,
        error: null,
        errorCode: null,
      });
      return;
    }
    const loginUrl = adminOAuthStartUrl();
    if (!loginUrl) {
      updateAuthSnapshot({
        error: "Firebase project ID is missing.",
        errorCode: null,
        state: "login",
      });
      return;
    }
    window.location.assign(loginUrl);
  }

  async function logout() {
    if (DEV_AUTH_LAYER_ENABLED) {
      updateAuthSnapshot({
        state: "login",
        sessionToken: null,
        session: null,
        error: null,
        errorCode: null,
      });
      return;
    }

    const token = sessionToken;
    clearStoredAdminSession();
    clearLoginToastPending();
    updateAuthSnapshot({ sessionToken: null });
    window.dispatchEvent(new Event(SESSION_EVENT));
    if (ADMIN_AUTH_BYPASS) {
      updateAuthSnapshot({
        sessionToken: LOCAL_DEV_ADMIN_SESSION_TOKEN,
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
      errorCode: null,
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
    errorCode,
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
