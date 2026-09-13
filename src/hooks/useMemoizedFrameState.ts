import { useRef } from 'react';
import type { FrameState, ElementAnimationState } from '../types/animation';

/**
 * Memoized frame state that only triggers re-renders when
 * individual element states actually change.
 */
export function useMemoizedFrameState(frameState: FrameState): FrameState {
  const prevRef = useRef<FrameState>(new Map());

  // Check if any values actually changed
  let hasChanged = frameState.size !== prevRef.current.size;

  if (!hasChanged) {
    for (const [id, state] of frameState) {
      const prev = prevRef.current.get(id);
      if (!prev || !statesEqual(prev, state)) {
        hasChanged = true;
        break;
      }
    }
  }

  if (hasChanged) {
    prevRef.current = frameState;
  }

  return prevRef.current;
}

function statesEqual(a: ElementAnimationState, b: ElementAnimationState): boolean {
  return (
    a.opacity === b.opacity &&
    a.translateX === b.translateX &&
    a.translateY === b.translateY &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY &&
    a.rotation === b.rotation
  );
}
