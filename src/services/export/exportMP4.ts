import type { ExportTaskContext } from '@excalimate/export-runtime';
import type { PreparedExportContext } from './context';
import { downloadBlob } from './download';
import { renderRasterFrames } from './rasterFrames';
import { QUALITY_SETTINGS, type ExportOptions } from './types';

export async function exportMP4(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  if (!context.capabilities.h264) {
    throw new Error(
      'H.264 encoding is unavailable for this export. Try WebM or reduce the dimensions.',
    );
  }
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  task.throwIfCancelled();
  const bitrate = QUALITY_SETTINGS[options.quality ?? 'high'].bitrate;
  const frameDurationUs = Math.round(1_000_000 / context.fps);
  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'avc',
      width: context.width,
      height: context.height,
      frameRate: context.fps,
    },
    fastStart: 'in-memory',
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
    codec: 'avc1.640028',
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

  task.report('encode', 0.25, 'Flushing H.264 encoder');
  await encoder.flush();
  if (encoderError) throw encoderError;
  encoder.close();
  task.report('encode', 1, 'H.264 encoding complete');
  task.report('package', 0.4, 'Finalizing MP4 container');
  muxer.finalize();
  const blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
  task.report('package', 1, 'MP4 container ready');
  task.report('download', 0.5, 'Starting MP4 download');
  downloadBlob(blob, `${context.projectName}.mp4`);
}
