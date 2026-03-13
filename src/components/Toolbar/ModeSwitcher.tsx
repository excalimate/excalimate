import { useUIStore } from '../../stores/uiStore';

export function ModeSwitcher() {
  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);

  const baseClasses =
    'px-3 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none';
  const activeClasses = 'bg-indigo-500/20 text-indigo-400';
  const inactiveClasses =
    'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]';

  return (
    <div className="flex items-center bg-[var(--color-surface)] rounded-md p-0.5">
      <button
        onClick={() => setMode('edit')}
        className={`${baseClasses} ${mode === 'edit' ? activeClasses : inactiveClasses}`}
      >
        ✏️ Edit
      </button>
      <button
        onClick={() => setMode('animate')}
        className={`${baseClasses} ${mode === 'animate' ? activeClasses : inactiveClasses}`}
      >
        🎬 Animate
      </button>
    </div>
  );
}
