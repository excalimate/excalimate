import {
  CONSENT_SCHEMA_VERSION,
  CONSENT_STORAGE_KEY,
  OPTIONAL_STORAGE_KEYS,
} from '../privacy/dataInventory';

export const CONSENT_KEY = CONSENT_STORAGE_KEY;
export const CONSENT_VERSION = CONSENT_SCHEMA_VERSION;

export interface ConsentState {
  analytics: boolean;
  preferences: boolean;
}

export interface StoredConsent {
  version: string;
  state: ConsentState;
  timestamp: string;
}

export function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed: StoredConsent = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.timestamp !== 'string') return null;
    if (
      typeof parsed.state?.analytics !== 'boolean' ||
      typeof parsed.state?.preferences !== 'boolean'
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readStoredConsent()?.state.analytics === true;
}

/**
 * Check if the user has granted preference storage consent.
 * Use this before storing any user preference in localStorage.
 * Returns true if consent was granted, false otherwise.
 */
export function canStorePreferences(): boolean {
  return readStoredConsent()?.state.preferences === true;
}

/**
 * Safely store a preference value. Only writes if preferences consent is granted.
 * Returns true if the value was stored, false if consent was not given.
 */
export function storePreference(key: string, value: string): boolean {
  if (!canStorePreferences()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Could not store preference "${key}".`, error);
    return false;
  }
}

/**
 * Read a stored preference. Returns null if preferences consent is not granted
 * or if the key doesn't exist.
 */
export function readPreference(key: string): string | null {
  if (!canStorePreferences()) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Could not read preference "${key}".`, error);
    return null;
  }
}

export function clearOptionalPreferences(): void {
  for (const key of Object.values(OPTIONAL_STORAGE_KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Could not remove preference "${key}".`, error);
    }
  }
}
