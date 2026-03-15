import { Button, Menu, ActionIcon, Tooltip } from '@mantine/core';
import { IconGhost, IconBroadcast, IconBroadcastOff, IconLayersLinked, IconListDetails, IconChevronDown } from '@tabler/icons-react';
import { FileControls } from './FileControls';
import { ModeSwitcher } from './ModeSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ExportControls } from './ExportControls';
import { useUIStore } from '../../stores/uiStore';
import { useMcpLive } from '../../hooks/useMcpLive';

export function Toolbar() {
  const ghostMode = useUIStore((s) => s.ghostMode);
  const sequenceRevealOpen = useUIStore((s) => s.sequenceRevealOpen);
  const layersPanelOpen = useUIStore((s) => s.layersPanelOpen);
  const theme = useUIStore((s) => s.theme);
  const { connected, connect, disconnect } = useMcpLive();

  return (
    <header role="toolbar" aria-label="Main toolbar" className="bg-surface border-border shadow-float mx-2 my-2 flex items-center h-10 px-3 gap-1.5 border rounded-lg select-none">
      {/* Left section: Logo and file controls */}
      <div className="flex items-center gap-1 mr-4">
        <img src={theme === 'dark' ? '/excalimate_logo_dark.svg' : '/excalimate_logo.svg'} alt="Excalimate logo" className="w-auto h-5 mr-2" />
        <FileControls />
        <Menu shadow="md" width={200} position="bottom-start">
          <Menu.Target>
            <Button variant="subtle" color="gray" size="compact-sm" rightSection={<IconChevronDown size={12} />}>
              Tools
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconListDetails size={16} />}
              onClick={() => useUIStore.getState().toggleSequenceReveal()}
              color={sequenceRevealOpen ? 'indigo' : undefined}
            >
              Sequence Reveal
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* Center section: Mode switcher */}
      <div className="flex-1 flex justify-center">
        <ModeSwitcher />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        <Tooltip label="Toggle layers panel">
          <ActionIcon
            variant={layersPanelOpen ? 'light' : 'subtle'}
            color={layersPanelOpen ? 'indigo' : 'gray'}
            size="sm"
            onClick={() => useUIStore.getState().toggleLayersPanel()}
          >
            <IconLayersLinked size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Ghost Mode">
          <ActionIcon
            variant={ghostMode ? 'light' : 'subtle'}
            color={ghostMode ? 'indigo' : 'gray'}
            size="sm"
            onClick={() => useUIStore.getState().toggleGhostMode()}
          >
            <IconGhost size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={connected ? 'Disconnect from MCP server' : 'Connect to MCP live'}>
          <ActionIcon
            variant={connected ? 'light' : 'subtle'}
            color={connected ? 'green' : 'gray'}
            size="sm"
            onClick={() => connected ? disconnect() : connect()}
          >
            {connected ? <IconBroadcast size={16} /> : <IconBroadcastOff size={16} />}
          </ActionIcon>
        </Tooltip>
        <div className="w-px h-5 bg-border mx-1" />
        <ExportControls />
        <div className="w-px h-5 bg-border mx-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}
