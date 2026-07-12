import { describe, expect, it } from 'vitest';
import componentSource from '../../components/FeedbackExitIntent.astro?raw';
import {
  FEEDBACK_EXIT_INTENT_DELAY_MS,
  isTopEdgeExitIntent,
  shouldShowFeedbackExitIntent,
} from './exitIntent';

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

describe('feedback exit-intent presentation', () => {
  it('uses a short guard window before arming', () => {
    expect(FEEDBACK_EXIT_INTENT_DELAY_MS).toBeGreaterThanOrEqual(1500);
    expect(FEEDBACK_EXIT_INTENT_DELAY_MS).toBeLessThanOrEqual(2000);
  });

  it('centers the fixed dialog within responsive viewport gutters', () => {
    expect(componentSource).toContain('position: fixed;');
    expect(componentSource).toContain('inset: 50% auto auto 50%;');
    expect(componentSource).toContain('width: min(600px, calc(100vw - 32px));');
    expect(componentSource).toContain('max-height: calc(100dvh - 32px);');
    expect(componentSource).toContain('transform: translate(-50%, -50%);');
    expect(componentSource).toContain('z-index: 300;');
    expect(componentSource).toContain('z-index: 299;');
  });

  it('uses native close semantics and a single-border close control', () => {
    expect(componentSource).toContain('<form method="dialog">');
    expect(componentSource).toContain('aria-label="Close feedback invitation"');
    expect(componentSource).toContain('<IconX size={20}');
    expect(componentSource).toContain('width: 32px;');
    expect(componentSource).toContain('height: 32px;');
    expect(componentSource).toContain('border: 1px solid var(--border-strong);');
    expect(componentSource).toContain('.feedback-exit-close:focus-visible');
  });
});
