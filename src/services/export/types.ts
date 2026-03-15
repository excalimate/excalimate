export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'svg';
export type ExportQuality = 'low' | 'medium' | 'high' | 'very-high';

export interface ExportOptions {
  format: ExportFormat;
  quality?: ExportQuality;
  fps?: number;
  onProgress?: (progress: number) => void;
}

export const QUALITY_SETTINGS: Record<ExportQuality, { bitrate: number; gifQuality: number }> = {
  'low': { bitrate: 2_000_000, gifQuality: 20 },
  'medium': { bitrate: 8_000_000, gifQuality: 10 },
  'high': { bitrate: 20_000_000, gifQuality: 5 },
  'very-high': { bitrate: 40_000_000, gifQuality: 1 },
};
