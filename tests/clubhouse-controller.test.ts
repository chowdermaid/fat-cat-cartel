import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { CLUBHOUSE } from "../src/features/home/constants.ts";
import { getClubhouseGeometry, isInsideClubhousePolygon, toScenePoint } from "../src/features/home/utils/clubhouse.ts";

type AnimationOptions = {
  duration: number;
  autoplay?: boolean;
  loop?: boolean;
  opacity?: number | number[];
  x?: number;
  y?: number;
  onUpdate?: () => void;
  onComplete?: () => void;
};
type FakeHandle = ReturnType<typeof handle>;
const handles: FakeHandle[] = [];

function handle(target: Record<string, unknown>, options: AnimationOptions, timer: boolean) {
  const animation = {
    target, options, timer, paused: options.autoplay === false, cancelled: false, completed: false,
    pause() { this.paused = true; return this; },
    resume() { this.paused = false; return this; },
    cancel() { this.cancelled = true; return this; },
    revert() { this.cancelled = true; return this; },
    finish() {
      if (this.cancelled || this.paused || this.completed || options.loop) return;
      this.completed = true;
      for (const key of ["x", "y"] as const) if (options[key] !== undefined) target[key] = options[key];
      options.onUpdate?.();
      options.onComplete?.();
    },
  };
  handles.push(animation);
  return animation;
}

mock.module("animejs", {
  namedExports: {
    animate: (target: Record<string, unknown>, options: AnimationOptions) => handle(target, options, false),
    createTimer: (options: AnimationOptions) => handle({}, options, true),
  },
});
const { createClubhouseController } = await import("../src/features/home/hooks/clubhouseController.ts");

function fixture(count = 20, width = 800, reducedMotion = false) {
  const geometry = getClubhouseGeometry(width, width < CLUBHOUSE.narrowWidth ? CLUBHOUSE.narrowPortraitSize : CLUBHOUSE.portraitSize, CLUBHOUSE);
  const ids = Array.from({ length: count }, (_, i) => String(i));
  let visible: string[] = [];
  const elements = new Map<string, { style: Record<string, string>; querySelector: (selector: string) => { style: Record<string, string> } }>();
  const start = handles.length;
  const controller = createClubhouseController((next) => { visible = next; }, () => {});
  controller.setEnvironment({ hidden: false, offscreen: false, reducedMotion });
  controller.resize(width);
  controller.setRoster(ids);
  const register = () => {
    for (const id of visible) {
      if (elements.has(id)) continue;
      const fade = { style: {} as Record<string, string> };
      const body = { style: {} as Record<string, string> };
      const element = { style: {} as Record<string, string>, querySelector: (selector: string) => selector.includes("fade") ? fade : body };
      elements.set(id, element);
      controller.register(id, element as unknown as HTMLDivElement);
    }
  };
  register();
  const active = () => handles.slice(start).filter((item) => !item.cancelled && !item.completed);
  const rotation = () => active().find((item) => item.timer && item.options.duration >= 15000);
  const exit = () => active().find((item) => item.options.opacity === 0);
  const motionTo = (point: { x: number; y: number }) => active().find((item) => item.options.x === point.x && item.options.y === point.y);
  const reachDoor = () => {
    for (let step = 0; step < 3 && !exit(); step++) {
      const motion = motionTo(geometry.carpetEntry) ?? motionTo(geometry.door);
      assert.ok(motion, "expected a doorway walking segment");
      motion.finish();
    }
    assert.ok(exit(), "fade-out starts only at the door");
  };
  return { controller, ids, elements, register, active, rotation, exit, geometry, motionTo, reachDoor, visible: () => visible };
}

test("exit keeps old member until completion; entrance never exceeds capacity", () => {
  const f = fixture();
  const original = [...f.visible()];
  f.rotation()!.finish();
  assert.deepEqual(f.visible(), original);
  assert.equal(f.exit(), undefined);
  f.reachDoor();
  const departingPosition = f.elements.get(original[0])!.style.transform;
  const door = toScenePoint(f.geometry.door, f.geometry.bounds);
  assert.equal(departingPosition, `translate3d(${door.x}px, ${door.y}px, 0)`);
  f.exit()!.finish();
  assert.equal(f.visible().length, 15);
  assert.equal(new Set(f.visible()).size, 15);
  assert.equal(original.filter((id) => f.visible().includes(id)).length, 14);
  f.register();
  assert.equal(f.elements.get(f.visible().at(-1)!)!.style.transform, departingPosition);
  assert.equal(f.active().filter((item) => Array.isArray(item.options.opacity)).length, 1);
  assert.equal(f.rotation(), undefined);
  f.active().find((item) => Array.isArray(item.options.opacity))!.finish();
  const incoming = f.motionTo(f.geometry.carpetEntry)!;
  incoming.finish();
  f.active().find((item) => item.target === incoming.target && item.options.x !== undefined)?.finish();
  assert.ok(isInsideClubhousePolygon(incoming.target as { x: number; y: number }, f.geometry.walkPolygon));
  assert.ok(f.rotation(), "next rotation interval starts after arrival");
  f.controller.dispose();
  assert.equal(f.active().length, 0);
});

