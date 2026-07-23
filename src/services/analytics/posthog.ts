import type { CaptureResult, PostHog } from 'posthog-js';
import type { AutoAnimateConfidenceBand, AutoAnimateStrategy } from '@excalimate/animation-core';
import type { ExportFormat } from '../export/types';
import type { AspectRatio } from '../../stores/projectStore';
import type { Theme } from '../../stores/uiStore';
import type { WorkspaceMode } from '../../types/ui';
import type { TemplateCategory } from '../../templates/schema';
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
  properties: Record<string, string | number | boolean> = {},
): void {
  if (!captureEnabled || !client || client.has_opted_out_capturing()) return;
  client.capture(event, properties);
}

export interface CreatorAnalyticsEventMap {
  creator_workspace_changed: {
    workspace: WorkspaceMode;
    source: 'switcher' | 'escalation' | 'project-load' | 'query';
  };
  creator_project_started: {
    path: 'draw' | 'import-excalidraw' | 'open-project' | 'mcp' | 'template';
  };
  creator_template_gallery: {
    action: 'open' | 'search' | 'category';
    category?: TemplateCategory | 'all';
  };
  creator_template_used: {
    category: TemplateCategory;
    aspect_ratio: '16:9' | '4:3' | '1:1' | '3:2';
  };
  creator_scene_state_captured: {
    element_count_bucket: '0' | '1-10' | '11-100' | '101-1000' | '1001+';
  };
  creator_smart_transition_previewed: {
    change_count_bucket: '0' | '1-10' | '11-100' | '101-1000' | '1001+';
    ambiguous_mapping_count_bucket: '0' | '1' | '2-5' | '6+';
    camera_included: boolean;
  };
  creator_smart_transition_decided: {
    decision: 'accepted' | 'rejected';
    ambiguous_mapping_count_bucket: '0' | '1' | '2-5' | '6+';
  };
  creator_smart_transition_escalated: {
    action: 'customized' | 'open-studio';
  };
  creator_auto_animate_previewed: {
    scope: 'selection' | 'diagram';
    strategy: AutoAnimateStrategy;
    confidence_band: AutoAnimateConfidenceBand;
    target_count: number;
  };
  creator_auto_animate_applied: {
    scope: 'selection' | 'diagram';
    strategy: AutoAnimateStrategy;
    confidence_band: AutoAnimateConfidenceBand;
    recipe_count: number;
  };
  creator_auto_animate_rejected: {
    scope: 'selection' | 'diagram';
    strategy: AutoAnimateStrategy;
    confidence_band: AutoAnimateConfidenceBand;
  };
  creator_preset_applied: {
    preset: 'fade' | 'slide' | 'draw' | 'pop';
    direction?: 'left' | 'right' | 'up' | 'down';
    selection_size: number;
    speed_band: 'slow' | 'normal' | 'fast';
  };
  creator_first_preview: {
    workspace: WorkspaceMode;
    reduced_motion: boolean;
  };
  creator_escalated: {
    destination: 'sequence' | 'studio';
  };
  creator_sequence_opened: {
    action_count: number;
    custom_count: number;
  };
  creator_sequence_action_reordered: {
    source: 'drag' | 'keyboard';
  };
  creator_sequence_timing_changed: {
    scope: 'single' | 'bulk';
    start_mode: 'absolute' | 'afterPrevious' | 'withPrevious';
    speed_band: 'fast' | 'normal' | 'slow' | 'custom';
  };
  creator_sequence_actions_grouped: {
    action_count: number;
  };
  creator_sequence_customized_opened_in_studio: {
    status: 'customized' | 'detached' | 'unmanaged';
  };
  creator_sequence_bulk_action: {
    action: 'enable' | 'disable' | 'delete' | 'timing';
    action_count: number;
  };
}

const CREATOR_PROPERTY_ALLOWLIST = {
  creator_workspace_changed: ['workspace', 'source'],
  creator_project_started: ['path'],
  creator_template_gallery: ['action', 'category'],
  creator_template_used: ['category', 'aspect_ratio'],
  creator_scene_state_captured: ['element_count_bucket'],
  creator_smart_transition_previewed: [
    'change_count_bucket',
    'ambiguous_mapping_count_bucket',
    'camera_included',
  ],
  creator_smart_transition_decided: ['decision', 'ambiguous_mapping_count_bucket'],
  creator_smart_transition_escalated: ['action'],
  creator_auto_animate_previewed: ['scope', 'strategy', 'confidence_band', 'target_count'],
  creator_auto_animate_applied: ['scope', 'strategy', 'confidence_band', 'recipe_count'],
  creator_auto_animate_rejected: ['scope', 'strategy', 'confidence_band'],
  creator_preset_applied: ['preset', 'direction', 'selection_size', 'speed_band'],
  creator_first_preview: ['workspace', 'reduced_motion'],
  creator_escalated: ['destination'],
  creator_sequence_opened: ['action_count', 'custom_count'],
  creator_sequence_action_reordered: ['source'],
  creator_sequence_timing_changed: ['scope', 'start_mode', 'speed_band'],
  creator_sequence_actions_grouped: ['action_count'],
  creator_sequence_customized_opened_in_studio: ['status'],
  creator_sequence_bulk_action: ['action', 'action_count'],
} as const satisfies {
  [Event in keyof CreatorAnalyticsEventMap]: readonly (keyof CreatorAnalyticsEventMap[Event])[];
};

export function sanitizeCreatorAnalyticsPayload<Event extends keyof CreatorAnalyticsEventMap>(
  event: Event,
  payload: CreatorAnalyticsEventMap[Event] & Record<string, unknown>,
): CreatorAnalyticsEventMap[Event] {
  const sanitized: Record<string, unknown> = {};
  for (const key of CREATOR_PROPERTY_ALLOWLIST[event]) {
    if (payload[key] !== undefined) sanitized[key] = payload[key];
  }
  return sanitized as CreatorAnalyticsEventMap[Event];
}

export function trackCreatorEvent<Event extends keyof CreatorAnalyticsEventMap>(
  event: Event,
  payload: CreatorAnalyticsEventMap[Event],
): void {
  trackEvent(
    event,
    sanitizeCreatorAnalyticsPayload(
      event,
      payload as CreatorAnalyticsEventMap[Event] & Record<string, unknown>,
    ),
  );
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
