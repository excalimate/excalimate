import { useCallback, useRef, useMemo } from 'react';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData, AnimatableTarget, Bounds } from '../../types/excalidraw';
import { CAMERA_FRAME_TARGET_ID, useProjectStore, getFrameHeight } from '../../stores/projectStore';
import '@excalidraw/excalidraw/index.css';

interface ExcalidrawEditorProps {
  onSceneChange?: (scene: ExcalidrawSceneData) => void;
  onElementsSelected?: (elementIds: string[]) => void;
  initialData?: ExcalidrawSceneData;
}

/**
 * Compute bounds for an Excalidraw element.
 * For arrows/lines, bounds are computed from the points array (authoritative source).
 * For bound text on arrows, computes position from the arrow's midpoint
 * (since Excalidraw positions bound text dynamically and stored x/y may be stale).
 * For other shapes, uses x/y/width/height directly.
 */
function computeBounds(
  element: NonDeletedExcalidrawElement,
  elementById?: Map<string, NonDeletedExcalidrawElement>,
): Bounds {
  const elAny = element as any;

  // For bound text elements, compute position from the container's geometry
  // because Excalidraw positions bound text dynamically and stored x/y can be stale/zero
  if (element.type === 'text' && elAny.containerId && elementById) {
    const container = elementById.get(elAny.containerId);
    if (container) {
      const containerAny = container as any;
      // Get the container's visual center
      let cx: number, cy: number;
      if (
        containerAny.points &&
        Array.isArray(containerAny.points) &&
        containerAny.points.length >= 2
      ) {
        // Arrow/line: compute midpoint of the path
        const points = containerAny.points as number[][];
        const midIdx = Math.floor(points.length / 2);
        if (points.length % 2 === 0) {
          // Even number of points: average the two middle points
          const p1 = points[midIdx - 1];
          const p2 = points[midIdx];
          cx = container.x + (p1[0] + p2[0]) / 2;
          cy = container.y + (p1[1] + p2[1]) / 2;
        } else {
          // Odd number: use the middle point
          cx = container.x + points[midIdx][0];
          cy = container.y + points[midIdx][1];
        }
      } else {
        // Shape: use center
        cx = container.x + container.width / 2;
        cy = container.y + container.height / 2;
      }

      // Use the text's own width/height if valid, otherwise estimate
      const tw = element.width > 0 ? element.width : 80;
      const th = element.height > 0 ? element.height : 20;
      return {
        x: cx - tw / 2,
        y: cy - th / 2,
        width: tw,
        height: th,
        centerX: cx,
        centerY: cy,
      };
    }
  }

  // For linear elements (arrows, lines, freedraw), compute from points
  if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [px, py] of elAny.points as number[][]) {
      const ax = element.x + px;
      const ay = element.y + py;
      if (ax < minX) minX = ax;
      if (ay < minY) minY = ay;
      if (ax > maxX) maxX = ax;
      if (ay > maxY) maxY = ay;
    }

    // Account for stroke width, arrowhead tips, and bezier curve bulge
    const strokeWidth = elAny.strokeWidth ?? 1;
    const pad = strokeWidth / 2 + (element.type === 'arrow' ? 8 : 3);
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const w = maxX - minX;
    const h = maxY - minY;
    return {
      x: minX,
      y: minY,
      width: Math.max(w, 1),
      height: Math.max(h, 1),
      centerX: minX + w / 2,
      centerY: minY + h / 2,
    };
  }

  // For rectangles, ellipses, text, etc. — handle potential negative dims
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const w = Math.abs(element.width);
  const h = Math.abs(element.height);
  return {
    x: minX,
    y: minY,
    width: w,
    height: h,
    centerX: minX + w / 2,
    centerY: minY + h / 2,
  };
}

/**
 * Compute the visual extent of an element, handling points and negative dimensions.
 * Returns [minX, minY, maxX, maxY].
 */
function elementExtent(el: {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: number[][];
}): [number, number, number, number] {
  const elAny = el as any;
  if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [px, py] of elAny.points as number[][]) {
      const ax = el.x + px;
      const ay = el.y + py;
      if (ax < minX) minX = ax;
      if (ay < minY) minY = ay;
      if (ax > maxX) maxX = ax;
      if (ay > maxY) maxY = ay;
    }
    return [minX, minY, maxX, maxY];
  }
  const x1 = Math.min(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  const x2 = Math.max(el.x, el.x + el.width);
  const y2 = Math.max(el.y, el.y + el.height);
  return [x1, y1, x2, y2];
}

