import {
  Accordion,
  Anchor,
  Box,
  Button,
  Code,
  Divider,
  Group,
  List,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconChartBar,
  IconDatabase,
  IconExternalLink,
  IconLock,
  IconServer,
  IconSettings,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useConsentStore } from '../stores/consentStore';
import { readStoredConsent } from '../services/analytics/consent';
import {
  ANALYTICS_EVENT_DEFINITIONS,
  BROWSER_STORAGE_ITEMS,
  DATA_PRACTICES,
  EXCLUDED_ANALYTICS_DATA,
  PRIVACY_POLICY_URL,
} from '../services/privacy/dataInventory';

function getChoices(): { analytics: boolean; preferences: boolean } {
  return readStoredConsent()?.state ?? { analytics: false, preferences: false };
}

function DataInventory() {
  return (
    <Accordion variant="separated">
      <Accordion.Item value="processing">
        <Accordion.Control icon={<IconServer size={16} />}>
          Processing and recipients
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            {DATA_PRACTICES.map((practice) => (
              <Box key={practice.id}>
                <Text size="sm" fw={600}>
                  {practice.title}
                </Text>
                <Text size="xs" c="dimmed" mb={4}>
                  {practice.condition}
                </Text>
                <Table withRowBorders={false} verticalSpacing={4}>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Th w={90}>Data</Table.Th>
                      <Table.Td>{practice.data}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>Why</Table.Th>
                      <Table.Td>{practice.purpose}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>Basis</Table.Th>
                      <Table.Td>{practice.legalBasis}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>Recipient</Table.Th>
                      <Table.Td>{practice.recipient}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>Retention</Table.Th>
                      <Table.Td>{practice.retention}</Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Box>
            ))}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="events">
        <Accordion.Control icon={<IconChartBar size={16} />}>
          Optional analytics event catalogue
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="sm">
            <Text size="xs" c="dimmed">
              These events are sent only after analytics consent. PostHog also receives a random
              in-memory session identifier, event timestamp, SDK name/version, and transient request
              network metadata.
            </Text>
            {Object.entries(ANALYTICS_EVENT_DEFINITIONS).map(([name, definition]) => (
              <Box key={name}>
                <Text size="sm" fw={600}>
                  {definition.label}
                </Text>
                <Text size="xs">
                  <Code>{name}</Code> - {definition.purpose}
                </Text>
                {Object.entries(definition.properties).length > 0 && (
                  <List size="xs" mt={4}>
                    {Object.entries(definition.properties).map(([property, description]) => (
                      <List.Item key={property}>
                        <Code>{property}</Code>: {description}
                      </List.Item>
                    ))}
                  </List>
                )}
              </Box>
            ))}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="storage">
        <Accordion.Control icon={<IconDatabase size={16} />}>Browser storage</Accordion.Control>
        <Accordion.Panel>
          <ScrollArea>
            <Table striped withTableBorder miw={620}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Key</Table.Th>
                  <Table.Th>Contents and purpose</Table.Th>
                  <Table.Th>Category</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {BROWSER_STORAGE_ITEMS.map((item) => (
                  <Table.Tr key={item.key}>
                    <Table.Td>
                      <Code>{item.key}</Code>
                    </Table.Td>
                    <Table.Td>
                      {item.contents} {item.purpose}
                    </Table.Td>
                    <Table.Td>{item.category}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="excluded">
        <Accordion.Control icon={<IconLock size={16} />}>
          Never included in analytics
        </Accordion.Control>
        <Accordion.Panel>
          <List size="sm">
            {EXCLUDED_ANALYTICS_DATA.map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

export function ConsentBanner() {
  const {
    showBanner,
    showModal,
    analytics,
    preferences,
    acceptAll,
    rejectAll,
    saveConsent,
    openSettings,
  } = useConsentStore();

  if (!showBanner && !showModal) return null;

  const handleCloseModal = () => {
    const choices = getChoices();
    useConsentStore.setState({
      showModal: false,
      analytics: choices.analytics,
      preferences: choices.preferences,
    });
  };
  const handleSave = (analytics: boolean, preferences: boolean) => {
    saveConsent({ analytics, preferences });
    notifications.show({
      title: 'Privacy choices saved',
      message: analytics
        ? 'Optional product analytics is enabled.'
        : 'Only required service processing remains active.',
      color: 'blue',
    });
  };

  return (
    <>
      {showBanner && (
        <Box
          role="dialog"
          aria-label="Privacy choices"
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
          <Group justify="space-between" wrap="wrap" gap="sm" maw={980} mx="auto">
            <Group gap="xs" style={{ flex: 1, minWidth: 240 }} wrap="nowrap" align="center">
              <IconShieldCheck
                size={18}
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              />
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                Cloudflare processes requests for delivery, security, and aggregate traffic
                statistics. Optional PostHog product analytics starts only if you accept.{' '}
                <Anchor href={PRIVACY_POLICY_URL} target="_blank" size="sm">
                  Full data list
                </Anchor>
              </Text>
            </Group>
            <Group gap={8} wrap="nowrap">
              <Button
                variant="subtle"
                size="xs"
                onClick={openSettings}
                leftSection={<IconSettings size={14} />}
              >
                Details
              </Button>
              <Button variant="default" size="xs" onClick={rejectAll}>
                Use required only
              </Button>
              <Button size="xs" onClick={acceptAll}>
                Accept optional
              </Button>
            </Group>
          </Group>
        </Box>
      )}

      <Modal
        opened={showModal}
        onClose={handleCloseModal}
        title="Privacy and data settings"
        size="xl"
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Optional choices can be changed at any time. Required service processing and aggregate
            edge statistics are not controlled by the optional analytics switch.
          </Text>

          <Divider />

          <Group justify="space-between" wrap="nowrap" py={6}>
            <Box>
              <Group gap={8} wrap="nowrap">
                <IconServer size={16} />
                <Text size="sm" fw={500}>
                  Required service processing
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>
                Cloudflare handles ordinary request metadata for delivery, security, reliability,
                and aggregate traffic reports. Excalimate does not add a client analytics beacon for
                this.
              </Text>
            </Box>
            <Switch checked disabled size="md" aria-label="Required service processing is active" />
          </Group>

          <Group justify="space-between" wrap="nowrap" py={6}>
            <Box>
              <Group gap={8} wrap="nowrap">
                <IconAdjustments size={16} />
                <Text size="sm" fw={500}>
                  Preference storage
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>
                Remembers theme, MCP URL, and the short GitHub star cache.
              </Text>
            </Box>
            <Switch
              checked={preferences}
              onChange={(event) =>
                useConsentStore.setState({ preferences: event.currentTarget.checked })
              }
              size="md"
              aria-label="Preference storage"
            />
          </Group>

          <Group justify="space-between" wrap="nowrap" py={6}>
            <Box>
              <Group gap={8} wrap="nowrap">
                <IconChartBar size={16} />
                <Text size="sm" fw={500}>
                  Optional product analytics
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>
                Declared, pseudonymous usage events via PostHog Cloud EU. No project content, full
                URLs, referrers, autocapture, or session replay.
              </Text>
            </Box>
            <Switch
              checked={analytics}
              onChange={(event) =>
                useConsentStore.setState({ analytics: event.currentTarget.checked })
              }
              size="md"
              aria-label="Optional product analytics"
            />
          </Group>

          <Divider />
          <DataInventory />

          <Group justify="space-between" mt="xs">
            <Anchor href={PRIVACY_POLICY_URL} target="_blank" size="sm">
              Complete privacy notice{' '}
              <IconExternalLink size={13} style={{ verticalAlign: 'text-bottom' }} />
            </Anchor>
            <Group gap={8}>
              <Button variant="default" size="sm" onClick={() => handleSave(false, false)}>
                Use required only
              </Button>
              <Button variant="light" size="sm" onClick={() => handleSave(analytics, preferences)}>
                Save choices
              </Button>
              <Button size="sm" onClick={() => handleSave(true, true)}>
                Accept optional
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
