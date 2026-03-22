import { useState } from 'react';
import { Box, Group, Stack, Text, Button, Switch, Anchor, Divider, Modal } from '@mantine/core';
import { IconShieldCheck, IconSettings, IconLock, IconAdjustments, IconChartBar } from '@tabler/icons-react';
import { useConsentStore } from '../stores/consentStore';
import { CONSENT_KEY, type StoredConsent } from '../services/analytics/consent';

function readStoredConsent(): { analytics: boolean; preferences: boolean } {
  const fallback = { analytics: false, preferences: false };
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return fallback;

  try {
    const parsed: StoredConsent = JSON.parse(raw);
    return { analytics: !!parsed.state?.analytics, preferences: !!parsed.state?.preferences };
  } catch {
    return fallback;
  }
}

export function ConsentBanner() {
  const { showBanner, showModal, acceptAll, rejectAll, saveConsent, openSettings } = useConsentStore();
  const [analyticsOn, setAnalyticsOn] = useState(() => readStoredConsent().analytics);
  const [preferencesOn, setPreferencesOn] = useState(() => readStoredConsent().preferences);

  if (!showBanner && !showModal) return null;

  const handleCloseModal = () => useConsentStore.setState({ showModal: false });
  const handleOpenSettings = () => {
    const stored = readStoredConsent();
    setAnalyticsOn(stored.analytics);
    setPreferencesOn(stored.preferences);
    openSettings();
  };
  const handleAcceptAll = () => { acceptAll(); };
  const handleRejectAll = () => { rejectAll(); };
  const handleSavePrefs = () => {
    saveConsent({ analytics: analyticsOn, preferences: preferencesOn });
  };

  return (
    <>
      {showBanner && (
        <Box
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            padding: '12px 24px',
          }}
        >
          <Group justify="space-between" wrap="wrap" gap="sm" maw={900} mx="auto">
            <Group gap="xs" style={{ flex: 1, minWidth: 200 }} wrap="nowrap" align="center">
              <IconShieldCheck size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                We use anonymous analytics to improve Excalimate.{' '}
                <Anchor href="https://excalimate.com/privacy" target="_blank" size="sm">
                  Privacy Policy
                </Anchor>
              </Text>
            </Group>
            <Group gap={8} wrap="nowrap">
              <Button variant="subtle" size="xs" onClick={handleOpenSettings} leftSection={<IconSettings size={14} />}>
                Manage
              </Button>
              <Button variant="default" size="xs" onClick={rejectAll}>Decline</Button>
              <Button size="xs" onClick={acceptAll}>Accept All</Button>
            </Group>
          </Group>
        </Box>
      )}

      <Modal opened={showModal} onClose={handleCloseModal} title="Cookie Preferences" size="lg" centered>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Manage your cookie preferences. You can update these at any time.
          </Text>

          <Divider my="xs" />

          <Group justify="space-between" wrap="nowrap" py={8}>
            <div>
              <Group gap={8} wrap="nowrap">
                <IconLock size={16} style={{ color: 'var(--color-text-muted)' }} />
                <Text size="sm" fw={500}>Necessary</Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>Essential for the app to function. Cannot be disabled.</Text>
            </div>
            <Switch checked disabled size="md" />
          </Group>

          <Group justify="space-between" wrap="nowrap" py={8}>
            <div>
              <Group gap={8} wrap="nowrap">
                <IconAdjustments size={16} style={{ color: 'var(--color-text-muted)' }} />
                <Text size="sm" fw={500}>Preferences</Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>Remembers your settings, theme, and other choices across sessions.</Text>
            </div>
            <Switch checked={preferencesOn} onChange={(e) => setPreferencesOn(e.currentTarget.checked)} size="md" />
          </Group>

          <Group justify="space-between" wrap="nowrap" py={8}>
            <div>
              <Group gap={8} wrap="nowrap">
                <IconChartBar size={16} style={{ color: 'var(--color-text-muted)' }} />
                <Text size="sm" fw={500}>Analytics</Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>Anonymous usage statistics via PostHog. No personal data collected.</Text>
            </div>
            <Switch checked={analyticsOn} onChange={(e) => setAnalyticsOn(e.currentTarget.checked)} size="md" />
          </Group>

          <Divider my="xs" />

          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={handleRejectAll}>Reject All</Button>
            <Button variant="light" size="sm" onClick={handleSavePrefs}>Save Preferences</Button>
            <Button size="sm" onClick={handleAcceptAll}>Accept All</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
