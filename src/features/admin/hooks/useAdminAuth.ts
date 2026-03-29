import { useState } from "react";

// Change this password to whatever you like.
const ADMIN_PASSWORD = "meowfia2026";

export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function login(password: string) {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError(null);
    } else {
      setError("Incorrect password. Try again, boss.");
    }
  }

  function logout() {
    setAuthed(false);
  }

  return { authed, error, login, logout };
}
