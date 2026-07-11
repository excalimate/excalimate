import {
  CAMERA_FRAME_TARGET_ID,
  PROJECT_LIMITS,
  SceneStateSchema,
} from '@excalimate/project-schema';
import type {
  CameraFrame,
  SceneElementMapping,
  SceneState,
  SceneStateElement,
  SmartTransitionSettings,
  TransitionPropertyRecipe,
} from '@excalimate/project-schema';

const POSITION_EPSILON = 0.01;
const SCORE_EPSILON = 0.05;
const MIN_SUGGESTION_SCORE = 0.45;
const DEFAULT_CANDIDATE_LIMIT = 32;

export type SceneChangeType =
  | 'added'
  | 'removed'
  | 'moved'
  | 'resized'
  | 'rotated'
  | 'presence'
  | 'bound-group';

export interface SceneElementInput {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
  opacity?: number;
  isDeleted?: boolean;
  groupIds?: readonly string[];
  boundElements?: readonly { id: string }[] | null;
  containerId?: string | null;
  fileId?: string | null;
  text?: string;
}

export interface CaptureSceneStateInput {
  id: string;
  name: string;
  createdAt: string;
  elements: readonly SceneElementInput[];
  cameraFrame?: CameraFrame;
}

export interface SceneElementMatch {
  fromElementId: string;
  toElementId: string;
  method: 'stable-id' | 'explicit';
  confidence: 1;
}

export interface SceneMatchSuggestion {
  fromElementId: string;
  toElementId: string;
  confidence: number;
  ambiguous: boolean;
  reasons: readonly ('type' | 'label' | 'spatial' | 'group')[];
}

export interface SceneElementChange {
  fromElementId?: string;
  toElementId?: string;
  types: readonly SceneChangeType[];
}

export interface SceneDiffResult {
  matches: readonly SceneElementMatch[];
  suggestions: readonly SceneMatchSuggestion[];
  ambiguousFromElementIds: readonly string[];
  changes: readonly SceneElementChange[];
  addedElementIds: readonly string[];
  removedElementIds: readonly string[];
}

export interface DiffSceneStatesOptions {
  mappings?: readonly SceneElementMapping[];
  maxHeuristicCandidates?: number;
  shouldCancel?: () => boolean;
}

export interface SmartTransitionRecipeOptions {
  baselineElements?: readonly SceneElementInput[];
  baselineCameraFrame?: CameraFrame;
}

export class SceneDiffCancelledError extends Error {
  constructor() {
    super('Scene diff was cancelled');
    this.name = 'SceneDiffCancelledError';
  }
}

