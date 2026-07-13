import type { ActionMove } from './sequenceModel';

export const SEQUENCE_MOVE_REQUEST_EVENT = 'excalimate:sequence-move-request';

export interface SequenceMoveRequest {
  actionId: string;
  move: ActionMove;
}

export function requestFocusedSequenceMove(move: ActionMove): void {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;
  const row = activeElement.closest<HTMLElement>('[data-sequence-action-id]');
  const actionId = row?.dataset['sequenceActionId'];
  if (!actionId) return;
  window.dispatchEvent(
    new CustomEvent<SequenceMoveRequest>(SEQUENCE_MOVE_REQUEST_EVENT, {
      detail: { actionId, move },
    }),
  );
}
