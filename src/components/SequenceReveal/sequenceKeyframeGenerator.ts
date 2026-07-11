import type { AnimatableTarget } from '../../types/excalidraw';
import { useAnimationStore } from '../../stores/animationStore';
import {
  createAction,
  updateAction,
} from '../../services/AnimationCommandService';
import type {
  AnimationCommandResult,
  AnimationCommandValue,
} from '../../services/AnimationCommandService';
import type { RevealSequence } from './sequenceStore';

export function applySequenceKeyframes(
  sequence: RevealSequence,
  _targets: AnimatableTarget[],
): AnimationCommandResult<AnimationCommandValue> {
  const draft = {
    type: 'sequence' as const,
    preset: 'sequence-reveal',
    targetIds: sequence.elementIds,
    timing: {
      startMs: sequence.startTime,
      durationMs: sequence.duration,
      staggerMs: sequence.delay,
      startMode: 'absolute' as const,
    },
    easing: 'easeOut' as const,
    parameters: {
      property: sequence.property,
    },
  };
  const existing = useAnimationStore
    .getState()
    .actions.find((action) => action.id === sequence.id);
  if (!existing) {
    return createAction({
      ...draft,
      ...(sequence.id ? { id: sequence.id } : {}),
    });
  }
  return updateAction(existing.id, (action) => ({
    ...action,
    ...draft,
    ownership: action.ownership,
    generatedHash: action.generatedHash,
    status: 'managed',
  }));
}
