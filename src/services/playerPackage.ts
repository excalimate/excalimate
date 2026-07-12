import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ProjectDocument } from '@excalimate/project-schema';
import { parseProjectDocument } from '@excalimate/project-schema';
import { parsePlayerPackage } from '@excalimate/player-runtime';
import type { PlayerPackageV1 } from '@excalimate/player-runtime';
import type { AnimatableTarget } from '../types/excalidraw';
import { buildGroupHierarchy } from '../core/models/GroupHierarchy';
import {
  collectAbsoluteOpacityTargetIds,
  collectOpacityTrackTargetIds,
  getRenderableAnimationElements,
} from '../core/engine/renderUtils';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const OUTPUT_WIDTHS: Record<ProjectDocument['playback']['cameraFrame']['aspectRatio'], number> = {
  '16:9': 1920,
  '4:3': 1440,
  '1:1': 1080,
  '3:2': 1620,
};
const ASPECT_VALUES: Record<ProjectDocument['playback']['cameraFrame']['aspectRatio'], number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:2': 3 / 2,
};

export async function generatePlayerPackage(
  project: ProjectDocument,
  targets: readonly AnimatableTarget[],
  options: { theme?: 'light' | 'dark' } = {},
): Promise<PlayerPackageV1> {
  project = parseProjectDocument(project);
  const { exportToSvg, getCommonBounds } = await import('@excalidraw/excalidraw');
  const opacityTrackTargetIds = collectOpacityTrackTargetIds(project.timeline);
  const absoluteOpacityTargetIds = collectAbsoluteOpacityTargetIds(
    project.scene.elements,
    opacityTrackTargetIds,
  );
  const elements = getRenderableAnimationElements(
    project.scene
      .elements as unknown as readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[],
    opacityTrackTargetIds,
  );
  if (elements.length === 0) {
    throw new Error('The project has no visible elements to share');
  }
  const exportElements = elements.map((element) => {
    const withoutLink = element.link ? { ...element, link: null } : element;
    return absoluteOpacityTargetIds.has(element.id)
      ? { ...withoutLink, opacity: 100 }
      : withoutLink;
  }) as readonly NonDeletedExcalidrawElement[];
  const frameIds = new Set(
    exportElements
      .filter((element) => element.type === 'frame' || element.type === 'magicframe')
      .map((element) => element.id),
  );
  const rootElements = exportElements.filter(
    (element) => frameIds.has(element.id) || !element.frameId || !frameIds.has(element.frameId),
  );
  const [sceneMinX, sceneMinY] = getCommonBounds(rootElements);
  const sceneOffsetX = -sceneMinX;
  const sceneOffsetY = -sceneMinY;

  const svg = await exportToSvg({
    elements: [...exportElements],
    files: project.scene.files,
    appState: {
      ...project.scene.appState,
      exportBackground: true,
      exportEmbedScene: false,
      exportWithDarkMode: options.theme === 'dark',
      frameRendering: {
        enabled: true,
        clip: false,
        name: false,
        outline: false,
      },
      viewBackgroundColor:
        options.theme === 'dark'
          ? '#ffffff'
          : (readString(project.scene.appState['viewBackgroundColor']) ?? '#ffffff'),
    },
    exportPadding: 0,
  });
  markAnimationTargets(svg, getExportRenderOrder(exportElements), sceneOffsetX, sceneOffsetY);
  wrapScene(svg);

  const cameraFrame = project.playback.cameraFrame;
  const aspect = ASPECT_VALUES[cameraFrame.aspectRatio];
  const outputWidth = OUTPUT_WIDTHS[cameraFrame.aspectRatio];
  const outputHeight = Math.round(outputWidth / aspect);
  const title = safeTitle(project.metadata.name);

  return parsePlayerPackage({
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: project.version,
    scene: {
      svg: new XMLSerializer().serializeToString(svg),
      ...(absoluteOpacityTargetIds.size > 0
        ? { absoluteOpacityTargetIds: [...absoluteOpacityTargetIds].sort() }
        : {}),
    },
    animation: {
      timeline: project.timeline,
      hierarchy: buildGroupHierarchy([...targets]),
    },
    playback: {
      clipStart: project.playback.clipStart,
      clipEnd: project.playback.clipEnd,
      camera: {
        ...cameraFrame,
        height: cameraFrame.width / aspect,
        sceneOffsetX,
        sceneOffsetY,
      },
    },
    dimensions: {
      width: outputWidth,
      height: outputHeight,
      aspectRatio: cameraFrame.aspectRatio,
    },
    poster: {
      kind: 'frame',
      timeMs: project.playback.clipStart,
    },
    ...(title ? { title } : {}),
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  });
}

