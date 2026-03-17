import { useEffect, useState, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useAnimationStore } from '../../stores/animationStore';

interface HintDef {
  attr: string;
  label: string;
  /** Offset from the anchor point to the label position */
  offset: [number, number];
  /** Which edge of the element the arrow points to */
  anchor: 'bottom' | 'top' | 'left' | 'right';
}

const EDIT_HINTS: HintDef[] = [
  { attr: 'file', label: 'New, import & save', offset: [-40, 80], anchor: 'bottom' },
  { attr: 'tools', label: 'Sequence reveal', offset: [30, 110], anchor: 'bottom' },
  { attr: 'mode', label: 'Pick a mode &\nStart animating!', offset: [0, 160], anchor: 'bottom' },
  { attr: 'ghost', label: 'Preview hidden\nelements', offset: [-50, 110], anchor: 'bottom' },
  { attr: 'live', label: 'Connect to AI', offset: [20, 80], anchor: 'bottom' },
];

const ANIMATE_HINTS: HintDef[] = [
  { attr: 'mode', label: 'Switch to Edit\nto draw shapes', offset: [0, 100], anchor: 'bottom' },
  { attr: 'layers', label: 'Select an\nelement here', offset: [160, 20], anchor: 'right' },
  { attr: 'camera', label: 'Camera frame — drag,\nresize & animate it', offset: [220, 0], anchor: 'right' },
  { attr: 'timeline', label: 'Scrub to preview\n& add keyframes', offset: [60, -90], anchor: 'top' },
];

interface HintPos {
  /** Anchor point on the target element */
  ex: number;
  ey: number;
  /** Label position */
  lx: number;
  ly: number;
  label: string;
  anchor: 'bottom' | 'top' | 'left' | 'right';
}

/**
 * Hand-drawn curved arrows with handwritten labels pointing to UI elements.
 * Shows different hints for Edit vs Animate mode.
 */
export function ToolbarHints() {
  const mode = useUIStore((s) => s.mode);
  const drawToolActive = useUIStore((s) => s.drawToolActive);
  const hasSelection = useUIStore((s) => s.selectedElementIds.length > 0);
  const targets = useProjectStore((s) => s.targets);
  const tracks = useAnimationStore((s) => s.timeline.tracks);
  const [hints, setHints] = useState<HintPos[]>([]);
  const rafRef = useRef(0);

  const hasElements = targets.length > 1;
  const hasTracks = tracks.length > 0;
  // Edit: hide when elements exist or drawing tool active
  // Animate: hide when tracks exist OR user selects an element (they're interacting)
  const visible = mode === 'edit'
    ? !hasElements && !drawToolActive
    : !hasTracks && !hasSelection;

  const measure = useCallback(() => {
    const defs = mode === 'edit' ? EDIT_HINTS : ANIMATE_HINTS;
    const result: HintPos[] = [];
    for (const def of defs) {
      const el = document.querySelector(`[data-hint="${def.attr}"]`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();

      let ex: number, ey: number;
      switch (def.anchor) {
        case 'bottom':
          ex = rect.left + rect.width / 2;
          ey = rect.bottom;
          break;
        case 'top':
          ex = rect.left + rect.width / 2;
          ey = rect.top;
          break;
        case 'right':
          ex = rect.right;
          ey = rect.top + rect.height / 2;
          break;
        case 'left':
          ex = rect.left;
          ey = rect.top + rect.height / 2;
          break;
      }

      result.push({
        ex,
        ey,
        lx: ex + def.offset[0],
        ly: ey + def.offset[1],
        label: def.label,
        anchor: def.anchor,
      });
    }
    setHints(result);
  }, [mode]);

  useEffect(() => {
    if (!visible) return;
    // Measure twice: once immediately, once after a delay for late-rendering elements
    // (e.g. camera frame overlay renders after Excalidraw mounts)
    rafRef.current = requestAnimationFrame(measure);
    const timer = setTimeout(measure, 500);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [visible, measure]);

  if (!visible || hints.length === 0) return null;

  return (
    <svg
      className="fixed inset-0 z-50 pointer-events-none"
      width="100%"
      height="100%"
      style={{ overflow: 'visible' }}
    >
      {hints.map((h) => (
        <HintArrow key={h.label} hint={h} />
      ))}
    </svg>
  );
}

/** Render a single hand-drawn curved arrow + handwritten label */
function HintArrow({ hint }: { hint: HintPos }) {
  const { ex, ey, lx, ly, label, anchor } = hint;
  const lines = label.split('\n');
  const textHeight = lines.length * 20;

  // Arrow start: near the label, with a gap so text doesn't touch the line
  // Arrow end: at the anchor point on the element
  let startX: number, startY: number, endX: number, endY: number;

  switch (anchor) {
    case 'bottom':
      startX = lx;
      startY = ly - 14;
      endX = ex;
      endY = ey + 6;
      break;
    case 'top':
      startX = lx;
      startY = ly + textHeight + 8;
      endX = ex;
      endY = ey - 6;
      break;
    case 'right':
      // Arrow starts to the LEFT of the label text, pointing left toward the element
      startX = lx - 60;
      startY = ly + textHeight / 2;
      endX = ex + 6;
      endY = ey;
      break;
    case 'left':
      startX = lx + 60;
      startY = ly + textHeight / 2;
      endX = ex - 6;
      endY = ey;
      break;
  }

  // Control points for an organic cubic bezier
  const dx = endX - startX;
  const dy = endY - startY;
  // Add wobble when the line would be too straight
  const isVertical = Math.abs(dx) < 80 && Math.abs(dy) > 50;
  const isHorizontal = Math.abs(dy) < 80 && Math.abs(dx) > 50;
  const wobbleX = isVertical ? 45 : 0;
  const wobbleY = isHorizontal ? 40 : 0;

  const cp1x = startX + dx * 0.15 + wobbleX;
  const cp1y = startY + dy * 0.55 + wobbleY;
  const cp2x = startX + dx * 0.75 - wobbleX * 0.5;
  const cp2y = startY + dy * 0.15 - wobbleY * 0.5;

  // Arrowhead from tangent at curve end
  const tx = 3 * (endX - cp2x);
  const ty = 3 * (endY - cp2y);
  const angle = Math.atan2(ty, tx);
  const headLen = 9;
  const headAngle = Math.PI / 5;
  const ax1 = endX - headLen * Math.cos(angle - headAngle);
  const ay1 = endY - headLen * Math.sin(angle - headAngle);
  const ax2 = endX - headLen * Math.cos(angle + headAngle);
  const ay2 = endY - headLen * Math.sin(angle + headAngle);

  return (
    <g>
      <path
        d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d={`M ${ax1} ${ay1} L ${endX} ${endY} L ${ax2} ${ay2}`}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={lx}
          y={ly + i * 20}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          opacity="0.55"
          style={{
            fontFamily: '"Virgil", "Segoe Print", "Comic Sans MS", cursive',
            fontSize: '16px',
            fontWeight: 400,
          }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

