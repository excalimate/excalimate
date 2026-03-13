import { FileControls } from './FileControls';
import { ModeSwitcher } from './ModeSwitcher';
import { PlaybackControls } from './PlaybackControls';
import { ExportControls } from './ExportControls';
import { FrameControls } from './FrameControls';
import { useUIStore } from '../../stores/uiStore';
import { useMcpLive } from '../../hooks/useMcpLive';

export function Toolbar() {
  const ghostMode = useUIStore((s) => s.ghostMode);
  const sequenceRevealOpen = useUIStore((s) => s.sequenceRevealOpen);
  const { connected, connect, disconnect } = useMcpLive();

  return (
    <header role="toolbar" aria-label="Main toolbar" className="flex items-center h-10 px-2 gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] select-none">
      {/* Left section: Logo and file controls */}
      <div className="flex items-center gap-1 mr-4">
        <span className="text-sm font-semibold text-indigo-400 mr-2">
          ✦ Animate
        </span>
        <FileControls />
      </div>

      {/* Center section: Mode switcher */}
      <div className="flex-1 flex justify-center">
        <ModeSwitcher />
      </div>

      {/* Right section: Ghost mode + Frame + Playback + Export */}
      <div className="flex items-center gap-1">
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            ghostMode
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-indigo-400'
          }`}
          onClick={() => useUIStore.getState().toggleGhostMode()}
          title="Ghost Mode: Show faded hidden elements for easier selection"
        >
          👻 Ghost
        </button>
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            sequenceRevealOpen
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-indigo-400'
          }`}
          onClick={() => useUIStore.getState().toggleSequenceReveal()}
          title="Sequence Reveal: Create staggered reveal animations"
        >
          🎬 Sequence
        </button>
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            connected
              ? 'bg-green-500/20 border-green-500/50 text-green-300'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-green-400'
          }`}
          onClick={() => connected ? disconnect() : connect()}
          title={connected ? 'Disconnect from MCP server' : 'Connect to MCP server for live AI-driven updates'}
        >
          {connected ? '🟢 Live' : '📡 Live'}
        </button>
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
        <FrameControls />
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
        <PlaybackControls />
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
        <ExportControls />
      </div>
    </header>
  );
}
