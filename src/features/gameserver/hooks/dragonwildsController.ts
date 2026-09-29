import type {
  DragonwildsServerState, GameServerActionResponse, GameServerAuditLogResponse,
  GameServerStatusResponse, GameServerTelemetryResponse,
} from "../types";
import { DRAGONWILDS_POLL_INTERVAL_MS, DRAGONWILDS_POLL_MAX_ATTEMPTS } from "../constants";
import { canDragonwildsAct, dragonwildsActionStatus, gameServerError, isGameServerAccessError } from "../utils/dragonwilds";

type Status = GameServerStatusResponse<"dragonwilds">;
type Context = { identity: string; token: string; isCurrent?: () => boolean };
type Dependencies = {
  status: (token: string) => Promise<Status>;
  telemetry: (token: string) => Promise<GameServerTelemetryResponse<"dragonwilds">>;
  events: (token: string) => Promise<GameServerAuditLogResponse>;
  action: (token: string, action: "start" | "stop") => Promise<GameServerActionResponse<"dragonwilds">>;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
};

export function emptyDragonwildsState(identity = ""): DragonwildsServerState {
  return { identity, status: null, telemetry: null, events: [], loadingStatus: false,
    loadingTelemetry: false, loadingEvents: false, action: null, waitingForHost: false,
    accessDenied: false, error: null, telemetryError: null, eventsError: null, notice: null };
}

