import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createDotLottieArchive } from './exportLottie';

describe('createDotLottieArchive', () => {
  it('creates a dotLottie v2 archive with the generated animation', async () => {
    const animation = {
      v: '5.12.2',
      fr: 60,
      ip: 0,
      op: 60,
      w: 1920,
      h: 1080,
      assets: [],
      layers: [],
    };

    const archive = unzipSync(await createDotLottieArchive(animation));

    expect(Object.keys(archive).sort()).toEqual(['a/animation.json', 'manifest.json']);
    expect(JSON.parse(strFromU8(archive['manifest.json']))).toEqual({
      version: '2',
      generator: 'Excalimate',
      animations: [{ id: 'animation' }],
    });
    expect(JSON.parse(strFromU8(archive['a/animation.json']))).toEqual(animation);
  });
});
