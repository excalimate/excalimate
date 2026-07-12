import { composeStates, createDefaultState } from '@excalimate/animation-core';
import type { ElementAnimationState, FrameState } from '@excalimate/animation-core';
import { parsePlayerPackage, sanitizeSvg } from '@excalimate/player-runtime';
import type { PlayerPackageV1 } from '@excalimate/player-runtime';
import { CAMERA_FRAME_TARGET_ID } from '@excalimate/project-schema';
import { sampleEasingProgresses } from './easingSamples.js';
import { createFrameSampler } from './sampler.js';
import { ANIMATED_SVG_LIMITS } from './resources.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const GEOMETRY_SELECTOR = 'path,line,polyline,polygon,circle,ellipse,rect';
export type AnimatedSvgCapabilityProfile = 'css-keyframes' | 'smil';

export interface AnimatedSvgCompileOptions {
  profile?: AnimatedSvgCapabilityProfile;
  theme?: 'light' | 'dark';
  adaptiveTolerance?: number;
  maxAdaptiveSamplesPerSegment?: number;
}

export interface AnimatedSvgCompileResult {
  svg: string;
  profile: AnimatedSvgCapabilityProfile;
  sourceKeyframeCount: number;
  emittedKeyframeCount: number;
  adaptiveSampleCount: number;
  posterTimeMs: number;
}

interface TargetMetadata {
  id: string;
  element: SVGGraphicsElement;
  origin: readonly [number, number] | null;
  center: readonly [number, number] | null;
  boundTo: string | null;
  startBoundTo: string | null;
  endBoundTo: string | null;
  bindingPoints: readonly [number, number, number, number] | null;
  drawAnimated: boolean;
}

interface TimelineSample {
  timeMs: number;
  percentage: number;
  frame: FrameState;
  adaptive: boolean;
}

export function compileAnimatedSvg(
  input: PlayerPackageV1,
  options: AnimatedSvgCompileOptions = {},
): AnimatedSvgCompileResult {
  const playerPackage = parsePlayerPackage(input);
  const sanitized = sanitizeSvg(playerPackage.scene.svg);
  const document = new DOMParser().parseFromString(sanitized.svg, 'image/svg+xml');
  const root = document.documentElement;
  if (!(root instanceof SVGSVGElement)) {
    throw new Error('Animated SVG source did not produce an SVG root');
  }

  const profile = options.profile ?? 'css-keyframes';
  const tolerance = clamp(options.adaptiveTolerance ?? 0.0025, 0.0001, 0.05);
  const maxSamples = Math.round(clamp(options.maxAdaptiveSamplesPerSegment ?? 24, 2, 64));
  const sampler = createFrameSampler({
    timeline: playerPackage.animation.timeline,
    hierarchy: playerPackage.animation.hierarchy,
    clipStart: playerPackage.playback.clipStart,
    clipEnd: playerPackage.playback.clipEnd,
    fps: 1,
  });
  const samplePlan = buildSamplePlan(playerPackage, sampler.sampleAt, tolerance, maxSamples);
  if (samplePlan.samples.length > ANIMATED_SVG_LIMITS.maxSamples) {
    throw new Error('Animated SVG exceeds the sample budget');
  }
  const targets = collectTargets(root, playerPackage);
  const posterFrame = sampler.sampleAt(playerPackage.poster.timeMs);
  const affectedTargetIds = collectAffectedTargetIds(playerPackage, targets);
  const animatedTargets = targets.filter((target) => affectedTargetIds.has(target.id));
  const emittedKeyframeCount =
    samplePlan.samples.length *
    animatedTargets.reduce((total, target) => total + 2 + (target.drawAnimated ? 1 : 0), 1);
  if (emittedKeyframeCount > ANIMATED_SVG_LIMITS.maxDeclarations) {
    throw new Error('Animated SVG exceeds the declaration budget');
  }

  const posterCameraMatrix = cameraMatrix(playerPackage, posterFrame, posterFrame);
  const scene = root.querySelector<SVGGraphicsElement>('[data-excalimate-scene="true"]');
  if (!scene) throw new Error('Animated SVG scene wrapper is missing');
  scene.setAttribute('transform', matrixValue(posterCameraMatrix));

  const posterRect = cameraRect(playerPackage, posterFrame);
  root.setAttribute(
    'viewBox',
    `${posterRect.left} ${posterRect.top} ${posterRect.width} ${posterRect.height}`,
  );
  root.setAttribute('width', String(playerPackage.dimensions.width));
  root.setAttribute('height', String(playerPackage.dimensions.height));
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const background = document.createElementNS(SVG_NAMESPACE, 'rect');
  background.setAttribute('x', formatNumber(posterRect.left));
  background.setAttribute('y', formatNumber(posterRect.top));
  background.setAttribute('width', formatNumber(posterRect.width));
  background.setAttribute('height', formatNumber(posterRect.height));
  background.setAttribute('fill', options.theme === 'dark' ? '#121212' : '#ffffff');
  background.setAttribute('data-excalimate-poster-background', 'true');
  root.insertBefore(background, scene);

  for (const target of animatedTargets) {
    applyPosterState(target, posterFrame);
  }

  if (profile === 'css-keyframes') {
    emitCssAnimation(
      document,
      root,
      scene,
      playerPackage,
      samplePlan.samples,
      animatedTargets,
      posterFrame,
    );
  } else {
    emitSmilAnimation(
      document,
      scene,
      playerPackage,
      samplePlan.samples,
      animatedTargets,
      posterFrame,
    );
  }
  assertSafeAnimatedSvg(root);
  const svg = new XMLSerializer().serializeToString(root);
  if (new TextEncoder().encode(svg).byteLength > ANIMATED_SVG_LIMITS.maxOutputBytes) {
    throw new Error('Animated SVG exceeds the serialized output budget');
  }
  return {
    svg,
    profile,
    sourceKeyframeCount: playerPackage.animation.timeline.tracks.reduce(
      (total, track) => total + (track.enabled ? track.keyframes.length : 0),
      0,
    ),
    emittedKeyframeCount,
    adaptiveSampleCount: samplePlan.adaptiveSampleCount,
    posterTimeMs: playerPackage.poster.timeMs,
  };
}

