import { useState, type ReactNode } from 'react';
import { Button, Modal, Progress, Text, Group, Stack, Alert } from '@mantine/core';
import { nprogress } from '@mantine/nprogress';
import { notifications } from '@mantine/notifications';
import { IconMovie, IconVideo, IconPhoto, IconSvg, IconDownload, IconCheck, IconX } from '@tabler/icons-react';
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
      nprogress.start();
      await exportAnimation({
        format,
        quality,
        onProgress: (p) => {
          setProgress(p);
          nprogress.set(p * 100);
        },
      });
      nprogress.complete();
      notifications.show({
        title: 'Export complete',
        message: `${FORMAT_INFO[format].label} file has been exported successfully.`,
        icon: <IconCheck size={16} />,
        color: 'green',
      });
    } catch (error) {
      nprogress.complete();
      const message = error instanceof Error ? error.message : 'Export failed';
      notifications.show({
        title: 'Export failed',
        message,
        icon: <IconX size={16} />,
        color: 'red',
      });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Button variant="subtle" color="gray" size="compact-sm" leftSection={<IconDownload size={14} />} onClick={() => setShowDialog(true)}>
        Export
      </Button>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Export Animation"
        size="md"
      >
        <Stack gap="md">
          {/* Clip info */}
          <Text size="xs" c="dimmed">
            Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s ({clipDuration}s)
          </Text>

          {/* Export progress */}
          {exporting ? (
            <Stack gap="xs">
              <Group gap="xs">
                {FORMAT_INFO[format].icon}
                <Text size="sm" fw={500}>Exporting {FORMAT_INFO[format].label}…</Text>
              </Group>
              <Progress value={progress * 100} animated size="lg" radius="sm" />
              <Text size="xs" c="dimmed" ta="center">{Math.round(progress * 100)}%</Text>
              <Alert variant="light" color="blue" radius="sm">
                <Text size="xs">You can close this dialog — the export will continue in the background.</Text>
              </Alert>
            </Stack>
          ) : (
            <>
              {/* Format selection */}
              <div>
                <Text size="xs" fw={500} mb={8}>Format</Text>
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
                  <Text size="xs" fw={500} mb={8}>Quality</Text>
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
                  <Text size="xs" c="dimmed" mt={4}>
                    {QUALITY_INFO[quality].desc}
                  </Text>
                </div>
              )}

              {/* Export button */}
              <Button fullWidth leftSection={<IconDownload size={16} />} onClick={handleExport}>
                Export {FORMAT_INFO[format].label}
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
