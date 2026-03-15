import { ActionIcon, Tooltip } from '@mantine/core';
import { IconAspectRatio, IconMaximize } from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import { getExportResolution } from '../../stores/projectStore';
import type { AspectRatio } from '../../stores/projectStore';

const RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1', '3:2'];

export function FrameControls() {
  const aspectRatio = useProjectStore((s) => s.cameraFrame.aspectRatio);
  const res = getExportResolution(aspectRatio);

  return (
    <div className="flex items-center gap-1">
      <IconAspectRatio size={14} className="text-text-muted" />
      <select
        className="text-[10px] bg-surface border border-border rounded px-1 py-0.5 text-text cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/50"
        value={aspectRatio}
        onChange={(e) => useProjectStore.getState().setCameraAspectRatio(e.target.value as AspectRatio)}
        title={`Camera frame: ${res.width}×${res.height} export`}
      >
        {RATIOS.map((r) => {
          const rr = getExportResolution(r);
          return <option key={r} value={r}>{r} ({rr.width}×{rr.height})</option>;
        })}
      </select>
      <Tooltip label="Fit camera frame to scene">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => useProjectStore.getState().fitFrameToScene()}>
          <IconMaximize size={16} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
