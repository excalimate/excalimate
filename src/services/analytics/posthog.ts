import posthog, { type PostHog } from 'posthog-js';
import { CONSENT_KEY, type StoredConsent } from './consent';

/**
 * PostHog configuration — reads from Vite env vars.
 * Leave VITE_PUBLIC_POSTHOG_KEY empty to disable analytics entirely.
 */
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/** Whether PostHog is configured (key is set) */
export const isPostHogConfigured = (): boolean => POSTHOG_KEY.length > 0;

/** Get the PostHog client instance (for the provider) */
export function getPostHogClient(): PostHog | undefined {
  if (!isPostHogConfigured()) return undefined;

  const consent = getStoredConsent();
  const hasConsent = consent?.state.analytics === true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage',
    opt_out_capturing_by_default: !hasConsent,
    loaded: (ph) => {
      if (!hasConsent) {
        ph.opt_out_capturing();
      }
    },
  });

  return posthog;
}

/** Call after user grants consent — opts PostHog in */
export function enableCapture(): void {
  if (!isPostHogConfigured()) return;
  posthog.opt_in_capturing();
}

/** Call after user revokes consent — opts PostHog out */
export function disableCapture(): void {
  if (!isPostHogConfigured()) return;
  posthog.opt_out_capturing();
}

/** Track a custom event (only fires if opted in) */
export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!isPostHogConfigured() || posthog.has_opted_out_capturing()) return;
  posthog.capture(event, properties);
}

export function trackExport(format: string): void {
  trackEvent('animation_exported', { format });
}

export function trackMcpConnection(): void {
  trackEvent('mcp_connected');
}

export function trackSceneCreated(elementCount: number): void {
  trackEvent('scene_created', { element_count: elementCount });
}

export function trackShare(): void {
  trackEvent('project_shared');
}

// File operations
export function trackNewProject(aspectRatio: string): void {
  trackEvent('project_created', { aspect_ratio: aspectRatio });
}

export function trackSaveProject(): void {
  trackEvent('project_saved');
}

export function trackLoadProject(source: 'file' | 'checkpoint' | 'share_url'): void {
  trackEvent('project_loaded', { source });
}

export function trackImport(source: 'file' | 'url'): void {
  trackEvent('excalidraw_imported', { source });
}

// Mode switching
export function trackModeSwitch(mode: 'edit' | 'animate'): void {
  trackEvent('mode_switched', { mode });
}

// Playback
export function trackPlayback(action: 'play' | 'pause' | 'stop'): void {
  trackEvent('playback_action', { action });
}

// Animation
export function trackKeyframeAction(action: 'add' | 'move' | 'delete' | 'update'): void {
  trackEvent('keyframe_action', { action });
}

export function trackTrackAction(action: 'add' | 'remove' | 'toggle'): void {
  trackEvent('track_action', { action });
}

export function trackSequenceAction(action: 'create' | 'update' | 'delete'): void {
  trackEvent('sequence_action', { action });
}

// Camera
export function trackCameraAction(action: 'change_aspect_ratio' | 'fit_to_scene', ratio?: string): void {
  trackEvent('camera_action', { action, ...(ratio ? { ratio } : {}) });
}

// UI
export function trackThemeToggle(theme: string): void {
  trackEvent('theme_toggled', { theme });
}

export function trackPanelToggle(panel: string, open: boolean): void {
  trackEvent('panel_toggled', { panel, open });
}

// Grouping
export function trackGroupAction(action: 'group' | 'ungroup', elementCount?: number): void {
  trackEvent('group_action', { action, ...(elementCount ? { element_count: elementCount } : {}) });
}

// MCP
export function trackMcpAction(action: 'connect' | 'disconnect' | 'set_url'): void {
  trackEvent('mcp_action', { action });
}

// Page navigation
export function trackPageView(page: string): void {
  trackEvent('page_viewed', { page });
}

function getStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