function markAnimationTargets(
  svg: SVGSVGElement,
  elements: readonly NonDeletedExcalidrawElement[],
  sceneOffsetX: number,
  sceneOffsetY: number,
): void {
  const exportedElements = Array.from(svg.children).filter(
    (child): child is SVGGraphicsElement =>
      child instanceof SVGGraphicsElement && (child.localName === 'g' || child.localName === 'use'),
  );
  if (exportedElements.length !== elements.length) {
    throw new Error('The exported SVG scene does not match its source elements');
  }

  elements.forEach((element, index) => {
    const exported = exportedElements[index];
    if (!exported) return;
    const wrapper = document.createElementNS(SVG_NAMESPACE, 'g');
    wrapper.setAttribute('data-excalimate-id', element.id);
    wrapper.setAttribute(
      'data-excalimate-origin',
      `${element.x + sceneOffsetX} ${element.y + sceneOffsetY}`,
    );
    wrapper.setAttribute(
      'data-excalimate-center',
      `${element.x + element.width / 2 + sceneOffsetX} ${element.y + element.height / 2 + sceneOffsetY}`,
    );
    if (element.type === 'text' && element.containerId) {
      wrapper.setAttribute('data-excalimate-bound-to', element.containerId);
    }
    if ((element.type === 'arrow' || element.type === 'line') && element.points.length >= 2) {
      const startBinding = element.startBinding?.elementId;
      const endBinding = element.endBinding?.elementId;
      if (startBinding) {
        wrapper.setAttribute('data-excalimate-start-bound-to', startBinding);
      }
      if (endBinding) {
        wrapper.setAttribute('data-excalimate-end-bound-to', endBinding);
      }
      if (startBinding || endBinding) {
        const start = element.points[0];
        const end = element.points[element.points.length - 1];
        wrapper.setAttribute(
          'data-excalimate-binding-points',
          [
            element.x + start[0] + sceneOffsetX,
            element.y + start[1] + sceneOffsetY,
            element.x + end[0] + sceneOffsetX,
            element.y + end[1] + sceneOffsetY,
          ].join(' '),
        );
      }
    }
    exported.replaceWith(wrapper);
    wrapper.append(exported);
  });
}

function getExportRenderOrder(
  elements: readonly NonDeletedExcalidrawElement[],
): readonly NonDeletedExcalidrawElement[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const regularElements = elements.filter(
    (element) =>
      element.type !== 'embeddable' &&
      element.type !== 'iframe' &&
      element.type !== 'frame' &&
      element.type !== 'magicframe',
  );
  const iframeElements = elements.filter(
    (element) => element.type === 'embeddable' || element.type === 'iframe',
  );
  const rendered = new Set<string>();
  const order: NonDeletedExcalidrawElement[] = [];

  const append = (element: NonDeletedExcalidrawElement): void => {
    if (rendered.has(element.id)) return;
    rendered.add(element.id);
    order.push(element);
    const boundText = element.boundElements
      ?.filter((binding) => binding.type === 'text')
      .map((binding) => byId.get(binding.id))
      .find((bound): bound is NonDeletedExcalidrawElement => Boolean(bound));
    if (boundText) append(boundText);
  };

  for (const element of [...regularElements, ...iframeElements]) {
    if (element.type === 'text' && element.containerId && byId.has(element.containerId)) {
      continue;
    }
    append(element);
  }
  return order;
}

function wrapScene(svg: SVGSVGElement): void {
  const scene = document.createElementNS(SVG_NAMESPACE, 'g');
  scene.setAttribute('data-excalimate-scene', 'true');
  const rootFilter = svg.getAttribute('filter');
  if (rootFilter) {
    scene.setAttribute('filter', rootFilter);
    svg.removeAttribute('filter');
  }
  const renderableChildren = Array.from(svg.children).filter((child) => child.localName !== 'defs');
  for (const child of renderableChildren) scene.append(child);
  svg.append(scene);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function safeTitle(value: string): string | undefined {
  const title = value.trim().slice(0, 128);
  if (
    !title ||
    [...title].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return undefined;
  }
  return title;
}