export function estimateLegacySampledSvgKeyframes(
  playerPackage: PlayerPackageV1,
  fps: number,
): number {
  const animatedTargetCount = new Set(
    playerPackage.animation.timeline.tracks
      .filter((track) => track.enabled && track.targetId !== CAMERA_FRAME_TARGET_ID)
      .map((track) => track.targetId),
  ).size;
  const durationMs = playerPackage.playback.clipEnd - playerPackage.playback.clipStart;
  const samples = Math.ceil((durationMs / 1000) * fps) + 1;
  return animatedTargetCount * samples;
}

function buildSamplePlan(
  playerPackage: PlayerPackageV1,
  sampleAt: (timeMs: number) => FrameState,
  tolerance: number,
  maxSamples: number,
): { samples: TimelineSample[]; adaptiveSampleCount: number } {
  const clipStart = playerPackage.playback.clipStart;
  const clipEnd = playerPackage.playback.clipEnd;
  const times = new Map<number, { adaptive: boolean }>();
  times.set(clipStart, { adaptive: false });
  times.set(clipEnd, { adaptive: false });
  let adaptiveSampleCount = 0;

  for (const track of playerPackage.animation.timeline.tracks) {
    if (!track.enabled) continue;
    const keyframes = [...track.keyframes].sort((left, right) => left.time - right.time);
    for (const keyframe of keyframes) {
      if (keyframe.time >= clipStart && keyframe.time <= clipEnd) {
        const current = times.get(keyframe.time);
        times.set(keyframe.time, { adaptive: current?.adaptive ?? false });
      }
    }
    for (let index = 0; index < keyframes.length - 1; index += 1) {
      const start = keyframes[index];
      const end = keyframes[index + 1];
      if (!start || !end || end.time <= clipStart || start.time >= clipEnd) {
        continue;
      }
      if (start.easing === 'step') {
        const beforeEnd = Math.max(start.time, end.time - 0.001);
        if (beforeEnd >= clipStart && beforeEnd <= clipEnd) {
          if (!times.has(beforeEnd)) adaptiveSampleCount += 1;
          times.set(beforeEnd, { adaptive: true });
        }
        continue;
      }
      if (start.easing === 'linear') continue;
      const progresses = sampleEasingProgresses(start.easing, tolerance, maxSamples);
      for (const progress of progresses) {
        if (progress <= 0 || progress >= 1) continue;
        const time = start.time + (end.time - start.time) * progress;
        if (time < clipStart || time > clipEnd) continue;
        const normalizedTime = roundTime(time);
        if (!times.has(normalizedTime)) adaptiveSampleCount += 1;
        times.set(normalizedTime, { adaptive: true });
      }
    }
  }

  const duration = clipEnd - clipStart;
  const samples = [...times.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timeMs, metadata]) => ({
      timeMs,
      percentage: ((timeMs - clipStart) / duration) * 100,
      frame: sampleAt(timeMs),
      adaptive: metadata.adaptive,
    }));
  return { samples, adaptiveSampleCount };
}

