import type { Scores } from "@/types";
import { callAdminFunction } from "./adminFunctions";

export function upsertEasterParticipantAdmin(
  adminSessionToken: string,
  input: { id?: string; name: string; scores: Scores },
) {
  return callAdminFunction("upsertEasterParticipantAdmin", adminSessionToken, input);
}

export function deleteEasterParticipantAdmin(
  adminSessionToken: string,
  id: string,
) {
  return callAdminFunction("deleteEasterParticipantAdmin", adminSessionToken, { id });
}
