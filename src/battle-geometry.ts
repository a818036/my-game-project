import type { BattleObserverPosition, BattleSceneManifest, BattleSceneObject, BattleCoordinate, WarUnit } from './phase4';

export type VisibilityReason = 'beyond-range' | 'occluded';
export interface VisibilityResult {
  targetId: string;
  targetLabel: string;
  distance: number;
  visible: boolean;
  reason?: VisibilityReason;
  blockedBy?: string;
}

const z = (point: BattleCoordinate) => point.z ?? 0;
const distanceBetween = (a: BattleCoordinate, b: BattleCoordinate) => Math.hypot(a.x - b.x, a.y - b.y, z(a) - z(b));

function segmentDistance(point: BattleCoordinate, start: BattleCoordinate, end: BattleCoordinate) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = z(end) - z(start);
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared === 0) return distanceBetween(point, start);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy + (z(point) - z(start)) * dz) / lengthSquared));
  return distanceBetween(point, { x: start.x + projection * dx, y: start.y + projection * dy, z: z(start) + projection * dz });
}

function blocksSight(observer: BattleCoordinate, target: BattleCoordinate, blocker: BattleSceneObject) {
  if (!blocker.position || !blocker.radius || blocker.radius <= 0) return false;
  // A blocker only occludes the interior of the sight segment. Its own center is not the target.
  const dx = target.x - observer.x, dy = target.y - observer.y, dz = z(target) - z(observer);
  const projection = ((blocker.position.x - observer.x) * dx + (blocker.position.y - observer.y) * dy + (z(blocker.position) - z(observer)) * dz) /
    Math.max(Number.EPSILON, dx ** 2 + dy ** 2 + dz ** 2);
  return projection > 0.001 && projection < 0.999 && segmentDistance(blocker.position, observer, target) <= blocker.radius;
}

/** 3D straight-line sight estimate. Legacy 2D coordinates are treated as elevation 0. */
export function computeBattleVisibility(
  scene: BattleSceneManifest,
  observer: BattleObserverPosition,
  units: WarUnit[],
): VisibilityResult[] | null {
  if (!observer.position || observer.sightRange === undefined) return null;
  const targets = [
    ...scene.objects.filter((object) => object.position).map((object) => ({ id: `object:${object.id}`, label: object.label, position: object.position! })),
    ...units.filter((unit) => unit.position).map((unit) => ({ id: `unit:${unit.id}`, label: `${unit.commanderName}率領的部隊`, position: unit.position! })),
  ];
  return targets.map((target) => {
    const distance = distanceBetween(observer.position!, target.position);
    if (distance > observer.sightRange!) return { targetId: target.id, targetLabel: target.label, distance: Number(distance.toFixed(2)), visible: false, reason: 'beyond-range' };
    const blocker = scene.objects.find((object) => object.id !== target.id.replace(/^object:/, '') && object.destroyed !== true && object.blocksLineOfSight === true && blocksSight(observer.position!, target.position, object));
    if (blocker) return { targetId: target.id, targetLabel: target.label, distance: Number(distance.toFixed(2)), visible: false, reason: 'occluded', blockedBy: blocker.label };
    return { targetId: target.id, targetLabel: target.label, distance: Number(distance.toFixed(2)), visible: true };
  });
}
