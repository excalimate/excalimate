import { create } from 'zustand';
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  clearOptionalPreferences,
  readStoredConsent,
  type ConsentState,
  type StoredConsent,
} from '../services/analytics/consent';
import { enableCapture, disableCapture } from '../services/analytics/posthog';

interface ConsentStore {
  decided: boolean;
  analytics: boolean;
  preferences: boolean;
  showBanner: boolean;
  showModal: boolean;

  saveConsent: (state: ConsentState) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  openSettings: () => void;
}

function persistConsent(state: ConsentState): void {
  const data: StoredConsent = {
    version: CONSENT_VERSION,
    state,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
}

const stored = readStoredConsent();

export const useConsentStore = create<ConsentStore>((set) => ({
  decided: stored !== null,
  analytics: stored?.state.analytics ?? false,
  preferences: stored?.state.preferences ?? false,
  showBanner: stored === null,
  showModal: false,

  saveConsent: (state: ConsentState) => {
    persistConsent(state);
    if (state.analytics) void enableCapture();
    else disableCapture();
    if (!state.preferences) clearOptionalPreferences();
    set({
      decided: true,
      analytics: state.analytics,
      preferences: state.preferences,
      showBanner: false,
      showModal: false,
    });
  },

  acceptAll: () => {
    const state: ConsentState = { analytics: true, preferences: true };
    persistConsent(state);
    void enableCapture();
    set({ decided: true, analytics: true, preferences: true, showBanner: false, showModal: false });
  },

  rejectAll: () => {
    const state: ConsentState = { analytics: false, preferences: false };
    persistConsent(state);
    disableCapture();
    clearOptionalPreferences();
    set({
      decided: true,
      analytics: false,
      preferences: false,
      showBanner: false,
      showModal: false,
    });
  },

  openSettings: () => {
    set({ showModal: true });
  },
}));
