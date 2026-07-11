import { describe, expect, it, vi } from 'vitest';
import {
  encryptData,
  exportKeyToString,
  generateEncryptionKey,
} from './encryption';
import {
  buildEditorShareUrl,
  buildHostedPlayerUrl,
  downloadEncryptedShare,
  parseEditorShareReference,
  parsePlayerShareFragment,
} from './shareTransport';

describe('encrypted share transport', () => {
  it('accepts only strict fragment IDs and key lengths', () => {
    const reference = parsePlayerShareFragment(
      '#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    );
    expect(reference).toEqual({
      shareId: 'abcdefgh',
      keyString: 'AAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(
      parseEditorShareReference(
        'https://excalimate.com/#share=abcdefghijklmnopqrstuv,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).toEqual({
      shareId: 'abcdefghijklmnopqrstuv',
      keyString: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(() =>
      parsePlayerShareFragment(
        '#share=https://attacker.example/payload,AAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).toThrow(/invalid/i);
    expect(() =>
      parsePlayerShareFragment(
        '#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA&source=https://attacker.example',
      ),
    ).toThrow(/invalid/i);
  });

  it('keeps encryption keys out of network requests', async () => {
    const key = await generateEncryptionKey();
    const keyString = await exportKeyToString(key);
    const encrypted = await encryptData({ safe: true }, key);
    const fetchImplementation = vi.fn(async () =>
      new Response(encrypted, { status: 200 }),
    );

    await expect(
      downloadEncryptedShare(
        { shareId: 'abcdefgh', keyString },
        {
          fetch: fetchImplementation,
          shareOrigin: 'https://share.example',
        },
      ),
    ).resolves.toEqual({ safe: true });

    const request = JSON.stringify(fetchImplementation.mock.calls);
    expect(request).toContain('https://share.example/share/abcdefgh');
    expect(request).not.toContain(keyString);
    expect(request).not.toMatch(/deleteSecret/i);
  });

  it('permits HTTP only for loopback development share origins', async () => {
    const key = await generateEncryptionKey();
    const keyString = await exportKeyToString(key);
    const encrypted = await encryptData({ safe: true }, key);
    const fetchImplementation = vi.fn(async () =>
      new Response(encrypted, { status: 200 }),
    );

    await expect(
      downloadEncryptedShare(
        { shareId: 'abcdefgh', keyString },
        { fetch: fetchImplementation, shareOrigin: 'http://localhost:8787' },
      ),
    ).resolves.toEqual({ safe: true });
    await expect(
      downloadEncryptedShare(
        { shareId: 'abcdefgh', keyString },
        { fetch: fetchImplementation, shareOrigin: 'http://share.example' },
      ),
    ).rejects.toThrow('HTTPS or loopback HTTP');
  });

  it('builds hosted and editor links with secrets only in fragments', () => {
    const reference = {
      shareId: 'abcdefgh',
      keyString: 'AAAAAAAAAAAAAAAAAAAAAA',
    };
    const hosted = buildHostedPlayerUrl('https://excalimate.com/path', reference);
    const editor = buildEditorShareUrl('https://excalimate.com/path', reference);

    expect(hosted).toBe(
      'https://excalimate.com/player.html#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    );
    expect(editor).toBe(
      'https://excalimate.com/#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    );
    expect(new URL(hosted).search).toBe('');
    expect(new URL(editor).search).toBe('');
  });
});
