import type {
  ActionStartMode,
  AnimationAction,
  AnimationActionTiming,
  AnimationTrack,
  CameraFrame,
} from '@excalimate/project-schema';
import type { AnimatableTarget } from '../../types/excalidraw';
import { ASPECT_RATIOS } from '../../stores/projectStore';

export const SPEED_DURATION_MS = Object.freeze({
  fast: 300,
  normal: 500,
  slow: 800,
});

export type FriendlySpeed = keyof typeof SPEED_DURATION_MS;

export const START_MODE_LABELS: Record<ActionStartMode, string> = {
  afterPrevious: 'After previous',
  withPrevious: 'With previous',
  absolute: 'At time',
};

export const SEQUENCE_VIRTUALIZATION_THRESHOLD = 100;
export const SEQUENCE_ROW_HEIGHT = 240;
const VIRTUAL_OVERSCAN_ROWS = 4;

export interface ResolvedActionTiming {
  actionId: string;
  startMs: number;
  endMs: number;
  group: number;
}

export interface ActionSequenceRow {
  kind: 'action';
  id: string;
  action: AnimationAction;
  targetSummary: string;
  invalidTargetIds: readonly string[];
  resolved: ResolvedActionTiming;
  canonicalEasing: readonly string[];
  hasCanonicalTiming: boolean;
}

export interface CustomSequenceRow {
  kind: 'custom';
  id: string;
  track: AnimationTrack;
  targetSummary: string;
  invalidTargetIds: readonly string[];
  startMs: number;
  endMs: number;
}

export type SequenceRow = ActionSequenceRow | CustomSequenceRow;

export function getFriendlySpeed(durationMs: number): FriendlySpeed | 'custom' {
  const entry = Object.entries(SPEED_DURATION_MS).find(
    ([, value]) => value === durationMs,
  );
  return (entry?.[0] as FriendlySpeed | undefined) ?? 'custom';
}

export function shouldPreviewAction(
  reducedMotion: boolean,
  intent: 'hover' | 'focus' | 'explicit',
): boolean {
  return intent === 'explicit' || !reducedMotion;
}

export function formatFriendlyDuration(durationMs: number): string {
  const speed = getFriendlySpeed(durationMs);
  return speed === 'custom'
    ? `Custom (${durationMs} ms)`
    : `${speed[0]!.toUpperCase()}${speed.slice(1)} (${durationMs} ms)`;
}

export function resolveActionTimings(
  actions: readonly AnimationAction[],
): ResolvedActionTiming[] {
  let previousStart = 0;
  let previousEnd = 0;
  let group = 0;
  return actions.map((action, index) => {
    const startMs =
      action.timing.startMode === 'afterPrevious'
        ? previousEnd + action.timing.startMs
        : action.timing.startMode === 'withPrevious'
          ? previousStart + action.timing.startMs
          : action.timing.startMs;
    const endMs =
      startMs +
      action.timing.durationMs +
      Math.max(0, action.targetIds.length - 1) * action.timing.staggerMs;
    if (index > 0 && action.timing.startMode !== 'withPrevious') group += 1;
    previousStart = startMs;
    previousEnd = endMs;
    return { actionId: action.id, startMs, endMs, group };
  });
}

export function buildSequenceRows(
  actions: readonly AnimationAction[],
  tracks: readonly AnimationTrack[],
  targets: readonly AnimatableTarget[],
): SequenceRow[] {
  const targetLabels = new Map(targets.map((target) => [target.id, target.label]));
  const timings = new Map(
    resolveActionTimings(actions).map((timing) => [timing.actionId, timing]),
  );
  const ownedTrackIds = new Set(
    actions.flatMap((action) =>
      action.ownership.map((ownership) => ownership.trackId),
    ),
  );
  const tracksById = new Map(tracks.map((track) => [track.id, track]));
  const actionRows: ActionSequenceRow[] = actions.map((action) => {
    const invalidTargetIds = action.targetIds.filter(
      (targetId) =>
        targetId !== '__camera_frame__' && !targetLabels.has(targetId),
    );
    const ownedKeyframes = action.ownership.flatMap((ownership) => {
      const track = tracksById.get(ownership.trackId);
      if (!track) return [];
      const ownedIds = new Set(ownership.keyframeIds);
      return track.keyframes.filter((keyframe) => ownedIds.has(keyframe.id));
    });
    const canonicalTimes = ownedKeyframes.map((keyframe) => keyframe.time);
    const resolved = timings.get(action.id) ?? {
      actionId: action.id,
      startMs: action.timing.startMs,
      endMs: action.timing.startMs + action.timing.durationMs,
      group: 0,
    };
    return {
      kind: 'action',
      id: action.id,
      action,
      targetSummary: summarizeTargets(action.targetIds, targetLabels),
      invalidTargetIds,
      resolved:
        canonicalTimes.length > 0
          ? {
              ...resolved,
              startMs: Math.min(...canonicalTimes),
              endMs: Math.max(...canonicalTimes),
            }
          : resolved,
      canonicalEasing: [
        ...new Set(ownedKeyframes.map((keyframe) => keyframe.easing)),
      ],
      hasCanonicalTiming: canonicalTimes.length > 0,
    };
  });
  const customRows: CustomSequenceRow[] = tracks
    .filter((track) => !ownedTrackIds.has(track.id))
    .map((track) => {
      const times = track.keyframes.map((keyframe) => keyframe.time);
      const invalidTargetIds =
        track.targetId !== '__camera_frame__' && !targetLabels.has(track.targetId)
          ? [track.targetId]
          : [];
      return {
        kind: 'custom',
        id: `track:${track.id}`,
        track,
        targetSummary: summarizeTargets([track.targetId], targetLabels),
        invalidTargetIds,
        startMs: times.length > 0 ? Math.min(...times) : 0,
        endMs: times.length > 0 ? Math.max(...times) : 0,
      };
    });
  return [...actionRows, ...customRows];
}