function collectTargets(root: SVGSVGElement, playerPackage: PlayerPackageV1): TargetMetadata[] {
  const drawTargets = new Set(
    playerPackage.animation.timeline.tracks
      .filter(
        (track) => track.enabled && track.property === 'drawProgress' && track.keyframes.length > 0,
      )
      .map((track) => track.targetId),
  );
  return Array.from(root.querySelectorAll<SVGGraphicsElement>('[data-excalimate-id]')).map(
    (element) => {
      const id = element.getAttribute('data-excalimate-id');
      if (!id) throw new Error('Animated SVG target marker is empty');
      return {
        id,
        element,
        origin: parsePoint(element.getAttribute('data-excalimate-origin')),
        center: parsePoint(element.getAttribute('data-excalimate-center')),
        boundTo: element.getAttribute('data-excalimate-bound-to'),
        startBoundTo: element.getAttribute('data-excalimate-start-bound-to'),
        endBoundTo: element.getAttribute('data-excalimate-end-bound-to'),
        bindingPoints: parseBindingPoints(element.getAttribute('data-excalimate-binding-points')),
        drawAnimated: drawTargets.has(id),
      };
    },
  );
}

function collectAffectedTargetIds(
  playerPackage: PlayerPackageV1,
  targets: readonly TargetMetadata[],
): Set<string> {
  const affected = new Set<string>();
  const hierarchy = playerPackage.animation.hierarchy;
  const addGroupMembers = (groupId: string): void => {
    for (const memberId of hierarchy[groupId] ?? []) {
      if (memberId in hierarchy) addGroupMembers(memberId);
      else affected.add(memberId);
    }
  };
  for (const track of playerPackage.animation.timeline.tracks) {
    if (!track.enabled || track.keyframes.length === 0) continue;
    if (track.targetId === CAMERA_FRAME_TARGET_ID) continue;
    if (track.targetType === 'group') addGroupMembers(track.targetId);
    else affected.add(track.targetId);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const target of targets) {
      if (target.boundTo && affected.has(target.boundTo) && !affected.has(target.id)) {
        affected.add(target.id);
        changed = true;
      }
      if (
        (target.startBoundTo && affected.has(target.startBoundTo)) ||
        (target.endBoundTo && affected.has(target.endBoundTo))
      ) {
        if (!affected.has(target.id)) {
          affected.add(target.id);
          changed = true;
        }
      }
    }
  }
  return affected;
}

