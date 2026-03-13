/**
 * SequenceRevealPanel — Create and manage reveal sequence animations.
 *
 * Sequences are stored so delay/duration can be updated later,
 * automatically regenerating the keyframes.
 */

import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { AnimatableTarget } from '../../types/excalidraw';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useUIStore } from '../../stores/uiStore';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';

// ── Stored sequence definition ───────────────────────────────────

export interface RevealSequence {
  id: string;
  name: string;
  elementIds: string[];
  property: 'opacity' | 'drawProgress';
  startTime: number;
  delay: number;
  duration: number;
}

// Simple module-level store for sequences (persists across panel open/close)
let _sequences: RevealSequence[] = [];
let _listeners: Array<() => void> = [];

function getSequences(): RevealSequence[] { return _sequences; }

function setSequences(seqs: RevealSequence[]) {
  _sequences = seqs;
  _listeners.forEach(fn => fn());
}

function useSequences(): RevealSequence[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);
  return _sequences;
}

// ── Keyframe generation ──────────────────────────────────────────

function applySequenceKeyframes(seq: RevealSequence, targets: AnimatableTarget[]) {
  const store = useAnimationStore.getState();

  for (let i = 0; i < seq.elementIds.length; i++) {
    const targetId = seq.elementIds[i];
    const target = targets.find(t => t.id === targetId);
    if (!target) continue;

    const revealStart = seq.startTime + i * seq.delay;
    const revealEnd = revealStart + seq.duration;

    // Ensure track exists
    let track = store.timeline.tracks.find(
      t => t.targetId === targetId && t.property === seq.property,
    );
    if (!track) {
      store.addTrack(targetId, target.type, seq.property);
      track = useAnimationStore.getState().timeline.tracks.find(
        t => t.targetId === targetId && t.property === seq.property,
      );
    }
    if (!track) continue;

    // Clear existing keyframes
    const currentTrack = useAnimationStore.getState().timeline.tracks.find(t => t.id === track!.id);
    if (currentTrack) {
      for (const kf of [...currentTrack.keyframes]) {
        useAnimationStore.getState().removeKeyframe(track!.id, kf.id);
      }
    }

    // Generate: hidden(0) at t=0 → hidden(0) at reveal start → visible(1) at reveal end
    if (revealStart > 0) {
      useAnimationStore.getState().addKeyframe(track.id, 0, 0);
    }
    if (revealStart > 10) {
      useAnimationStore.getState().addKeyframe(track.id, revealStart, 0);
    }
    useAnimationStore.getState().addKeyframe(track.id, revealEnd, 1, 'easeOut');
  }
}

// ── Panel props & component ──────────────────────────────────────

interface SequenceRevealPanelProps {
  targets: AnimatableTarget[];
  selectedElementIds: string[];
}