export function createDragonwildsController(api: Dependencies) {
  let state = emptyDragonwildsState();
  let context: Context | null = null;
  let epoch = 0;
  let statusRequest = 0;
  let eventRequest = 0;
  let pollGeneration = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const pending = new Map<string, Promise<unknown>>();
  const schedule = api.schedule ?? setTimeout;
  const cancel = api.cancel ?? clearTimeout;
  const emit = (patch: Partial<DragonwildsServerState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const current = (version: number) => context !== null && version === epoch &&
    !state.accessDenied && (context.isCurrent?.() ?? true);

  // Do not adopt a coalesced response from an earlier identity/request generation.
  async function read<T>(
    operation: string,
    ctx: Context,
    version: number,
    valid: () => boolean,
    load: () => Promise<T>,
  ): Promise<T | undefined> {
    const key = `${ctx.identity}:${operation}`;
    const earlier = pending.get(key);
    if (earlier) {
      try { await earlier; }
      catch { /* Its owner handles errors. */ }
    }
    if (!current(version) || !valid()) return undefined;
    const promise = load();
    pending.set(key, promise);
    try { return await promise; }
    finally { if (pending.get(key) === promise) pending.delete(key); }
  }

  function cancelPolling() {
    pollGeneration += 1;
    if (timer !== undefined) cancel(timer);
    timer = undefined;
  }

  function deny() {
    cancelPolling();
    epoch += 1;
    state = { ...emptyDragonwildsState(state.identity), accessDenied: true };
    emit({});
  }

  function fail(error: unknown, field: "error" | "telemetryError" | "eventsError") {
    if (isGameServerAccessError(error)) deny();
    else emit({ [field]: gameServerError(error) });
  }

  async function loadEvents() {
    if (!context || !current(epoch)) return;
    const ctx = context;
    const version = epoch;
    const request = ++eventRequest;
    const valid = () => current(version) && request === eventRequest;
    emit({ loadingEvents: true, eventsError: null });
    try {
      const result = await read("events", ctx, version, valid, () => api.events(ctx.token));
      if (result && valid()) {
        emit({
          events: result.entries
            .filter((entry) => entry.serverId === "dragonwilds")
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5),
        });
      }
    } catch (error) {
      if (valid()) fail(error, "eventsError");
    } finally {
      if (valid()) emit({ loadingEvents: false });
    }
  }

  async function loadTelemetry(ctx: Context, version: number, request: number) {
    const valid = () => current(version) && request === statusRequest &&
      state.status?.enabled === true && state.status.status === "running";
    if (!valid()) return;
    emit({ loadingTelemetry: true });
    try {
      const result = await read("telemetry", ctx, version, valid, () => api.telemetry(ctx.token));
      if (result && valid()) emit({ telemetry: result, telemetryError: null });
    } catch (error) {
      if (valid()) {
        emit({ telemetry: null });
        fail(error, "telemetryError");
      }
    } finally {
      if (valid()) emit({ loadingTelemetry: false });
    }
  }

  function acceptStatus(result: Status) {
    const transition = state.status !== null &&
      (state.status.status !== result.status || state.status.enabled !== result.enabled);
    const inactive = !result.enabled || result.status !== "running";
    if (transition && inactive) {
      eventRequest += 1;
      emit({ events: [], loadingEvents: false });
    }
    emit({ status: result, ...(inactive ? { telemetry: null, loadingTelemetry: false } : {}) });
  }

  async function loadStatus(): Promise<Status | null> {
    if (!context || !current(epoch)) return null;
    const ctx = context;
    const version = epoch;
    const request = ++statusRequest;
    const valid = () => current(version) && request === statusRequest;
    emit({ loadingStatus: true, telemetry: null, loadingTelemetry: false, telemetryError: null, error: null });
    try {
      const result = await read("status", ctx, version, valid, () => api.status(ctx.token));
      if (!result || !valid()) return null;
      acceptStatus(result);
      if (result.enabled && result.status === "running") void loadTelemetry(ctx, version, request);
      return result;
    } catch (error) {
      if (valid()) fail(error, "error");
      return null;
    } finally {
      if (valid()) emit({ loadingStatus: false });
    }
  }

  function poll(attempt: number, generation: number, version: number) {
    if (!current(version) || generation !== pollGeneration) return;
    timer = schedule(() => {
      timer = undefined;
      void (async () => {
        const result = await loadStatus();
        if (!current(version) || generation !== pollGeneration) return;
        if (result?.enabled && result.status === "pending" && attempt < DRAGONWILDS_POLL_MAX_ATTEMPTS) {
          poll(attempt + 1, generation, version);
          return;
        }
        emit({ waitingForHost: false, notice: result?.status === "running"
          ? "Host running; game readiness unverified."
          : result?.status === "pending" ? "Host is still starting. Refresh status to check again."
          : "Host-start waiting ended. Check status before trying again." });
      })();
    }, DRAGONWILDS_POLL_INTERVAL_MS);
  }

  async function refreshStatus() {
    if (!context || !current(epoch) || state.action) return;
    cancelPolling();
    emit({ waitingForHost: false, notice: null });
    await loadStatus();
  }

  async function runAction(action: "start" | "stop") {
    if (!context || !current(epoch) || !canDragonwildsAct(state, action) || !state.status) return;
    const ctx = context;
    const version = epoch;
    cancelPolling();
    statusRequest += 1;
    eventRequest += 1;
    emit({ action, waitingForHost: false, loadingEvents: false, telemetry: null,
      loadingTelemetry: false, notice: null, error: null });
    let succeeded = false;
    try {
      const result = await api.action(ctx.token, action);
      if (!current(version)) return;
      acceptStatus(dragonwildsActionStatus(result, state.status!));
      succeeded = result.ok;
      emit(result.ok ? { notice: result.message } : { notice: result.message, error: result.message });
    } catch (error) {
      if (current(version)) {
        fail(error, "error");
        if (current(version)) emit({ notice: gameServerError(error) });
      }
    } finally {
      if (current(version)) {
        // Keep controls locked until the authoritative post-action status arrives.
        const result = await loadStatus();
        if (current(version)) {
          emit({ action: null });
          void loadEvents();
          if (succeeded && action === "start" && result?.enabled && result.status === "pending") {
            emit({ waitingForHost: true });
            poll(1, pollGeneration, version);
          }
        }
      }
    }
  }

  function disconnect() {
    context = null;
    epoch += 1;
    statusRequest += 1;
    eventRequest += 1;
    cancelPolling();
    state = emptyDragonwildsState();
    emit({});
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    connect(ctx: Context) {
      disconnect();
      context = ctx;
      emit({ identity: ctx.identity });
      void loadStatus();
      void loadEvents();
    },
    disconnect, refreshStatus, refreshEvents: loadEvents, runAction,
  };
}
