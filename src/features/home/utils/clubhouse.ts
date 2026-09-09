import { CLUBHOUSE_HATS, type ClubhouseHat } from "./clubhouseHats.ts";
import type { ClubhouseBounds, ClubhouseGeometry, ClubhousePoint, ClubhouseQueue } from "../types.ts";
import { CLUBHOUSE } from "../constants.ts";

export function getClubhouseHatCorners(size: number, hat: ClubhouseHat): ClubhousePoint[] {
  const width = size * hat.width;
  const height = width * hat.aspectRatio;
  const anchor = { x: width * hat.origin.x, y: height * hat.origin.y };
  const angle = hat.rotation * Math.PI / 180;
  return [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => ({
    x: size * hat.left + anchor.x + (x - anchor.x) * Math.cos(angle) - (y - anchor.y) * Math.sin(angle),
    y: size * hat.top + anchor.y + (x - anchor.x) * Math.sin(angle) + (y - anchor.y) * Math.cos(angle),
  }));
}

export function getClubhouseFootprint(size: number, config: typeof CLUBHOUSE, hat?: ClubhouseHat) {
  const corners = (hat ? [hat] : CLUBHOUSE_HATS).flatMap((option) => getClubhouseHatCorners(size, option));
  return {
    left: Math.min(0, (size - config.nameWidth) / 2, ...corners.map((point) => point.x)),
    right: Math.max(size, (size + config.nameWidth) / 2, ...corners.map((point) => point.x)),
    top: Math.min(0, ...corners.map((point) => point.y)) - config.bobPx,
    bottom: Math.max(size + config.nameBottom, ...corners.map((point) => point.y)),
  };
}

export function getClubhouseBounds(width: number, height: number, size: number, config: typeof CLUBHOUSE): ClubhouseBounds {
  const footprint = getClubhouseFootprint(size, config);
  const left = width * config.region.left + config.edgeClearance - footprint.left;
  const top = height * config.region.top + config.edgeClearance - footprint.top;
  return {
    left,
    top,
    width: Math.max(0, width * config.region.right - config.edgeClearance - footprint.right - left),
    height: Math.max(0, height * config.region.bottom - config.edgeClearance - footprint.bottom - top),
  };
}

export function isInsideClubhousePolygon(point: ClubhousePoint, polygon: readonly ClubhousePoint[]): boolean {
  return polygon.length >= 3 && polygon.every((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -1e-8;
  });
}

export function clampClubhousePoint(point: ClubhousePoint, polygon: readonly ClubhousePoint[]): ClubhousePoint {
  if (!polygon.length || isInsideClubhousePolygon(point, polygon)) return { ...point };
  let closest = polygon[0];
  let distance = Infinity;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
    const candidate = { x: a.x + dx * t, y: a.y + dy * t };
    const nextDistance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (nextDistance < distance) { closest = candidate; distance = nextDistance; }
  });
  return { ...closest };
}

export function getClubhouseGeometry(width: number, size: number, config: typeof CLUBHOUSE, sceneHeight?: number): ClubhouseGeometry {
  const height = sceneHeight || Math.max(width < config.narrowWidth ? config.narrowSceneHeight : config.sceneHeight, width * config.artwork.height / config.artwork.width);
  const bounds = getClubhouseBounds(width, height, size, config);
  const scale = Math.max(width / config.artwork.width, height / config.artwork.height);
  const imageWidth = config.artwork.width * scale;
  const imageHeight = config.artwork.height * scale;
  const artworkPoint = (point: ClubhousePoint) => ({ x: point.x * imageWidth, y: height - imageHeight + point.y * imageHeight });
  const normalize = (point: ClubhousePoint) => ({ x: (point.x - bounds.left) / (bounds.width || 1), y: (point.y - bounds.top) / (bounds.height || 1) });
  const groundPoint = (point: ClubhousePoint) => {
    const pixel = artworkPoint(point);
    return normalize({ x: pixel.x - size / 2, y: pixel.y - size - 2 });
  };
  const carpet = config.carpet.map(artworkPoint);
  let polygon = [
    { x: bounds.left, y: bounds.top }, { x: bounds.left + bounds.width, y: bounds.top },
    { x: bounds.left + bounds.width, y: bounds.top + bounds.height }, { x: bounds.left, y: bounds.top + bounds.height },
  ];
  // Erode the carpet by the ground shadow, then clip to the full artwork-safe scene bounds.
  const shadow = [
    { x: size * 0.1 - 3, y: size - 7 }, { x: size * 0.9 + 3, y: size - 7 },
    { x: size * 0.9 + 3, y: size + 11 }, { x: size * 0.1 - 3, y: size + 11 },
  ];
  carpet.forEach((a, i) => {
    const b = carpet[(i + 1) % carpet.length];
    const cross = (point: ClubhousePoint) => (b.x - a.x) * point.y - (b.y - a.y) * point.x;
    const offset = Math.min(...shadow.map(cross));
    const signed = (point: ClubhousePoint) => cross({ x: point.x - a.x, y: point.y - a.y }) + offset;
    const clipped: ClubhousePoint[] = [];
    polygon.forEach((point, j) => {
      const next = polygon[(j + 1) % polygon.length];
      const start = signed(point);
      const end = signed(next);
      if (start >= 0) clipped.push(point);
      if ((start >= 0) !== (end >= 0)) {
        const t = start / (start - end);
        clipped.push({ x: point.x + (next.x - point.x) * t, y: point.y + (next.y - point.y) * t });
      }
    });
    polygon = clipped;
  });
  const walkPolygon = polygon.map(normalize);
  const door = groundPoint(config.door);
  return {
    height, bounds, carpet, walkPolygon,
    door: { x: Math.max(0, Math.min(1, door.x)), y: Math.max(0, Math.min(1, door.y)) },
    carpetEntry: clampClubhousePoint(groundPoint(config.carpetEntry), walkPolygon),
  };
}