export function SequenceRevealPanel({ targets, selectedElementIds }: SequenceRevealPanelProps) {
  const sequences = useSequences();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftDelay, setDraftDelay] = useState(300);
  const [draftDuration, setDraftDuration] = useState(500);
  const [draftProperty, setDraftProperty] = useState<'opacity' | 'drawProgress'>('opacity');

  // Track selection into draft order
  useEffect(() => {
    if (editingId) return; // Don't modify while editing existing sequence
    const validIds = selectedElementIds.filter(
      id => id !== CAMERA_FRAME_TARGET_ID && targets.some(t => t.id === id),
    );
    setDraftOrder(prev => {
      const existing = new Set(prev);
      const newIds = validIds.filter(id => !existing.has(id));
      const kept = prev.filter(id => validIds.includes(id));
      return [...kept, ...newIds];
    });
  }, [selectedElementIds, targets, editingId]);

  const getLabel = (id: string): string => {
    return targets.find(t => t.id === id)?.label ?? id.slice(0, 10);
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const arr = [...draftOrder];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    setDraftOrder(arr);
  };

  const removeItem = (index: number) => {
    setDraftOrder(prev => prev.filter((_, i) => i !== index));
  };

  // ── Create new sequence ────────────────────────────────────────

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

  // ── Edit existing sequence ─────────────────────────────────────

  const startEditing = (seq: RevealSequence) => {
    setEditingId(seq.id);
    setDraftOrder([...seq.elementIds]);
    setDraftDelay(seq.delay);
    setDraftDuration(seq.duration);
    setDraftProperty(seq.property);
  };

  const updateSequence = useCallback(() => {
    if (!editingId) return;
    const existing = getSequences().find(s => s.id === editingId);
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
    setSequences(getSequences().map(s => s.id === editingId ? updated : s));
    setEditingId(null);
    setDraftOrder([]);
  }, [editingId, draftOrder, draftDelay, draftDuration, draftProperty, targets]);

  const deleteSequence = (id: string) => {
    setSequences(getSequences().filter(s => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraftOrder([]);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftOrder([]);
  };

  const close = () => useUIStore.getState().toggleSequenceReveal();

  const currentTime = Math.round(usePlaybackStore.getState().currentTime);

  return (
    <div
      className="absolute right-[290px] top-12 w-[320px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-sm font-semibold">🎬 Sequence Reveal</span>
        <button onClick={close} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-lg leading-none">×</button>
      </div>

      {/* Existing sequences */}
      {sequences.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--color-border)] shrink-0">
          <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            Saved Sequences
          </div>
          <div className="space-y-1">
            {sequences.map(seq => (
              <div key={seq.id} className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-surface-secondary)] text-xs">
                <span className="flex-1 truncate">{seq.name}</span>
                <span className="text-[9px] text-[var(--color-text-secondary)]">
                  {seq.elementIds.length}el · {seq.startTime}ms
                </span>
                <button
                  onClick={() => startEditing(seq)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 px-1"
                >✎</button>
                <button
                  onClick={() => deleteSequence(seq.id)}
                  className="text-[10px] text-[var(--color-text-secondary)] hover:text-red-400 px-1"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-3 py-2 space-y-2 border-b border-[var(--color-border)] shrink-0">
        <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">
          {editingId ? 'Edit Sequence' : 'New Sequence'}
          {!editingId && <span className="normal-case"> (starts at {currentTime}ms)</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--color-text-secondary)] w-16">Property</label>
          <select
            value={draftProperty}
            onChange={(e) => setDraftProperty(e.target.value as 'opacity' | 'drawProgress')}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]"
          >
            <option value="opacity">Opacity (fade in)</option>
            <option value="drawProgress">Draw Progress (draw in)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--color-text-secondary)] w-16">Delay</label>
          <input
            type="number" value={draftDelay} min={0} step={50}
            onChange={(e) => setDraftDelay(Number(e.target.value))}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]"
          />
          <span className="text-[10px] text-[var(--color-text-secondary)]">ms</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--color-text-secondary)] w-16">Duration</label>
          <input
            type="number" value={draftDuration} min={50} step={50}
            onChange={(e) => setDraftDuration(Number(e.target.value))}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]"
          />
          <span className="text-[10px] text-[var(--color-text-secondary)]">ms</span>
        </div>
      </div>

      {/* Element order */}
      <div className="px-3 py-2 overflow-y-auto flex-1 min-h-0">
        <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
          Reveal Order ({draftOrder.length} elements)
        </div>
        {draftOrder.length === 0 ? (
          <div className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
            Select elements in the editor
          </div>
        ) : (
          <div className="space-y-0.5">
            {draftOrder.map((id, i) => {
              const t = editingId ? (getSequences().find(s => s.id === editingId)?.startTime ?? currentTime) : currentTime;
              return (
                <div key={id} className="flex items-center gap-1 px-1.5 py-1 rounded bg-[var(--color-surface-secondary)] text-xs">
                  <span className="text-[var(--color-text-secondary)] w-4 text-center text-[10px]">{i + 1}</span>
                  <span className="flex-1 truncate">{getLabel(id)}</span>
                  <span className="text-[9px] text-[var(--color-text-secondary)]">
                    {t + i * draftDelay}ms
                  </span>
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0}
                    className="w-4 h-4 text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30">↑</button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === draftOrder.length - 1}
                    className="w-4 h-4 text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30">↓</button>
                  <button onClick={() => removeItem(i)}
                    className="w-4 h-4 text-[10px] text-[var(--color-text-secondary)] hover:text-red-400">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-[var(--color-border)] shrink-0">
        {draftOrder.length > 0 && (
          <div className="text-[10px] text-[var(--color-text-secondary)] mb-2">
            Total: {(draftOrder.length - 1) * draftDelay + draftDuration}ms
          </div>
        )}
        <div className="flex gap-2">
          {editingId ? (
            <>
              <button
                onClick={updateSequence}
                disabled={draftOrder.length === 0}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 transition-colors"
              >
                Update Keyframes
              </button>
              <button
                onClick={cancelEditing}
                className="px-3 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={createSequence}
              disabled={draftOrder.length === 0}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 transition-colors"
            >
              Generate at {currentTime}ms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
