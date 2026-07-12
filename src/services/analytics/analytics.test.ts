import type { CaptureResult } from 'posthog-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  canStorePreferences,
  clearOptionalPreferences,
  readStoredConsent,
  storePreference,
} from './consent';
import { OPTIONAL_STORAGE_KEYS } from '../privacy/dataInventory';

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  has_opted_out_capturing: vi.fn(() => false),
}));

vi.mock('posthog-js', () => ({ default: posthogMock }));

function storeConsent(analytics: boolean, preferences: boolean, version = CONSENT_VERSION): void {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({
      version,
      state: { analytics, preferences },
      timestamp: '2026-07-12T00:00:00.000Z',
    }),
  );
}

describe('privacy consent storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts only the current, complete consent schema', () => {
    storeConsent(true, false);
    expect(readStoredConsent()?.state).toEqual({ analytics: true, preferences: false });

    storeConsent(true, true, '1.1');
    expect(readStoredConsent()).toBeNull();

    localStorage.setItem(CONSENT_KEY, '{"version":"2.0","state":{}}');
    expect(readStoredConsent()).toBeNull();
  });

  it('writes optional preferences only after preference consent', () => {
    expect(storePreference(OPTIONAL_STORAGE_KEYS.theme, 'dark')).toBe(false);
    expect(localStorage.getItem(OPTIONAL_STORAGE_KEYS.theme)).toBeNull();

    storeConsent(false, true);
    expect(canStorePreferences()).toBe(true);
    expect(storePreference(OPTIONAL_STORAGE_KEYS.theme, 'dark')).toBe(true);
    expect(localStorage.getItem(OPTIONAL_STORAGE_KEYS.theme)).toBe('dark');
  });

  it('removes every optional preference key on withdrawal', () => {
    for (const key of Object.values(OPTIONAL_STORAGE_KEYS)) localStorage.setItem(key, 'value');
    clearOptionalPreferences();
    for (const key of Object.values(OPTIONAL_STORAGE_KEYS))
      expect(localStorage.getItem(key)).toBeNull();
  });
});

describe('PostHog privacy boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
  });

  it('does not initialize PostHog without current analytics consent', async () => {
    const analytics = await import('./posthog');
    analytics.initializeAnalyticsFromConsent();
    await Promise.resolve();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it('initializes only after consent and stops captures after withdrawal', async () => {
    storeConsent(true, false);
    const analytics = await import('./posthog');

    analytics.initializeAnalyticsFromConsent();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalledOnce());
    analytics.trackSaveProject();
    expect(posthogMock.capture).toHaveBeenCalledWith('project_saved', {});

    analytics.disableCapture();
    analytics.trackSaveProject();
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthogMock.reset).toHaveBeenCalledWith(true);
  });

  it('rejects undeclared events and strips undeclared properties', async () => {
    const { filterAnalyticsCapture } = await import('./posthog');
    const base: CaptureResult = {
      uuid: '00000000-0000-4000-8000-000000000000',
      event: 'animation_exported',
      properties: {
        format: 'mp4',
        distinct_id: 'session-only',
        $current_url: 'https://app.excalimate.com/#share=secret',
        project_name: 'Private project',
      },
      $set: { email: 'visitor@example.com' },
    };

    expect(filterAnalyticsCapture(base)).toEqual({
      ...base,
      properties: { format: 'mp4', distinct_id: 'session-only' },
      $set: undefined,
      $set_once: undefined,
      $unset: undefined,
    });
    expect(filterAnalyticsCapture({ ...base, event: '$pageview' })).toBeNull();
    expect(filterAnalyticsCapture(null)).toBeNull();
  });
});
