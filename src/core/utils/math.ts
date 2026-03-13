/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b by factor t (0..1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse of lerp: returns t for value between a and b */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/** Remap value from one range to another */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Approximately equal comparison for floating point */
export function approxEqual(
  a: number,
  b: number,
  epsilon: number = 1e-9,
): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Snap value to nearest multiple of step */
export function snapToGrid(value: number, step: number): number {
  if (step === 0) return value;
  return Math.round(value / step) * step;
}

/** Calculate distance between two 2D points */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Format milliseconds to human-readable time string (e.g. "1:23.456") */
export function formatTime(ms: number): string {
  const negative = ms < 0;
  const absMs = Math.abs(ms);

  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.round(absMs % 1000);

  const secondsStr = seconds.toString().padStart(minutes > 0 ? 2 : 1, '0');
  const millisStr = millis.toString().padStart(3, '0');

  const prefix = negative ? '-' : '';

  if (minutes > 0) {
    return `${prefix}${minutes}:${secondsStr}.${millisStr}`;
  }
  return `${prefix}${secondsStr}.${millisStr}`;
}

/** Parse time string back to milliseconds */
export function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Handle "83456ms" format
  const msMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*ms$/i);
  if (msMatch) {
    return parseFloat(msMatch[1]);
  }

  // Handle "m:ss.mmm" or "m:ss" format
  const colonMatch = trimmed.match(/^(-?)(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (colonMatch) {
    const sign = colonMatch[1] === '-' ? -1 : 1;
    const minutes = parseInt(colonMatch[2], 10);
    const seconds = parseInt(colonMatch[3], 10);
    const millis = colonMatch[4]
      ? parseInt(colonMatch[4].padEnd(3, '0'), 10)
      : 0;
    if (seconds >= 60) return null;
    return sign * (minutes * 60000 + seconds * 1000 + millis);
  }

  // Handle "ss.mmm" or plain seconds format
  const secMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)$/);
  if (secMatch) {
    return parseFloat(secMatch[1]) * 1000;
  }

  return null;
}
