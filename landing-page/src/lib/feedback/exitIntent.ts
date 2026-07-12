export const FEEDBACK_EXIT_INTENT_SESSION_KEY = 'excalimate-feedback-exit-intent-shown';
export const FEEDBACK_EXIT_INTENT_DELAY_MS = 1750;

const EXIT_INTENT_TOP_EDGE_PX = 12;

type ExitIntentPointerEvent = Pick<MouseEvent, 'clientY' | 'relatedTarget'>;

interface ExitIntentContext {
  armed: boolean;
  finePointer: boolean;
  alreadyShown: boolean;
  dialogOpen: boolean;
}

export function isTopEdgeExitIntent(event: ExitIntentPointerEvent): boolean {
  return event.relatedTarget === null && event.clientY <= EXIT_INTENT_TOP_EDGE_PX;
}

export function shouldShowFeedbackExitIntent(
  event: ExitIntentPointerEvent,
  context: ExitIntentContext,
): boolean {
  return (
    context.armed &&
    context.finePointer &&
    !context.alreadyShown &&
    !context.dialogOpen &&
    isTopEdgeExitIntent(event)
  );
}
