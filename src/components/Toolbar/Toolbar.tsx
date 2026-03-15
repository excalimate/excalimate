import { useState, useEffect, useRef } from 'react';
import { Button, Menu, ActionIcon, Tooltip, Modal, TextInput, Group, Stack, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { nprogress } from '@mantine/nprogress';
import {
  IconGhost,
  IconBroadcast,
  IconBroadcastOff,
  IconListDetails,
  IconChevronDown,
  IconAlertTriangle,
  IconServer,
} from '@tabler/icons-react';
import { FileControls } from './FileControls';
import { ModeSwitcher } from './ModeSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ExportControls } from './ExportControls';
import { useUIStore } from '../../stores/uiStore';
import { useMcpLive, getMcpUrl } from '../../hooks/useMcpLive';

export function Toolbar() {
  const ghostMode = useUIStore((s) => s.ghostMode);
  const sequenceRevealOpen = useUIStore((s) => s.sequenceRevealOpen);
  const theme = useUIStore((s) => s.theme);
  const { connected, status, connect, disconnect, setLiveUrl, lastError, clearError } = useMcpLive();
  const [manualConnectionError, setManualConnectionError] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState(getMcpUrl());
  const showConnectionError = Boolean(lastError) || manualConnectionError;
  const isMixedContent = window.location.protocol === 'https:' && connectionUrl.startsWith('http://');

  // Track status changes for nprogress + connecting notification
  const prevStatusRef = useRef(status);
  const connectingNotifId = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'connecting' && prev !== 'connecting') {
      // Show progress bar and connecting notification
      nprogress.start();
      connectingNotifId.current = 'mcp-connecting';
      notifications.show({
        id: 'mcp-connecting',
        loading: true,
        title: 'Connecting to MCP server',
        message: connectionUrl,
        autoClose: false,
        withCloseButton: false,
      });
    } else if (status === 'connected' && prev !== 'connected') {
      nprogress.complete();
      notifications.hide('mcp-connecting');
      notifications.show({
        title: 'Connected',
        message: `Live preview active — ${connectionUrl}`,
        color: 'green',
        autoClose: 3000,
      });
    } else if (status === 'disconnected' && prev === 'connecting') {
      // Connection attempt failed
      nprogress.complete();
      notifications.hide('mcp-connecting');
    } else if (status === 'reconnecting') {
      nprogress.start();
    } else if (status === 'disconnected' && prev === 'reconnecting') {
      nprogress.complete();
    }
  }, [status, connectionUrl]);

  const handleLiveClick = () => {
    if (connected) {
      disconnect();
      notifications.show({
        title: 'Disconnected',
        message: 'MCP live preview disconnected.',
        color: 'gray',
        autoClose: 2000,
      });
      return;
    }

    clearError();
    setConnectionUrl(getMcpUrl());
    try {
      connect();
    } catch {
      setManualConnectionError(true);
    }
  };

  const handleRetryConnection = () => {
    setLiveUrl(connectionUrl);
    clearError();
    setManualConnectionError(false);
    try {
      connect(connectionUrl);
    } catch {
      setManualConnectionError(true);
    }
  };

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
            onClick={handleLiveClick}
          >
            {connected ? <IconBroadcast size={16} /> : <IconBroadcastOff size={16} />}
          </ActionIcon>
        </Tooltip>
        <div className="w-px h-5 bg-border mx-1" />
        <ExportControls />
        <div className="w-px h-5 bg-border mx-1" />
        <ThemeToggle />
      </div>
      <Modal
        opened={showConnectionError}
        onClose={() => {
          setManualConnectionError(false);
          clearError();
        }}
        title="Connection Failed"
        centered
      >
        <Stack gap="sm">
          <Alert
            variant="light"
            color="yellow"
            title="Could not connect to the MCP server"
            icon={<IconAlertTriangle size={18} />}
          >
            Check that the server is running at <strong>{connectionUrl}</strong> and the URL is correct.
          </Alert>
          {isMixedContent && (
            <Alert variant="light" color="orange" title="Mixed content blocked" icon={<IconAlertTriangle size={18} />}>
              Your browser blocks connections from HTTPS pages to HTTP servers. Either run the MCP server with HTTPS, or access Excalimate via HTTP.
            </Alert>
          )}
          <TextInput
            label="Server URL"
            placeholder="http://localhost:3001"
            value={connectionUrl}
            onChange={(e) => setConnectionUrl(e.currentTarget.value)}
            leftSection={<IconServer size={14} />}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setManualConnectionError(false); clearError(); }}>
              Cancel
            </Button>
            <Button onClick={handleRetryConnection}>Retry</Button>
          </Group>
        </Stack>
      </Modal>
    </header>
  );
}
