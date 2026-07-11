import type { ExportTaskContext } from '@excalimate/export-runtime';
import type { PreparedExportContext } from './context';
import { downloadBlob } from './download';
import { renderRasterFrames } from './rasterFrames';
import { QUALITY_SETTINGS, type ExportOptions } from './types';

export async function exportWebM(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  const useVp9 = context.capabilities.vp9;
  if (!useVp9 && !context.capabilities.vp8) {
    throw new Error(
      'Neither VP8 nor VP9 encoding is available for this export.',
    );
  }
  const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
  task.throwIfCancelled();
  const bitrate = QUALITY_SETTINGS[options.quality ?? 'high'].bitrate;
  const frameDurationUs = Math.round(1_000_000 / context.fps);
  const codec = useVp9 ? 'vp09.00.10.08' : 'vp8';
  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: useVp9 ? 'V_VP9' : 'V_VP8',
      width: context.width,
      height: context.height,
      frameRate: context.fps,
    },
  });
  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: (error) => {
      encoderError = error;
    },
  });
  task.defer(() => {
    if (encoder.state !== 'closed') encoder.close();
  });
  encoder.configure({
    codec,
    width: context.width,
    height: context.height,
    bitrate,
    framerate: context.fps,
  });

  await renderRasterFrames(context, task, async (canvas, frameIndex) => {
    const frame = new VideoFrame(canvas, {
      timestamp: frameIndex * frameDurationUs,
      duration: frameDurationUs,
    });
    try {
      encoder.encode(frame, {
        keyFrame:
          frameIndex % Math.max(1, Math.round(context.fps * 2)) === 0,
      });
    } finally {
      frame.close();
    }
    if (encoder.encodeQueueSize > 4) await encoder.flush();
    if (encoderError) throw encoderError;
  });

  task.report('encode', 0.25, `Flushing ${useVp9 ? 'VP9' : 'VP8'} encoder`);
  await encoder.flush();
  if (encoderError) throw encoderError;
  encoder.close();
  task.report('encode', 1, 'WebM encoding complete');
  task.report('package', 0.4, 'Finalizing WebM container');
  muxer.finalize();
  const blob = new Blob([muxerTarget.buffer], { type: 'video/webm' });
  task.report('package', 1, 'WebM container ready');
  task.report('download', 0.5, 'Starting WebM download');
  downloadBlob(blob, `${context.projectName}.webm`);
}
