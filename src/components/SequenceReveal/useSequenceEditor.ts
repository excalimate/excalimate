import { useCallback, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import type { AnimatableTarget } from '../../types/excalidraw';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { applySequenceKeyframes } from './sequenceKeyframeGenerator';
import {
  getSequences,
  setSequences,
  useSequences,
  type RevealSequence,
} from './sequenceStore';

export function useSequenceEditor(params: {
  targets: AnimatableTarget[];
  selectedElementIds: string[];
}) {
  const { targets, selectedElementIds } = params;
  const sequences = useSequences();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftDelay, setDraftDelay] = useState(300);
  const [draftDuration, setDraftDuration] = useState(500);
  const [draftProperty, setDraftProperty] = useState<'opacity' | 'drawProgress'>('opacity');

  useEffect(() => {
    if (editingId) return;
    const validIds = selectedElementIds.filter(
      (id) => id !== CAMERA_FRAME_TARGET_ID && targets.some((t) => t.id === id),
    );
    setDraftOrder((prev) => {
      const existing = new Set(prev);
      const newIds = validIds.filter((id) => !existing.has(id));
      const kept = prev.filter((id) => validIds.includes(id));
      return [...kept, ...newIds];
    });
  }, [selectedElementIds, targets, editingId]);

  const getLabel = (id: string): string => {
    return targets.find((t) => t.id === id)?.label ?? id.slice(0, 10);
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const arr = [...draftOrder];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    setDraftOrder(arr);
  };

  const removeItem = (index: number) => {
    setDraftOrder((prev) => prev.filter((_, i) => i !== index));
  };

  const createSequence = useCallback(() => {
    if (draftOrder.length === 0) return;

    useUndoRedoStore.getState().pushState();
    const startTime = Math.round(usePlaybackStore.getState().currentTime);

    const seq: RevealSequence = {
      id: nanoid(8),
      name: `Sequence ${sequences.length + 1}`,
      elementIds: [...draftOrder],
      property: draftProperty,
      startTime,
      delay: draftDelay,
      duration: draftDuration,
    };

    applySequenceKeyframes(seq, targets);
    setSequences([...getSequences(), seq]);
    setDraftOrder([]);
    computeFrameAtTime(startTime);
  }, [draftOrder, draftDelay, draftDuration, draftProperty, sequences.length, targets]);

  const startEditing = (seq: RevealSequence) => {
    setEditingId(seq.id);
    setDraftOrder([...seq.elementIds]);
    setDraftDelay(seq.delay);
    setDraftDuration(seq.duration);
    setDraftProperty(seq.property);
  };

  const updateSequence = useCallback(() => {
    if (!editingId) return;
    const existing = getSequences().find((s) => s.id === editingId);
    if (!existing) return;

    useUndoRedoStore.getState().pushState();

    const updated: RevealSequence = {
      ...existing,
      elementIds: [...draftOrder],
      delay: draftDelay,
      duration: draftDuration,
      property: draftProperty,
    };

    applySequenceKeyframes(updated, targets);
    setSequences(getSequences().map((s) => (s.id === editingId ? updated : s)));
    setEditingId(null);
    setDraftOrder([]);
  }, [editingId, draftOrder, draftDelay, draftDuration, draftProperty, targets]);

  const deleteSequence = (id: string) => {
    setSequences(getSequences().filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraftOrder([]);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftOrder([]);
  };

  const currentTime = Math.round(usePlaybackStore.getState().currentTime);

  return {
    sequences,
    editingId,
    draftOrder,
    draftDelay,
    draftDuration,
    draftProperty,
    setDraftDelay,
    setDraftDuration,
    setDraftProperty,
    getLabel,
    moveItem,
    removeItem,
    createSequence,
    startEditing,
    updateSequence,
    deleteSequence,
    cancelEditing,
    currentTime,
  };
}
