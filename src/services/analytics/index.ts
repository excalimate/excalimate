export {
  isPostHogConfigured,
  enableCapture,
  disableCapture,
  initializeAnalyticsFromConsent,
  trackExport,
  trackShare,
} from './posthog';
export {
  CONSENT_KEY,
  CONSENT_VERSION,
  type ConsentState,
  type StoredConsent,
  canStorePreferences,
  storePreference,
  readPreference,
  readStoredConsent,
} from './consent';