function emitCssAnimation(
  document: Document,
  root: SVGSVGElement,
  scene: SVGGraphicsElement,
  playerPackage: PlayerPackageV1,
  samples: readonly TimelineSample[],
  targets: readonly TargetMetadata[],
  posterFrame: FrameState,
): void {
  const durationMs = playerPackage.playback.clipEnd - playerPackage.playback.clipStart;
  const css: string[] = [];
  targets.forEach((target, index) => {
    const targetId = `xmt-target-${index}`;
    target.element.setAttribute('id', targetId);
    const transformName = `xmt-transform-${index}`;
    const opacityName = `xmt-opacity-${index}`;
    css.push(`@keyframes ${transformName}{`);
    for (const sample of samples) {
      const state = resolveTargetState(sample.frame, target);
      css.push(
        `${percentage(sample.percentage)}{transform:${matrixValue(
          targetMatrix(state, target, sample.frame),
        )};${sample.percentage < 100 ? 'animation-timing-function:linear;' : ''}}`,
      );
    }
    css.push(`}@keyframes ${opacityName}{`);
    for (const sample of samples) {
      const state = resolveTargetState(sample.frame, target);
      css.push(
        `${percentage(sample.percentage)}{opacity:${formatNumber(state.opacity)};${
          sample.percentage < 100 ? 'animation-timing-function:linear;' : ''
        }}`,
      );
    }
    css.push(
      `}#${targetId}{animation:${transformName} ${formatNumber(
        durationMs,
      )}ms linear both,${opacityName} ${formatNumber(durationMs)}ms linear both;}`,
    );
    if (target.drawAnimated) {
      const drawName = `xmt-draw-${index}`;
      css.push(`@keyframes ${drawName}{`);
      for (const sample of samples) {
        const state = resolveTargetState(sample.frame, target);
        css.push(
          `${percentage(sample.percentage)}{stroke-dashoffset:${formatNumber(
            1 - clamp(state.drawProgress, 0, 1),
          )};${sample.percentage < 100 ? 'animation-timing-function:linear;' : ''}}`,
        );
      }
      css.push(
        `}#${targetId} :is(${GEOMETRY_SELECTOR.split(',').join(
          ',',
        )}){stroke-dasharray:1;animation:${drawName} ${formatNumber(durationMs)}ms linear both;}`,
      );
      setGeometryPoster(target, resolveTargetState(posterFrame, target));
    }
  });

  const sceneId = 'xmt-camera-scene';
  const cameraName = 'xmt-camera';
  scene.setAttribute('id', sceneId);
  css.push(`@keyframes ${cameraName}{`);
  for (const sample of samples) {
    css.push(
      `${percentage(sample.percentage)}{transform:${matrixValue(
        cameraMatrix(playerPackage, posterFrame, sample.frame),
      )};${sample.percentage < 100 ? 'animation-timing-function:linear;' : ''}}`,
    );
  }
  css.push(`}#${sceneId}{animation:${cameraName} ${formatNumber(durationMs)}ms linear both;}`);
  css.push(
    `@media (prefers-reduced-motion:reduce){#${sceneId},[id^="xmt-target-"],[id^="xmt-target-"] :is(${GEOMETRY_SELECTOR}){animation:none!important;}}`,
  );
  const style = document.createElementNS(SVG_NAMESPACE, 'style');
  style.setAttribute('data-excalimate-animation-profile', 'css-keyframes');
  style.textContent = css.join('');
  root.insertBefore(style, root.firstChild);
}

function emitSmilAnimation(
  document: Document,
  scene: SVGGraphicsElement,
  playerPackage: PlayerPackageV1,
  samples: readonly TimelineSample[],
  targets: readonly TargetMetadata[],
  posterFrame: FrameState,
): void {
  const durationMs = playerPackage.playback.clipEnd - playerPackage.playback.clipStart;
  for (const target of targets) {
    appendSmilAnimation(
      document,
      target.element,
      'transform',
      samples.map((sample) =>
        matrixValue(targetMatrix(resolveTargetState(sample.frame, target), target, sample.frame)),
      ),
      samples,
      durationMs,
      samples.map(() => '0 0 1 1'),
    );
    appendSmilAnimation(
      document,
      target.element,
      'opacity',
      samples.map((sample) => formatNumber(resolveTargetState(sample.frame, target).opacity)),
      samples,
      durationMs,
      samples.map(() => '0 0 1 1'),
    );
    if (target.drawAnimated) {
      const posterState = resolveTargetState(posterFrame, target);
      setGeometryPoster(target, posterState);
      for (const geometry of Array.from(
        target.element.querySelectorAll<SVGGeometryElement>(GEOMETRY_SELECTOR),
      )) {
        appendSmilAnimation(
          document,
          geometry,
          'stroke-dashoffset',
          samples.map((sample) =>
            formatNumber(1 - clamp(resolveTargetState(sample.frame, target).drawProgress, 0, 1)),
          ),
          samples,
          durationMs,
          samples.map(() => '0 0 1 1'),
        );
      }
    }
  }
  appendSmilAnimation(
    document,
    scene,
    'transform',
    samples.map((sample) => matrixValue(cameraMatrix(playerPackage, posterFrame, sample.frame))),
    samples,
    durationMs,
    samples.map(() => '0 0 1 1'),
  );
}

function appendSmilAnimation(
  document: Document,
  parent: Element,
  attributeName: string,
  values: readonly string[],
  samples: readonly TimelineSample[],
  durationMs: number,
  splines: readonly string[],
): void {
  const animation = document.createElementNS(SVG_NAMESPACE, 'animate');
  animation.setAttribute('attributeName', attributeName);
  animation.setAttribute('values', values.join(';'));
  animation.setAttribute(
    'keyTimes',
    samples.map((sample) => formatNumber(sample.percentage / 100)).join(';'),
  );
  animation.setAttribute('dur', `${formatNumber(durationMs)}ms`);
  animation.setAttribute('begin', '0s');
  animation.setAttribute('fill', 'freeze');
  animation.setAttribute('calcMode', 'spline');
  animation.setAttribute('keySplines', splines.slice(0, -1).join(';'));
  animation.setAttribute('data-excalimate-animation-profile', 'smil');
  parent.prepend(animation);
}

