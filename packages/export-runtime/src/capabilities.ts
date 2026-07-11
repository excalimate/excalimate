import type { ExportCapabilityReport } from './types.js';

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

export interface CapabilityDetectionOptions {
  width: number;
  height: number;
  bitrate: number;
}

export async function detectExportCapabilities(
  options: CapabilityDetectionOptions,
): Promise<ExportCapabilityReport> {
  const videoEncoder = typeof VideoEncoder !== 'undefined';
  const [h264, vp8, vp9] = videoEncoder
    ? await Promise.all([
        supportsCodec('avc1.640028', options),
        supportsCodec('vp8', options),
        supportsCodec('vp09.00.10.08', options),
      ])
    : [false, false, false];
  const worker = typeof Worker !== 'undefined';
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const navigatorWithMemory =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithDeviceMemory);
  const deviceMemoryBytes =
    navigatorWithMemory?.deviceMemory === undefined
      ? undefined
      : navigatorWithMemory.deviceMemory * 1024 * 1024 * 1024;

  return {
    worker,
    offscreenCanvas,
    videoEncoder,
    h264,
    vp8,
    vp9,
    ...(deviceMemoryBytes === undefined ? {} : { deviceMemoryBytes }),
    executionMode: worker ? 'worker-assisted' : 'cooperative-main',
  };
}

async function supportsCodec(
  codec: string,
  options: CapabilityDetectionOptions,
): Promise<boolean> {
  try {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width: options.width,
      height: options.height,
      bitrate: options.bitrate,
      framerate: 30,
    });
    return support.supported === true;
  } catch {
    return false;
  }
}
