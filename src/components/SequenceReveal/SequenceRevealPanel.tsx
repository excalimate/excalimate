/**
 * SequenceRevealPanel — Create and manage reveal sequence animations.
 */

import type { AnimatableTarget } from '../../types/excalidraw';
import { useUIStore } from '../../stores/uiStore';
import { useSequenceEditor } from './useSequenceEditor';
export type { RevealSequence } from './sequenceStore';

// ── Panel props & component ──────────────────────────────────────

interface SequenceRevealPanelProps {
  targets: AnimatableTarget[];
  selectedElementIds: string[];
}

export function SequenceRevealPanel({ targets, selectedElementIds }: SequenceRevealPanelProps) {
  const {
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
  } = useSequenceEditor({ targets, selectedElementIds });

  const close = () => useUIStore.getState().toggleSequenceReveal();

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
              const t = editingId
                ? (sequences.find((s) => s.id === editingId)?.startTime ?? currentTime)
                : currentTime;
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