export function shuffleMembers(ids: readonly string[], random = Math.random): string[] {
  const result = [...new Set(ids)];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function reconcileClubhouse(
  queue: ClubhouseQueue,
  roster: readonly string[],
  limit: number,
  protectedIds: ReadonlySet<string>,
  random = Math.random,
): ClubhouseQueue {
  const ids = new Set(roster);
  const known = new Set([...queue.visible, ...queue.waiting]);
  const visible = [...new Set(queue.visible)].filter((id) => ids.has(id));
  const waiting = [...new Set([
    ...shuffleMembers(roster.filter((id) => !known.has(id)), random),
    ...queue.waiting,
  ])].filter((id) => ids.has(id) && !visible.includes(id));
  const target = Math.max(0, Math.min(CLUBHOUSE.maxVisible, limit));
  for (let i = visible.length - 1; i >= 0 && visible.length > target; i--) {
    if (!protectedIds.has(visible[i])) waiting.push(...visible.splice(i, 1));
  }
  while (visible.length < target && waiting.length) visible.push(waiting.shift()!);
  return { visible, waiting };
}

export function replacementCandidate(queue: ClubhouseQueue, protectedIds: ReadonlySet<string>) {
  return queue.waiting.length ? queue.visible.find((id) => !protectedIds.has(id)) : undefined;
}

export function replaceClubhouseMember(queue: ClubhouseQueue, outgoing: string): ClubhouseQueue {
  if (!queue.waiting.length || !queue.visible.includes(outgoing)) return queue;
  return {
    visible: [...queue.visible.filter((id) => id !== outgoing), queue.waiting[0]],
    waiting: [...queue.waiting.slice(1), outgoing],
  };
}

export function toScenePoint(point: ClubhousePoint, bounds: ClubhouseBounds): ClubhousePoint {
  return {
    x: bounds.left + Math.max(0, Math.min(1, point.x)) * bounds.width,
    y: bounds.top + Math.max(0, Math.min(1, point.y)) * bounds.height,
  };
}

export function chooseClubhousePoint(
  occupied: readonly ClubhousePoint[],
  bounds: ClubhouseBounds,
  samples: number,
  spacing: { width: number; height: number },
  random = Math.random,
  polygon: readonly ClubhousePoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
): ClubhousePoint {
  let best = polygon.length ? {
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
  } : { x: 0.5, y: 0.5 };
  const left = Math.min(...polygon.map((point) => point.x));
  const top = Math.min(...polygon.map((point) => point.y));
  const width = Math.max(...polygon.map((point) => point.x)) - left;
  const height = Math.max(...polygon.map((point) => point.y)) - top;
  let bestDistance = -1;
  for (let i = 0; i < samples; i++) {
    const candidate = { x: left + random() * width, y: top + random() * height };
    if (!isInsideClubhousePolygon(candidate, polygon)) continue;
    const distance = Math.min(...occupied.map((point) => Math.max(
      Math.abs(point.x - candidate.x) * bounds.width / spacing.width,
      Math.abs(point.y - candidate.y) * bounds.height / spacing.height,
    )));
    if (distance > bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function clubhouseTravelMs(from: ClubhousePoint, to: ClubhousePoint, bounds: ClubhouseBounds, speed: number) {
  return Math.hypot((to.x - from.x) * bounds.width, (to.y - from.y) * bounds.height) / speed * 1000;
}