/**
 * Extract animatable targets from Excalidraw elements.
 *
 * Builds a clean hierarchy:
 *   ExcalidrawGroup
 *     ├── label-group:arrow1 (arrow1 + text1)
 *     ├── label-group:arrow2 (arrow2 + text2)
 *     └── rectangle3
 *
 * Each element has exactly ONE parentGroupId (its immediate container).
 * Groups reference their direct children, not deeply nested elements.
 */
export function extractTargets(elements: readonly ExcalidrawElement[]): AnimatableTarget[] {
  const targets: AnimatableTarget[] = [];

  const nonDeleted = elements.filter((el) => !el.isDeleted) as NonDeletedExcalidrawElement[];
  const elementById = new Map(nonDeleted.map((el) => [el.id, el]));

  // ── Step 1: Identify bound text relationships (for labeling only) ─

  const boundTextIds = new Set<string>();
  for (const el of nonDeleted) {
    if (el.type !== 'text') continue;
    const containerId = (el as { containerId?: string | null }).containerId;
    if (containerId && elementById.has(containerId)) {
      boundTextIds.add(el.id);
    }
  }

  // ── Step 2: Collect Excalidraw group membership ────────────────

  const excalidrawGroups = new Map<string, string[]>(); // groupId → raw memberIds
  const elementInnerGroup = new Map<string, string>(); // elementId → innermost Excalidraw groupId
  const groupParent = new Map<string, string>(); // childGroupId → parentGroupId

  for (const element of nonDeleted) {
    const gids = (element as { groupIds?: readonly string[] }).groupIds;
    if (gids && gids.length > 0) {
      elementInnerGroup.set(element.id, gids[0]);
      for (const groupId of gids) {
        if (!excalidrawGroups.has(groupId)) excalidrawGroups.set(groupId, []);
        excalidrawGroups.get(groupId)!.push(element.id);
      }
      for (let i = 0; i < gids.length - 1; i++) {
        if (!groupParent.has(gids[i])) {
          groupParent.set(gids[i], gids[i + 1]);
        }
      }
    }
  }

  // ── Step 3: Create element targets ─────────────────────────────

  nonDeleted.forEach((element, index) => {
    let label: string;

    if (element.type === 'text') {
      const text = (element as { text?: string }).text?.slice(0, 20) ?? '';
      label = boundTextIds.has(element.id) ? `Label: "${text}"` : `Text: "${text}"`;
    } else if (element.type === 'arrow') {
      const boundEls = (element as { boundElements?: readonly { id: string; type: string }[] })
        .boundElements;
      const boundTextEntry = boundEls?.find((b) => b.type === 'text');
      const textContent = boundTextEntry
        ? (elementById.get(boundTextEntry.id) as { text?: string } | undefined)?.text?.slice(0, 20)
        : undefined;
      label = textContent ? `Arrow: "${textContent}"` : `Arrow ${index + 1}`;
    } else if (element.type === 'line') {
      label = `Line ${index + 1}`;
    } else {
      const boundEls = (element as { boundElements?: readonly { id: string; type: string }[] })
        .boundElements;
      const boundTextEntry = boundEls?.find((b) => b.type === 'text');
      const textContent = boundTextEntry
        ? (elementById.get(boundTextEntry.id) as { text?: string } | undefined)?.text?.slice(0, 15)
        : undefined;
      const typeName = element.type.charAt(0).toUpperCase() + element.type.slice(1);
      label = textContent ? `${typeName}: "${textContent}"` : `${typeName} ${index + 1}`;
    }

    // Compute rawOrigin with points extent for linear elements
    const elAny = element as any;
    const rawOrigin: NonNullable<AnimatableTarget['rawOrigin']> = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
    if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
      let pMinX = Infinity,
        pMaxX = -Infinity,
        pMinY = Infinity,
        pMaxY = -Infinity;
      for (const [px, py] of elAny.points as number[][]) {
        if (px < pMinX) pMinX = px;
        if (px > pMaxX) pMaxX = px;
        if (py < pMinY) pMinY = py;
        if (py > pMaxY) pMaxY = py;
      }
      const strokeWidth = elAny.strokeWidth ?? 1;
      const pad = strokeWidth / 2 + (element.type === 'arrow' ? 8 : 3);
      rawOrigin.pointsMinX = pMinX - pad;
      rawOrigin.pointsMaxX = pMaxX + pad;
      rawOrigin.pointsMinY = pMinY - pad;
      rawOrigin.pointsMaxY = pMaxY + pad;
    }

    targets.push({
      id: element.id,
      type: 'element',
      label,
      elementIds: [element.id],
      originalBounds: computeBounds(element, elementById),
      originalAngle: element.angle ?? 0,
      zIndex: index,
      parentGroupId: elementInnerGroup.get(element.id),
      elementType: element.type,
      rawOrigin,
    });
  });

  // ── Step 4: Create Excalidraw group targets ────────────────────

  let groupIndex = 0;
  for (const [groupId, memberIds] of excalidrawGroups) {
    groupIndex++;
    const memberElements = nonDeleted.filter((el) => memberIds.includes(el.id));
    if (memberElements.length === 0) continue;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const el of memberElements) {
      const [x1, y1, x2, y2] = elementExtent(el);
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    }

    targets.push({
      id: groupId,
      type: 'group',
      label: `Group ${groupIndex}`,
      elementIds: memberIds,
      originalBounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      },
      originalAngle: 0,
      zIndex: -1,
      parentGroupId: groupParent.get(groupId),
    });
  }

  // Add camera frame as a special animatable target
  const frame = useProjectStore.getState().cameraFrame;
  const frameH = getFrameHeight(frame);
  targets.push({
    id: CAMERA_FRAME_TARGET_ID,
    type: 'element',
    label: `🎬 Camera Frame (${frame.aspectRatio})`,
    elementIds: [CAMERA_FRAME_TARGET_ID],
    originalBounds: {
      x: frame.x - frame.width / 2,
      y: frame.y - frameH / 2,
      width: frame.width,
      height: frameH,
      centerX: frame.x,
      centerY: frame.y,
    },
    originalAngle: 0,
    zIndex: -2,
    elementType: 'frame',
  });

  return targets;
}

