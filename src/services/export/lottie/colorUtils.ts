/**
 * Color conversion utilities for Lottie export.
 * Lottie uses [r, g, b, a] arrays with values in 0–1 range.
 */

/** Parse a CSS hex color to Lottie [r, g, b, a] (0–1 range). */
export function hexToLottie(hex: string): number[] {
  const cleaned = hex.replace('#', '');
  let r: number, g: number, b: number, a = 1;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  } else {
    // Fallback: black
    return [0, 0, 0, 1];
  }

  return [
    Math.round(r * 1000) / 1000,
    Math.round(g * 1000) / 1000,
    Math.round(b * 1000) / 1000,
    a,
  ];
}

/** Check if a background color is effectively transparent. */
export function isTransparent(color: string | undefined): boolean {
  if (!color) return true;
  const lower = color.toLowerCase().trim();
  return lower === 'transparent' || lower === '' || lower === 'none';
}
