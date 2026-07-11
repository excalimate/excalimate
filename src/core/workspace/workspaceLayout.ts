export function getMagicControlsPlacement(
  mobile: boolean,
  hasElements: boolean,
): 'drawer' | 'sidebar' | 'hidden' {
  if (!hasElements) return 'hidden';
  return mobile ? 'drawer' : 'sidebar';
}

export function getMagicPreviewPolicy(reducedMotion: boolean): {
  autoPlay: false;
  transition: 'none' | 'standard';
} {
  return {
    autoPlay: false,
    transition: reducedMotion ? 'none' : 'standard',
  };
}

export function getWorkspaceMinimumWidth(
  workspace: 'sequence' | 'studio',
): number {
  return workspace === 'studio' ? 960 : 768;
}
