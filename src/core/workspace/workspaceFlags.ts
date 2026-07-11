import type { WorkspaceMode } from '../../types/ui';

export interface WorkspaceShellFlags {
  forceStudioShell: boolean;
  workspaceOverride?: WorkspaceMode;
}

export function resolveWorkspaceShellFlags(
  search: string,
  buildForceStudio = false,
): WorkspaceShellFlags {
  const params = new URLSearchParams(search);
  const queryForcesStudio =
    params.get('legacyStudio') === '1' || params.get('studio') === 'legacy';
  const requestedWorkspace = params.get('workspace');
  const workspaceOverride =
    requestedWorkspace === 'magic' ||
    requestedWorkspace === 'sequence' ||
    requestedWorkspace === 'studio'
      ? requestedWorkspace
      : undefined;

  return {
    forceStudioShell: buildForceStudio || queryForcesStudio,
    ...(workspaceOverride ? { workspaceOverride } : {}),
  };
}

export function getWorkspaceShellFlags(): WorkspaceShellFlags {
  return resolveWorkspaceShellFlags(
    window.location.search,
    import.meta.env.VITE_FORCE_STUDIO_SHELL === 'true',
  );
}