test("interaction during fade cancels eviction and retains protected member", () => {
  const f = fixture();
  const id = f.visible()[0];
  f.rotation()!.finish();
  f.reachDoor();
  const exit = f.exit()!;
  f.controller.protect(id, "focus", true);
  assert.equal(exit.cancelled, true);
  exit.finish();
  assert.ok(f.visible().includes(id));
  assert.equal(f.rotation(), undefined);
  f.controller.protect(id, "focus", false);
  f.motionTo(f.geometry.carpetEntry)!.finish();
  f.controller.protect(id, "focus", true);
  f.rotation()!.finish();
  f.reachDoor();
  f.exit()!.finish();
  assert.ok(f.visible().includes(id));
  f.controller.dispose();
});

test("clearing hover cannot override an open tooltip or hidden-tab pause", () => {
  const f = fixture(1);
  const id = f.visible()[0];
  f.controller.protect(id, "hover", true);
  f.controller.protect(id, "tooltip", true);
  f.controller.setEnvironment({ hidden: true });
  f.controller.protect(id, "hover", false);
  assert.ok(f.active().every((item) => item.paused));
  f.controller.setEnvironment({ hidden: false });
  assert.ok(f.active().every((item) => item.paused));
  f.controller.protect(id, "tooltip", false);
  assert.ok(f.active().some((item) => !item.paused));
  f.controller.dispose();
});

test("closing a tooltip preserves focus protection during manual rotation", () => {
  const f = fixture(20, 320, true);
  const id = f.visible()[0];
  f.controller.protect(id, "focus", true);
  f.controller.protect(id, "tooltip", true);
  f.controller.protect(id, "tooltip", false);
  f.controller.showOtherMembers();
  assert.ok(f.visible().includes(id));
  f.controller.protect(id, "focus", false);
  f.controller.showOtherMembers();
  assert.ok(!f.visible().includes(id));
  f.controller.dispose();
});

test("hidden and offscreen pauses stop transitions and resume with a fresh rotation timer", () => {
  const f = fixture();
  const firstTimer = f.rotation()!;
  f.controller.setEnvironment({ hidden: true });
  assert.ok(firstTimer.cancelled);
  firstTimer.finish();
  assert.equal(f.exit(), undefined);
  f.controller.setEnvironment({ offscreen: true, hidden: false });
  assert.equal(f.rotation(), undefined);
  f.controller.setEnvironment({ offscreen: false });
  assert.notEqual(f.rotation(), firstTimer);
  assert.ok(f.rotation()!.options.duration >= 15000);
  f.rotation()!.finish();
  f.reachDoor();
  const exit = f.exit()!;
  const before = [...f.visible()];
  f.controller.setEnvironment({ hidden: true });
  exit.finish();
  assert.deepEqual(f.visible(), before);
  f.controller.setEnvironment({ hidden: false });
  exit.finish();
  assert.notDeepEqual(f.visible(), before);
  f.controller.dispose();
});

test("reduced motion has no animation handles and supports fair manual replacement", () => {
  const f = fixture(20, 320, true);
  assert.equal(f.active().length, 0);
  const seen = new Set(f.visible());
  for (let i = 0; i < 5; i++) {
    f.controller.showOtherMembers();
    f.register();
    assert.equal(f.visible().length, 15);
    const incoming = f.visible().at(-1)!;
    assert.ok(!seen.has(incoming));
    seen.add(incoming);
    assert.equal(f.active().length, 0);
  }
  assert.equal(seen.size, 20);
  f.controller.dispose();
});

test("switching reduced motion on cancels active exit without losing its member", () => {
  const f = fixture();
  f.rotation()!.finish();
  const before = [...f.visible()];
  f.controller.setEnvironment({ reducedMotion: true });
  assert.deepEqual(f.visible(), before);
  assert.equal(f.active().length, 0);
  f.controller.setEnvironment({ reducedMotion: false });
  assert.ok(f.rotation());
  f.controller.dispose();
});

