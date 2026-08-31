import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { animate, type JSAnimation } from "animejs";
import type { Body, Composite, Engine } from "matter-js";
import {
  DROP_STAGGER_MS,
  MAX_QUEUED_DROPS,
  MAX_VISIBLE_COINS,
} from "../constants";
import type { ComplaintCoinMark, ComplaintCoinView } from "../types";

type MatterModule = typeof import("matter-js");

type PhysicsController = {
  settle: (count: number) => void;
  increase: (amount: number, targetCount: number) => void;
  decrease: (amount: number, targetCount: number) => void;
  breakJar: (targetCount: number, amount: number) => void;
};

type SpudBodyMetadata = {
  kind: "coin" | "wall";
  id?: number;
  landed?: boolean;
};

const COIN_MARKS: ComplaintCoinMark[] = ["plus", "spud", "potato", "grumpy"];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function bodyMetadata(body: Body): SpudBodyMetadata | null {
  const plugin = body.plugin as { spudJar?: SpudBodyMetadata };
  return plugin.spudJar ?? null;
}

export function useSpudJarPhysics(total: number | null, cycle: number | null) {
  const jarRef = useRef<HTMLDivElement>(null);
  const jarVisualRef = useRef<HTMLDivElement>(null);
  const coinElementsRef = useRef(new Map<number, HTMLDivElement>());
  const controllerRef = useRef<PhysicsController | null>(null);
  const totalRef = useRef(total);
  const previousTotalRef = useRef<number | null>(null);
  const previousCycleRef = useRef<number | null>(null);
  const animationsRef = useRef(new Set<JSAnimation>());
  const [coins, setCoins] = useState<ComplaintCoinView[]>([]);
  const [breaking, setBreaking] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  totalRef.current = total;

  const bindCoinElement = useCallback(
    (id: number, element: HTMLDivElement | null) => {
      if (element) coinElementsRef.current.set(id, element);
      else coinElementsRef.current.delete(id);
    },
    [],
  );

  useEffect(() => {
    const host = jarRef.current;
    if (!host) return;

    let cancelled = false;
    let matter: MatterModule | null = null;
    let engine: Engine | null = null;
    let walls: Composite | null = null;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let nextCoinId = 1;
    let dropTimer: number | null = null;
    let reconcileTimer: number | null = null;
    let breakTimer: number | null = null;
    let queuedDrops = 0;
    let needsRebuild = false;
    let isBreaking = false;
    const pendingRemovals = new Set<number>();
    const removalTimers = new Map<number, number>();
    const animations = animationsRef.current;
    let desiredVisibleCount = Math.min(totalRef.current ?? 0, MAX_VISIBLE_COINS);
    let width = Math.max(host.clientWidth, 240);
    let height = Math.max(host.clientHeight, 300);
    const bodies = new Map<number, Body>();
    let order: number[] = [];
    const pendingEntrances = new Set<number>();

    function trackAnimation(animation: JSAnimation): void {
      animations.add(animation);
      void animation.then(() => animations.delete(animation));
    }

    function clearDropTimer(): void {
      if (dropTimer !== null) window.clearTimeout(dropTimer);
      dropTimer = null;
    }

    function clearReconcileTimer(): void {
      if (reconcileTimer !== null) window.clearTimeout(reconcileTimer);
      reconcileTimer = null;
    }

    function clearBreakTimer(): void {
      if (breakTimer !== null) window.clearTimeout(breakTimer);
      breakTimer = null;
    }

    function clearRemovalTimers(): void {
      for (const timer of removalTimers.values()) window.clearTimeout(timer);
      removalTimers.clear();
      pendingRemovals.clear();
    }

    function coinRadius(): number {
      return Math.max(8, Math.min(12, width / 32));
    }

    function clearCoinBodies(): void {
      if (!matter || !engine) return;
      clearRemovalTimers();
      for (const body of bodies.values()) {
        matter.Composite.remove(engine.world, body);
      }
      bodies.clear();
      order = [];
      pendingEntrances.clear();
      coinElementsRef.current.clear();
    }

    function addWalls(): void {
      if (!matter || !engine) return;
      if (walls) matter.Composite.remove(engine.world, walls, true);
      walls = matter.Composite.create();
      const top = height * 0.15;
      const bottom = height * 0.89;
      const wallHeight = bottom - top;
      const options = {
        isStatic: true,
        restitution: 0.18,
        friction: 0.5,
        plugin: { spudJar: { kind: "wall" } satisfies SpudBodyMetadata },
      };
      matter.Composite.add(walls, [
        matter.Bodies.rectangle(width * 0.24, (top + bottom) / 2, 12, wallHeight, {
          ...options,
          angle: 0.08,
        }),
        matter.Bodies.rectangle(width * 0.76, (top + bottom) / 2, 12, wallHeight, {
          ...options,
          angle: -0.08,
        }),
        matter.Bodies.rectangle(width / 2, bottom + 5, width * 0.63, 14, options),
      ]);
      matter.Composite.add(engine.world, walls);
    }

    function makeCoinBody(
      id: number,
      x: number,
      y: number,
      radius: number,
      initiallySettled: boolean,
    ): Body {
      if (!matter || !engine) throw new Error("Spud Jar physics is not ready.");
      const body = matter.Bodies.circle(x, y, radius * 0.86, {
        isStatic: false,
        restitution: 0.42,
        friction: 0.34,
        frictionAir: 0.018,
        density: 0.0015,
        sleepThreshold: 35,
        angle: (Math.random() - 0.5) * 1.4,
        plugin: {
          spudJar: {
            kind: "coin",
            id,
            landed: initiallySettled,
          } satisfies SpudBodyMetadata,
        },
      });
      bodies.set(id, body);
      order.push(id);
      matter.Composite.add(engine.world, body);
      if (initiallySettled) matter.Sleeping.set(body, true);
      return body;
    }

    function settledPositions(count: number, radius: number): Array<{ x: number; y: number }> {
      const bottom = height * 0.86;
      const left = width * 0.23;
      const right = width * 0.77;
      const diameter = radius * 1.82;
      const columns = Math.max(1, Math.floor((right - left) / diameter));
      return Array.from({ length: count }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const rowCount = Math.min(columns, count - row * columns);
        const rowWidth = (rowCount - 1) * diameter;
        return {
          x: width / 2 - rowWidth / 2 + column * diameter,
          y: bottom - radius - row * radius * 1.62,
        };
      });
    }

    function settle(count: number): void {
      if (!matter || !engine) return;
      const visibleCount = Math.min(Math.max(0, count), MAX_VISIBLE_COINS);
      desiredVisibleCount = visibleCount;
      clearCoinBodies();
      const radius = coinRadius();
      const positions = settledPositions(visibleCount, radius);
      const views = positions.map((position, index) => {
        const id = nextCoinId++;
        makeCoinBody(id, position.x, position.y, radius, true);
        return { id, radius, mark: COIN_MARKS[index % COIN_MARKS.length] };
      });
      setCoins(views);
    }

    function removeOldestCoin(): void {
      if (!matter || !engine || order.length === 0) return;
      const id = order.shift();
      if (id === undefined) return;
      const body = bodies.get(id);
      if (body) matter.Composite.remove(engine.world, body);
      bodies.delete(id);
      coinElementsRef.current.delete(id);
      setCoins((current) => current.filter((coin) => coin.id !== id));
    }

    function spawnCoin(): void {
      if (!matter || !engine) return;
      if (order.length >= MAX_VISIBLE_COINS) removeOldestCoin();
      const radius = coinRadius();
      const id = nextCoinId++;
      const x = width * (0.36 + Math.random() * 0.28);
      const body = makeCoinBody(id, x, height * 0.045, radius, false);
      matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.9,
        y: 0.35 + Math.random() * 0.45,
      });
      matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.18);
      pendingEntrances.add(id);
      setCoins((current) => [
        ...current,
        { id, radius, mark: COIN_MARKS[(id - 1) % COIN_MARKS.length] },
      ]);
    }

    function processDropQueue(): void {
      dropTimer = null;
      if (queuedDrops <= 0) {
        if (needsRebuild) {
          needsRebuild = false;
          reconcileTimer = window.setTimeout(() => {
            reconcileTimer = null;
            settle(desiredVisibleCount);
          }, 1250);
        }
        return;
      }
      queuedDrops -= 1;
      spawnCoin();
      dropTimer = window.setTimeout(processDropQueue, DROP_STAGGER_MS);
    }

    function increase(_amount: number, targetCount: number): void {
      const target = Math.min(targetCount, MAX_VISIBLE_COINS);
      if (isBreaking) {
        desiredVisibleCount = target;
        return;
      }
      clearReconcileTimer();
      clearRemovalTimers();
      desiredVisibleCount = target;
      if (reducedMotion) {
        settle(target);
        const newest = order.at(-1);
        if (newest !== undefined) pendingEntrances.add(newest);
        return;
      }
      if (bodies.size > target) {
        const excess = bodies.size - target;
        const scheduled = queueBottomRemovals(Math.min(excess, 24));
        if (scheduled < excess) {
          reconcileTimer = window.setTimeout(() => {
            reconcileTimer = null;
            settle(desiredVisibleCount);
          }, scheduled * 80 + 320);
        }
        return;
      }
      const missing = Math.max(0, target - bodies.size - queuedDrops);
      const room = Math.max(0, MAX_QUEUED_DROPS - queuedDrops);
      const animatedDrops = Math.min(missing, room);
      queuedDrops += animatedDrops;
      if (animatedDrops < missing) needsRebuild = true;
      if (dropTimer === null) processDropQueue();
    }

    function wakeCoinPile(): void {
      if (!matter) return;
      for (const body of bodies.values()) {
        if (body.isStatic) matter.Body.setStatic(body, false);
        matter.Sleeping.set(body, false);
      }
    }

    function removeCoinAndCollapse(id: number): void {
      if (!matter || !engine) return;
      pendingRemovals.delete(id);
      const body = bodies.get(id);
      if (!body) return;

      const element = coinElementsRef.current.get(id);
      const art = element?.querySelector<HTMLElement>(".spud-coin-art");
      matter.Composite.remove(engine.world, body);
      bodies.delete(id);
      order = order.filter((coinId) => coinId !== id);
      wakeCoinPile();

      if (!art) {
        coinElementsRef.current.delete(id);
        setCoins((current) => current.filter((coin) => coin.id !== id));
        return;
      }

      const removal = animate(art, {
        opacity: [1, 0],
        scaleX: [1, 1.08, 0.72],
        scaleY: [1, 0.78, 0.38],
        translateY: [0, 5, 22],
        duration: 220,
        ease: "in(3)",
      });
      trackAnimation(removal);
      void removal.then(() => {
        if (cancelled) return;
        coinElementsRef.current.delete(id);
        setCoins((current) => current.filter((coin) => coin.id !== id));
      });
    }

    function queueBottomRemovals(count: number): number {
      if (!matter || !engine || count <= 0) return 0;
      const candidates = [...bodies.entries()]
        .filter(([id]) => !pendingRemovals.has(id))
        .sort(([, bodyA], [, bodyB]) => {
          const vertical = bodyB.position.y - bodyA.position.y;
          if (Math.abs(vertical) > 0.5) return vertical;
          return (
            Math.abs(bodyA.position.x - width / 2) -
            Math.abs(bodyB.position.x - width / 2)
          );
        })
        .slice(0, count);

      candidates.forEach(([id], index) => {
        pendingRemovals.add(id);
        if (index === 0) {
          removeCoinAndCollapse(id);
          return;
        }
        const timer = window.setTimeout(() => {
          removalTimers.delete(id);
          removeCoinAndCollapse(id);
        }, index * 80);
        removalTimers.set(id, timer);
      });
      return candidates.length;
    }

    function decrease(_amount: number, targetCount: number): void {
      clearDropTimer();
      clearReconcileTimer();
      queuedDrops = 0;
      needsRebuild = false;
      const target = Math.min(targetCount, MAX_VISIBLE_COINS);
      desiredVisibleCount = target;
      if (isBreaking) return;
      if (reducedMotion) {
        settle(target);
        return;
      }
      const eventualBodyCount = bodies.size - pendingRemovals.size;
      const excess = Math.max(0, eventualBodyCount - target);
      const removalCount = Math.min(excess, 24);
      const scheduled = queueBottomRemovals(removalCount);

      if (eventualBodyCount < target) {
        const missing = Math.min(target - eventualBodyCount, MAX_QUEUED_DROPS);
        queuedDrops = missing;
        if (dropTimer === null) processDropQueue();
        return;
      }

      if (scheduled < excess) {
        reconcileTimer = window.setTimeout(() => {
          reconcileTimer = null;
          settle(desiredVisibleCount);
        }, scheduled * 80 + 320);
      }
    }

    function breakJar(targetCount: number, amount: number): void {
      if (!matter || !engine) return;
      desiredVisibleCount = Math.min(targetCount, MAX_VISIBLE_COINS);
      if (isBreaking) return;
      clearDropTimer();
      clearReconcileTimer();
      clearBreakTimer();
      clearRemovalTimers();
      queuedDrops = 0;
      needsRebuild = false;
      isBreaking = true;
      setBreaking(true);

      if (reducedMotion) {
        settle(desiredVisibleCount);
        isBreaking = false;
        setBreaking(false);
        return;
      }

      const dropsBeforeBreak = Math.min(
        Math.max(0, amount),
        Math.max(0, MAX_VISIBLE_COINS - order.length),
      );
      for (let index = 0; index < dropsBeforeBreak; index += 1) spawnCoin();
      breakTimer = window.setTimeout(() => {
        breakTimer = null;
        if (!matter || !engine) return;
        if (walls) {
          matter.Composite.remove(engine.world, walls, true);
          walls = null;
        }
        for (const body of bodies.values()) {
          matter.Body.setStatic(body, false);
          matter.Sleeping.set(body, false);
          const direction = body.position.x < width / 2 ? -1 : 1;
          matter.Body.setVelocity(body, {
            x: direction * (2.8 + Math.random() * 4.2),
            y: -4.5 - Math.random() * 4,
          });
          matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.55);
        }

        const visual = jarVisualRef.current;
        if (visual) {
          trackAnimation(
            animate(visual, {
              translateX: [0, -8, 10, -12, 9, -5, 0],
              rotate: [0, -2, 3, -4, 3, -2, 0],
              scale: [1, 1.015, 0.96],
              opacity: [1, 1, 0],
              duration: 760,
              ease: "inOut(3)",
            }),
          );
        }

        breakTimer = window.setTimeout(() => {
          breakTimer = null;
          clearCoinBodies();
          addWalls();
          settle(desiredVisibleCount);
          isBreaking = false;
          setBreaking(false);
          const freshVisual = jarVisualRef.current;
          if (freshVisual) {
            trackAnimation(
              animate(freshVisual, {
                opacity: [0, 1],
                scale: [0.9, 1],
                translateY: [-18, 0],
                duration: 420,
                ease: "out(4)",
              }),
            );
          }
        }, 780);
      }, dropsBeforeBreak > 0 ? 520 : 0);
    }

    function renderFrame(now: number): void {
      if (cancelled || !matter || !engine) return;
      const delta = Math.min(34, now - lastFrame);
      lastFrame = now;
      matter.Engine.update(engine, delta);
      for (const [id, body] of bodies) {
        const element = coinElementsRef.current.get(id);
        if (!element) continue;
        const radius = Number(element.style.width.replace("px", "")) / 2;
        element.style.transform = `translate3d(${body.position.x - radius}px, ${body.position.y - radius}px, 0) rotate(${body.angle}rad)`;
        if (pendingEntrances.delete(id)) {
          const art = element.querySelector<HTMLElement>(".spud-coin-art");
          if (art) {
            trackAnimation(
              animate(art, {
                opacity: [0, 1],
                scale: [0.55, 1],
                duration: reducedMotion ? 180 : 360,
                ease: "out(4)",
              }),
            );
          }
        }
      }
      animationFrame = requestAnimationFrame(renderFrame);
    }

    function collisionHandler(event: { pairs: Array<{ bodyA: Body; bodyB: Body }> }): void {
      if (reducedMotion) return;
      for (const pair of event.pairs) {
        const candidates = [pair.bodyA, pair.bodyB];
        const coin = candidates.find((body) => bodyMetadata(body)?.kind === "coin");
        if (!coin || coin.position.y < height * 0.35) continue;
        const metadata = bodyMetadata(coin);
        if (!metadata || metadata.landed) continue;
        metadata.landed = true;
        const visual = jarVisualRef.current;
        if (visual) {
          trackAnimation(
            animate(visual, {
              rotate: [0, -1.1, 0.8, -0.35, 0],
              duration: 460,
              ease: "out(3)",
            }),
          );
        }
        break;
      }
    }

    void import("matter-js").then((module) => {
      if (cancelled) return;
      matter = module;
      engine = matter.Engine.create({ enableSleeping: true });
      engine.gravity.y = 0.92;
      engine.positionIterations = 5;
      engine.velocityIterations = 4;
      addWalls();
      matter.Events.on(engine, "collisionStart", collisionHandler);
      controllerRef.current = { settle, increase, decrease, breakJar };
      settle(totalRef.current ?? 0);
      lastFrame = performance.now();
      animationFrame = requestAnimationFrame(renderFrame);
    });

    let previousWidth = width;
    let previousHeight = height;
    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(host.clientWidth, 240);
      const nextHeight = Math.max(host.clientHeight, 300);
      if (Math.abs(nextWidth - previousWidth) < 2 && Math.abs(nextHeight - previousHeight) < 2) return;
      previousWidth = width = nextWidth;
      previousHeight = height = nextHeight;
      clearDropTimer();
      clearReconcileTimer();
      clearBreakTimer();
      clearRemovalTimers();
      setBreaking(false);
      queuedDrops = 0;
      needsRebuild = false;
      addWalls();
      settle(desiredVisibleCount);
    });
    resizeObserver.observe(host);

    return () => {
      cancelled = true;
      controllerRef.current = null;
      resizeObserver.disconnect();
      clearDropTimer();
      clearReconcileTimer();
      clearRemovalTimers();
      cancelAnimationFrame(animationFrame);
      for (const animation of animations) animation.revert();
      animations.clear();
      if (matter && engine) {
        matter.Events.off(engine, "collisionStart", collisionHandler);
        clearCoinBodies();
        matter.Engine.clear(engine);
      }
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (total === null || cycle === null) return;
    const previous = previousTotalRef.current;
    const previousCycle = previousCycleRef.current;
    previousTotalRef.current = total;
    previousCycleRef.current = cycle;
    const controller = controllerRef.current;
    if (!controller) return;
    if (previous === null || previousCycle === null) {
      controller.settle(total);
    } else if (cycle > previousCycle) {
      const amount =
        (cycle - previousCycle) * MAX_VISIBLE_COINS + total - previous;
      controller.breakJar(total, amount);
    } else if (cycle < previousCycle) {
      controller.settle(total);
    } else if (total > previous) {
      controller.increase(total - previous, total);
    } else if (total < previous) {
      controller.decrease(previous - total, total);
    }
  }, [cycle, total]);

  return {
    jarRef,
    jarVisualRef,
    coins,
    bindCoinElement,
    reducedMotion,
    breaking,
  };
}
