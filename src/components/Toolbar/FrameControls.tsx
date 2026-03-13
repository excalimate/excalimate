import { useProjectStore } from '../../stores/projectStore';
import { getExportResolution } from '../../stores/projectStore';
import type { AspectRatio } from '../../stores/projectStore';

const RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1', '3:2'];

export function FrameControls() {
  const aspectRatio = useProjectStore((s) => s.cameraFrame.aspectRatio);
  const res = getExportResolution(aspectRatio);

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-[var(--color-text-secondary)]">🎬</span>
      <select
        className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        value={aspectRatio}
        onChange={(e) => useProjectStore.getState().setCameraAspectRatio(e.target.value as AspectRatio)}
        title={`Camera frame: ${res.width}×${res.height} export`}
      >
        {RATIOS.map((r) => {
          const rr = getExportResolution(r);
          return <option key={r} value={r}>{r} ({rr.width}×{rr.height})</option>;
        })}
      </select>
      <button
        className="text-[10px] text-[var(--color-text-secondary)] hover:text-indigo-400 px-1"
        onClick={() => useProjectStore.getState().fitFrameToScene()}
        title="Fit camera frame to scene"
      >
        ⊡
      </button>
    </div>
  );
}