test("resize protects interacting actors; roster removals cancel only removed actors", () => {
  const f = fixture();
  const protectedIds = f.visible().slice(0, 8);
  for (const id of protectedIds) f.controller.protect(id, "tooltip", true);
  f.controller.resize(320);
  assert.equal(f.visible().length, 15);
  assert.ok(protectedIds.every((id) => f.visible().includes(id)));
  for (const id of protectedIds) f.controller.protect(id, "tooltip", false);
  assert.equal(f.visible().length, 15);
  f.controller.resize(800);
  assert.equal(f.visible().length, 15);
  const survivor = f.visible()[0];
  const oldPosition = f.elements.get(survivor)!.style.transform;
  f.controller.setRoster(f.ids.filter((id) => id !== f.visible()[1]));
  assert.equal(f.elements.get(survivor)!.style.transform, oldPosition);
  assert.equal(f.visible().length, 15);
  f.controller.dispose();
});

test("dispose cancels walking, bob, timers and exits; remount creates only one set", () => {
  const first = fixture();
  for (const idle of first.active().filter((item) => item.timer && item.options.duration < 15000)) idle.finish();
  assert.ok(first.active().some((item) => item.options.loop));
  first.rotation()!.finish();
  const oldHandles = first.active();
  first.controller.dispose();
  assert.ok(oldHandles.every((item) => item.cancelled));
  const before = [...first.visible()];
  for (const item of oldHandles) item.finish();
  assert.deepEqual(first.visible(), before);
  const second = fixture();
  assert.equal(second.active().filter((item) => item.timer).length, 16);
  second.controller.dispose();
  assert.equal(second.active().length, 0);
});

test("emptying the roster immediately cancels all handles", () => {
  const f = fixture();
  f.controller.setRoster([]);
  assert.deepEqual(f.visible(), []);
  assert.equal(f.active().length, 0);
  f.controller.dispose();
});

test("departure pauses mid-walk offscreen and retargets the door after resize", () => {
  const f = fixture();
  f.rotation()!.finish();
  const firstLeg = f.motionTo(f.geometry.carpetEntry)!;
  f.controller.setEnvironment({ offscreen: true });
  firstLeg.finish();
  assert.ok(!firstLeg.completed);
  f.controller.setEnvironment({ offscreen: false });
  firstLeg.finish();
  const oldDoorLeg = f.motionTo(f.geometry.door)!;
  f.controller.resize(320);
  assert.ok(oldDoorLeg.cancelled);
  const next = getClubhouseGeometry(320, CLUBHOUSE.narrowPortraitSize, CLUBHOUSE);
  f.motionTo(next.door)!.finish();
  assert.ok(f.exit());
  f.exit()!.finish();
  assert.equal(f.visible().length, 15);
  f.register();
  const incomingId = f.visible().at(-1)!;
  const door = toScenePoint(next.door, next.bounds);
  assert.equal(f.elements.get(incomingId)!.style.transform, `translate3d(${door.x}px, ${door.y}px, 0)`);
  f.controller.dispose();
  assert.equal(f.active().length, 0);
});

test("reduced motion during an entrance settles the member on the carpet without a journey", () => {
  const f = fixture();
  f.rotation()!.finish();
  f.reachDoor();
  f.exit()!.finish();
  f.register();
  const before = [...f.visible()];
  f.controller.setEnvironment({ reducedMotion: true });
  assert.deepEqual(f.visible(), before);
  assert.equal(f.active().length, 0);
  const point = f.elements.get(before.at(-1)!)!.style.transform.match(/translate3d\(([^p]+)px, ([^p]+)px/)!;
  const normalized = {
    x: (Number(point[1]) - f.geometry.bounds.left) / f.geometry.bounds.width,
    y: (Number(point[2]) - f.geometry.bounds.top) / f.geometry.bounds.height,
  };
  assert.ok(isInsideClubhousePolygon(normalized, f.geometry.walkPolygon));
  f.controller.dispose();
});

test("wandering paths remain inside the carpet, including between destinations", () => {
  const f = fixture(15);
  for (let cycle = 0; cycle < 20; cycle++) {
    for (const idle of f.active().filter((item) => item.timer)) idle.finish();
    for (const movement of f.active().filter((item) => item.options.x !== undefined)) {
      const start = movement.target as { x: number; y: number };
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        assert.ok(isInsideClubhousePolygon({
          x: start.x + (movement.options.x! - start.x) * t,
          y: start.y + (movement.options.y! - start.y) * t,
        }, f.geometry.walkPolygon));
      }
      movement.finish();
    }
  }
  f.controller.dispose();
});
