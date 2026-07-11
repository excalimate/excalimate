import { lazy, Suspense } from 'react';
import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowBackUp } from '@tabler/icons-react';
import { FileControls } from '../Toolbar/FileControls';
import { ExportControls } from '../Toolbar/ExportControls';
import { PlaybackControls } from '../Toolbar/PlaybackControls';
import { ThemeToggle } from '../Toolbar/ThemeToggle';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { WorkspaceUnsupportedMessage } from './WorkspaceUnsupportedMessage';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ActionList } from '../Sequence/ActionList';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useSceneChangeSync } from '../App/useSceneChangeSync';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { getWorkspaceMinimumWidth } from '../../core/workspace/workspaceLayout';

const AnimateCanvasWrapper = lazy(() =>
  import('../App/AnimateCanvasWrapper').then((module) => ({
    default: module.AnimateCanvasWrapper,
  })),
);

export function SequenceWorkspace() {
  const isSupported = useMediaQuery(
    `(min-width: ${getWorkspaceMinimumWidth('sequence')}px)`,
    true,
  );
  const theme = useUIStore((state) => state.theme);
  const selectedElementIds = useUIStore(
    (state) => state.selectedElementIds,
  );
  const project = useProjectStore((state) => state.project);
  const targets = useProjectStore((state) => state.targets);
  const cameraFrame = useProjectStore((state) => state.cameraFrame);
  const canUndo = useUndoRedoStore((state) => state.canUndo);
  const { handleElementsSelected } = useSceneChangeSync();

  if (!isSupported) {
    return <WorkspaceUnsupportedMessage workspace="sequence" />;
  }

  return (
    <Box
      h="100vh"
      w="100vw"
      bg="var(--color-surface)"
      c="var(--color-text)"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        component="header"
        role="toolbar"
        aria-label="Sequence workspace toolbar"
        radius={0}
        withBorder
        px="md"
        py="xs"
      >
        <Group justify="space-between" gap="xs" wrap="wrap">
          <Group gap="xs" wrap="wrap">
            <img
              src={
                theme === 'dark'
                  ? '/excalimate_logo_dark.svg'
                  : '/excalimate_logo.svg'
              }
              alt="Excalimate logo"
              style={{ height: 22 }}
            />
            <FileControls />
            <WorkspaceSwitcher />
          </Group>
          <Group gap="xs" wrap="wrap">
            <PlaybackControls />
            <Tooltip label="Undo sequence action">
              <ActionIcon
                className="sequence-action-control"
                aria-label="Undo sequence action"
                variant="subtle"
                disabled={!canUndo}
                onClick={() => {
                  const result = useUndoRedoStore.getState().undo();
                  computeFrameAtTime(result?.time ?? 0);
                }}
              >
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <ExportControls />
            <ThemeToggle />
          </Group>
        </Group>
      </Paper>

      <Group
        align="stretch"
        gap="sm"
        p="sm"
        wrap="nowrap"
        style={{ flex: 1, minHeight: 0 }}
      >
        <Box
          component="main"
          aria-label="Sequence preview canvas"
          pos="relative"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <ErrorBoundary
            fallback={
              <Box
                h="100%"
                style={{ display: 'grid', placeItems: 'center' }}
              >
                Canvas error
              </Box>
            }
          >
            <Suspense
              fallback={
                <Box
                  h="100%"
                  style={{ display: 'grid', placeItems: 'center' }}
                >
                  Loading preview...
                </Box>
              }
            >
              <AnimateCanvasWrapper
                scene={project?.scene ?? null}
                targets={targets}
                selectedElementIds={selectedElementIds}
                cameraFrame={cameraFrame}
                onSelectElements={handleElementsSelected}
                onDragElement={() => undefined}
                onResizeElement={() => undefined}
                onRotateElement={() => undefined}
              />
            </Suspense>
          </ErrorBoundary>
        </Box>
        <Paper
          component="aside"
          aria-label="Sequence action list"
          withBorder
          radius="md"
          w="clamp(340px, 38vw, 520px)"
          miw={340}
          style={{ overflow: 'hidden' }}
        >
          <ActionList />
        </Paper>
      </Group>
    </Box>
  );
}
