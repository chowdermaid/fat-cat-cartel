import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { DEV_AUTH_LAYER_ENABLED, getSelectedDevPersona } from "@/lib/dev/personas";
import { devGameServerAccessStatus } from "@/lib/dev/gameServerAccess";
import { getGameServerStatus, getGameServerTelemetry, listGameServerEvents, startGameServer, stopGameServer } from "../api/gameServerFunctions";
import type { GameServerAccessState } from "../types";
import { gameServerIdentity } from "../utils/dragonwilds";
import { createDragonwildsController, emptyDragonwildsState } from "./dragonwildsController";

export function useDragonwildsServer(auth: GameServerAccessState) {
  const controller = useMemo(() => createDragonwildsController({
    status: (token) => getGameServerStatus(token, "dragonwilds"),
    telemetry: (token) => getGameServerTelemetry(token, "dragonwilds"),
    events: (token) => listGameServerEvents(token, "dragonwilds"),
    action: (token, action) => action === "start"
      ? startGameServer(token, "dragonwilds") : stopGameServer(token, "dragonwilds"),
  }), []);
  const identity = gameServerIdentity(auth, "dragonwilds");
  const token = auth.sessionToken;
  const discordId = auth.session?.discordUserId;
  const allowed = auth.authed && !auth.checking && auth.canUseGameServers && Boolean(token);
  useLayoutEffect(() => {
    if (allowed && token) {
      controller.connect({ identity, token, isCurrent: () => !DEV_AUTH_LAYER_ENABLED ||
        (getSelectedDevPersona().discordUserId === discordId && devGameServerAccessStatus(getSelectedDevPersona(), "dragonwilds").canUseGameServers) });
    }
    return controller.disconnect;
  }, [controller, identity, token, discordId, allowed]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const state = snapshot.identity === identity && allowed ? snapshot : {
    ...emptyDragonwildsState(identity), loadingStatus: allowed,
  };
  return { state, refreshStatus: controller.refreshStatus, refreshEvents: controller.refreshEvents, runAction: controller.runAction };
}
