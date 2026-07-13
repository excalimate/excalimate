import { Group, SegmentedControl, Text } from '@mantine/core';
import {
  IconLayoutBoard,
  IconListDetails,
  IconWand,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import type { WorkspaceMode } from '../../types/ui';
import { trackCreatorEvent } from '../../services/analytics/posthog';

const WORKSPACES = [
  {
    value: 'magic',
    label: (
      <Group gap={5} wrap="nowrap">
        <IconWand size={14} aria-hidden="true" />
        <Text span size="xs">Magic</Text>
      </Group>
    ),
  },
  {
    value: 'sequence',
    label: (
      <Group gap={5} wrap="nowrap">
        <IconListDetails size={14} aria-hidden="true" />
        <Text span size="xs">Sequence</Text>
      </Group>
    ),
  },
  {
    value: 'studio',
    label: (
      <Group gap={5} wrap="nowrap">
        <IconLayoutBoard size={14} aria-hidden="true" />
        <Text span size="xs">Studio</Text>
      </Group>
    ),
  },
] as const;

export function WorkspaceSwitcher() {
  const workspace = useUIStore((state) => state.workspace);
  const setWorkspace = useUIStore((state) => state.setWorkspace);

  return (
    <SegmentedControl
      aria-label="Workspace"
      size="xs"
      value={workspace}
      data={[...WORKSPACES]}
      onChange={(value) => {
        const nextWorkspace = value as WorkspaceMode;
        setWorkspace(nextWorkspace);
        trackCreatorEvent('creator_workspace_changed', {
          workspace: nextWorkspace,
          source: 'switcher',
        });
      }}
    />
  );
}
