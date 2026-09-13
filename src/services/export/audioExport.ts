import type { AudioAttachment } from '@excalimate/project-schema';
import type { ExportTaskContext } from '@excalimate/export-runtime';

const EXPORT_SAMPLE_RATE = 48_000;
const EXPORT_AUDIO_BITRATE = 128_000;

export type ExportAudioCodec = 'aac' | 'opus';

export interface PreparedAudioTrack {
  channels: readonly Float32Array[];
  sampleRate: number;
  frameCount: number;
}

export async function prepareAudioTrack(
  attachment: AudioAttachment | undefined,
  clipStartMs: number,
  clipEndMs: number,
  codec: ExportAudioCodec,
): Promise<PreparedAudioTrack | null> {
  if (!attachment) return null;
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    throw new Error(
      'This browser cannot encode the attached audio. Use a browser with WebCodecs audio support.',
    );
  }

  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(decodeAudioDataUrl(attachment.dataUrl));
  } catch {
    throw new Error('The attached audio could not be decoded for video export.');
  } finally {
    await context.close();
  }

  const channelCount = Math.min(2, decoded.numberOfChannels);
  const sourceChannels = Array.from(
    { length: channelCount },
    (_, index) => decoded.getChannelData(index),
  );
  const track = sliceAndResampleAudio(
    sourceChannels,
    decoded.sampleRate,
    clipStartMs,
    clipEndMs,
    EXPORT_SAMPLE_RATE,
  );
  if (!track) return null;
  const support = await AudioEncoder.isConfigSupported(
    audioEncoderConfig(codec, track.channels.length),
  );
  if (!support.supported) {
    throw new Error(
      `${codec === 'aac' ? 'AAC' : 'Opus'} audio encoding is unavailable in this browser.`,
    );
  }
  return track;
}

export async function encodeAudioTrack(
  track: PreparedAudioTrack,
  codec: ExportAudioCodec,
  output: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void,
  task: ExportTaskContext,
): Promise<void> {
  const config = audioEncoderConfig(codec, track.channels.length);
  const framesPerChunk = codec === 'aac' ? 1_024 : 960;
  let encoderError: Error | null = null;
  const encoder = new AudioEncoder({
    output,
    error: (error) => {
      encoderError = error;
    },
  });
  task.defer(() => {
    if (encoder.state !== 'closed') encoder.close();
  });
  encoder.configure(config);

  for (let offset = 0; offset < track.frameCount; offset += framesPerChunk) {
    task.throwIfCancelled();
    const frameCount = Math.min(framesPerChunk, track.frameCount - offset);
    const data = new Float32Array(frameCount * track.channels.length);
    for (let channel = 0; channel < track.channels.length; channel += 1) {
      data.set(track.channels[channel].subarray(offset, offset + frameCount), channel * frameCount);
    }
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate: track.sampleRate,
      numberOfFrames: frameCount,
      numberOfChannels: track.channels.length,
      timestamp: Math.round((offset * 1_000_000) / track.sampleRate),
      data,
    });
    try {
      encoder.encode(audioData);
    } finally {
      audioData.close();
    }
    if (encoder.encodeQueueSize > 8) await encoder.flush();
    if (encoderError) throw encoderError;
  }

  await encoder.flush();
  if (encoderError) throw encoderError;
  encoder.close();
}

export function sliceAndResampleAudio(
  channels: readonly Float32Array[],
  sourceSampleRate: number,
  clipStartMs: number,
  clipEndMs: number,
  targetSampleRate: number,
): PreparedAudioTrack | null {
  if (channels.length === 0 || channels[0].length === 0) return null;
  const startFrame = Math.min(
    channels[0].length,
    Math.max(0, Math.floor((clipStartMs * sourceSampleRate) / 1_000)),
  );
  const endFrame = Math.min(
    channels[0].length,
    Math.max(startFrame, Math.ceil((clipEndMs * sourceSampleRate) / 1_000)),
  );
  const sourceFrameCount = endFrame - startFrame;
  if (sourceFrameCount === 0) return null;

  const frameCount = Math.max(
    1,
    Math.round((sourceFrameCount * targetSampleRate) / sourceSampleRate),
  );
  const resampled = channels.map((channel) => {
    const output = new Float32Array(frameCount);
    for (let frame = 0; frame < frameCount; frame += 1) {
      const sourcePosition = startFrame + (frame * sourceSampleRate) / targetSampleRate;
      const lower = Math.min(endFrame - 1, Math.floor(sourcePosition));
      const upper = Math.min(endFrame - 1, lower + 1);
      const fraction = sourcePosition - lower;
      output[frame] = channel[lower] + (channel[upper] - channel[lower]) * fraction;
    }
    return output;
  });

  return {
    channels: resampled,
    sampleRate: targetSampleRate,
    frameCount,
  };
}

function audioEncoderConfig(codec: ExportAudioCodec, numberOfChannels: number): AudioEncoderConfig {
  return {
    codec: codec === 'aac' ? 'mp4a.40.2' : 'opus',
    sampleRate: EXPORT_SAMPLE_RATE,
    numberOfChannels,
    bitrate: EXPORT_AUDIO_BITRATE,
  };
}

function decodeAudioDataUrl(dataUrl: string): ArrayBuffer {
  const separator = dataUrl.indexOf(',');
  if (separator < 0) throw new Error('Invalid embedded audio data.');
  const binary = atob(dataUrl.slice(separator + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
