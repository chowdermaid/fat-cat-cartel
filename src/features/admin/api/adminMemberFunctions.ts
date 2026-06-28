import { callAdminFunction } from "./adminFunctions";
import type { MemberProfile } from "@/features/member-profile/types";
import type { SyncSource } from "../types";

export function triggerFCCollectionRefresh(adminSessionToken: string) {
  return callAdminFunction(
    "triggerFCCollectionRefresh",
    adminSessionToken,
    {},
    { timeout: 300_000 },
  );
}

export function triggerTomestoneRaidStatsRefresh(adminSessionToken: string) {
  return callAdminFunction("triggerTomestoneRaidStatsRefresh", adminSessionToken, {}, { timeout: 300_000 });
}

export function triggerDmuProgressRefresh(adminSessionToken: string) {
  return callAdminFunction<{
    ok: boolean;
    sourceStatus: {
      playersWithProgress: number;
      eligibleMembers: number;
    };
  }>("triggerDmuProgressRefresh", adminSessionToken, {}, { timeout: 300_000 });
}

export function triggerFFLogsRefresh(adminSessionToken: string) {
  return callAdminFunction("triggerFFLogsRefresh", adminSessionToken, {}, { timeout: 300_000 });
}

export function refreshMemberSource(
  adminSessionToken: string,
  lodestoneId: string,
  source: SyncSource,
) {
  return callAdminFunction(
    "refreshMemberSource",
    adminSessionToken,
    { lodestoneId, source },
    { timeout: 300_000 },
  );
}

export function importLodestoneMembers(adminSessionToken: string) {
  return callAdminFunction<{ total: number; written: number; failed: number }>(
    "importLodestoneMembers",
    adminSessionToken,
    {},
    { timeout: 300_000 },
  );
}

export function upsertMember(
  adminSessionToken: string,
  input: { lodestoneId: string; name: string },
) {
  return callAdminFunction(
    "upsertMember",
    adminSessionToken,
    input,
  );
}

export function deleteMember(
  adminSessionToken: string,
  input: { lodestoneId: string; name: string },
) {
  return callAdminFunction(
    "deleteMember",
    adminSessionToken,
    input,
  );
}

export function updateMemberProfileAdmin(
  adminSessionToken: string,
  input: {
    lodestoneId: string;
    profile: MemberProfile;
    fcRank: string | null;
  },
) {
  return callAdminFunction("updateMemberProfileAdmin", adminSessionToken, input);
}
