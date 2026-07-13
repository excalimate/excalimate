import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core';
import { IconDeviceDesktop, IconWand } from '@tabler/icons-react';
import type { WorkspaceMode } from '../../types/ui';
import { useUIStore } from '../../stores/uiStore';
import { trackCreatorEvent } from '../../services/analytics/posthog';

export function WorkspaceUnsupportedMessage({
  workspace,
}: {
  workspace: Extract<WorkspaceMode, 'sequence' | 'studio'>;
}) {
  return (
    <Center h="100vh" p="xl">
      <Paper withBorder shadow="md" radius="lg" p="xl" maw={520}>
        <Stack align="center" gap="md">
          <IconDeviceDesktop
            size={44}
            stroke={1.5}
            color="var(--mantine-color-indigo-6)"
            aria-hidden="true"
          />
          <Title order={2} ta="center">
            {workspace === 'studio'
              ? 'Studio needs a larger screen'
              : 'Sequence works best on a tablet or desktop'}
          </Title>
          <Text c="dimmed" ta="center">
            Your project and timeline are unchanged. Open Magic to keep editing
            on this device, or return on a wider screen.
          </Text>
          <Button
            leftSection={<IconWand size={18} aria-hidden="true" />}
            onClick={() => {
              useUIStore.getState().setWorkspace('magic');
              trackCreatorEvent('creator_workspace_changed', {
                workspace: 'magic',
                source: 'escalation',
              });
            }}
          >
            Open Magic
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
