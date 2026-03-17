import { useState, type ReactNode } from 'react';
import { Button, Modal, Progress, Text, Group, Stack, Alert, Tabs, SegmentedControl } from '@mantine/core';
import { nprogress } from '@mantine/nprogress';
import { notifications } from '@mantine/notifications';
import {
  IconMovie, IconVideo, IconPhoto, IconSvg, IconDownload, IconCheck, IconX,
  IconCamera,
} from '@tabler/icons-react';
import { exportAnimation } from '../../services/ExportService';
import type { ExportFormat, ExportQuality } from '../../services/ExportService';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

// ── Video export ─────────────────────────────────────────────────

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

// ── Image export ─────────────────────────────────────────────────

type ImageFormat = 'png' | 'jpg' | 'svg';
type ImageSource = 'raw' | 'animated' | 'camera';
type ImageScale = 1 | 2 | 3 | 4;

const IMAGE_FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'svg', label: 'SVG' },
];

const IMAGE_SCALES: { value: string; label: string }[] = [
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '3', label: '3x' },
  { value: '4', label: '4x' },
];

// ── General settings ─────────────────────────────────────────────

type ExportTheme = 'light' | 'dark';

async function exportImage(
  source: ImageSource,
  imageFormat: ImageFormat,
  scale: ImageScale,
  exportTheme: ExportTheme,
): Promise<void> {
  const { getNonDeletedElements, exportToSvg } = await import('@excalidraw/excalidraw');
  const { applyAnimationToElements } = await import('../../core/engine/renderUtils');
  const { getCameraRect } = await import('../../services/export/cameraMath');

  const project = useProjectStore.getState().project;
  if (!project?.scene) throw new Error('No scene to export');

  const rawElements = getNonDeletedElements(project.scene.elements);
  const targets = useProjectStore.getState().targets;
  const frameState = (await import('../../stores/playbackStore')).usePlaybackStore.getState().frameState;
  const files = project.scene.files ?? {};

  // Choose elements based on source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let elements: any[] = [...rawElements];
  if (source === 'animated' || source === 'camera') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements = applyAnimationToElements([...rawElements] as any, frameState, targets);
  }

  const isDark = exportTheme === 'dark';

  // exportWithDarkMode applies a CSS invert filter to the ENTIRE SVG (including
  // background). So we pass the LIGHT-mode colors and let the filter invert them:
  // white background → dark, black strokes → white, etc.
  const svg = await exportToSvg({
    elements,
    files,
    appState: {
      exportBackground: true,
      exportWithDarkMode: isDark,
      viewBackgroundColor: '#ffffff',
    },
    exportPadding: 20,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // Crop to camera frame if needed
  if (source === 'camera') {
    const cfg = useProjectStore.getState().cameraFrame;
    const cameraRect = getCameraRect(cfg, frameState);
    const vb = svg.viewBox?.baseVal;

    // Compute scene bounds to map camera coords to SVG coords
    let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
    for (const el of elements) {
      const x1 = Math.min(el.x, el.x + el.width);
      const y1 = Math.min(el.y, el.y + el.height);
      const x2 = Math.max(el.x, el.x + el.width);
      const y2 = Math.max(el.y, el.y + el.height);
      if (x1 < sMinX) sMinX = x1;
      if (y1 < sMinY) sMinY = y1;
      if (x2 > sMaxX) sMaxX = x2;
      if (y2 > sMaxY) sMaxY = y2;
    }

    const sceneW = (sMaxX - sMinX) || 1;
    const sceneH = (sMaxY - sMinY) || 1;
    const svgScaleX = (vb?.width ?? sceneW) / sceneW;
    const svgScaleY = (vb?.height ?? sceneH) / sceneH;

    const camSvgX = (cameraRect.x - cameraRect.width / 2 - sMinX) * svgScaleX + (vb?.x ?? 0);
    const camSvgY = (cameraRect.y - cameraRect.height / 2 - sMinY) * svgScaleY + (vb?.y ?? 0);
    const camSvgW = cameraRect.width * svgScaleX;
    const camSvgH = cameraRect.height * svgScaleY;

    svg.setAttribute('viewBox', `${camSvgX} ${camSvgY} ${camSvgW} ${camSvgH}`);
  }

  if (imageFormat === 'svg') {
    // Direct SVG download
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `excalimate-export.svg`);
    return;
  }

  // Rasterize SVG to canvas
  const vb = svg.viewBox?.baseVal;
  const baseW = vb?.width ?? 800;
  const baseH = vb?.height ?? 600;
  const outW = Math.round(baseW * scale);
  const outH = Math.round(baseH * scale);

  svg.setAttribute('width', String(outW));
  svg.setAttribute('height', String(outH));

  const svgStr = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  const img = new Image(outW, outH);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = isDark ? '#121212' : '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG'));
    };
    img.src = url;
  });

  const mimeType = imageFormat === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = imageFormat === 'jpg' ? 0.92 : undefined;
  canvas.toBlob(
    (b) => {
      if (b) downloadBlob(b, `excalimate-export.${imageFormat}`);
    },
    mimeType,
    quality,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────

export function ExportControls() {
  const mode = useUIStore((s) => s.mode);
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Video state
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Image state
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [imageSource, setImageSource] = useState<ImageSource>('raw');
  const [imageScale, setImageScale] = useState<ImageScale>(2);

  // General
  const [exportTheme, setExportTheme] = useState<ExportTheme>('light');

  const clipStart = useAnimationStore((s) => s.clipStart);
  const clipEnd = useAnimationStore((s) => s.clipEnd);
  const clipDuration = ((clipEnd - clipStart) / 1000).toFixed(1);

  const handleOpen = () => {
    setActiveTab(mode === 'animate' ? 'video' : 'image');
    setShowDialog(true);
  };

  const handleVideoExport = async () => {
    try {
      setExporting(true);
      setProgress(0);
      nprogress.start();
      await exportAnimation({
        format,
        quality,
        theme: exportTheme,
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
      notifications.show({ title: 'Export failed', message, icon: <IconX size={16} />, color: 'red' });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const handleImageExport = async () => {
    try {
      setExporting(true);
      nprogress.start();
      await exportImage(imageSource, imageFormat, imageScale, exportTheme);
      nprogress.complete();
      notifications.show({
        title: 'Image exported',
        message: `${imageFormat.toUpperCase()} image at ${imageScale}x scale.`,
        icon: <IconCheck size={16} />,
        color: 'green',
      });
    } catch (error) {
      nprogress.complete();
      const message = error instanceof Error ? error.message : 'Export failed';
      notifications.show({ title: 'Export failed', message, icon: <IconX size={16} />, color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  const isAnimateMode = mode === 'animate';

  return (
    <>
      <Button variant="subtle" color="gray" size="compact-sm" leftSection={<IconDownload size={14} />} onClick={handleOpen}>
        Export
      </Button>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Export"
        size="md"
      >
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="video" leftSection={<IconMovie size={14} />}>Video</Tabs.Tab>
            <Tabs.Tab value="image" leftSection={<IconPhoto size={14} />}>Image</Tabs.Tab>
          </Tabs.List>

          {/* ── Video Tab ─────────────────────────── */}
          <Tabs.Panel value="video" pt="md">
            <Stack gap="md">
              <Text size="xs" c="dimmed">
                Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s ({clipDuration}s)
              </Text>

              {exporting && activeTab === 'video' ? (
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
                  <div>
                    <Text size="xs" fw={500} mb={8}>Format</Text>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((f) => {
                        const info = FORMAT_INFO[f];
                        return (
                          <button
                            key={f}
                            type="button"
                            className={`px-3 py-2 rounded border text-left text-xs transition-colors cursor-pointer ${
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

                  {format !== 'svg' && (
                    <div>
                      <Text size="xs" fw={500} mb={8}>Quality</Text>
                      <div className="grid grid-cols-4 gap-1">
                        {(Object.keys(QUALITY_INFO) as ExportQuality[]).map((q) => {
                          const info = QUALITY_INFO[q];
                          return (
                            <button
                              key={q}
                              type="button"
                              className={`px-2 py-1.5 rounded border text-center text-[10px] transition-colors cursor-pointer ${
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
                      <Text size="xs" c="dimmed" mt={4}>{QUALITY_INFO[quality].desc}</Text>
                    </div>
                  )}

                  <Button fullWidth leftSection={<IconDownload size={16} />} onClick={handleVideoExport}>
                    Export {FORMAT_INFO[format].label}
                  </Button>
                </>
              )}
            </Stack>
          </Tabs.Panel>

          {/* ── Image Tab ─────────────────────────── */}
          <Tabs.Panel value="image" pt="md">
            <Stack gap="md">
              {/* Source (animate mode only) */}
              {isAnimateMode && (
                <div>
                  <Text size="xs" fw={500} mb={8}>Source</Text>
                  <div className="grid grid-cols-1 gap-1.5">
                    {([
                      { value: 'raw' as ImageSource, label: 'Complete drawing', desc: 'Original scene without animation', icon: <IconPhoto size={14} /> },
                      { value: 'animated' as ImageSource, label: 'Current animation state', desc: 'Drawing with animation applied at current time', icon: <IconMovie size={14} /> },
                      { value: 'camera' as ImageSource, label: 'Camera frame', desc: 'Cropped to camera frame at current time', icon: <IconCamera size={14} /> },
                    ]).map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={`px-3 py-2 rounded border text-left text-xs transition-colors cursor-pointer ${
                          imageSource === s.value
                            ? 'border-accent bg-accent-muted text-accent'
                            : 'border-border text-text-muted hover:border-accent/50'
                        }`}
                        onClick={() => setImageSource(s.value)}
                      >
                        <div className="font-medium flex items-center gap-1">{s.icon} {s.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format */}
              <div>
                <Text size="xs" fw={500} mb={8}>Format</Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={imageFormat}
                  onChange={(v) => setImageFormat(v as ImageFormat)}
                  data={IMAGE_FORMATS}
                />
              </div>

              {/* Scale (not for SVG) */}
              {imageFormat !== 'svg' && (
                <div>
                  <Text size="xs" fw={500} mb={8}>Scale</Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    value={String(imageScale)}
                    onChange={(v) => setImageScale(Number(v) as ImageScale)}
                    data={IMAGE_SCALES}
                  />
                </div>
              )}

              <Button
                fullWidth
                leftSection={<IconDownload size={16} />}
                onClick={handleImageExport}
                loading={exporting}
              >
                Export {imageFormat.toUpperCase()}
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* ── Shared settings (visible for both tabs) ── */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Group gap="sm" align="center">
            <Text size="xs" fw={500}>Export Theme</Text>
            <SegmentedControl
              size="xs"
              value={exportTheme}
              onChange={(v) => setExportTheme(v as ExportTheme)}
              data={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Group>
        </div>
      </Modal>
    </>
  );
}