export function captureSceneStateSnapshot(input: CaptureSceneStateInput): SceneState {
  const elements = input.elements
    .map((element): SceneStateElement => {
      const opacity = finiteOr(element.opacity, 100);
      return {
        id: element.id,
        type: element.type,
        x: finiteOr(element.x, 0),
        y: finiteOr(element.y, 0),
        width: Math.max(0, finiteOr(element.width, 0)),
        height: Math.max(0, finiteOr(element.height, 0)),
        angle: finiteOr(element.angle, 0),
        opacity: clamp(opacity > 1 ? opacity / 100 : opacity, 0, 1),
        present: element.isDeleted !== true,
        groupIds: stableUnique(element.groupIds ?? []),
        boundElementIds: stableUnique((element.boundElements ?? []).map((bound) => bound.id)),
        ...(element.containerId ? { containerId: element.containerId } : {}),
        ...(element.fileId ? { fileId: element.fileId } : {}),
        ...(element.text?.trim()
          ? { label: element.text.trim().slice(0, PROJECT_LIMITS.maxNameLength) }
          : {}),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return SceneStateSchema.parse({
    id: input.id,
    name: input.name,
    createdAt: input.createdAt,
    elements,
    ...(input.cameraFrame ? { cameraFrame: { ...input.cameraFrame } } : {}),
  });
}

export function sceneStateFingerprint(state: SceneState): string {
  return JSON.stringify({
    id: state.id,
    elements: [...state.elements]
      .sort(compareElements)
      .map((element) => [
        element.id,
        element.type,
        element.x,
        element.y,
        element.width,
        element.height,
        element.angle,
        element.opacity,
        element.present,
        [...element.groupIds].sort(),
        [...element.boundElementIds].sort(),
        element.containerId ?? null,
        element.fileId ?? null,
        element.label ?? null,
      ]),
    cameraFrame: state.cameraFrame
      ? [
          state.cameraFrame.aspectRatio,
          state.cameraFrame.width,
          state.cameraFrame.x,
          state.cameraFrame.y,
        ]
      : null,
  });
}

export function diffSceneStates(
  fromState: SceneState,
  toState: SceneState,
  options: DiffSceneStatesOptions = {},
): SceneDiffResult {
  if (
    fromState.elements.length > PROJECT_LIMITS.maxSceneElements ||
    toState.elements.length > PROJECT_LIMITS.maxSceneElements
  ) {
    throw new Error(
      `Scene diff supports at most ${PROJECT_LIMITS.maxSceneElements} elements per state`,
    );
  }
  const mappings = options.mappings ?? [];
  if (mappings.length > PROJECT_LIMITS.maxSceneMappings) {
    throw new Error(`Scene diff supports at most ${PROJECT_LIMITS.maxSceneMappings} mappings`);
  }
  const candidateLimit = Math.max(
    1,
    Math.min(
      DEFAULT_CANDIDATE_LIMIT,
      Math.floor(options.maxHeuristicCandidates ?? DEFAULT_CANDIDATE_LIMIT),
    ),
  );
  const fromById = new Map(fromState.elements.map((element) => [element.id, element]));
  const toById = new Map(toState.elements.map((element) => [element.id, element]));
  const matchedFrom = new Set<string>();
  const matchedTo = new Set<string>();
  const matches: SceneElementMatch[] = [];

  for (const id of [...fromById.keys()].sort()) {
    if (!toById.has(id)) continue;
    matches.push({
      fromElementId: id,
      toElementId: id,
      method: 'stable-id',
      confidence: 1,
    });
    matchedFrom.add(id);
    matchedTo.add(id);
  }

  for (const mapping of [...mappings].sort(compareMappings)) {
    checkCancelled(options.shouldCancel);
    if (!fromById.has(mapping.fromElementId) || !toById.has(mapping.toElementId)) {
      throw new Error('Explicit mapping references a missing state element');
    }
    if (matchedFrom.has(mapping.fromElementId) || matchedTo.has(mapping.toElementId)) {
      if (mapping.fromElementId === mapping.toElementId) continue;
      throw new Error('Explicit mapping conflicts with an existing match');
    }
    matches.push({
      fromElementId: mapping.fromElementId,
      toElementId: mapping.toElementId,
      method: 'explicit',
      confidence: 1,
    });
    matchedFrom.add(mapping.fromElementId);
    matchedTo.add(mapping.toElementId);
  }

  const unmatchedFrom = [...fromById.values()]
    .filter((element) => !matchedFrom.has(element.id) && element.present)
    .sort(compareElements);
  const unmatchedTo = [...toById.values()]
    .filter((element) => !matchedTo.has(element.id) && element.present)
    .sort(compareElementsByPosition);
  const suggestions: SceneMatchSuggestion[] = [];
  const ambiguousFrom = new Set<string>();
  for (const [index, fromElement] of unmatchedFrom.entries()) {
    if (index % 128 === 0) checkCancelled(options.shouldCancel);
    const candidates = nearbyCandidates(fromElement, unmatchedTo, candidateLimit)
      .map((toElement) => scoreCandidate(fromElement, toElement))
      .sort(
        (left, right) =>
          right.confidence - left.confidence || left.toElementId.localeCompare(right.toElementId),
      );
    const best = candidates[0];
    if (!best || best.confidence < MIN_SUGGESTION_SCORE) continue;
    const second = candidates[1];
    const ambiguous = second !== undefined && best.confidence - second.confidence <= SCORE_EPSILON;
    if (ambiguous) ambiguousFrom.add(fromElement.id);
    suggestions.push({ ...best, ambiguous });
  }

  matches.sort(
    (left, right) =>
      left.fromElementId.localeCompare(right.fromElementId) ||
      left.toElementId.localeCompare(right.toElementId),
  );
  suggestions.sort(
    (left, right) =>
      left.fromElementId.localeCompare(right.fromElementId) ||
      left.toElementId.localeCompare(right.toElementId),
  );

  const changes: SceneElementChange[] = [];
  const addedElementIds: string[] = [];
  const removedElementIds: string[] = [];
  for (const match of matches) {
    const fromElement = fromById.get(match.fromElementId)!;
    const toElement = toById.get(match.toElementId)!;
    const types = detectChangeTypes(fromElement, toElement);
    if (types.length > 0) {
      changes.push({
        fromElementId: fromElement.id,
        toElementId: toElement.id,
        types,
      });
    }
    if (fromElement.present && !toElement.present) {
      removedElementIds.push(fromElement.id);
    } else if (!fromElement.present && toElement.present) {
      addedElementIds.push(toElement.id);
    }
  }
  for (const element of unmatchedFrom) {
    removedElementIds.push(element.id);
    changes.push({ fromElementId: element.id, types: ['removed'] });
  }
  for (const element of unmatchedTo.sort(compareElements)) {
    addedElementIds.push(element.id);
    changes.push({ toElementId: element.id, types: ['added'] });
  }
  changes.sort(compareChanges);

  return {
    matches,
    suggestions,
    ambiguousFromElementIds: [...ambiguousFrom].sort(),
    changes,
    addedElementIds: stableUnique(addedElementIds),
    removedElementIds: stableUnique(removedElementIds),
  };
}

export function createSmartTransitionRecipes(
  fromState: SceneState,
  toState: SceneState,
  diff: SceneDiffResult,
  settings: SmartTransitionSettings,
  options: SmartTransitionRecipeOptions = {},
): TransitionPropertyRecipe[] {
  const fromById = new Map(fromState.elements.map((element) => [element.id, element]));
  const toById = new Map(toState.elements.map((element) => [element.id, element]));
  const baselineById = new Map(
    (options.baselineElements ?? []).map((element) => [element.id, element]),
  );
  const recipes = new Map<string, Omit<TransitionPropertyRecipe, 'delayMs'>>();
  const addRecipe = (
    targetId: string,
    property: TransitionPropertyRecipe['property'],
    from: number,
    to: number,
    identity?: number,
  ) => {
    if (
      approximatelyEqual(from, to) &&
      (identity === undefined || approximatelyEqual(from, identity))
    ) {
      return;
    }
    recipes.set(`${targetId}:${property}`, { targetId, property, from, to });
  };
  const addSnapshotGeometry = (
    targetId: string,
    element: SceneStateElement,
    baseline: SceneElementInput | undefined,
  ) => {
    const baselineX = finiteOr(baseline?.x, element.x);
    const baselineY = finiteOr(baseline?.y, element.y);
    const baselineWidth = finiteOr(baseline?.width, element.width);
    const baselineHeight = finiteOr(baseline?.height, element.height);
    const baselineAngle = finiteOr(baseline?.angle, element.angle);
    addRecipe(targetId, 'translateX', element.x - baselineX, element.x - baselineX, 0);
    addRecipe(targetId, 'translateY', element.y - baselineY, element.y - baselineY, 0);
    addRecipe(
      targetId,
      'scaleX',
      relativeScale(element.width, baselineWidth),
      relativeScale(element.width, baselineWidth),
      1,
    );
    addRecipe(
      targetId,
      'scaleY',
      relativeScale(element.height, baselineHeight),
      relativeScale(element.height, baselineHeight),
      1,
    );
    const rotation = radiansToDegrees(element.angle - baselineAngle);
    addRecipe(targetId, 'rotation', rotation, rotation, 0);
  };

  for (const match of diff.matches) {
    const fromElement = fromById.get(match.fromElementId)!;
    const toElement = toById.get(match.toElementId)!;
    const baseline = baselineById.get(toElement.id);
    if (!fromElement.present && toElement.present) {
      addSnapshotGeometry(toElement.id, toElement, baseline);
      addRecipe(
        toElement.id,
        'opacity',
        0,
        relativeOpacity(toElement.opacity, baseline?.opacity ?? toElement.opacity),
      );
      continue;
    }
    if (fromElement.present && !toElement.present) {
      const removedBaseline = baselineById.get(fromElement.id);
      addSnapshotGeometry(fromElement.id, fromElement, removedBaseline);
      addRecipe(
        fromElement.id,
        'opacity',
        relativeOpacity(fromElement.opacity, removedBaseline?.opacity ?? fromElement.opacity),
        0,
      );
      continue;
    }
    if (!fromElement.present || !toElement.present) continue;
    const baselineX = finiteOr(baseline?.x, toElement.x);
    const baselineY = finiteOr(baseline?.y, toElement.y);
    const baselineWidth = finiteOr(baseline?.width, toElement.width);
    const baselineHeight = finiteOr(baseline?.height, toElement.height);
    const baselineAngle = finiteOr(baseline?.angle, toElement.angle);
    addRecipe(toElement.id, 'translateX', fromElement.x - baselineX, toElement.x - baselineX, 0);
    addRecipe(toElement.id, 'translateY', fromElement.y - baselineY, toElement.y - baselineY, 0);
    addRecipe(
      toElement.id,
      'scaleX',
      relativeScale(fromElement.width, baselineWidth),
      relativeScale(toElement.width, baselineWidth),
      1,
    );
    addRecipe(
      toElement.id,
      'scaleY',
      relativeScale(fromElement.height, baselineHeight),
      relativeScale(toElement.height, baselineHeight),
      1,
    );
    addRecipe(
      toElement.id,
      'rotation',
      radiansToDegrees(fromElement.angle - baselineAngle),
      radiansToDegrees(toElement.angle - baselineAngle),
      0,
    );
    addRecipe(
      toElement.id,
      'opacity',
      relativeOpacity(fromElement.opacity, baseline?.opacity ?? toElement.opacity),
      relativeOpacity(toElement.opacity, baseline?.opacity ?? toElement.opacity),
      1,
    );
  }
  for (const elementId of diff.addedElementIds) {
    const element = toById.get(elementId);
    if (element) {
      addSnapshotGeometry(elementId, element, baselineById.get(elementId));
      addRecipe(
        elementId,
        'opacity',
        0,
        relativeOpacity(element.opacity, baselineById.get(elementId)?.opacity ?? element.opacity),
      );
    }
  }
  for (const elementId of diff.removedElementIds) {
    const element = fromById.get(elementId);
    if (element) {
      addSnapshotGeometry(elementId, element, baselineById.get(elementId));
      addRecipe(
        elementId,
        'opacity',
        relativeOpacity(element.opacity, baselineById.get(elementId)?.opacity ?? element.opacity),
        0,
      );
    }
  }
  if (settings.includeCamera && fromState.cameraFrame && toState.cameraFrame) {
    addCameraRecipes(
      recipes,
      fromState.cameraFrame,
      toState.cameraFrame,
      options.baselineCameraFrame,
    );
  }

  const targetOrder = stableUnique([...recipes.values()].map((recipe) => recipe.targetId));
  const delayByTarget = new Map(
    targetOrder.map((targetId, index) => [targetId, index * settings.staggerMs]),
  );
  return [...recipes.values()]
    .sort(
      (left, right) =>
        left.targetId.localeCompare(right.targetId) || left.property.localeCompare(right.property),
    )
    .map((recipe) => ({
      ...recipe,
      delayMs: delayByTarget.get(recipe.targetId) ?? 0,
    }));
}

function addCameraRecipes(
  recipes: Map<string, Omit<TransitionPropertyRecipe, 'delayMs'>>,
  from: CameraFrame,
  to: CameraFrame,
  baseline = to,
): void {
  const add = (
    property: TransitionPropertyRecipe['property'],
    start: number,
    end: number,
    identity: number,
  ) => {
    if (!approximatelyEqual(start, end) || !approximatelyEqual(start, identity)) {
      recipes.set(`${CAMERA_FRAME_TARGET_ID}:${property}`, {
        targetId: CAMERA_FRAME_TARGET_ID,
        property,
        from: start,
        to: end,
      });
    }
  };
  add('translateX', from.x - baseline.x, to.x - baseline.x, 0);
  add('translateY', from.y - baseline.y, to.y - baseline.y, 0);
  add(
    'scaleX',
    relativeScale(from.width, baseline.width),
    relativeScale(to.width, baseline.width),
    1,
  );
  add(
    'scaleY',
    relativeScale(from.width, baseline.width),
    relativeScale(to.width, baseline.width),
    1,
  );
}

function detectChangeTypes(from: SceneStateElement, to: SceneStateElement): SceneChangeType[] {
  const types: SceneChangeType[] = [];
  if (from.present !== to.present) {
    types.push('presence', to.present ? 'added' : 'removed');
  }
  if (from.present && to.present) {
    if (!approximatelyEqual(from.x, to.x) || !approximatelyEqual(from.y, to.y)) {
      types.push('moved');
    }
    if (!approximatelyEqual(from.width, to.width) || !approximatelyEqual(from.height, to.height)) {
      types.push('resized');
    }
    if (!approximatelyEqual(from.angle, to.angle)) types.push('rotated');
  }
  if (
    from.containerId !== to.containerId ||
    !sameStrings(from.groupIds, to.groupIds) ||
    !sameStrings(from.boundElementIds, to.boundElementIds)
  ) {
    types.push('bound-group');
  }
  return types;
}

function nearbyCandidates(
  source: SceneStateElement,
  targets: readonly SceneStateElement[],
  limit: number,
): SceneStateElement[] {
  if (targets.length <= limit) return [...targets];
  let low = 0;
  let high = targets.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (targets[middle]!.x < source.x) low = middle + 1;
    else high = middle;
  }
  const start = Math.max(0, Math.min(targets.length - limit, low - limit / 2));
  return targets.slice(start, start + limit);
}

function scoreCandidate(
  from: SceneStateElement,
  to: SceneStateElement,
): Omit<SceneMatchSuggestion, 'ambiguous'> {
  let confidence = 0;
  const reasons: Array<'type' | 'label' | 'spatial' | 'group'> = [];
  if (from.type === to.type) {
    confidence += 0.5;
    reasons.push('type');
  }
  if (from.label && to.label && normalizeLabel(from.label) === normalizeLabel(to.label)) {
    confidence += 0.25;
    reasons.push('label');
  }
  if (from.containerId === to.containerId && sameStrings(from.groupIds, to.groupIds)) {
    confidence += 0.05;
    reasons.push('group');
  }
  const distance = Math.hypot(
    from.x + from.width / 2 - (to.x + to.width / 2),
    from.y + from.height / 2 - (to.y + to.height / 2),
  );
  const diagonal = Math.max(
    1,
    Math.hypot(Math.max(from.width, to.width), Math.max(from.height, to.height)),
  );
  confidence += 0.2 / (1 + distance / diagonal);
  reasons.push('spatial');
  return {
    fromElementId: from.id,
    toElementId: to.id,
    confidence: Math.round(confidence * 1_000) / 1_000,
    reasons,
  };
}

function compareElements(left: SceneStateElement, right: SceneStateElement): number {
  return left.id.localeCompare(right.id);
}

function compareElementsByPosition(left: SceneStateElement, right: SceneStateElement): number {
  return left.x - right.x || left.y - right.y || left.id.localeCompare(right.id);
}

function compareMappings(left: SceneElementMapping, right: SceneElementMapping): number {
  return (
    left.fromElementId.localeCompare(right.fromElementId) ||
    left.toElementId.localeCompare(right.toElementId)
  );
}

function compareChanges(left: SceneElementChange, right: SceneElementChange): number {
  const leftId = left.fromElementId ?? left.toElementId ?? '';
  const rightId = right.fromElementId ?? right.toElementId ?? '';
  return leftId.localeCompare(rightId);
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function relativeScale(value: number, baseline: number): number {
  return baseline <= POSITION_EPSILON ? value : value / baseline;
}

function relativeOpacity(value: number, baselineOpacity: number | undefined): number {
  const normalizedBaseline = normalizeOpacity(baselineOpacity);
  return normalizedBaseline <= POSITION_EPSILON ? value : value / normalizedBaseline;
}

function normalizeOpacity(value: number | undefined): number {
  const opacity = finiteOr(value, 100);
  return clamp(opacity > 1 ? opacity / 100 : opacity, 0, 1);
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= POSITION_EPSILON;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function checkCancelled(shouldCancel?: () => boolean): void {
  if (shouldCancel?.()) throw new SceneDiffCancelledError();
}
