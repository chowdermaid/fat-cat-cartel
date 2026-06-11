import {
  LOGIN_TOAST_KEY,
  SESSION_ADMIN_KEY,
  SESSION_KEY,
} from "../constants";

export function storedSessionToken(): string | null {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(SESSION_KEY);
}

export function storedSessionIsAdmin(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem(SESSION_ADMIN_KEY) === "true"
  );
}

export function storeSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function storeSessionIsAdmin(isAdmin: boolean): void {
  localStorage.setItem(SESSION_ADMIN_KEY, isAdmin ? "true" : "false");
}

export function clearStoredAdminSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_ADMIN_KEY);
}

export function markLoginToastPending(): void {
  sessionStorage.setItem(LOGIN_TOAST_KEY, "1");
}

export function consumeLoginToastPending(): boolean {
  if (sessionStorage.getItem(LOGIN_TOAST_KEY) !== "1") return false;
  sessionStorage.removeItem(LOGIN_TOAST_KEY);
  return true;
}

export function clearLoginToastPending(): void {
  sessionStorage.removeItem(LOGIN_TOAST_KEY);
}
