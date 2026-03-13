import { useEffect, useRef, useState, useCallback } from 'react';
import { exportToSvg, exportToCanvas, getNonDeletedElements } from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import type { CameraFrame } from '../../stores/projectStore';
import { getFrameHeight } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { applyAnimationToElements } from '../../core/engine/renderUtils';

interface AnimationPreviewProps {
  scene: ExcalidrawSceneData | null;
  targets: AnimatableTarget[];
  frameState: FrameState;
  currentTime: number;
  selectedElementIds: string[];
  cameraFrame: CameraFrame;
  onSelectElements: (ids: string[]) => void;
  onDragElement: (targetId: string, deltaX: number, deltaY: number) => void;
  onResizeElement: (targetId: string, dScaleX: number, dScaleY: number) => void;
  className?: string;
}

interface PointerDownState {
  elementId: string | null;
  startX: number;
  startY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
}

interface DragState {
  targetIds: string[];
  startX: number;
  startY: number;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const DRAG_THRESHOLD = 3;

function findTopmostGroup(elementId: string, targets: AnimatableTarget[]): string {
  const groups = targets.filter((t) => t.type === 'group');
  const containingGroups = groups.filter((g) => g.elementIds.includes(elementId));
  if (containingGroups.length === 0) return elementId;
  const outermost = containingGroups.find(
    (g) => !g.parentGroupId || !containingGroups.some((cg) => cg.id === g.parentGroupId),
  );
  return (
    outermost?.id ??
    containingGroups.sort((a, b) => b.elementIds.length - a.elementIds.length)[0].id
  );
}

function findTargetAtSameLevel(
  elementId: string,
  currentSelectionIds: string[],
  targets: AnimatableTarget[],
): string {
  if (currentSelectionIds.length === 0) return findTopmostGroup(elementId, targets);
  const firstSelected = targets.find((t) => t.id === currentSelectionIds[0]);
  if (!firstSelected) return findTopmostGroup(elementId, targets);
  const desiredParentId = firstSelected.parentGroupId;

  const elementTarget = targets.find((t) => t.id === elementId);
  if (elementTarget && elementTarget.parentGroupId === desiredParentId) return elementTarget.id;

  const matchingGroup = targets.find(
    (g) =>
      g.type === 'group' && g.elementIds.includes(elementId) && g.parentGroupId === desiredParentId,
  );
  if (matchingGroup) return matchingGroup.id;

  return findTopmostGroup(elementId, targets);
}

function drillDown(currentId: string, elementId: string, targets: AnimatableTarget[]): string {
  const currentTarget = targets.find((t) => t.id === currentId);
  if (!currentTarget || currentTarget.type !== 'group') return elementId;
  const directChildren = targets.filter((t) => t.parentGroupId === currentId);
  const directChild = directChildren.find((t) => t.id === elementId);
  if (directChild) return directChild.id;
  const childGroup = directChildren.find(
    (t) => t.type === 'group' && t.elementIds.includes(elementId),
  );
  if (childGroup) return childGroup.id;
  if (currentTarget.elementIds.includes(elementId)) return elementId;
  return elementId;
}

/**
 * Restructure SVG DOM: wrap group member elements in actual <g> elements
 * so CSS transform cascade naturally handles group→child composition.
 * Processes innermost groups first so nested groups nest correctly.
 */
function wrapGroupsInSvg(elementMap: Map<string, SVGGElement>, targets: AnimatableTarget[]): void {
  const groupTargets = targets.filter((t) => t.type === 'group');
  if (groupTargets.length === 0) return;

  // Compute depth of each group (root=0, nested=higher)
  const depthMap = new Map<string, number>();
  const getDepth = (gId: string): number => {
    if (depthMap.has(gId)) return depthMap.get(gId)!;
    const g = groupTargets.find((gt) => gt.id === gId);
    if (!g?.parentGroupId) {
      depthMap.set(gId, 0);
      return 0;
    }
    const d = getDepth(g.parentGroupId) + 1;
    depthMap.set(gId, d);
    return d;
  };
  groupTargets.forEach((g) => getDepth(g.id));

  // Process innermost groups first (highest depth)
  const sorted = [...groupTargets].sort(
    (a, b) => (depthMap.get(b.id) ?? 0) - (depthMap.get(a.id) ?? 0),
  );

  for (const group of sorted) {
    // Direct children are targets whose parentGroupId === this group's id
    const directChildIds = new Set(
      targets.filter((t) => t.parentGroupId === group.id).map((t) => t.id),
    );

    // Find first child node in the DOM to determine the parent
    let firstNode: Element | null = null;
    for (const id of directChildIds) {
      const node = elementMap.get(id);
      if (node) {
        firstNode = node;
        break;
      }
    }
    if (!firstNode?.parentElement) continue;

    const parent = firstNode.parentElement;

    // Collect child SVG nodes in DOM order
    const childNodes: Element[] = [];
    for (const child of Array.from(parent.children)) {
      const id = child.getAttribute('data-element-id') ?? child.getAttribute('data-target-id');
      if (id && directChildIds.has(id)) {
        childNodes.push(child);
      }
    }
    if (childNodes.length === 0) continue;

    // Create wrapper <g> and nest children inside it
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    wrapper.setAttribute('data-target-id', group.id);
    wrapper.style.cursor = 'pointer';

    parent.insertBefore(wrapper, childNodes[0]);
    for (const node of childNodes) {
      wrapper.appendChild(node);
    }

    elementMap.set(group.id, wrapper);
  }
}

/**
 * Apply draw progress (0-1) to stroked SVG paths/lines inside a <g> element.
 * Uses stroke-dasharray/dashoffset to reveal the stroke progressively.
 */
function applyDrawProgress(gEl: SVGGElement, progress: number): void {
  const strokeElements = gEl.querySelectorAll(
    'path, line, polyline, polygon, circle, ellipse, rect',
  );
  for (const el of strokeElements) {
    if (!(el instanceof SVGGeometryElement)) continue;
    const totalLength = el.getTotalLength();
    if (totalLength <= 0) continue;
    const visibleLength = totalLength * Math.max(0, Math.min(1, progress));
    el.style.strokeDasharray = String(totalLength);
    el.style.strokeDashoffset = String(totalLength - visibleLength);
  }
}

function clearDrawProgress(gEl: SVGGElement): void {
  const strokeElements = gEl.querySelectorAll(
    'path, line, polyline, polygon, circle, ellipse, rect',
  );
  for (const el of strokeElements) {
    if (!(el instanceof SVGGeometryElement)) continue;
    el.style.removeProperty('stroke-dasharray');
    el.style.removeProperty('stroke-dashoffset');
  }
}

/**
 * Infer a broad content category from an SVG <g> element's children.
 */
function getSvgContentType(g: SVGGElement): 'text' | 'arrow' | 'shape' | 'unknown' {
  const first = g.children[0];
  if (!first) return 'unknown';
  if (first.tagName === 'text') return 'text';
  if (first.tagName === 'g') return 'arrow'; // arrows have nested <g> for arrowheads
  if (
    first.tagName === 'path' ||
    first.tagName === 'rect' ||
    first.tagName === 'ellipse' ||
    first.tagName === 'circle'
  )
    return 'shape';
  return 'unknown';
}

/**
 * Check whether an SVG <g>'s visual content is compatible with an element type.
 */
function svgContentMatchesElement(g: SVGGElement, el: NonDeletedExcalidrawElement): boolean {
  const svgType = getSvgContentType(g);
  if (svgType === 'text') return el.type === 'text';
  if (svgType === 'arrow') return el.type === 'arrow' || el.type === 'line';
  if (svgType === 'shape') return el.type !== 'text' && el.type !== 'arrow' && el.type !== 'line';
  return true; // unknown matches anything
}

/**
 * Match SVG <g> elements to Excalidraw elements when order doesn't align.
 *
 * Excalidraw's exportToSvg reorders bound text to be adjacent to its container.
 * So we match by type, and for bound text, we match based on which container
 * was most recently assigned (since the text follows its container in SVG order).
 */
function matchSvgToElements(
  gElements: SVGGElement[],
  elements: NonDeletedExcalidrawElement[],
  map: Map<string, SVGGElement>,
): void {
  const elementById = new Map(elements.map((el) => [el.id, el]));

  // Separate elements into pools by type, preserving array order
  const arrowEls = elements.filter((el) => el.type === 'arrow' || el.type === 'line');
  const shapeEls = elements.filter(
    (el) => el.type !== 'text' && el.type !== 'arrow' && el.type !== 'line',
  );
  // Split text into standalone and bound
  const standaloneTextEls = elements.filter((el) => {
    if (el.type !== 'text') return false;
    const cid = (el as { containerId?: string | null }).containerId;
    return !cid || !elementById.has(cid);
  });
  const boundTextByContainer = new Map<string, NonDeletedExcalidrawElement[]>();
  for (const el of elements) {
    if (el.type !== 'text') continue;
    const cid = (el as { containerId?: string | null }).containerId;
    if (!cid || !elementById.has(cid)) continue;
    if (!boundTextByContainer.has(cid)) boundTextByContainer.set(cid, []);
    boundTextByContainer.get(cid)!.push(el);
  }

  let ai = 0,
    si = 0,
    sti = 0;
  let lastMatchedContainerId: string | null = null;

  for (const g of gElements) {
    const svgType = getSvgContentType(g);
    let matched: NonDeletedExcalidrawElement | undefined;

    if (svgType === 'arrow' && ai < arrowEls.length) {
      matched = arrowEls[ai++];
      lastMatchedContainerId = matched.id;
    } else if (svgType === 'shape' && si < shapeEls.length) {
      matched = shapeEls[si++];
      lastMatchedContainerId = matched.id;
    } else if (svgType === 'text') {
      // Try to match bound text for the last matched container first
      if (lastMatchedContainerId) {
        const boundTexts = boundTextByContainer.get(lastMatchedContainerId);
        if (boundTexts && boundTexts.length > 0) {
          matched = boundTexts.shift();
          if (boundTexts.length === 0) {
            boundTextByContainer.delete(lastMatchedContainerId);
          }
        }
      }
      // If no bound text matched, try standalone text
      if (!matched && sti < standaloneTextEls.length) {
        matched = standaloneTextEls[sti++];
      }
      // Last resort: any remaining bound text
      if (!matched) {
        for (const [cid, texts] of boundTextByContainer) {
          if (texts.length > 0) {
            matched = texts.shift();
            if (texts.length === 0) boundTextByContainer.delete(cid);
            break;
          }
        }
      }
    }

    if (matched) {
      g.setAttribute('data-element-id', matched.id);
      g.style.cursor = 'pointer';
      map.set(matched.id, g);
    }
  }
}

/**
 * Renders the camera frame overlay with dimmed area outside the frame,
 * visible border, and interactive drag/resize.
 */
function CameraFrameOverlay({
  cameraFrame,
  frameState,
  svgContainerRef,
  containerRef,
  isSelected,
  onMouseDown,
  viewport,
  dragOffset,
}: {
  cameraFrame: CameraFrame;
  frameState: FrameState;
  svgContainerRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, handle?: string) => void;
  viewport: { panX: number; panY: number; zoom: number };
  dragOffset?: { dx: number; dy: number; dScale: number } | null;
}) {
  const svgEl = svgContainerRef.current?.querySelector('svg');
  if (!svgEl) return null;

  const containerRect = containerRef.current?.getBoundingClientRect();
  if (!containerRect) return null;

  const viewBox = svgEl.viewBox?.baseVal;
  if (!viewBox || viewBox.width === 0 || viewBox.height === 0) return null;

  const svgW = svgEl.width.baseVal.value || svgEl.getBoundingClientRect().width / viewport.zoom;
  const vbScaleX = svgW / viewBox.width;
  const vbScaleY = vbScaleX; // uniform scale

  // Get animated camera state + live drag offset
  const camState = frameState.get(CAMERA_FRAME_TARGET_ID);
  const tx = (camState?.translateX ?? 0) + (dragOffset?.dx ?? 0);
  const ty = (camState?.translateY ?? 0) + (dragOffset?.dy ?? 0);
  const dScale = dragOffset?.dScale ?? 0;
  const sx = (camState?.scaleX ?? 1) + dScale;
  const sy = (camState?.scaleY ?? 1) + dScale;

  const frameW = cameraFrame.width * sx;
  const frameH = getFrameHeight(cameraFrame) * sy;
  const frameCX = cameraFrame.x + tx;
  const frameCY = cameraFrame.y + ty;

  // Scene → SVG-local → screen
  const svgLocalX = (frameCX - viewBox.x) * vbScaleX;
  const svgLocalY = (frameCY - viewBox.y) * vbScaleY;
  const screenCX = svgLocalX * viewport.zoom + viewport.panX;
  const screenCY = svgLocalY * viewport.zoom + viewport.panY;
  const screenW = frameW * vbScaleX * viewport.zoom;
  const screenH = frameH * vbScaleY * viewport.zoom;

  const borderColor = isSelected ? '#ef4444' : '#dc2626';
  const left = screenCX - screenW / 2;
  const top = screenCY - screenH / 2;
  const BORDER_HIT = 6; // px border hit area for clicking

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
      {/* Dimmed overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
            ${left}px ${top}px,
            ${left}px ${top + screenH}px,
            ${left + screenW}px ${top + screenH}px,
            ${left + screenW}px ${top}px,
            ${left}px ${top}px
          )`,
        }}
      />
      {/* Visual frame border (non-interactive) */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: screenW,
          height: screenH,
          border: `2px solid ${borderColor}`,
          borderRadius: 2,
        }}
      >
        <span
          className="absolute text-white text-[10px] px-1 rounded-sm"
          style={{ top: -18, left: 0, background: 'rgba(0,0,0,0.5)' }}
        >
          🎬 {cameraFrame.aspectRatio}
        </span>
      </div>
      {/* Clickable border edges only — 4 thin hit areas around the frame */}
      {/* Top edge */}
      <div
        className="pointer-events-auto cursor-move"
        style={{
          position: 'absolute',
          left: left - BORDER_HIT,
          top: top - BORDER_HIT,
          width: screenW + BORDER_HIT * 2,
          height: BORDER_HIT * 2,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e);
        }}
      />
      {/* Bottom edge */}
      <div
        className="pointer-events-auto cursor-move"
        style={{
          position: 'absolute',
          left: left - BORDER_HIT,
          top: top + screenH - BORDER_HIT,
          width: screenW + BORDER_HIT * 2,
          height: BORDER_HIT * 2,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e);
        }}
      />
      {/* Left edge */}
      <div
        className="pointer-events-auto cursor-move"
        style={{
          position: 'absolute',
          left: left - BORDER_HIT,
          top: top + BORDER_HIT,
          width: BORDER_HIT * 2,
          height: screenH - BORDER_HIT * 2,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e);
        }}
      />
      {/* Right edge */}
      <div
        className="pointer-events-auto cursor-move"
        style={{
          position: 'absolute',
          left: left + screenW - BORDER_HIT,
          top: top + BORDER_HIT,
          width: BORDER_HIT * 2,
          height: screenH - BORDER_HIT * 2,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e);
        }}
      />
      {/* Resize handles (corners) — only when selected */}
      {isSelected &&
        ['nw', 'ne', 'sw', 'se'].map((corner) => {
          const isRight = corner.includes('e');
          const isBottom = corner.includes('s');
          const hx = isRight ? left + screenW - 5 : left - 5;
          const hy = isBottom ? top + screenH - 5 : top - 5;
          return (
            <div
              key={corner}
              className="pointer-events-auto absolute w-2.5 h-2.5 bg-white border-2 border-red-500 rounded-sm"
              style={{
                left: hx,
                top: hy,
                cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, `resize-${corner}`);
              }}
            />
          );
        })}
    </div>
  );
}

