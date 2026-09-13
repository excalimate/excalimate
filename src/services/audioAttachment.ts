import {
  PROJECT_LIMITS,
  encodeProjectDocument,
  type AudioAttachment,
} from '@excalimate/project-schema';
import { useProjectStore } from '../stores/projectStore';
import { toProjectDocument } from '../core/models/Project';

export const AUDIO_FILE_ACCEPT =
  'audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/aac,audio/flac';

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  webm: 'audio/webm',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

export async function attachAudioFile(file: File): Promise<AudioAttachment> {
  const project = useProjectStore.getState().project;
  if (!project) throw new Error('Create or open a project before importing audio.');
  if (file.size === 0) throw new Error('The selected audio file is empty.');
  if (file.size > PROJECT_LIMITS.maxAudioBytes) {
    throw new Error(
      `Audio files must be 10 MiB or smaller so the project remains portable.`,
    );
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = file.type.toLowerCase() || MIME_BY_EXTENSION[extension];
  if (!mimeType?.startsWith('audio/')) {
    throw new Error('Select a supported audio file (MP3, M4A, WAV, OGG, WebM, AAC, or FLAC).');
  }

  const probe = document.createElement('audio');
  if (probe.canPlayType(mimeType) === '') {
    throw new Error(`This browser cannot play ${mimeType} audio.`);
  }

  const [dataUrl, durationMs] = await Promise.all([
    readFileAsDataUrl(file),
    readAudioDuration(file),
  ]);
  const attachment: AudioAttachment = {
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    durationMs,
    dataUrl: normalizeDataUrlMimeType(dataUrl, mimeType),
  };

  if (useProjectStore.getState().project?.id !== project.id) {
    throw new Error('The project changed while the audio file was being imported. Try again.');
  }
  encodeProjectDocument({ ...toProjectDocument(project), audio: attachment });
  useProjectStore.getState().setAudioAttachment(attachment);
  return attachment;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The audio file could not be read.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The audio file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(objectUrl);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const durationMs = Math.round(audio.duration * 1_000);
      cleanup();
      if (
        !Number.isFinite(durationMs) ||
        durationMs <= 0 ||
        durationMs > PROJECT_LIMITS.maxTimelineDurationMs
      ) {
        reject(new Error('The audio duration is invalid or exceeds 24 hours.'));
        return;
      }
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('This browser could not decode the selected audio file.'));
    };
    audio.src = objectUrl;
  });
}

function normalizeDataUrlMimeType(dataUrl: string, mimeType: string): string {
  const separator = dataUrl.indexOf(',');
  if (separator < 0) throw new Error('The audio file could not be encoded.');
  return `data:${mimeType};base64,${dataUrl.slice(separator + 1)}`;
}
