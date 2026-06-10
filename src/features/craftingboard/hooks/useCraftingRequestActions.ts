import { useState } from "react";
import { toast } from "sonner";
import {
  acceptCraftingRequest,
  closeCraftingRequest,
  completeCraftingRequest,
  reopenCraftingRequest,
} from "../api/craftingRequests";
import type { CraftingRequestMember } from "../types";

export type CraftingLifecycleAction = "accept" | "complete" | "close" | "reopen";

export function useCraftingRequestActions({
  currentMember,
  isAdmin,
  reload,
  sessionToken,
}: {
  currentMember: CraftingRequestMember | null;
  isAdmin: boolean;
  reload: () => Promise<void>;
  sessionToken: string | null;
}) {
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);

  async function runLifecycleAction(
    requestId: string,
    action: CraftingLifecycleAction,
  ) {
    if (!currentMember) {
      toast.error("Member login is required.");
      return;
    }
    setActionRequestId(requestId);
    try {
      const payload = {
        sessionToken,
        member: currentMember,
        isAdmin,
        requestId,
      };
      if (action === "accept") {
        await acceptCraftingRequest(payload);
        toast.success("Request accepted.");
      } else if (action === "complete") {
        await completeCraftingRequest(payload);
        toast.success("Request completed.");
      } else if (action === "close") {
        await closeCraftingRequest(payload);
        toast.success("Request closed.");
      } else {
        await reopenCraftingRequest(payload);
        toast.success("Request moved back to open.");
      }
      await reload();
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "Request update failed.",
      );
      await reload();
    } finally {
      setActionRequestId(null);
    }
  }

  return { actionRequestId, runLifecycleAction };
}
