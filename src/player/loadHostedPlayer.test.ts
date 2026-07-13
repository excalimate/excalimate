import { describe, expect, it, vi } from 'vitest';
import { createPlayerTestPackage } from './playerTestFixture';
import { loadHostedPlayer } from './loadHostedPlayer';

const HASH = '#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA';

describe('hosted player share loading', () => {
  it('returns only a validated package and clears the key fragment', async () => {
    const clearFragment = vi.fn();
    const playerPackage = createPlayerTestPackage();
    const result = await loadHostedPlayer({
      hash: HASH,
      appOrigin: 'https://excalimate.com',
      clearFragment,
      download: async () => ({
        envelopeVersion: 2,
        project: { sensitive: 'editor-only' },
        playerPackage,
      }),
    });

    expect(clearFragment).toHaveBeenCalledOnce();
    expect(result).toEqual({
      kind: 'package',
      playerPackage: expect.objectContaining({ version: '1.0.0' }),
      editorUrl:
        'https://excalimate.com/#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(JSON.stringify(result)).not.toContain('editor-only');
  });

  it('returns a safe editor fallback for project-only legacy shares', async () => {
    await expect(
      loadHostedPlayer({
        hash: HASH,
        appOrigin: 'https://excalimate.com',
        clearFragment: vi.fn(),
        download: async () => ({ version: '1.0.0', scene: {} }),
      }),
    ).resolves.toEqual({
      kind: 'legacy',
      editorUrl:
        'https://excalimate.com/#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    });
  });

  it('rejects arbitrary source fragments before any network operation', async () => {
    const download = vi.fn();
    await expect(
      loadHostedPlayer({
        hash: '#source=https://attacker.example/project',
        download,
      }),
    ).rejects.toThrow('invalid');
    expect(download).not.toHaveBeenCalled();
  });
});
