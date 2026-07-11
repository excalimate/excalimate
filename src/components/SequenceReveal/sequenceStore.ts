import { useMemo } from 'react';
import type { AnimationAction } from '@excalimate/project-schema';
import { useAnimationStore } from '../../stores/animationStore';

export interface RevealSequence {
  id: string;
  name: string;
  elementIds: string[];
  property: 'opacity' | 'drawProgress';
  startTime: number;
  delay: number;
  duration: number;
}

function actionToSequence(
  action: AnimationAction,
  index: number,
): RevealSequence | null {
  if (action.type !== 'sequence') return null;
  const property = action.parameters.property;
  if (property !== 'opacity' && property !== 'drawProgress') return null;
  return {
    id: action.id,
    name: `Sequence ${index + 1}`,
    elementIds: [...action.targetIds],
    property,
    startTime: action.timing.startMs,
    delay: action.timing.staggerMs,
    duration: action.timing.durationMs,
  };
}

export function getSequences(): RevealSequence[] {
  return useAnimationStore
    .getState()
    .actions.map(actionToSequence)
    .filter((sequence): sequence is RevealSequence => sequence !== null);
}

export function useSequences(): RevealSequence[] {
  const actions = useAnimationStore((state) => state.actions);
  return useMemo(
    () =>
      actions
      .map(actionToSequence)
      .filter((sequence): sequence is RevealSequence => sequence !== null),
    [actions],
  );
}
