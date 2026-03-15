export function timeToPixel(time: number, zoom: number): number {
  return time * zoom;
}

export function pixelToTime(pixel: number, zoom: number): number {
  return pixel / zoom;
}

export function computeTicks(duration: number, zoom: number, scrollX: number, width: number): { time: number; x: number; label: string }[] {
  const _duration = duration;
  void _duration;

  const intervals = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const minTickSpacing = 60;
  let tickInterval = intervals[0];
  for (const interval of intervals) {
    if (interval * zoom >= minTickSpacing) {
      tickInterval = interval;
      break;
    }
  }

  const startTime = Math.floor(pixelToTime(scrollX, zoom) / tickInterval) * tickInterval;
  const endTime = pixelToTime(scrollX + width, zoom);
  const ticks: { time: number; x: number; label: string }[] = [];

  for (let time = startTime; time <= endTime + tickInterval; time += tickInterval) {
    if (time < 0) continue;
    const x = timeToPixel(time, zoom) - scrollX;
    const secs = time / 1000;
    const label =
      secs >= 60
        ? `${Math.floor(secs / 60)}:${(secs % 60).toFixed(secs % 1 === 0 ? 0 : 1).padStart(secs % 60 < 10 ? 3 : 4, '0')}`
        : `${secs.toFixed(secs % 1 === 0 ? 0 : 1)}s`;
    ticks.push({ time, x, label });
  }

  return ticks;
}
