import type { EasingType } from '@excalimate/project-schema';
import type { AnimationActionDraft } from './compiler.js';

export const AUTO_ANIMATE_STYLES = [
  'subtle',
  'balanced',
  'energetic',
] as const;

export type AutoAnimateStyle = (typeof AUTO_ANIMATE_STYLES)[number];

export interface TopologyElement {
  id: string;
  type: string;
  x?: number;
  y?: number;
}

export interface AutoAnimationAnalysis {
  strategy: AnimationActionDraft['type'];
  confidence: number;
  reason: string;
  orderedTargetIds: string[];
  draft: AnimationActionDraft;
}

const DRAWABLE_TYPES = new Set(['arrow', 'line', 'freedraw']);

function coordinate(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function timingForStyle(
  style: AutoAnimateStyle,
  targetCount: number,
): {
  durationMs: number;
  staggerMs: number;
  easing: EasingType;
} {
  if (style === 'subtle') {
    return {
      durationMs: 700,
      staggerMs: targetCount > 1 ? 180 : 0,
      easing: 'easeInOut',
    };
  }
  if (style === 'energetic') {
    return {
      durationMs: 360,
      staggerMs: targetCount > 1 ? 140 : 0,
      easing: 'easeOutBack',
    };
  }
  return {
    durationMs: 500,
    staggerMs: targetCount > 1 ? 220 : 0,
    easing: 'easeOut',
  };
}

export function analyzeAnimationTopology(
  elements: readonly TopologyElement[],
  style: AutoAnimateStyle,
): AutoAnimationAnalysis {
  if (elements.length === 0) {
    throw new Error('Auto-animation scope must contain at least one element');
  }

  const ordered = [...elements].sort(
    (left, right) =>
      coordinate(left.y) - coordinate(right.y) ||
      coordinate(left.x) - coordinate(right.x) ||
      left.id.localeCompare(right.id),
  );
  const orderedTargetIds = ordered.map((element) => element.id);
  const timing = timingForStyle(style, ordered.length);
  const baseTiming = {
    startMs: 0,
    durationMs: timing.durationMs,
    staggerMs: timing.staggerMs,
    startMode: 'absolute' as const,
  };

  if (ordered.every((element) => DRAWABLE_TYPES.has(element.type))) {
    return {
      strategy: 'draw',
      confidence: 0.94,
      reason: 'The scoped topology consists entirely of drawable connectors or paths.',
      orderedTargetIds,
      draft: {
        type: 'draw',
        preset: 'draw',
        targetIds: orderedTargetIds,
        timing: baseTiming,
        easing: timing.easing,
        parameters: {},
      },
    };
  }

  if (ordered.length > 1) {
    return {
      strategy: 'sequence',
      confidence: 0.86,
      reason: 'Multiple scoped elements have a deterministic top-to-bottom, left-to-right reading order.',
      orderedTargetIds,
      draft: {
        type: 'sequence',
        preset: `auto-${style}-sequence`,
        targetIds: orderedTargetIds,
        timing: baseTiming,
        easing: timing.easing,
        parameters: { property: 'opacity' },
      },
    };
  }

  const strategy = style === 'energetic' ? 'pop' : 'fade';
  return {
    strategy,
    confidence: 0.8,
    reason:
      strategy === 'pop'
        ? 'A single scoped element with energetic styling is best introduced with a deterministic pop.'
        : 'A single scoped element is best introduced with a deterministic fade.',
    orderedTargetIds,
    draft: {
      type: strategy,
      preset: strategy,
      targetIds: orderedTargetIds,
      timing: baseTiming,
      easing: timing.easing,
      parameters: {},
    },
  };
}
