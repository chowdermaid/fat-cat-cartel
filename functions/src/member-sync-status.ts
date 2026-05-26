export type MemberSyncSource = "lodestone" | "collection" | "tomestone" | "fflogs";

export function memberSyncSuccess(
  source: MemberSyncSource,
  lastAttemptAt: number,
  lastSuccessAt: number,
  message = `${source} refreshed.`,
  details?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    status: "success",
    lastAttemptAt,
    lastSuccessAt,
    message,
    ...(details ? { details } : {}),
  };
}

export function memberSyncError(
  lastAttemptAt: number,
  message: string,
): Record<string, unknown> {
  return {
    status: "error",
    lastAttemptAt,
    message,
  };
}

