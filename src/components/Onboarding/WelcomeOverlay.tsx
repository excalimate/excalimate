import { useState } from 'react';
import {
  Box,
  Button,
  FileButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconBroadcast,
  IconFileImport,
  IconFolderOpen,
  IconPencil,
  IconSparkles,
} from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useFileOperations } from '../Toolbar/useFileOperations';
import { useMcpLive } from '../../hooks/useMcpLive';
import { trackCreatorEvent } from '../../services/analytics/posthog';

export function WelcomeOverlay() {
  const [loading, setLoading] = useState(false);
  const project = useProjectStore((state) => state.project);
  const workspace = useUIStore((state) => state.workspace);
  const canvasMode = useUIStore((state) => state.canvasMode);
  const dismissed = useUIStore((state) => state.startSurfaceDismissed);
  const theme = useUIStore((state) => state.theme);
  const { handleImportFile, handleLoadProjectFile } = useFileOperations();
  const { connected, connect } = useMcpLive();
  const hasElements =
    project?.scene.elements.some((element) => !element.isDeleted) ?? false;

  if (
    workspace !== 'magic' ||
    canvasMode !== 'design' ||
    hasElements ||
    dismissed
  ) {
    return null;
  }

  const finishStart = (
    path:
      | 'draw'
      | 'import-excalidraw'
      | 'open-project'
      | 'mcp'
      | 'template-teaser',
  ) => {
    if (path === 'draw' || path === 'mcp' || path === 'template-teaser') {
      trackCreatorEvent('creator_project_started', { path });
    }
    useUIStore.getState().setStartSurfaceDismissed(true);
  };

  const runFileAction = async (
    file: File | null,
    kind: 'import' | 'open',
  ) => {
    if (!file) return;
    try {
      setLoading(true);
      if (kind === 'open') {
        await handleLoadProjectFile(file);
        finishStart('open-project');
      } else {
        await handleImportFile(file);
        finishStart('import-excalidraw');
      }
    } catch (error) {
      notifications.show({
        title: kind === 'open' ? 'Could not open project' : 'Could not import file',
        message:
          error instanceof Error ? error.message : 'The selected file is invalid.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      pos="absolute"
      inset={0}
      style={{
        zIndex: 20,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(12px, 4vw, 40px)',
      }}
    >
      <Paper
        component="section"
        aria-labelledby="magic-start-title"
        withBorder
        shadow="xl"
        radius="lg"
        p={{ base: 'md', sm: 'xl' }}
        maw={720}
        w="100%"
        style={{ pointerEvents: 'auto' }}
      >
        <Stack gap="lg">
          <Stack gap={6} align="center">
            <img
              src={
                theme === 'dark'
                  ? '/excalimate_logo_dark.svg'
                  : '/excalimate_logo.svg'
              }
              alt="Excalimate"
              style={{ height: 38, maxWidth: '70%' }}
            />
            <Title id="magic-start-title" order={2} ta="center">
              Start with the canvas
            </Title>
            <Text c="dimmed" ta="center" maw={520}>
              Draw freely, bring in an Excalidraw scene, or open an Excalimate
              project. Animation controls appear as soon as the canvas has content.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Button
              size="lg"
              leftSection={<IconPencil size={20} aria-hidden="true" />}
              onClick={() => {
                finishStart('draw');
                requestAnimationFrame(() =>
                  document.querySelector<HTMLElement>('.excalidraw')?.focus(),
                );
              }}
            >
              Start drawing
            </Button>
            <FileButton
              onChange={(file) => void runFileAction(file, 'import')}
              accept=".excalidraw,.json,application/json"
            >
              {(props) => (
                <Button
                  {...props}
                  size="lg"
                  variant="light"
                  loading={loading}
                  leftSection={<IconFileImport size={20} aria-hidden="true" />}
                >
                  Import Excalidraw
                </Button>
              )}
            </FileButton>
            <FileButton
              onChange={(file) => void runFileAction(file, 'open')}
              accept=".excanim,.json,application/json"
            >
              {(props) => (
                <Button
                  {...props}
                  size="lg"
                  variant="light"
                  loading={loading}
                  leftSection={<IconFolderOpen size={20} aria-hidden="true" />}
                >
                  Open Excalimate
                </Button>
              )}
            </FileButton>
            <Button
              size="lg"
              variant="light"
              color={connected ? 'green' : 'indigo'}
              leftSection={<IconBroadcast size={20} aria-hidden="true" />}
              onClick={() => {
                try {
                  connect();
                  finishStart('mcp');
                  notifications.show({
                    title: 'Connecting to MCP',
                    message: 'The local live connection is starting.',
                    color: 'indigo',
                  });
                } catch (error) {
                  notifications.show({
                    title: 'MCP connection failed',
                    message:
                      error instanceof Error
                        ? error.message
                        : 'Check the MCP server settings.',
                    color: 'red',
                  });
                }
              }}
            >
              {connected ? 'MCP connected' : 'Connect MCP'}
            </Button>
          </SimpleGrid>

          <Dropzone
            aria-label="Drop an Excalidraw or Excalimate file"
            loading={loading}
            multiple={false}
            onDrop={(files) => {
              const file = files[0];
              if (!file) return;
              const isProject = file.name.toLowerCase().endsWith('.excanim');
              void runFileAction(file, isProject ? 'open' : 'import');
            }}
            onReject={() =>
              notifications.show({
                title: 'Unsupported file',
                message: 'Drop an Excalidraw JSON or .excanim project.',
                color: 'yellow',
              })
            }
          >
            <Group justify="center" gap="xs" mih={54}>
              <IconFileImport
                size={22}
                color="var(--mantine-color-dimmed)"
                aria-hidden="true"
              />
              <Text size="sm" c="dimmed" ta="center">
                Drop an Excalidraw or Excalimate file here
              </Text>
            </Group>
          </Dropzone>

          <Button
            variant="subtle"
            disabled
            leftSection={<IconSparkles size={18} aria-hidden="true" />}
            aria-describedby="template-teaser-description"
          >
            Start from a template
          </Button>
          <Text
            id="template-teaser-description"
            size="xs"
            c="dimmed"
            ta="center"
          >
            Templates are coming in a later release.
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}