function applyPosterState(target: TargetMetadata, frame: FrameState): void {
  const state = resolveTargetState(frame, target);
  target.element.setAttribute('transform', matrixValue(targetMatrix(state, target, frame)));
  target.element.setAttribute('opacity', formatNumber(state.opacity));
  if (target.drawAnimated) setGeometryPoster(target, state);
}

function setGeometryPoster(target: TargetMetadata, state: ElementAnimationState): void {
  const offset = formatNumber(1 - clamp(state.drawProgress, 0, 1));
  for (const geometry of Array.from(
    target.element.querySelectorAll<SVGGeometryElement>(GEOMETRY_SELECTOR),
  )) {
    geometry.setAttribute('pathLength', '1');
    geometry.setAttribute('stroke-dasharray', '1');
    geometry.setAttribute('stroke-dashoffset', offset);
  }
}

function resolveTargetState(frame: FrameState, target: TargetMetadata): ElementAnimationState {
  const own = frame.get(target.id) ?? createDefaultState(target.id);
  if (!target.boundTo) return own;
  const parent = frame.get(target.boundTo);
  return parent ? composeStates(parent, own) : own;
}

function targetMatrix(
  state: ElementAnimationState,
  target: TargetMetadata,
  frame: FrameState,
): readonly [number, number, number, number, number, number] {
  let matrix: readonly [number, number, number, number, number, number];
  if (!target.origin || !target.center) {
    const radians = (state.rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    matrix = [
      cosine * state.scaleX,
      sine * state.scaleX,
      -sine * state.scaleY,
      cosine * state.scaleY,
      state.translateX,
      state.translateY,
    ];
  } else {
    const radians = (state.rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const scaledCenterX = target.origin[0] + (target.center[0] - target.origin[0]) * state.scaleX;
    const scaledCenterY = target.origin[1] + (target.center[1] - target.origin[1]) * state.scaleY;
    const scaleOffsetX = target.origin[0] * (1 - state.scaleX);
    const scaleOffsetY = target.origin[1] * (1 - state.scaleY);
    const rotateOffsetX = scaledCenterX - cosine * scaledCenterX + sine * scaledCenterY;
    const rotateOffsetY = scaledCenterY - sine * scaledCenterX - cosine * scaledCenterY;
    matrix = [
      cosine * state.scaleX,
      sine * state.scaleX,
      -sine * state.scaleY,
      cosine * state.scaleY,
      cosine * scaleOffsetX - sine * scaleOffsetY + rotateOffsetX + state.translateX,
      sine * scaleOffsetX + cosine * scaleOffsetY + rotateOffsetY + state.translateY,
    ];
  }
  if (!target.bindingPoints) return matrix;
  return applyEndpointBinding(
    matrix,
    target.bindingPoints,
    target.startBoundTo ? frame.get(target.startBoundTo) : undefined,
    target.endBoundTo ? frame.get(target.endBoundTo) : undefined,
    frame.get(target.id),
  );
}

function applyEndpointBinding(
  matrix: readonly [number, number, number, number, number, number],
  points: readonly [number, number, number, number],
  startState: ElementAnimationState | undefined,
  endState: ElementAnimationState | undefined,
  ownState: ElementAnimationState | undefined,
): readonly [number, number, number, number, number, number] {
  const [startX, startY, endX, endY] = points;
  const vectorX = endX - startX;
  const vectorY = endY - startY;
  const squaredLength = vectorX * vectorX + vectorY * vectorY;
  if (squaredLength === 0) return matrix;
  const ownTranslateX = ownState?.translateX ?? 0;
  const ownTranslateY = ownState?.translateY ?? 0;
  const startDeltaX = (startState?.translateX ?? ownTranslateX) - ownTranslateX;
  const startDeltaY = (startState?.translateY ?? ownTranslateY) - ownTranslateY;
  const endDeltaX = (endState?.translateX ?? ownTranslateX) - ownTranslateX;
  const endDeltaY = (endState?.translateY ?? ownTranslateY) - ownTranslateY;
  const deltaX = endDeltaX - startDeltaX;
  const deltaY = endDeltaY - startDeltaY;
  const projectionX = vectorX / squaredLength;
  const projectionY = vectorY / squaredLength;
  const projectionOffset = -(startX * vectorX + startY * vectorY) / squaredLength;
  return [
    matrix[0] + deltaX * projectionX,
    matrix[1] + deltaY * projectionX,
    matrix[2] + deltaX * projectionY,
    matrix[3] + deltaY * projectionY,
    matrix[4] + startDeltaX + deltaX * projectionOffset,
    matrix[5] + startDeltaY + deltaY * projectionOffset,
  ];
}

function cameraRect(
  playerPackage: PlayerPackageV1,
  frame: FrameState,
): {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  rotation: number;
} {
  const camera = playerPackage.playback.camera;
  const state = frame.get(CAMERA_FRAME_TARGET_ID);
  const width = camera.width * (state?.scaleX ?? 1);
  const height = camera.height * (state?.scaleY ?? 1);
  const centerX = camera.x + camera.sceneOffsetX + (state?.translateX ?? 0);
  const centerY = camera.y + camera.sceneOffsetY + (state?.translateY ?? 0);
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
    rotation: state?.rotation ?? 0,
  };
}

function cameraMatrix(
  playerPackage: PlayerPackageV1,
  posterFrame: FrameState,
  frame: FrameState,
): readonly [number, number, number, number, number, number] {
  const poster = cameraRect(playerPackage, posterFrame);
  const current = cameraRect(playerPackage, frame);
  const mapToPoster: Matrix = [
    poster.width / current.width,
    0,
    0,
    poster.height / current.height,
    poster.left - (poster.width / current.width) * current.left,
    poster.top - (poster.height / current.height) * current.top,
  ];
  const rotation = rotationMatrix(-current.rotation, current.centerX, current.centerY);
  return multiplyMatrix(mapToPoster, rotation);
}

type Matrix = readonly [number, number, number, number, number, number];

function rotationMatrix(degrees: number, centerX: number, centerY: number): Matrix {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine,
    sine,
    -sine,
    cosine,
    centerX - cosine * centerX + sine * centerY,
    centerY - sine * centerX - cosine * centerY,
  ];
}

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function assertSafeAnimatedSvg(root: SVGSVGElement): void {
  if (root.querySelector('script,foreignObject')) {
    throw new Error('Animated SVG contains a forbidden element');
  }
  for (const element of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.replace(/\s/g, '').toLowerCase();
      if (
        name.startsWith('on') ||
        value.includes('javascript:') ||
        value.includes('vbscript:') ||
        (value.includes('url(') && !isControlledLocalUrl(root, value)) ||
        (name.endsWith('href') && !value.startsWith('#') && !value.startsWith('data:image/'))
      ) {
        throw new Error('Animated SVG contains an unsafe reference');
      }

      function isControlledLocalUrl(root: SVGSVGElement, value: string): boolean {
        const match = /^url\(#([a-z0-9_-]+)\)$/i.exec(value);
        if (!match) return false;
        return Array.from(root.querySelectorAll('[id]')).some(
          (element) => element.getAttribute('id') === match[1],
        );
      }
    }
  }
  for (const style of Array.from(root.querySelectorAll('style'))) {
    const value = style.textContent?.toLowerCase() ?? '';
    if (value.includes('url(') || value.includes('@import')) {
      throw new Error('Animated SVG contains unsafe CSS');
    }
  }
}

function parsePoint(value: string | null): readonly [number, number] | null {
  const parts = value?.trim().split(/\s+/).map(Number);
  return parts?.length === 2 && parts.every(Number.isFinite)
    ? [parts[0] ?? 0, parts[1] ?? 0]
    : null;
}

function parseBindingPoints(
  value: string | null,
): readonly [number, number, number, number] | null {
  const parts = value?.trim().split(/\s+/).map(Number);
  if (parts?.length !== 4 || !parts.every(Number.isFinite)) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

function matrixValue(matrix: Matrix): string {
  return `matrix(${matrix.map(formatNumber).join(' ')})`;
}

function percentage(value: number): string {
  return `${formatNumber(value)}%`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Animation produced a non-finite value');
  const rounded = Math.abs(value) < 0.0000005 ? 0 : Number(value.toFixed(6));
  return String(rounded);
}

function roundTime(value: number): number {
  return Number(value.toFixed(6));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
