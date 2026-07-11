export {
  getPostHogClient,
  isPostHogConfigured,
  enableCapture,
  disableCapture,
  trackEvent,
  trackCreatorEvent,
  sanitizeCreatorAnalyticsPayload,
  trackExport,
  trackMcpConnection,
  trackSceneCreated,
  trackShare,
} from './posthog';
export type { CreatorAnalyticsEventMap } from './posthog';
export { CONSENT_KEY, CONSENT_VERSION, type ConsentState, type StoredConsent, canStorePreferences, storePreference, readPreference } from './consent';