export function ExcalidrawEditor({
  onSceneChange,
  onElementsSelected,
  initialData,
}: ExcalidrawEditorProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const onSceneChangeRef = useRef(onSceneChange);
  const onElementsSelectedRef = useRef(onElementsSelected);

  // Keep refs in sync without causing re-renders
  onSceneChangeRef.current = onSceneChange;
  onElementsSelectedRef.current = onElementsSelected;

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: any, _files: any) => {
      if (!apiRef.current) return;

      if (onSceneChangeRef.current) {
        const files = apiRef.current.getFiles();
        onSceneChangeRef.current({
          elements,
          appState: {
            viewBackgroundColor: appState?.viewBackgroundColor,
          },
          files: files ?? {},
        });
      }

      // Report selected elements from appState
      if (onElementsSelectedRef.current && appState?.selectedElementIds) {
        const selectedIds = Object.keys(appState.selectedElementIds).filter(
          (id: string) => appState.selectedElementIds[id],
        );
        onElementsSelectedRef.current(selectedIds);
      }
    },
    [],
  );

  // Compute initialData from prop — this runs on each mount
  // (key prop on parent forces re-mount when project changes)
  const stableInitialData = useMemo(
    () =>
      initialData
        ? {
            elements: initialData.elements as ExcalidrawElement[],
            appState: initialData.appState,
            files: initialData.files,
          }
        : undefined,
    [initialData],
  );

  return (
    <div
      className="excalidraw-wrapper"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Excalidraw
        excalidrawAPI={handleApiReady}
        initialData={stableInitialData}
        onChange={handleChange}
        theme="light"
      />
    </div>
  );
}

/**
 * Export the current Excalidraw scene to SVG.
 * Used by the SpriteManager to pre-render elements.
 */
export async function exportSceneToSvg(scene: ExcalidrawSceneData): Promise<SVGSVGElement> {
  const elements = scene.elements.filter((el) => !el.isDeleted) as NonDeletedExcalidrawElement[];
  const svg = await exportToSvg({
    elements,
    files: scene.files,
    appState: {
      ...scene.appState,
      exportBackground: true,
    },
    exportPadding: 30,
  });
  return svg;
}