function summarizeTargets(
  targetIds: readonly string[],
  targetLabels: ReadonlyMap<string, string>,
): string {
  if (targetIds.length === 1 && targetIds[0] === '__camera_frame__') {
    return 'Camera frame';
  }
  const labels = targetIds.map(
    (targetId) => targetLabels.get(targetId) ?? `Missing target`,
  );
  if (labels.length <= 2) return labels.join(', ');
  return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
}

export type ActionMove = 'up' | 'down' | 'top' | 'bottom';

export function moveActionId(
  orderedActionIds: readonly string[],
  actionId: string,
  move: ActionMove,
): string[] {
  const index = orderedActionIds.indexOf(actionId);
  if (index < 0) return [...orderedActionIds];
  const destination =
    move === 'top'
      ? 0
      : move === 'bottom'
        ? orderedActionIds.length - 1
        : move === 'up'
          ? Math.max(0, index - 1)
          : Math.min(orderedActionIds.length - 1, index + 1);
  return moveActionIdToIndex(orderedActionIds, actionId, destination);
}

export function moveActionIdToIndex(
  orderedActionIds: readonly string[],
  actionId: string,
  destination: number,
): string[] {
  const index = orderedActionIds.indexOf(actionId);
  if (index < 0 || destination < 0 || destination >= orderedActionIds.length) {
    return [...orderedActionIds];
  }
  const next = [...orderedActionIds];
  next.splice(index, 1);
  next.splice(destination, 0, actionId);
  return next;
}

export interface VirtualActionWindow {
  virtualized: boolean;
  start: number;
  end: number;
  paddingTop: number;
  paddingBottom: number;
}

export function getVirtualActionWindow(
  rowCount: number,
  scrollTop: number,
  viewportHeight: number,
): VirtualActionWindow {
  if (rowCount <= SEQUENCE_VIRTUALIZATION_THRESHOLD) {
    return {
      virtualized: false,
      start: 0,
      end: rowCount,
      paddingTop: 0,
      paddingBottom: 0,
    };
  }
  const visibleStart = Math.floor(scrollTop / SEQUENCE_ROW_HEIGHT);
  const visibleEnd = Math.ceil(
    (scrollTop + viewportHeight) / SEQUENCE_ROW_HEIGHT,
  );
  const start = Math.max(0, visibleStart - VIRTUAL_OVERSCAN_ROWS);
  const end = Math.min(rowCount, visibleEnd + VIRTUAL_OVERSCAN_ROWS);
  return {
    virtualized: true,
    start,
    end,
    paddingTop: start * SEQUENCE_ROW_HEIGHT,
    paddingBottom: (rowCount - end) * SEQUENCE_ROW_HEIGHT,
  };
}

export function mergeTiming(
  timing: AnimationActionTiming,
  update: Partial<AnimationActionTiming>,
): AnimationActionTiming {
  return { ...timing, ...update };
}

export function calculateCameraFit(
  targets: readonly AnimatableTarget[],
  cameraFrame: CameraFrame,
  padding = 60,
): { x: number; y: number; scale: number } | null {
  if (targets.length === 0) return null;
  const minX = Math.min(...targets.map((target) => target.originalBounds.x));
  const minY = Math.min(...targets.map((target) => target.originalBounds.y));
  const maxX = Math.max(
    ...targets.map(
      (target) => target.originalBounds.x + target.originalBounds.width,
    ),
  );
  const maxY = Math.max(
    ...targets.map(
      (target) => target.originalBounds.y + target.originalBounds.height,
    ),
  );
  const width = maxX - minX;
  const height = maxY - minY;
  const ratio = ASPECT_RATIOS[cameraFrame.aspectRatio];
  const fittedWidth = Math.max(width + padding * 2, (height + padding * 2) * ratio);
  return {
    x: (minX + maxX) / 2 - cameraFrame.x,
    y: (minY + maxY) / 2 - cameraFrame.y,
    scale: fittedWidth / cameraFrame.width,
  };
}
