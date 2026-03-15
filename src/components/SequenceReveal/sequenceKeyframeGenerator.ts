import type { AnimatableTarget } from '../../types/excalidraw';
import { useAnimationStore } from '../../stores/animationStore';
import type { RevealSequence } from './sequenceStore';

export function applySequenceKeyframes(seq: RevealSequence, targets: AnimatableTarget[]): void {
  const store = useAnimationStore.getState();

  for (let i = 0; i < seq.elementIds.length; i++) {
    const targetId = seq.elementIds[i];
    const target = targets.find((t) => t.id === targetId);
    if (!target) continue;

    const revealStart = seq.startTime + i * seq.delay;
    const revealEnd = revealStart + seq.duration;

    let track = store.timeline.tracks.find(
      (t) => t.targetId === targetId && t.property === seq.property,
    );
    if (!track) {
      store.addTrack(targetId, target.type, seq.property);
      track = useAnimationStore.getState().timeline.tracks.find(
        (t) => t.targetId === targetId && t.property === seq.property,
      );
    }
    if (!track) continue;

    const currentTrack = useAnimationStore.getState().timeline.tracks.find((t) => t.id === track!.id);
    if (currentTrack) {
      for (const kf of [...currentTrack.keyframes]) {
        useAnimationStore.getState().removeKeyframe(track!.id, kf.id);
      }
    }

    if (revealStart > 0) {
      useAnimationStore.getState().addKeyframe(track.id, 0, 0);
    }
    if (revealStart > 10) {
      useAnimationStore.getState().addKeyframe(track.id, revealStart, 0);
    }
    useAnimationStore.getState().addKeyframe(track.id, revealEnd, 1, 'easeOut');
  }
}
