import { describe, expect, it } from 'vitest';
import { isTopEdgeExitIntent, shouldShowFeedbackExitIntent } from './exitIntent';

const exitEvent = {
  clientY: 0,
  relatedTarget: null,
};

describe('isTopEdgeExitIntent', () => {
  it('detects the pointer leaving through the top edge', () => {
    expect(isTopEdgeExitIntent(exitEvent)).toBe(true);
  });

  it('ignores pointer movement within the document', () => {
    expect(isTopEdgeExitIntent({ clientY: 0, relatedTarget: document.body })).toBe(false);
  });

  it('ignores exits away from the top edge', () => {
    expect(isTopEdgeExitIntent({ clientY: 80, relatedTarget: null })).toBe(false);
  });
});

describe('shouldShowFeedbackExitIntent', () => {
  const readyContext = {
    armed: true,
    finePointer: true,
    alreadyShown: false,
    dialogOpen: false,
  };

  it('shows for an armed first-time desktop exit', () => {
    expect(shouldShowFeedbackExitIntent(exitEvent, readyContext)).toBe(true);
  });

  it.each([
    ['before arming', { armed: false }],
    ['on a coarse pointer', { finePointer: false }],
    ['after it was already shown', { alreadyShown: true }],
    ['while the dialog is open', { dialogOpen: true }],
  ])('does not show %s', (_label, contextOverride) => {
    expect(
      shouldShowFeedbackExitIntent(exitEvent, {
        ...readyContext,
        ...contextOverride,
      }),
    ).toBe(false);
  });
});
