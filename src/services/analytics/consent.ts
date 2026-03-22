export const CONSENT_KEY = 'excalimate-analytics-consent';
export const CONSENT_VERSION = '1.1';

export interface ConsentState {
  analytics: boolean;
  preferences: boolean;
}

export interface StoredConsent {
  version: string;
  state: ConsentState;
  timestamp: string;
}

/**
 * Check if the user has granted preference storage consent.
 * Use this before storing any user preference in localStorage.
 * Returns true if consent was granted, false otherwise.
 */
export function canStorePreferences(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed: StoredConsent = JSON.parse(raw);
    return parsed.state?.preferences === true;
  } catch {
    return false;
  }
}

/**
 * Safely store a preference value. Only writes if preferences consent is granted.
 * Returns true if the value was stored, false if consent was not given.
 */
export function storePreference(key: string, value: string): boolean {
  if (!canStorePreferences()) return false;
  localStorage.setItem(key, value);
  return true;
}

/**
 * Read a stored preference. Returns null if preferences consent is not granted
 * or if the key doesn't exist.
 */
export function readPreference(key: string): string | null {
  if (!canStorePreferences()) return null;
  return localStorage.getItem(key);
}
