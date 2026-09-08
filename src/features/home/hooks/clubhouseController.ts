import { animate, createTimer, type Timer } from "animejs";
import { CLUBHOUSE } from "../constants.ts";
import type {
  ClubhouseActor, ClubhouseBounds, ClubhouseEnvironment, ClubhouseLayout,
  ClubhouseProtection, ClubhouseQueue, ClubhouseGeometry, ClubhousePoint,
} from "../types";
import {
  chooseClubhousePoint, clubhouseTravelMs, getClubhouseGeometry, getClubhouseFootprint, clampClubhousePoint, isInsideClubhousePolygon, reconcileClubhouse,
  replaceClubhouseMember, replacementCandidate, toScenePoint,
} from "../utils/clubhouse.ts";

const randomRange = ({ min, max }: { min: number; max: number }) => min + Math.random() * (max - min);

export function createClubhouseController(
  publish: (ids: string[]) => void,
  publishLayout: (layout: ClubhouseLayout) => void,
) {
  let queue: ClubhouseQueue = { visible: [], waiting: [] };
  let roster: string[] = [];
  let bounds: ClubhouseBounds = { left: 0, top: 0, width: 0, height: 0 };
  let limit: number = CLUBHOUSE.narrowVisible;
  let measured = false;
  let geometry: ClubhouseGeometry | undefined;
  let spacing = { width: 1, height: 1 };
  let disposed = false;
  let outgoing: string | undefined;
  let rotation: Timer | undefined;
  let environment: ClubhouseEnvironment = { hidden: true, offscreen: true, reducedMotion: false };
  const actors = new Map<string, ClubhouseActor>();
  const globallyPaused = () => environment.hidden || environment.offscreen;
  const protectedIds = () => new Set([...actors].filter(([, actor]) => actor.protection.size || actor.journey).map(([id]) => id));

  function destination(id?: string) {
    return chooseClubhousePoint(
      [...actors].filter(([otherId]) => otherId !== id).flatMap(([, actor]) => [actor.point, actor.destination]),
      bounds, CLUBHOUSE.destinationSamples, spacing, Math.random, geometry?.walkPolygon,
    );
  }

  function renderActor(actor: ClubhouseActor) {
    if (!actor.element) return;
    const point = toScenePoint(actor.point, bounds);
    actor.element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    actor.element.style.zIndex = String(Math.round(point.y) + 1);
  }

  function stopWalking(actor: ClubhouseActor) {
    actor.movement?.cancel();
    actor.bob?.revert();
    actor.idle?.cancel();
    actor.movement = actor.bob = actor.idle = undefined;
  }

  function removeActor(id: string) {
    const actor = actors.get(id);
    if (!actor) return;
    stopWalking(actor);
    actor.transition?.cancel();
    actors.delete(id);
  }

  function cancelExit() {
    if (!outgoing) return;
    const id = outgoing;
    const actor = actors.get(id);
    actor?.transition?.cancel();
    if (actor) {
      stopWalking(actor);
      actor.transition = undefined;
      if (actor.fade) actor.fade.style.opacity = "1";
      actor.journey = "returning";
      actor.route = geometry ? [{ ...geometry.carpetEntry }] : [];
    }
    outgoing = undefined;
    advanceRoute(id);
  }

  function scheduleIdle(id: string, delay = randomRange(CLUBHOUSE.idleMs)) {
    const actor = actors.get(id);
    if (!actor || !actor.element || disposed || environment.reducedMotion || actor.idle || actor.movement || actor.journey || actor.transition) return;
    actor.idle = createTimer({
      duration: delay,
      autoplay: false,
      onComplete: () => {
        actor.idle = undefined;
        walk(id);
      },
    });
    if (!globallyPaused() && !actor.protection.size) actor.idle.resume();
  }

  function walk(id: string) {
    const actor = actors.get(id);
    if (!actor?.element || disposed || environment.reducedMotion) return;
    if (globallyPaused() || actor.protection.size) {
      scheduleIdle(id);
      return;
    }
    move(id, destination(id), () => scheduleIdle(id));
  }

  function move(id: string, target: ClubhousePoint, complete: () => void) {
    const actor = actors.get(id);
    if (!actor || disposed) return;
    actor.destination = { ...target };
    const duration = clubhouseTravelMs(actor.point, target, bounds, randomRange(actor.journey ? CLUBHOUSE.doorwaySpeed : CLUBHOUSE.speed));
    if (duration < 1) {
      actor.point = { ...target };
      renderActor(actor);
      complete();
      return;
    }
    if (actor.body) actor.bob = animate(actor.body, {
      translateY: [0, -CLUBHOUSE.bobPx], duration: 480, alternate: true, loop: true, ease: "inOutSine",
    });
    actor.movement = animate(actor.point, {
      x: actor.destination.x, y: actor.destination.y, duration, ease: "linear",
      onUpdate: () => renderActor(actor),
      onComplete: () => {
        actor.movement = undefined;
        actor.bob?.revert();
        actor.bob = undefined;
        complete();
      },
    });
  }

  function advanceRoute(id: string) {
    const actor = actors.get(id);
    if (!actor?.element || !actor.journey || disposed || globallyPaused() || environment.reducedMotion || actor.protection.size || actor.movement || actor.transition) return;
    const target = actor.route[0];
    if (target) {
      move(id, target, () => { actor.route.shift(); advanceRoute(id); });
    } else if (actor.journey === "departing" && actor.fade) {
      actor.transition = animate(actor.fade, {
        opacity: 0, duration: CLUBHOUSE.fadeMs, ease: "out(2)",
        onComplete: () => finishReplacement(id),
      });
    } else {
      actor.journey = null;
      reconcile();
      scheduleIdle(id);
    }
  }

  function syncActor(id: string, actor: ClubhouseActor) {
    if (environment.reducedMotion) stopWalking(actor);
    else {
      const paused = globallyPaused() || actor.protection.size > 0;
      for (const animation of [actor.movement, actor.bob, actor.idle]) {
        if (paused) animation?.pause();
        else animation?.resume();
      }
      scheduleIdle(id, CLUBHOUSE.startStaggerMs * (queue.visible.indexOf(id) + 1));
    }
    if (globallyPaused() || actor.protection.size) actor.transition?.pause();
    else actor.transition?.resume();
    advanceRoute(id);
  }

  function commit(next: ClubhouseQueue, entering = false) {
    const changed = next.visible.join("|") !== queue.visible.join("|");
    queue = next;
    for (const id of actors.keys()) if (!queue.visible.includes(id)) removeActor(id);
    for (const id of queue.visible) {
      if (actors.has(id)) continue;
      const target = destination();
      const point = entering && geometry ? { ...geometry.door } : { ...target };
      actors.set(id, {
        point, destination: target, protection: new Set(), element: null, body: null, fade: null, entering,
        journey: entering ? "arriving" : null,
        route: entering && geometry ? [{ ...geometry.carpetEntry }, target] : [],
      });
    }
    if (changed) publish([...queue.visible]);
  }

  function reconcile() {
    if (!measured || disposed) return;
    commit(reconcileClubhouse(queue, roster, limit, protectedIds()));
    if (!queue.waiting.length) {
      rotation?.cancel();
      rotation = undefined;
    }
    scheduleRotation();
  }

  function finishReplacement(id: string) {
    outgoing = undefined;
    if (disposed) return;
    if (actors.get(id)?.protection.size) {
      const actor = actors.get(id);
      if (actor?.fade) actor.fade.style.opacity = "1";
    } else commit(replaceClubhouseMember(queue, id), !environment.reducedMotion);
    scheduleRotation();
  }

  function replace(manual = false) {
    if (disposed || globallyPaused() || outgoing || (!manual && environment.reducedMotion)) return;
    const id = replacementCandidate(queue, protectedIds());
    const actor = id ? actors.get(id) : undefined;
    if (!id || !actor?.fade || !geometry) {
      scheduleRotation();
      return;
    }
    rotation?.cancel();
    rotation = undefined;
    if (environment.reducedMotion) {
      finishReplacement(id);
      return;
    }
    outgoing = id;
    stopWalking(actor);
    actor.transition?.cancel();
    actor.transition = undefined;
    actor.journey = "departing";
    actor.route = [{ ...geometry.carpetEntry }, { ...geometry.door }];
    advanceRoute(id);
  }

  function scheduleRotation() {
    if (disposed || rotation || outgoing || globallyPaused() || environment.reducedMotion || !queue.waiting.length || [...actors.values()].some((actor) => actor.journey)) return;
    rotation = createTimer({
      duration: randomRange(CLUBHOUSE.replacementMs),
      onComplete: () => {
        rotation = undefined;
        replace();
      },
    });
  }

  return {
    setRoster(ids: string[]) {
      if (disposed) return;
      if (ids.join("|") !== roster.join("|")) cancelExit();
      roster = ids;
      reconcile();
    },
    resize(width: number) {
      if (disposed || width <= 0) return;
      const narrow = width < CLUBHOUSE.narrowWidth;
      const size = narrow ? CLUBHOUSE.narrowPortraitSize : CLUBHOUSE.portraitSize;
      const previousGeometry = geometry;
      geometry = getClubhouseGeometry(width, size, CLUBHOUSE);
      const height = geometry.height;
      const nextLimit = geometry.walkPolygon.length >= 3 ? Math.min(CLUBHOUSE.maxVisible, narrow ? CLUBHOUSE.narrowVisible : CLUBHOUSE.maxVisible) : 0;
      bounds = geometry.bounds;
      const footprint = getClubhouseFootprint(size, CLUBHOUSE);
      spacing = { width: footprint.right - footprint.left, height: footprint.bottom - footprint.top };
      measured = true;
      limit = nextLimit;
      publishLayout({ narrow, size, limit, height });
      for (const [id, actor] of actors) {
        stopWalking(actor);
        if (previousGeometry && isInsideClubhousePolygon(actor.point, previousGeometry.walkPolygon)) {
          actor.point = clampClubhousePoint(actor.point, geometry.walkPolygon);
        }
        if (actor.journey) {
          if (actor.transition) actor.point = { ...geometry.door };
          if (actor.journey === "departing") {
            actor.route = actor.transition ? [] : actor.route.length === 1
              ? [{ ...geometry.door }] : [{ ...geometry.carpetEntry }, { ...geometry.door }];
          } else if (actor.journey === "returning") actor.route = [{ ...geometry.carpetEntry }];
          else {
            const target = clampClubhousePoint(actor.route.at(-1) ?? actor.point, geometry.walkPolygon);
            actor.route = actor.route.length === 1 ? [target] : [{ ...geometry.carpetEntry }, target];
          }
        } else actor.point = clampClubhousePoint(actor.point, geometry.walkPolygon);
        renderActor(actor);
        syncActor(id, actor);
      }
      reconcile();
    },
    register(id: string, element: HTMLDivElement | null) {
      const actor = actors.get(id);
      if (!actor || disposed) return;
      if (actor.element === element) return;
      stopWalking(actor);
      actor.transition?.cancel();
      actor.transition = undefined;
      actor.element = element;
      actor.body = element?.querySelector<HTMLElement>("[data-clubhouse-body]") ?? null;
      actor.fade = element?.querySelector<HTMLElement>("[data-clubhouse-fade]") ?? null;
      if (!element) return;
      renderActor(actor);
      if (actor.fade) {
        actor.fade.style.opacity = "1";
        if (actor.entering && !environment.reducedMotion) actor.transition = animate(actor.fade, {
          opacity: [0, 1], duration: CLUBHOUSE.fadeMs, ease: "out(2)", autoplay: false,
          onComplete: () => { actor.transition = undefined; advanceRoute(id); },
        });
      }
      actor.entering = false;
      syncActor(id, actor);
    },
    protect(id: string, reason: ClubhouseProtection, active: boolean) {
      const actor = actors.get(id);
      if (!actor || disposed) return;
      if (active) actor.protection.add(reason);
      else actor.protection.delete(reason);
      if (active && outgoing === id) cancelExit();
      syncActor(id, actor);
      reconcile();
    },
    setEnvironment(next: Partial<ClubhouseEnvironment>) {
      if (disposed) return;
      const wasReduced = environment.reducedMotion;
      environment = { ...environment, ...next };
      if (environment.reducedMotion && !wasReduced) {
        cancelExit();
        for (const actor of actors.values()) {
          stopWalking(actor);
          actor.transition?.cancel();
          actor.transition = undefined;
          if (actor.fade) actor.fade.style.opacity = "1";
          actor.journey = null;
          actor.route = [];
          actor.entering = false;
          if (geometry) actor.point = clampClubhousePoint(actor.point, geometry.walkPolygon);
          renderActor(actor);
        }
      }
      for (const [id, actor] of actors) syncActor(id, actor);
      if (globallyPaused() || environment.reducedMotion) {
        rotation?.cancel();
        rotation = undefined;
      } else scheduleRotation();
    },
    showOtherMembers: () => replace(true),
    dispose() {
      disposed = true;
      rotation?.cancel();
      cancelExit();
      for (const id of actors.keys()) removeActor(id);
    },
  };
}
