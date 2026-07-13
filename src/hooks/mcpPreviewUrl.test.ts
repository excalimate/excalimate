import { describe, expect, it } from 'vitest';
import { normalizeMcpPreviewUrl } from './mcpPreviewUrl';

describe('normalizeMcpPreviewUrl', () => {
  it('accepts local and authenticated pairing URLs', () => {
    expect(normalizeMcpPreviewUrl(' http://127.0.0.1:3001/p/preview-id/ ')).toBe(
      'http://127.0.0.1:3001/p/preview-id',
    );
    expect(normalizeMcpPreviewUrl('https://mcp.example/p/preview-id/access-key')).toBe(
      'https://mcp.example/p/preview-id/access-key',
    );
  });

  it.each([
    '',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3001/mcp',
    'ftp://127.0.0.1/p/preview-id',
    'https://mcp.example/p/preview-id?token=secret',
    'https://user:password@mcp.example/p/preview-id',
  ])('rejects a non-pairing URL: %s', (url) => {
    expect(() => normalizeMcpPreviewUrl(url)).toThrow(/preview pairing URL/);
  });
});
