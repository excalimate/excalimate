import { useState, type ReactNode } from 'react';
import { Button } from '@mantine/core';
import { IconMovie, IconVideo, IconPhoto, IconSvg, IconDownload } from '@tabler/icons-react';
import { Modal } from '../common';
import { exportAnimation } from '../../services/ExportService';
import type { ExportFormat, ExportQuality } from '../../services/ExportService';
import { useAnimationStore } from '../../stores/animationStore';

const FORMAT_INFO: Record<ExportFormat, { label: string; desc: string; icon: ReactNode }> = {
  mp4: { label: 'MP4', desc: 'H.264 — best quality, universal playback', icon: <IconMovie size={16} /> },
  webm: { label: 'WebM', desc: 'VP9 — smaller files, web-optimized', icon: <IconVideo size={16} /> },
  gif: { label: 'GIF', desc: 'Animated image, works everywhere', icon: <IconPhoto size={16} /> },
  svg: { label: 'SVG', desc: 'Animated vector, infinite resolution', icon: <IconSvg size={16} /> },
};

const QUALITY_INFO: Record<ExportQuality, { label: string; desc: string }> = {
  low:         { label: 'Low',       desc: '2 Mbps / 480px' },
  medium:      { label: 'Medium',    desc: '8 Mbps / 640px' },
  high:        { label: 'High',      desc: '20 Mbps / 800px' },
  'very-high': { label: 'Very High', desc: '40 Mbps / 1280px' },
};

export function ExportControls() {
  const [showDialog, setShowDialog] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const clipStart = useAnimationStore((s) => s.clipStart);
  const clipEnd = useAnimationStore((s) => s.clipEnd);
  const clipDuration = ((clipEnd - clipStart) / 1000).toFixed(1);

  const handleExport = async () => {
    try {
      setExporting(true);
      setProgress(0);
      await exportAnimation({ format, quality, onProgress: setProgress });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      window.alert(`Export failed: ${message}`);
    } finally {
      setExporting(false);
      setProgress(0);
      setShowDialog(false);
    }
  };

  if (exporting) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
        <span className="text-accent">{FORMAT_INFO[format].icon} Exporting</span>
        <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <span>{Math.round(progress * 100)}%</span>
      </div>
    );
  }

  return (
    <>
      <Button variant="subtle" color="gray" size="compact-sm" leftSection={<IconDownload size={14} />} onClick={() => setShowDialog(true)}>
        Export
      </Button>

      <Modal isOpen={showDialog} onClose={() => setShowDialog(false)} title="Export Animation">
          <div className="space-y-4 w-[340px]">
            {/* Clip info */}
            <div className="text-xs text-text-muted">
              Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s ({clipDuration}s)
            </div>

            {/* Format selection */}
            <div>
              <div className="text-xs font-medium mb-2">Format</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((f) => {
                  const info = FORMAT_INFO[f];
                  return (
                    <button
                      key={f}
                      className={`px-3 py-2 rounded border text-left text-xs transition-colors ${
                        format === f
                          ? 'border-accent bg-accent-muted text-accent'
                          : 'border-border text-text-muted hover:border-accent/50'
                      }`}
                      onClick={() => setFormat(f)}
                    >
                      <div className="font-medium flex items-center gap-1">{info.icon} {info.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{info.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality selection (not for SVG) */}
            {format !== 'svg' && (
              <div>
                <div className="text-xs font-medium mb-2">Quality</div>
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(QUALITY_INFO) as ExportQuality[]).map((q) => {
                    const info = QUALITY_INFO[q];
                    return (
                      <button
                        key={q}
                        className={`px-2 py-1.5 rounded border text-center text-[10px] transition-colors ${
                          quality === q
                            ? 'border-accent bg-accent-muted text-accent'
                            : 'border-border text-text-muted hover:border-accent/50'
                        }`}
                        onClick={() => setQuality(q)}
                      >
                        <div className="font-medium">{info.label}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {QUALITY_INFO[quality].desc}
                </div>
              </div>
            )}

            {/* Export button */}
            <Button fullWidth onClick={handleExport}>
              Export {FORMAT_INFO[format].label}
            </Button>
          </div>
        </Modal>
    </>
  );
}
