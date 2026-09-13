// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sliceAndResampleAudio } from './audioExport';

describe('audio export sampling', () => {
  it('clips audio to the exported timeline range and starts at timestamp zero', () => {
    const source = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);

    const result = sliceAndResampleAudio([source], 4, 500, 1_500, 4);

    expect(result?.frameCount).toBe(4);
    expect(Array.from(result?.channels[0] ?? [])).toEqual([2, 3, 4, 5]);
  });

  it('linearly resamples stereo channels to the export sample rate', () => {
    const left = new Float32Array([0, 1]);
    const right = new Float32Array([1, 0]);

    const result = sliceAndResampleAudio([left, right], 2, 0, 1_000, 4);

    expect(result?.frameCount).toBe(4);
    expect(Array.from(result?.channels[0] ?? [])).toEqual([0, 0.5, 1, 1]);
    expect(Array.from(result?.channels[1] ?? [])).toEqual([1, 0.5, 0, 0]);
  });

  it('omits audio when the export range does not overlap it', () => {
    expect(
      sliceAndResampleAudio([new Float32Array([0, 1])], 2, 2_000, 3_000, 48_000),
    ).toBeNull();
  });
});
