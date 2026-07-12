import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_LABEL_DEFINITIONS,
  getCategoryFromLabels,
  getStatusFromLabels,
  isTerminalStatus,
} from './config';

describe('feedback label mapping', () => {
  it('maps labels and applies safe defaults', () => {
    expect(getCategoryFromLabels(['feedback: integration'])).toBe('integration');
    expect(getCategoryFromLabels([])).toBe('other');
    expect(getStatusFromLabels(['status: planned'])).toBe('planned');
    expect(getStatusFromLabels([])).toBe('under-review');
  });

  it('marks only completed and rejected as terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('rejected')).toBe(true);
    expect(isTerminalStatus('in-progress')).toBe(false);
  });

  it('defines unique repository labels', () => {
    const names = FEEDBACK_LABEL_DEFINITIONS.map((label) => label.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
