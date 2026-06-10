import { callAdminFunction } from "@/features/admin/lib/adminFunctions";
import { db, ref, set } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import type { MemberProfile } from "../types";

export async function saveOwnMemberProfile({
  lodestoneId,
  profile,
  sessionToken,
}: {
  lodestoneId: string;
  profile: MemberProfile;
  sessionToken: string | null;
}) {
  if (firebaseApp) {
    if (!sessionToken) throw new Error("Login is required.");
    await callAdminFunction("updateOwnMemberProfile", sessionToken, {
      profile,
    });
    return;
  }

  await set(ref(db, `memberProfiles/${lodestoneId}`), profile);
}
