import { describe, expect, it } from 'vitest';
import { sanitizeCreatorAnalyticsPayload, trackCreatorEvent } from './posthog';

describe('creator analytics', () => {
  it('allows only content-free properties declared for the event', () => {
    const payload = sanitizeCreatorAnalyticsPayload('creator_auto_animate_previewed', {
      scope: 'diagram',
      strategy: 'hierarchical',
      confidence_band: 'high',
      target_count: 4,
      label: 'private diagram text',
      project_id: 'private-id',
      url: 'https://private.example',
    });

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

  it('keeps sequence analytics privacy-safe', () => {
    expect(
      sanitizeCreatorAnalyticsPayload('creator_sequence_timing_changed', {
        scope: 'bulk',
        start_mode: 'withPrevious',
        speed_band: 'custom',
        label: 'private layer name',
        action_id: 'private-action-id',
        project_name: 'private project',
        url: 'https://private.example',
      }),
    ).toEqual({
      scope: 'bulk',
      start_mode: 'withPrevious',
      speed_band: 'custom',
    });
  });

  it('keeps template and transition analytics content-free', () => {
    expect(
      sanitizeCreatorAnalyticsPayload('creator_template_used', {
        category: 'software',
        aspect_ratio: '16:9',
        template_id: 'private-template-id',
        project_name: 'private project',
        text: 'private diagram text',
      }),
    ).toEqual({
      category: 'software',
      aspect_ratio: '16:9',
    });
    expect(
      sanitizeCreatorAnalyticsPayload('creator_smart_transition_previewed', {
        change_count_bucket: '11-100',
        ambiguous_mapping_count_bucket: '2-5',
        camera_included: false,
        from_state_id: 'private-state-id',
        labels: ['private label'],
        url: 'https://private.example',
      }),
    ).toEqual({
      change_count_bucket: '11-100',
      ambiguous_mapping_count_bucket: '2-5',
      camera_included: false,
    });
  });
});
