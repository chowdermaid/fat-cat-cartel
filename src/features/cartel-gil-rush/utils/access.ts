import type { AdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { canViewGilRush } from "../../../../functions/src/cartel-gil-rush-model";

export function canAccessGilRush(auth: Pick<AdminAuth, "authed" | "checking" | "session">): boolean {
  return auth.authed && !auth.checking && canViewGilRush(auth.session);
}
