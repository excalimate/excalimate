/**
 * SequenceRevealPanel — Create and manage reveal sequence animations.
 */

import type { AnimatableTarget } from '../../types/excalidraw';
import { ActionIcon, Button, CloseButton } from '@mantine/core';
import { IconListDetails, IconPencil, IconX, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
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
      className="absolute right-[290px] top-12 w-[320px] bg-surface border border-border rounded-lg shadow-xl z-50 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-semibold flex items-center gap-1.5"><IconListDetails size={16} /> Sequence Reveal</span>
        <CloseButton onClick={close} />
      </div>

      {/* Existing sequences */}
      {sequences.length > 0 && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Saved Sequences
          </div>
          <div className="space-y-1">
            {sequences.map(seq => (
              <div key={seq.id} className="flex items-center gap-1 px-2 py-1 rounded bg-surface-alt text-xs">
                <span className="flex-1 truncate">{seq.name}</span>
                <span className="text-[9px] text-text-muted">
                  {seq.elementIds.length}el · {seq.startTime}ms
                </span>
                <ActionIcon variant="subtle" color="indigo" size="xs" onClick={() => startEditing(seq)}>
                  <IconPencil size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => deleteSequence(seq.id)}>
                  <IconX size={14} />
                </ActionIcon>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-3 py-2 space-y-2 border-b border-border shrink-0">
        <div className="text-[10px] text-text-muted uppercase tracking-wider">
          {editingId ? 'Edit Sequence' : 'New Sequence'}
          {!editingId && <span className="normal-case"> (starts at {currentTime}ms)</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-muted w-16">Property</label>
          <select
            value={draftProperty}
            onChange={(e) => setDraftProperty(e.target.value as 'opacity' | 'drawProgress')}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-border bg-surface-alt text-text"
          >
            <option value="opacity">Opacity (fade in)</option>
            <option value="drawProgress">Draw Progress (draw in)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-muted w-16">Delay</label>
          <input
            type="number" value={draftDelay} min={0} step={50}
            onChange={(e) => setDraftDelay(Number(e.target.value))}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-border bg-surface-alt text-text"
          />
          <span className="text-[10px] text-text-muted">ms</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-muted w-16">Duration</label>
          <input
            type="number" value={draftDuration} min={50} step={50}
            onChange={(e) => setDraftDuration(Number(e.target.value))}
            className="flex-1 px-1 py-0.5 text-xs rounded border border-border bg-surface-alt text-text"
          />
          <span className="text-[10px] text-text-muted">ms</span>
        </div>
      </div>

      {/* Element order */}
      <div className="px-3 py-2 overflow-y-auto flex-1 min-h-0">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
          Reveal Order ({draftOrder.length} elements)
        </div>
        {draftOrder.length === 0 ? (
          <div className="text-xs text-text-muted py-4 text-center">
            Select elements in the editor
          </div>
        ) : (
          <div className="space-y-0.5">
            {draftOrder.map((id, i) => {
              const t = editingId
                ? (sequences.find((s) => s.id === editingId)?.startTime ?? currentTime)
                : currentTime;
              return (
                <div key={id} className="flex items-center gap-1 px-1.5 py-1 rounded bg-surface-alt text-xs">
                  <span className="text-text-muted w-4 text-center text-[10px]">{i + 1}</span>
                  <span className="flex-1 truncate">{getLabel(id)}</span>
                  <span className="text-[9px] text-text-muted">
                    {t + i * draftDelay}ms
                  </span>
                  <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => moveItem(i, -1)} disabled={i === 0}>
                    <IconArrowUp size={14} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => moveItem(i, 1)} disabled={i === draftOrder.length - 1}>
                    <IconArrowDown size={14} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" size="xs" onClick={() => removeItem(i)}>
                    <IconX size={14} />
                  </ActionIcon>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        {draftOrder.length > 0 && (
          <div className="text-[10px] text-text-muted mb-2">
            Total: {(draftOrder.length - 1) * draftDelay + draftDuration}ms
          </div>
        )}
        <div className="flex gap-2">
          {editingId ? (
            <>
              <Button
                fullWidth
                size="xs"
                onClick={updateSequence}
                disabled={draftOrder.length === 0}
              >
                Update Keyframes
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={cancelEditing}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              fullWidth
              size="xs"
              onClick={createSequence}
              disabled={draftOrder.length === 0}
            >
              Generate at {currentTime}ms
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
