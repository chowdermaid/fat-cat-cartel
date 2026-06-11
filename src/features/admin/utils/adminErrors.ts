export function adminAuthErrorMessage(code: string | null): string | null {
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

export function normalizeAdminAuthError(err: unknown): {
  message: string;
  errorCode: string | null;
} {
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
  const errorCode = knownMessage.includes("Link your Lodestone")
    ? "not_linked"
    : knownMessage.includes("no longer tracked")
      ? "missing_member"
      : knownMessage.includes("Allowed Discord role")
        ? "unauthorized"
        : null;

  return { message: knownMessage, errorCode };
}
