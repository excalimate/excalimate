import { Kbd, Stack, Text } from '@mantine/core';
import {
  IconFolderOpen,
  IconFileImport,
  IconBroadcast,
  IconServer,
} from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useAnimationStore } from '../../stores/animationStore';

/**
 * Non-intrusive onboarding content shown on the canvas for empty projects.
 * Styled after Excalidraw's welcome screen — centered logo, helpful message,
 * and quick action links. Disappears automatically when user starts working.
 */
export function WelcomeOverlay() {
  const mode = useUIStore((s) => s.mode);
  const drawToolActive = useUIStore((s) => s.drawToolActive);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const theme = useUIStore((s) => s.theme);
  const targets = useProjectStore((s) => s.targets);
  const tracks = useAnimationStore((s) => s.timeline.tracks);

  const hasElements = targets.length > 1;
  const hasTracks = tracks.length > 0;
  const hasSelection = selectedElementIds.length > 0;

  // Hide when the user has content or is actively interacting
  if (mode === 'edit' && (hasElements || drawToolActive)) return null;
  if (mode === 'animate' && (hasTracks || hasSelection)) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
      <Stack gap="md" align="center" className="pointer-events-none">
        {/* Logo */}
        <img
          src={theme === 'dark' ? '/excalimate_logo_dark.svg' : '/excalimate_logo.svg'}
          alt="Excalimate"
          className="h-12 opacity-80"
        />

        {/* Helpful message */}
        <Text
          ta="center"
          style={{
            fontFamily: '"Virgil", "Segoe Print", "Comic Sans MS", cursive',
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
            opacity: 0.55,
            whiteSpace: 'pre-line',
          }}
        >
          {mode === 'edit'
            ? 'Draw something on the canvas,\nor use the actions below to get started.'
            : hasElements
              ? 'Select an element, then add\nkeyframes in the Properties panel.'
              : 'Switch to Edit mode and\ndraw some shapes first.'
          }
        </Text>

        {/* Quick action links */}
        {mode === 'edit' && (
          <Stack gap={4} className="pointer-events-auto" mt="xs">
            <ActionLink
              icon={<IconFolderOpen size={16} />}
              label="Open"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-hint="file"] button')?.click();
              }}
            />
            <ActionLink
              icon={<IconFileImport size={16} />}
              label="Import Excalidraw"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-hint="file"] button')?.click();
              }}
            />
            <ActionLink
              icon={<IconBroadcast size={16} />}
              label="Connect to MCP server"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-hint="live"] button')?.click();
              }}
            />
            <ActionLink
              icon={<IconServer size={16} />}
              label="MCP Setup Guide"
              onClick={() => useUIStore.getState().setActivePage('mcp-guide')}
            />
          </Stack>
        )}
      </Stack>
    </div>
  );
}

function ActionLink({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-accent-muted transition-colors text-left cursor-pointer"
      style={{ minWidth: 200 }}
    >
      <span className="text-text-muted opacity-60">{icon}</span>
      <span
        className="flex-1 text-text-muted"
        style={{
          fontFamily: '"Virgil", "Segoe Print", "Comic Sans MS", cursive',
          fontSize: '15px',
          opacity: 0.6,
        }}
      >
        {label}
      </span>
      {shortcut && (
        <Kbd size="xs" style={{ opacity: 0.5 }}>{shortcut}</Kbd>
      )}
    </button>
  );
}
