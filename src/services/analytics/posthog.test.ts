import { describe, expect, it } from 'vitest';
import {
  sanitizeCreatorAnalyticsPayload,
  trackCreatorEvent,
} from './posthog';

describe('creator analytics', () => {
  it('allows only content-free properties declared for the event', () => {
    const payload = sanitizeCreatorAnalyticsPayload(
      'creator_auto_animate_previewed',
      {
        scope: 'diagram',
        strategy: 'hierarchical',
        confidence_band: 'high',
        target_count: 4,
        label: 'private diagram text',
        project_id: 'private-id',
        url: 'https://private.example',
      },
    );

    expect(payload).toEqual({
      scope: 'diagram',
      strategy: 'hierarchical',
      confidence_band: 'high',
      target_count: 4,
    });
  });

  it('is a no-op when PostHog is not configured', () => {
    expect(() =>
      trackCreatorEvent('creator_workspace_changed', {
        workspace: 'magic',
        source: 'switcher',
      }),
    ).not.toThrow();
  });
});
