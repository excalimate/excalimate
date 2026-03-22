export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'svg' | 'lottie' | 'dotlottie';
export type ExportQuality = 'low' | 'medium' | 'high' | 'very-high';
export type LottieFontEmbeddingMode = 'inline' | 'glyphs';

export interface ExportOptions {
  format: ExportFormat;
  quality?: ExportQuality;
  fps?: number;
  theme?: 'light' | 'dark';
  lottieFontEmbeddingModes?: LottieFontEmbeddingMode[];
  onProgress?: (progress: number) => void;
}

export const QUALITY_SETTINGS: Record<ExportQuality, { bitrate: number; gifQuality: number }> = {
  'low': { bitrate: 2_000_000, gifQuality: 20 },
  'medium': { bitrate: 8_000_000, gifQuality: 10 },
  'high': { bitrate: 20_000_000, gifQuality: 5 },
  'very-high': { bitrate: 40_000_000, gifQuality: 1 },
};
