export { getPostHogClient, isPostHogConfigured, enableCapture, disableCapture, trackEvent, trackExport, trackMcpConnection, trackSceneCreated, trackShare } from './posthog';
export { CONSENT_KEY, CONSENT_VERSION, type ConsentState, type StoredConsent, canStorePreferences, storePreference, readPreference } from './consent';
