import type { CaptureResult, PostHog } from 'posthog-js';
import type { ExportFormat } from '../export/types';
import type { AspectRatio } from '../../stores/projectStore';
import type { Theme } from '../../stores/uiStore';
import {
  ANALYTICS_EVENT_DEFINITIONS,
  POSTHOG_TECHNICAL_PROPERTIES,
  type AnalyticsEventName,
} from '../privacy/dataInventory';
import { hasAnalyticsConsent } from './consent';

/**
 * PostHog configuration — reads from Vite env vars.
 * Leave VITE_PUBLIC_POSTHOG_KEY empty to disable analytics entirely.
 */
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;
let initialization: Promise<PostHog | null> | null = null;
let captureEnabled = false;
let consentGeneration = 0;

/** Whether PostHog is configured (key is set) */
export const isPostHogConfigured = (): boolean => POSTHOG_KEY.length > 0;

function isDeclaredEvent(event: string): event is AnalyticsEventName {
  return Object.hasOwn(ANALYTICS_EVENT_DEFINITIONS, event);
}

export function filterAnalyticsCapture(capture: CaptureResult | null): CaptureResult | null {
  if (!capture) return null;
  if (!isDeclaredEvent(capture.event)) return null;

  const declaredProperties = Object.keys(ANALYTICS_EVENT_DEFINITIONS[capture.event].properties);
  const permitted = new Set<string>([...POSTHOG_TECHNICAL_PROPERTIES, ...declaredProperties]);
  const properties = Object.fromEntries(
    Object.entries(capture.properties).filter(([key]) => permitted.has(key)),
  );

  return { ...capture, properties, $set: undefined, $set_once: undefined, $unset: undefined };
}

async function initializeClient(): Promise<PostHog | null> {
  if (!isPostHogConfigured()) return null;
  if (client) return client;
  if (initialization) return initialization;

  const generation = consentGeneration;
  initialization = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'never',
        autocapture: false,
        rageclick: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_surveys_automatic_display: true,
        disable_product_tours: true,
        disable_web_experiments: true,
        advanced_disable_flags: true,
        advanced_disable_feature_flags: true,
        advanced_disable_feature_flags_on_first_load: true,
        disableDeviceModel: true,
        disable_capture_url_hashes: true,
        save_referrer: false,
        save_campaign_params: false,
        persistence: 'memory',
        disable_persistence: true,
        respect_dnt: true,
        opt_out_capturing_by_default: false,
        before_send: filterAnalyticsCapture,
      });
      client = posthog;

      if (!captureEnabled || generation !== consentGeneration) {
        posthog.opt_out_capturing();
        posthog.reset(true);
        return null;
      }

      return posthog;
    })
    .finally(() => {
      initialization = null;
    });

  return initialization;
}

export async function enableCapture(): Promise<void> {
  captureEnabled = true;
  await initializeClient();
  if (captureEnabled && client?.has_opted_out_capturing()) {
    client.opt_in_capturing();
  }
}

export function disableCapture(): void {
  captureEnabled = false;
  consentGeneration += 1;
  if (client) {
    client.opt_out_capturing();
    client.reset(true);
  }
  clearPostHogPersistence();
}

export function initializeAnalyticsFromConsent(): void {
  if (hasAnalyticsConsent()) {
    void enableCapture();
  } else {
    clearPostHogPersistence();
  }
}

function trackEvent(
  event: AnalyticsEventName,
  properties: Record<string, string | boolean> = {},
): void {
  if (!captureEnabled || !client || client.has_opted_out_capturing()) return;
  client.capture(event, properties);
}

export function trackExport(format: ExportFormat): void {
  trackEvent('animation_exported', { format });
}

export function trackShare(): void {
  trackEvent('project_shared');
}

// File operations
export function trackNewProject(aspectRatio: AspectRatio): void {
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
export function trackCameraAction(
  action: 'change_aspect_ratio' | 'fit_to_scene',
  ratio?: AspectRatio,
): void {
  trackEvent('camera_action', { action, ...(ratio ? { ratio } : {}) });
}

// UI
export function trackThemeToggle(theme: Theme): void {
  trackEvent('theme_toggled', { theme });
}

// Grouping
export function trackGroupAction(action: 'group' | 'ungroup', elementCount?: number): void {
  trackEvent('group_action', {
    action,
    ...(elementCount ? { element_count_bucket: bucketCount(elementCount) } : {}),
  });
}

// MCP
export function trackMcpAction(action: 'connect' | 'disconnect' | 'set_url'): void {
  trackEvent('mcp_action', { action });
}

function bucketCount(count: number): '1' | '2-5' | '6-20' | '21+' {
  if (count <= 1) return '1';
  if (count <= 5) return '2-5';
  if (count <= 20) return '6-20';
  return '21+';
}

function clearPostHogPersistence(): void {
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith('ph_')) storage.removeItem(key);
    }
  }

  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim();
    if (name?.startsWith('ph_')) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
}
