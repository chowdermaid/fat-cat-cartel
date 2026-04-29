import { useState } from "react";

const ADMIN_PASSWORD = "meowfia2026";
const SESSION_KEY = "admin_authed";

export function useAdminAuth() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [error, setError] = useState<string | null>(null);

  function login(password: string) {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError(null);
    } else {
      setError("Incorrect password. Try again, boss.");
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }

  return { authed, error, login, logout };
}
