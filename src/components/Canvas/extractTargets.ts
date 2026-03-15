import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { AnimatableTarget } from '../../types/excalidraw';
import { CAMERA_FRAME_TARGET_ID, getFrameHeight, useProjectStore } from '../../stores/projectStore';
import { computeBounds, elementExtent } from './computeBounds';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    label: `Camera Frame (${frame.aspectRatio})`,
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
