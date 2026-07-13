import { useEffect, useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { NavigationProgress } from '@mantine/nprogress';
import { McpSetupGuide } from '../Pages/McpSetupGuide';
import { ConsentBanner } from '../ConsentBanner';
import { MagicWorkspace } from '../Workspace/MagicWorkspace';
import { StudioWorkspace } from '../Workspace/StudioWorkspace';
import { SequenceWorkspace } from '../Workspace/SequenceWorkspace';
import { useUIStore } from '../../stores/uiStore';
import { useAppHotkeys } from '../../hooks/useAppHotkeys';
import { useAutoSave } from '../../hooks/useAutoSave';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { useShareLoader } from './useShareLoader';
import { getWorkspaceShellFlags } from '../../core/workspace/workspaceFlags';
import { trackCreatorEvent } from '../../services/analytics/posthog';

export function App() {
  useAppHotkeys();
  getPlaybackController();

  const shellFlags = useMemo(() => getWorkspaceShellFlags(), []);
  const shareLoadState = useShareLoader();
  const recoveryReady = useAutoSave({
    restoreLocal: shareLoadState === 'idle',
    enabled: shareLoadState !== 'loading',
  });
  const startupReady = shareLoadState !== 'loading' && recoveryReady;
  const theme = useUIStore((state) => state.theme);
  const workspace = useUIStore((state) => state.workspace);
  const activePage = useUIStore((state) => state.activePage);

  useEffect(() => {
    const handler = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!startupReady || !shellFlags.workspaceOverride) return;
    useUIStore.getState().hydrateWorkspace(shellFlags.workspaceOverride);
    trackCreatorEvent('creator_workspace_changed', {
      workspace: shellFlags.workspaceOverride,
      source: 'query',
    });
  }, [shellFlags.workspaceOverride, startupReady]);

  const content = activePage === 'mcp-guide' ? (
    <McpSetupGuide />
  ) : startupReady ? (
    shellFlags.forceStudioShell ||
    (workspace === 'sequence' && shellFlags.forceLegacySequence) ? (
      <StudioWorkspace legacyShell />
    ) : workspace === 'magic' ? (
      <MagicWorkspace />
    ) : workspace === 'sequence' ? (
      <SequenceWorkspace />
    ) : (
      <StudioWorkspace />
    )
  ) : null;

  return (
    <MantineProvider
      forceColorScheme={theme}
      theme={{ respectReducedMotion: true }}
    >
      <ModalsProvider>
        <Notifications position="bottom-right" />
        <NavigationProgress />
        {content}
        <ConsentBanner />
      </ModalsProvider>
    </MantineProvider>
  );
}
