import type { WorkspaceMode } from '../../types/ui';

export interface WorkspaceShellFlags {
  forceStudioShell: boolean;
  forceLegacySequence: boolean;
  workspaceOverride?: WorkspaceMode;
}

export function resolveWorkspaceShellFlags(
  search: string,
  buildForceStudio = false,
  buildForceLegacySequence = false,
): WorkspaceShellFlags {
  const params = new URLSearchParams(search);
  const queryForcesStudio =
    params.get('legacyStudio') === '1' || params.get('studio') === 'legacy';
  const queryForcesLegacySequence =
    params.get('legacySequence') === '1' ||
    params.get('sequence') === 'legacy';
  const requestedWorkspace = params.get('workspace');
  const workspaceOverride =
    requestedWorkspace === 'magic' ||
    requestedWorkspace === 'sequence' ||
    requestedWorkspace === 'studio'
      ? requestedWorkspace
      : undefined;

  return {
    forceStudioShell: buildForceStudio || queryForcesStudio,
    forceLegacySequence:
      buildForceLegacySequence || queryForcesLegacySequence,
    ...(workspaceOverride ? { workspaceOverride } : {}),
  };
}

export function getWorkspaceShellFlags(): WorkspaceShellFlags {
  return resolveWorkspaceShellFlags(
    window.location.search,
    import.meta.env.VITE_FORCE_STUDIO_SHELL === 'true',
    import.meta.env.VITE_FORCE_LEGACY_SEQUENCE === 'true',
  );
}
