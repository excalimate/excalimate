import { CAMERA_FRAME_TARGET_ID } from '@excalimate/project-schema';
import {
  composeStates,
  createDefaultState,
} from '@excalimate/animation-core';
import type {
  ElementAnimationState,
  FrameState,
} from '@excalimate/animation-core';
import { sanitizeSvg } from './sanitize.js';
import type { PlayerPackageV1, PlayerSceneAdapter } from './types.js';

interface SvgTarget {
  element: SVGGraphicsElement;
  paths: PathMetric[];
  origin: readonly [number, number] | null;
  center: readonly [number, number] | null;
  boundTo: string | null;
}

interface PathMetric {
  element: SVGGeometryElement;
  length: number;
}

export class SvgSceneAdapter implements PlayerSceneAdapter {
  readonly svg: SVGSVGElement;
  private readonly container: Element;
  private readonly playerPackage: PlayerPackageV1;
  private readonly targets = new Map<string, SvgTarget>();
  private readonly cameraScene: SVGGraphicsElement | null;
  private destroyed = false;

  constructor(
    container: Element,
    playerPackage: PlayerPackageV1,
  ) {
    this.container = container;
    this.playerPackage = playerPackage;
    const sanitized = sanitizeSvg(playerPackage.scene.svg);
    const parsed = new DOMParser().parseFromString(sanitized.svg, 'image/svg+xml');
    const imported = document.importNode(parsed.documentElement, true);
    if (!(imported instanceof SVGSVGElement)) {
      throw new Error('Player scene did not produce an SVG root');
    }
    this.svg = imported;
    this.svg.setAttribute('role', 'img');
    if (playerPackage.title) this.svg.setAttribute('aria-label', playerPackage.title);
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    for (const element of Array.from(
      this.svg.querySelectorAll<SVGGraphicsElement>('[data-excalimate-id]'),
    )) {
      const targetId = element.getAttribute('data-excalimate-id');
      if (!targetId) continue;
      this.targets.set(targetId, {
        element,
        paths: [],
        origin: parsePoint(element.getAttribute('data-excalimate-origin')),
        center: parsePoint(element.getAttribute('data-excalimate-center')),
        boundTo: element.getAttribute('data-excalimate-bound-to'),
      });
    }
    for (const geometry of Array.from(
      this.svg.querySelectorAll<SVGGeometryElement>(
        'path, line, polyline, polygon, circle, ellipse, rect',
      ),
    )) {
      const targetElement = geometry.closest<SVGGraphicsElement>(
        '[data-excalimate-id]',
      );
      const targetId = targetElement?.getAttribute('data-excalimate-id');
      const target = targetId ? this.targets.get(targetId) : undefined;
      if (target) {
        target.paths.push({
          element: geometry,
          length: safePathLength(geometry),
        });
      }
    }
    this.cameraScene = this.svg.querySelector<SVGGraphicsElement>(
      '[data-excalimate-scene="true"]',
    );
    this.container.replaceChildren(this.svg);
  }

  applyFrame(frame: FrameState): void {
    if (this.destroyed) throw new Error('Player scene adapter is destroyed');
    for (const [targetId, target] of this.targets) {
      const ownState = frame.get(targetId);
      const parentState = target.boundTo ? frame.get(target.boundTo) : undefined;
      const state = parentState
        ? composeStates(parentState, ownState ?? createDefaultState(targetId))
        : ownState;
      const element = target.element;
      element.style.opacity = String(state?.opacity ?? 1);
      element.removeAttribute('transform');
      element.style.transform = '';
      if (state && target.origin && target.center) {
        element.setAttribute(
          'transform',
          createTransformMatrix(state, target.origin, target.center),
        );
      } else if (state) {
        element.style.transformBox = 'fill-box';
        element.style.transformOrigin = 'center';
        element.style.transform = `translate(${state.translateX}px, ${state.translateY}px) rotate(${state.rotation}deg) scale(${state.scaleX}, ${state.scaleY})`;
      }
      const drawProgress = clamp(state?.drawProgress ?? 1, 0, 1);
      for (const path of target.paths) {
        if (path.length <= 0 || drawProgress >= 1) {
          path.element.style.strokeDasharray = '';
          path.element.style.strokeDashoffset = '';
        } else {
          path.element.style.strokeDasharray = String(path.length);
          path.element.style.strokeDashoffset = String(
            path.length * (1 - drawProgress),
          );
        }
      }
    }

    const camera = this.playerPackage.playback.camera;
    const state = frame.get(CAMERA_FRAME_TARGET_ID);
    const width = camera.width * (state?.scaleX ?? 1);
    const height = camera.height * (state?.scaleY ?? 1);
    const centerX =
      camera.x + camera.sceneOffsetX + (state?.translateX ?? 0);
    const centerY =
      camera.y + camera.sceneOffsetY + (state?.translateY ?? 0);
    this.svg.setAttribute(
      'viewBox',
      `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`,
    );
    if (this.cameraScene) {
      const rotation = state?.rotation ?? 0;
      this.cameraScene.setAttribute(
        'transform',
        rotation === 0 ? '' : `rotate(${-rotation} ${centerX} ${centerY})`,
      );
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.targets.clear();
    this.container.replaceChildren();
  }
}

function safePathLength(path: SVGGeometryElement): number {
  if (typeof path.getTotalLength !== 'function') return 0;
  try {
    const length = path.getTotalLength();
    return Number.isFinite(length) && length > 0 ? length : 0;
  } catch {
    return 0;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parsePoint(value: string | null): readonly [number, number] | null {
  const values = value?.trim().split(/\s+/).map(Number);
  return values?.length === 2 && values.every(Number.isFinite)
    ? [values[0] ?? 0, values[1] ?? 0]
    : null;
}

function createTransformMatrix(
  state: ElementAnimationState,
  origin: readonly [number, number],
  center: readonly [number, number],
): string {
  const radians = (state.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const scaledCenterX = origin[0] + (center[0] - origin[0]) * state.scaleX;
  const scaledCenterY = origin[1] + (center[1] - origin[1]) * state.scaleY;
  const scaleOffsetX = origin[0] * (1 - state.scaleX);
  const scaleOffsetY = origin[1] * (1 - state.scaleY);
  const rotateOffsetX =
    scaledCenterX - cosine * scaledCenterX + sine * scaledCenterY;
  const rotateOffsetY =
    scaledCenterY - sine * scaledCenterX - cosine * scaledCenterY;
  const translateX =
    cosine * scaleOffsetX -
    sine * scaleOffsetY +
    rotateOffsetX +
    state.translateX;
  const translateY =
    sine * scaleOffsetX +
    cosine * scaleOffsetY +
    rotateOffsetY +
    state.translateY;
  return `matrix(${cosine * state.scaleX} ${sine * state.scaleX} ${-sine * state.scaleY} ${cosine * state.scaleY} ${translateX} ${translateY})`;
}
