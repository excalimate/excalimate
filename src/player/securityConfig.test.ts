import { describe, expect, it } from 'vitest';
import headers from '../../public/_headers?raw';

describe('hosted player deployment policy', () => {
  it('keeps editor documents frame-denied without wildcard policy overlap', () => {
    expect(headers).toMatch(
      /\/\r?\n\s+Content-Security-Policy: frame-ancestors 'none'/,
    );
    expect(headers).toMatch(
      /\/index\.html\r?\n\s+Content-Security-Policy: frame-ancestors 'none'/,
    );
    expect(headers).not.toMatch(/\n\/\*\n/);
  });

  it('gives the embeddable player a least-privilege document policy', () => {
    const playerPolicy = headers.slice(headers.indexOf('/player.html'));
    expect(playerPolicy).toContain("default-src 'none'");
    expect(playerPolicy).toContain(
      'connect-src https://share.excalimate.com',
    );
    expect(playerPolicy).toContain("img-src 'self' data:");
    expect(playerPolicy).toContain("worker-src 'none'");
    expect(playerPolicy).toContain('frame-ancestors https:');
    expect(playerPolicy).not.toContain("frame-ancestors 'none'");
    expect(playerPolicy).toContain('X-Content-Type-Options: nosniff');
    expect(playerPolicy).toContain('Referrer-Policy: no-referrer');
    expect(playerPolicy).toContain('Permissions-Policy:');
  });
});
