import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import {
  IconAdjustments,
  IconArrowBackUp,
  IconPlayerPlay,
  IconShare,
} from '@tabler/icons-react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { WelcomeOverlay } from '../Onboarding/WelcomeOverlay';
import { FileControls } from '../Toolbar/FileControls';
import { ExportControls } from '../Toolbar/ExportControls';
import { PlaybackControls } from '../Toolbar/PlaybackControls';
import { ThemeToggle } from '../Toolbar/ThemeToggle';
import { useShareOperations } from '../Toolbar/useShareOperations';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { MagicControls } from './MagicControls';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useSceneChangeSync } from '../App/useSceneChangeSync';
import {
  computeFrameAtTime,
  getPlaybackController,
} from '../../core/engine/playbackSingleton';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import {
  getMagicControlsPlacement,
  getMagicPreviewPolicy,
} from '../../core/workspace/workspaceLayout';

const ExcalidrawEditor = lazy(() =>
  import('../Canvas/ExcalidrawEditor').then((module) => ({
    default: module.ExcalidrawEditor,
  })),
);
const AnimateCanvasWrapper = lazy(() =>
  import('../App/AnimateCanvasWrapper').then((module) => ({
    default: module.AnimateCanvasWrapper,
  })),
);

export function MagicWorkspace() {
  const mobile = useMediaQuery('(max-width: 47.99em)', false);
  const reducedMotion = useReducedMotion();
  const firstPreviewTracked = useRef(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const project = useProjectStore((state) => state.project);
  const theme = useUIStore((state) => state.theme);
  const targets = useProjectStore((state) => state.targets);
  const cameraFrame = useProjectStore((state) => state.cameraFrame);
  const canvasMode = useUIStore((state) => state.canvasMode);
  const selectedElementIds = useUIStore(
    (state) => state.selectedElementIds,
  );
  const canUndo = useUndoRedoStore((state) => state.canUndo);
  const { handleSceneChange, handleElementsSelected } = useSceneChangeSync();
  const { loading: shareLoading, handleShare } = useShareOperations();
  const hasElements =
    project?.scene.elements.some((element) => !element.isDeleted) ?? false;
  const controlsPlacement = getMagicControlsPlacement(mobile, hasElements);
  const previewPolicy = getMagicPreviewPolicy(reducedMotion);

  const setCanvasMode = (mode: 'design' | 'preview') => {
    useUIStore.getState().setCanvasMode(mode);
  };

  useEffect(() => {
    if (canvasMode === 'preview' && !firstPreviewTracked.current) {
      firstPreviewTracked.current = true;
      trackCreatorEvent('creator_first_preview', {
        workspace: 'magic',
        reduced_motion: reducedMotion,
      });
    }
  }, [canvasMode, reducedMotion]);

  const undo = () => {
    const result = useUndoRedoStore.getState().undo();
    computeFrameAtTime(result?.time ?? 0);
  };

  const startPlayback = () => {
    setCanvasMode('preview');
    getPlaybackController().togglePlayPause();
  };

  return (
    <Box
      h="100vh"
      w="100vw"
      bg="var(--color-surface)"
      c="var(--color-text)"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        className="magic-toolbar"
        component="header"
        role="toolbar"
        aria-label="Magic workspace toolbar"
        radius={0}
        withBorder
        px={{ base: 'xs', sm: 'md' }}
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
            <SegmentedControl
              aria-label="Canvas mode"
              size="xs"
              value={canvasMode}
              onChange={(value) =>
                setCanvasMode(value as 'design' | 'preview')
              }
              data={[
                { value: 'design', label: 'Design' },
                { value: 'preview', label: 'Preview' },
              ]}
            />
            {canvasMode === 'preview' && !mobile ? (
              <PlaybackControls />
            ) : (
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconPlayerPlay size={16} aria-hidden="true" />}
                onClick={startPlayback}
                disabled={!hasElements}
              >
                Play
              </Button>
            )}
            <Tooltip label="Undo animation action">
              <ActionIcon
                aria-label="Undo animation action"
                size={mobile ? 'lg' : 'md'}
                variant="subtle"
                disabled={!canUndo}
                onClick={undo}
              >
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <ExportControls />
            <Button
              size="compact-sm"
              variant="subtle"
              loading={shareLoading}
              leftSection={<IconShare size={16} aria-hidden="true" />}
              onClick={() => void handleShare()}
            >
              Share
            </Button>
            <ThemeToggle />
            {mobile && hasElements && (
              <Button
                size="compact-sm"
                leftSection={<IconAdjustments size={16} aria-hidden="true" />}
                onClick={() => setControlsOpen(true)}
              >
                Controls
              </Button>
            )}
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
          aria-label="Magic canvas"
          data-preview-transition={previewPolicy.transition}
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
                  Loading editor...
                </Box>
              }
            >
              {canvasMode === 'design' ? (
                <ExcalidrawEditor
                  key={project?.id ?? 'empty'}
                  onSceneChange={handleSceneChange}
                  onElementsSelected={handleElementsSelected}
                  initialData={project?.scene}
                />
              ) : (
                <AnimateCanvasWrapper
                  scene={project?.scene ?? null}
                  targets={targets}
                  selectedElementIds={selectedElementIds}
                  cameraFrame={cameraFrame}
                  onSelectElements={(ids) =>
                    useUIStore.getState().setSelectedElements(ids)
                  }
                  onDragElement={() => undefined}
                  onResizeElement={() => undefined}
                  onRotateElement={() => undefined}
                />
              )}
            </Suspense>
          </ErrorBoundary>
          <WelcomeOverlay />
        </Box>

        {controlsPlacement === 'sidebar' && (
          <Paper
            component="aside"
            aria-label="Magic animation controls"
            withBorder
            radius="md"
            w={330}
            miw={300}
          >
            <ScrollArea h="100%" type="auto">
              <MagicControls />
            </ScrollArea>
          </Paper>
        )}
      </Group>

      <Drawer
        opened={controlsPlacement === 'drawer' && controlsOpen}
        onClose={() => setControlsOpen(false)}
        title="Magic animation controls"
        position="bottom"
        size="85%"
        closeButtonProps={{ 'aria-label': 'Close animation controls' }}
      >
        <ScrollArea h="calc(85vh - 72px)">
          <MagicControls />
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