export function AnimationPreview({
  scene,
  targets,
  frameState,
  currentTime: _currentTime,
  selectedElementIds,
  cameraFrame,
  onSelectElements,
  onDragElement,
  onResizeElement,
  className = '',
}: AnimationPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elementGroupMap = useRef<Map<string, SVGGElement>>(new Map());
  const bboxCenterCache = useRef<Map<string, { cx: number; cy: number }>>(new Map());
  const origTransformCache = useRef<Map<string, string | null>>(new Map());
  const elementsRef = useRef<NonDeletedExcalidrawElement[]>([]);

  // Canvas viewport state (pan/zoom)
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Interaction refs
  const pointerDownRef = useRef<PointerDownState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const [marqueeVisual, setMarqueeVisual] = useState<MarqueeState | null>(null);
  const suppressClickRef = useRef(false);
  const resizeRef = useRef<{
    targetId: string;
    corner: string;
    startX: number;
    startY: number;
  } | null>(null);
  // Counter to trigger re-render of handle overlays during drag
  const [dragTick, setDragTick] = useState(0);
  // Live camera frame drag offset (scene units) for realtime overlay update
  const [camDragOffset, setCamDragOffset] = useState<{
    dx: number;
    dy: number;
    dScale: number;
  } | null>(null);

  // Canvas zoom (scroll wheel) and pan (middle-click or Space+drag)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setViewport((v) => {
      const newZoom = Math.max(0.1, Math.min(10, v.zoom * factor));
      // Zoom toward cursor position
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...v, zoom: newZoom };
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const scale = newZoom / v.zoom;
      return {
        zoom: newZoom,
        panX: cx - (cx - v.panX) * scale,
        panY: cy - (cy - v.panY) * scale,
      };
    });
  }, []);

  // Middle-click or Space+click to pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMDown = (e: MouseEvent) => {
      if (e.button === 1) {
        // middle click
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: viewport.panX,
          panY: viewport.panY,
        };
      }
    };
    const handleMMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewport((v) => ({
          ...v,
          panX: panStartRef.current.panX + dx,
          panY: panStartRef.current.panY + dy,
        }));
      }
    };
    const handleMUp = () => {
      isPanningRef.current = false;
    };

    container.addEventListener('mousedown', handleMDown);
    document.addEventListener('mousemove', handleMMove);
    document.addEventListener('mouseup', handleMUp);
    return () => {
      container.removeEventListener('mousedown', handleMDown);
      document.removeEventListener('mousemove', handleMMove);
      document.removeEventListener('mouseup', handleMUp);
    };
  }, [viewport.panX, viewport.panY]);

  // Camera frame mouse handler — select and start drag/resize
  const handleCameraFrameMouseDown = useCallback(
    (e: React.MouseEvent, handle?: string) => {
      onSelectElements([CAMERA_FRAME_TARGET_ID]);
      suppressClickRef.current = true;

      if (handle?.startsWith('resize-')) {
        const startX = e.clientX;
        const startY = e.clientY;
        const corner = handle.replace('resize-', '');

        const computeDScale = (mx: number, my: number) => {
          const dx = mx - startX;
          const dy = my - startY;
          // Use the dominant axis for smooth diagonal dragging
          // SE/NE: right/down = bigger frame = more positive dScale
          // NW/SW: left/up = bigger frame = more positive dScale
          const isRight = corner.includes('e');
          const isBottom = corner.includes('s');
          const primaryDelta = isRight ? dx : -dx;
          const secondaryDelta = isBottom ? dy : -dy;
          return (primaryDelta + secondaryDelta) / 2 / 150;
        };

        const handleMouseMove = (me: MouseEvent) => {
          setCamDragOffset({ dx: 0, dy: 0, dScale: computeDScale(me.clientX, me.clientY) });
        };
        const handleMouseUp = (me: MouseEvent) => {
          const dScale = computeDScale(me.clientX, me.clientY);
          if (Math.abs(dScale) > 0.005) {
            onResizeElement(CAMERA_FRAME_TARGET_ID, dScale, dScale);
          }
          setCamDragOffset(null);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      } else {
        // Start drag — handled by the main drag system
        dragRef.current = {
          targetIds: [CAMERA_FRAME_TARGET_ID],
          startX: e.clientX,
          startY: e.clientY,
        };
      }

      e.preventDefault();
    },
    [onSelectElements, onResizeElement],
  );

  // ---------- SVG Rendering ----------

  const renderScene = useCallback(async () => {
    if (!scene || scene.elements.length === 0) {
      setSvgNode(null);
      return;
    }
    try {
      const elements = getNonDeletedElements(
        scene.elements as ExcalidrawElement[],
      ) as NonDeletedExcalidrawElement[];
      if (elements.length === 0) {
        setSvgNode(null);
        return;
      }
      elementsRef.current = elements;

      const svg = await exportToSvg({
        elements,
        files: scene.files ?? {},
        appState: { ...scene.appState, exportBackground: true },
        exportPadding: 30,
      });

      // Map SVG <g> elements to Excalidraw element IDs.
      // Excalidraw's exportToSvg may reorder elements (e.g., bound text is placed
      // next to its container). We can't rely on index-based mapping.
      // Instead, match by analyzing SVG content type and pairing with elements.
      const gElements = Array.from(svg.children).filter(
        (c): c is SVGGElement =>
          c instanceof SVGElement && (c.tagName === 'g' || c.tagName === 'use'),
      );

      const map = new Map<string, SVGGElement>();

      if (gElements.length === elements.length) {
        // Same count — try 1:1 mapping first (fast path)
        let allMatch = true;
        for (let i = 0; i < gElements.length; i++) {
          if (!svgContentMatchesElement(gElements[i], elements[i])) {
            allMatch = false;
            break;
          }
        }

        if (allMatch) {
          // Perfect 1:1 alignment
          gElements.forEach((g, i) => {
            g.setAttribute('data-element-id', elements[i].id);
            g.style.cursor = 'pointer';
            map.set(elements[i].id, g);
          });
        } else {
          // Reordered — use greedy matching
          matchSvgToElements(gElements, elements, map);
        }
      } else {
        // Different counts — use greedy matching
        matchSvgToElements(gElements, elements, map);
      }

      // Wrap group members in <g> elements for correct CSS transform cascade
      wrapGroupsInSvg(map, targets);

      elementGroupMap.current = map;
      setSvgNode(svg);
      setError(null);
    } catch (e) {
      console.error('Failed to render scene:', e);
      setError(e instanceof Error ? e.message : 'Failed to render');
    }
  }, [scene, targets]);

  useEffect(() => {
    renderScene();
  }, [renderScene]);

  // Insert SVG into DOM
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || !svgNode) return;
    // Clear any previous content safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    // Let SVG render at natural size — viewport transform handles zoom/pan
    // Allow overflow so dragged elements beyond the original scene bounds stay visible
    svgNode.style.overflow = 'visible';
    container.appendChild(svgNode);

    // Cache bbox centers and original transforms for all mapped elements
    requestAnimationFrame(() => {
      const bboxCache = new Map<string, { cx: number; cy: number }>();
      const origCache = new Map<string, string | null>();
      for (const [id, gEl] of elementGroupMap.current) {
        origCache.set(id, gEl.getAttribute('transform'));
        try {
          const box = (gEl as SVGGraphicsElement).getBBox();
          bboxCache.set(id, { cx: box.x + box.width / 2, cy: box.y + box.height / 2 });
        } catch {
          /* ignore */
        }
      }
      bboxCenterCache.current = bboxCache;
      origTransformCache.current = origCache;
    });

    return () => {
      // Only remove the SVG node we added, not innerHTML
      // (wrapGroupsInSvg may have reparented child nodes)
      if (svgNode.parentElement === container) {
        container.removeChild(svgNode);
      }
    };
  }, [svgNode]);

  // ---------- Apply animation by rendering to canvas (fast, Excalidraw-quality) ----------

  const applyTransforms = useCallback(async () => {
    if (!scene || scene.elements.length === 0) return;
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;

    const ghostMode = useUIStore.getState().ghostMode;
    const GHOST_MIN_OPACITY = 0.15;

    const elements = getNonDeletedElements(
      scene.elements as ExcalidrawElement[],
    ) as NonDeletedExcalidrawElement[];

    // Apply animation transforms to element clones
    const animated = applyAnimationToElements(elements, frameState, targets);

    // Ghost mode: ensure hidden elements have minimum visible opacity
    if (ghostMode) {
      for (let i = 0; i < animated.length; i++) {
        const el = animated[i] as any;
        if ((el.opacity ?? 100) < 15) {
          animated[i] = { ...el, opacity: 15 } as ExcalidrawElement;
        }
      }
    }

    // Render via Excalidraw's native Canvas2D renderer (fast, no DOM manipulation)
    try {
      const srcCanvas = await exportToCanvas({
        elements: animated,
        files: scene.files ?? {},
        appState: { exportBackground: true },
        exportPadding: 30,
      });

      // Size canvas to match the source
      canvas.width = srcCanvas.width;
      canvas.height = srcCanvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(srcCanvas, 0, 0);
      }

      // Hide the SVG layer and show canvas (keep SVG for hit testing)
      const svgContainer = svgContainerRef.current;
      if (svgContainer) svgContainer.style.opacity = '0';
      canvas.style.opacity = '1';
    } catch (e) {
      console.error('Animation render failed:', e);
    }
  }, [scene, frameState, selectedElementIds, targets]);

  const renderRequestRef = useRef<number | null>(null);

  useEffect(() => {
    // Schedule render on next animation frame
    if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
    renderRequestRef.current = requestAnimationFrame(() => {
      applyTransforms();
    });
    return () => {
      if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
    };
  }, [applyTransforms]);

  // Re-apply transforms when ghost mode toggles
  useEffect(() => {
    return useUIStore.subscribe((s, prev) => {
      if (s.ghostMode !== prev.ghostMode) applyTransforms();
    });
  }, [applyTransforms]);

  // ---------- Find element from DOM ----------

  const findElementId = useCallback((target: Element): string | null => {
    let el: Element | null = target;
    while (el && el !== svgContainerRef.current) {
      if (el instanceof SVGElement && el.getAttribute('data-element-id')) {
        return el.getAttribute('data-element-id');
      }
      el = el.parentElement;
    }
    return null;
  }, []);

  // ---------- Mouse event handlers ----------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      suppressClickRef.current = false;
      const elementId = findElementId(e.target as Element);
      pointerDownRef.current = {
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey,
      };
      e.preventDefault();
    },
    [findElementId],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const elementId = findElementId(e.target as Element);
      if (!elementId) return;
      const currentSelection = selectedElementIds[0];
      if (currentSelection) {
        onSelectElements([drillDown(currentSelection, elementId, targets)]);
      } else {
        onSelectElements([elementId]);
      }
    },
    [findElementId, targets, selectedElementIds, onSelectElements],
  );

  // Global mouse move / up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pd = pointerDownRef.current;
      if (!pd) return;

      const dx = e.clientX - pd.startX;
      const dy = e.clientY - pd.startY;

      // Haven't started gesture yet — check threshold
      if (!dragRef.current && !marqueeRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

        if (pd.elementId) {
          // Start element drag
          const topId = findTopmostGroup(pd.elementId, targets);
          let dragTargets: string[];
          if (pd.shiftKey) {
            dragTargets = selectedElementIds.includes(topId)
              ? [...selectedElementIds]
              : [...selectedElementIds, topId];
            if (!selectedElementIds.includes(topId)) onSelectElements(dragTargets);
          } else if (selectedElementIds.includes(topId)) {
            dragTargets = [...selectedElementIds];
          } else {
            dragTargets = [topId];
            onSelectElements(dragTargets);
          }
          dragRef.current = { targetIds: dragTargets, startX: pd.startX, startY: pd.startY };
          // Show SVG for drag feedback, hide canvas
          const svgCont = svgContainerRef.current;
          const canvasEl = canvasOverlayRef.current;
          if (svgCont) svgCont.style.opacity = '1';
          if (canvasEl) canvasEl.style.opacity = '0';
        } else {
          // Start marquee
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const m: MarqueeState = {
              startX: pd.startX - rect.left,
              startY: pd.startY - rect.top,
              currentX: e.clientX - rect.left,
              currentY: e.clientY - rect.top,
            };
            marqueeRef.current = m;
            setMarqueeVisual({ ...m });
          }
        }
        return;
      }

      // Active drag — apply visual feedback directly to target (group wrapper or element)
      if (dragRef.current) {
        // Convert screen pixels to scene-space pixels by dividing by viewport zoom
        const dragDx = (e.clientX - dragRef.current.startX) / viewport.zoom;
        const dragDy = (e.clientY - dragRef.current.startY) / viewport.zoom;
        const isCameraDrag = dragRef.current.targetIds.includes(CAMERA_FRAME_TARGET_ID);

        for (const selId of dragRef.current.targetIds) {
          if (selId === CAMERA_FRAME_TARGET_ID) {
            // Camera frame has no SVG element — update overlay via state
            setCamDragOffset({ dx: dragDx, dy: dragDy, dScale: 0 });
            continue;
          }
          const gEl = elementGroupMap.current.get(selId);
          if (gEl) {
            const state = frameState.get(selId);
            const tx = (state?.translateX ?? 0) + dragDx;
            const ty = (state?.translateY ?? 0) + dragDy;
            const rot = state?.rotation ?? 0;
            const sx = state?.scaleX ?? 1;
            const sy = state?.scaleY ?? 1;
            const center = bboxCenterCache.current.get(selId);
            const cx = center?.cx ?? 0;
            const cy = center?.cy ?? 0;
            const orig = origTransformCache.current.get(selId) ?? '';
            const animParts: string[] = [];
            if (tx !== 0 || ty !== 0) animParts.push(`translate(${tx} ${ty})`);
            if (rot !== 0) animParts.push(`rotate(${rot} ${cx} ${cy})`);
            if (sx !== 1 || sy !== 1)
              animParts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
            gEl.setAttribute(
              'transform',
              orig ? `${animParts.join(' ')} ${orig}` : animParts.join(' '),
            );
            gEl.style.transform = '';
          }
        }
        // Trigger re-render so handle overlays update
        if (!isCameraDrag) setDragTick((n) => n + 1);
      }

      // Active marquee
      if (marqueeRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const updated: MarqueeState = {
            ...marqueeRef.current,
            currentX: e.clientX - rect.left,
            currentY: e.clientY - rect.top,
          };
          marqueeRef.current = updated;
          setMarqueeVisual({ ...updated });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const pd = pointerDownRef.current;
      pointerDownRef.current = null;

      // Commit drag
      if (dragRef.current) {
        const dx = (e.clientX - dragRef.current.startX) / viewport.zoom;
        const dy = (e.clientY - dragRef.current.startY) / viewport.zoom;
        if (
          Math.abs(dx) > DRAG_THRESHOLD / viewport.zoom ||
          Math.abs(dy) > DRAG_THRESHOLD / viewport.zoom
        ) {
          for (const selId of dragRef.current.targetIds) {
            onDragElement(selId, dx, dy);
          }
        }
        dragRef.current = null;
        setDragTick(0);
        setCamDragOffset(null);
        // Don't restore SVG/canvas visibility here — applyTransforms will handle it
        // after canvas re-renders with committed state (avoids flash of stale canvas)
        suppressClickRef.current = true;
        return;
      }

      // Commit marquee
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        const left = Math.min(m.startX, m.currentX);
        const top = Math.min(m.startY, m.currentY);
        const right = Math.max(m.startX, m.currentX);
        const bottom = Math.max(m.startY, m.currentY);
        if (right - left > 5 && bottom - top > 5) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const selected: string[] = [];
            for (const [elementId, gEl] of elementGroupMap.current) {
              // Only check leaf elements, not group wrappers
              if (!gEl.hasAttribute('data-element-id')) continue;
              const bbox = gEl.getBoundingClientRect();
              const elLeft = bbox.left - rect.left;
              const elTop = bbox.top - rect.top;
              const elRight = bbox.right - rect.left;
              const elBottom = bbox.bottom - rect.top;
              if (elRight > left && elLeft < right && elBottom > top && elTop < bottom) {
                const topId = findTopmostGroup(elementId, targets);
                if (!selected.includes(topId)) selected.push(topId);
              }
            }
            onSelectElements(selected);
          }
        }
        marqueeRef.current = null;
        setMarqueeVisual(null);
        suppressClickRef.current = true;
        return;
      }

      // Plain click (no drag / no marquee)
      if (!pd) return;
      const elementId = pd.elementId;
      if (!elementId) {
        onSelectElements([]);
        suppressClickRef.current = true;
        return;
      }

      if (pd.shiftKey) {
        const targetId = findTargetAtSameLevel(elementId, selectedElementIds, targets);
        const newSelection = selectedElementIds.includes(targetId)
          ? selectedElementIds.filter((id) => id !== targetId)
          : [...selectedElementIds, targetId];
        onSelectElements(newSelection);
      } else if (pd.ctrlKey) {
        const topId = findTopmostGroup(elementId, targets);
        const newSelection = selectedElementIds.includes(topId)
          ? selectedElementIds.filter((id) => id !== topId)
          : [...selectedElementIds, topId];
        onSelectElements(newSelection);
      } else {
        onSelectElements([findTopmostGroup(elementId, targets)]);
      }
      suppressClickRef.current = true;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    frameState,
    selectedElementIds,
    targets,
    onDragElement,
    onSelectElements,
    findElementId,
    viewport.zoom,
  ]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.stopPropagation();
    }
  }, []);

  // ---------- Render ----------

  if (!scene || scene.elements.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-[var(--color-text-secondary)] ${className}`}
      >
        <div className="text-center">
          <div className="text-3xl mb-2 opacity-40">🎬</div>
          <p className="text-sm">No scene loaded</p>
          <p className="text-xs mt-1 opacity-60">Import or draw elements in Edit mode</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full text-red-400 ${className}`}>
        <p className="text-sm">Render error: {error}</p>
      </div>
    );
  }

  const marqueeRect = marqueeVisual
    ? {
        left: Math.min(marqueeVisual.startX, marqueeVisual.currentX),
        top: Math.min(marqueeVisual.startY, marqueeVisual.currentY),
        width: Math.abs(marqueeVisual.currentX - marqueeVisual.startX),
        height: Math.abs(marqueeVisual.currentY - marqueeVisual.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white select-none ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      <div
        ref={svgContainerRef}
        className="absolute"
        style={{
          transformOrigin: '0 0',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      />
      {/* Canvas overlay for Excalidraw-quality animated rendering */}
      <canvas
        ref={canvasOverlayRef}
        className="absolute pointer-events-none"
        style={{
          transformOrigin: '0 0',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      />
      {marqueeRect && marqueeRect.width > 3 && marqueeRect.height > 3 && (
        <div
          className="absolute border-2 border-indigo-400/60 bg-indigo-400/10 pointer-events-none"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
      {/* Camera frame overlay */}
      <CameraFrameOverlay
        cameraFrame={cameraFrame}
        frameState={frameState}
        svgContainerRef={svgContainerRef}
        containerRef={containerRef}
        isSelected={selectedElementIds.includes(CAMERA_FRAME_TARGET_ID)}
        onMouseDown={handleCameraFrameMouseDown}
        viewport={viewport}
        dragOffset={camDragOffset}
      />
      {/* Selection handles for selected elements */}
      {selectedElementIds
        .filter((id) => id !== CAMERA_FRAME_TARGET_ID)
        .map((selId) => {
          // Compute handle position from animated element data + viewport
          const target = targets.find(t => t.id === selId);
          if (!target) return null;

          // Get animated bounds: original bounds + animation offsets
          const state = frameState.get(selId);
          const tx = state?.translateX ?? 0;
          const ty = state?.translateY ?? 0;
          const sx = state?.scaleX ?? 1;
          const sy = state?.scaleY ?? 1;

          const ob = target.originalBounds;
          const animX = ob.x + tx;
          const animY = ob.y + ty;
          const animW = ob.width * sx;
          const animH = ob.height * sy;

          // Compute handle position from animated element data + viewport
          // (SVG is hidden so getBoundingClientRect would be stale — use computed bounds)
          let l: number, t2: number, w: number, h: number;
          l = animX * viewport.zoom + viewport.panX;
          t2 = animY * viewport.zoom + viewport.panY;
          w = animW * viewport.zoom;
          h = animH * viewport.zoom;

          if (w === 0 || h === 0) return null;

          const HANDLES: { id: string; cx: number; cy: number; cursor: string }[] = [
            { id: 'nw', cx: 0, cy: 0, cursor: 'nwse-resize' },
            { id: 'n', cx: 0.5, cy: 0, cursor: 'ns-resize' },
            { id: 'ne', cx: 1, cy: 0, cursor: 'nesw-resize' },
            { id: 'w', cx: 0, cy: 0.5, cursor: 'ew-resize' },
            { id: 'e', cx: 1, cy: 0.5, cursor: 'ew-resize' },
            { id: 'sw', cx: 0, cy: 1, cursor: 'nesw-resize' },
            { id: 's', cx: 0.5, cy: 1, cursor: 'ns-resize' },
            { id: 'se', cx: 1, cy: 1, cursor: 'nwse-resize' },
          ];

          return (
            <div
              key={selId}
              className="pointer-events-none absolute"
              style={{ left: l, top: t2, width: w, height: h }}
            >
              {HANDLES.map((handle) => (
                <div
                  key={handle.id}
                  className="pointer-events-auto absolute w-2 h-2 bg-white border border-indigo-500 rounded-sm"
                  style={{
                    left: handle.cx * w - 4,
                    top: handle.cy * h - 4,
                    cursor: handle.cursor,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    suppressClickRef.current = true;

                    let bboxW = w / viewport.zoom, bboxH = h / viewport.zoom;
                    const gElRef = elementGroupMap.current.get(selId);
                    const origTransform = gElRef?.getAttribute('transform') ?? '';
                    let bCx = 0, bCy = 0;
                    if (gElRef) {
                      try {
                        const box = (gElRef as SVGGraphicsElement).getBBox();
                        bboxW = box.width || bboxW;
                        bboxH = box.height || bboxH;
                        bCx = box.x + box.width / 2;
                        bCy = box.y + box.height / 2;
                      } catch { /* fallback */ }
                    }

                    resizeRef.current = { targetId: selId, corner: handle.id, startX: e.clientX, startY: e.clientY };
                    useUndoRedoStore.getState().pushState();
                    let totalDSx = 0, totalDSy = 0;

                    // Show SVG layer for resize feedback, hide canvas
                    const svgCont = svgContainerRef.current;
                    const canvasEl = canvasOverlayRef.current;
                    if (svgCont) svgCont.style.opacity = '1';
                    if (canvasEl) canvasEl.style.opacity = '0';

                    const handleResizeMove = (me: MouseEvent) => {
                      if (!resizeRef.current) return;
                      const rdx = (me.clientX - resizeRef.current.startX) / viewport.zoom;
                      const rdy = (me.clientY - resizeRef.current.startY) / viewport.zoom;
                      const hid = resizeRef.current.corner;
                      const affX = hid.includes('e') || hid.includes('w');
                      const affY = hid.includes('s') || hid.includes('n');
                      const sgnX = hid.includes('e') ? 1 : hid.includes('w') ? -1 : 0;
                      const sgnY = hid.includes('s') ? 1 : hid.includes('n') ? -1 : 0;
                      let dSx = affX ? sgnX * rdx / Math.max(bboxW, 1) : 0;
                      let dSy = affY ? sgnY * rdy / Math.max(bboxH, 1) : 0;
                      if (me.shiftKey) {
                        const avg = (Math.abs(dSx) + Math.abs(dSy)) / 2;
                        if (affX && affY) { dSx = Math.sign(dSx || 1) * avg; dSy = Math.sign(dSy || 1) * avg; }
                        else if (affX) { dSy = dSx; } else { dSx = dSy; }
                      }
                      if (me.altKey) { dSx *= 2; dSy *= 2; }
                      totalDSx = dSx; totalDSy = dSy;
                      // SVG transform for visual feedback (visible because we showed SVG)
                      if (gElRef) {
                        const nSx = Math.max(0.05, 1 + dSx);
                        const nSy = Math.max(0.05, 1 + dSy);
                        const halfW = bboxW / 2;
                        const halfH = bboxH / 2;
                        const ox = me.altKey ? bCx : (sgnX === 1 ? bCx - halfW : sgnX === -1 ? bCx + halfW : bCx);
                        const oy = me.altKey ? bCy : (sgnY === 1 ? bCy - halfH : sgnY === -1 ? bCy + halfH : bCy);
                        const scalePart = `translate(${ox} ${oy}) scale(${nSx} ${nSy}) translate(${-ox} ${-oy})`;
                        gElRef.setAttribute('transform', `${scalePart} ${origTransform}`);
                      }
                      setDragTick((n) => n + 1);
                    };

                    const handleResizeUp = () => {
                      if (resizeRef.current && (Math.abs(totalDSx) > 0.01 || Math.abs(totalDSy) > 0.01)) {
                        onResizeElement(resizeRef.current.targetId, totalDSx, totalDSy);
                      }
                      // Don't manually swap SVG/canvas visibility here —
                      // applyTransforms handles it after canvas re-renders with committed state
                      resizeRef.current = null;
                      setDragTick(0);
                      document.removeEventListener('mousemove', handleResizeMove);
                      document.removeEventListener('mouseup', handleResizeUp);
                    };
                    document.addEventListener('mousemove', handleResizeMove);
                    document.addEventListener('mouseup', handleResizeUp);
                  }}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}
