import { describe, expect, it } from 'vitest';
import headers from '../../public/_headers?raw';
import { DEFAULT_SHARE_ORIGIN } from '../services/shareTransport';

const normalizedHeaders = headers.replace(/\r\n/g, '\n');
const COMMON_HEADERS = [
  'Cross-Origin-Resource-Policy:',
  'Permissions-Policy:',
  'Referrer-Policy: no-referrer',
  'Strict-Transport-Security: max-age=31536000; includeSubDomains',
  'X-Content-Type-Options: nosniff',
];

function routePolicy(route: string, nextRoute?: string): string {
  const start = normalizedHeaders.indexOf(`${route}\n`);
  const end = nextRoute
    ? normalizedHeaders.indexOf(`${nextRoute}\n`, start)
    : normalizedHeaders.length;
  expect(start).toBeGreaterThanOrEqual(0);
  return normalizedHeaders.slice(start, end);
}

describe('hosted player deployment policy', () => {
  it('keeps editor documents frame-denied without wildcard policy overlap', () => {
    expect(headers).toMatch(/\/\r?\n\s+Content-Security-Policy: frame-ancestors 'none'/);
    expect(headers).toMatch(/\/index\.html\r?\n\s+Content-Security-Policy: frame-ancestors 'none'/);
    expect(headers).not.toMatch(/\n\/\*\n/);
    for (const policy of [
      routePolicy('/', '/index.html'),
      routePolicy('/index.html', '/player.html'),
    ]) {
      for (const header of COMMON_HEADERS) expect(policy).toContain(header);
      expect(policy).toContain('Cross-Origin-Resource-Policy: same-origin');
    }
  });

  it('gives the embeddable player a least-privilege document policy', () => {
    const playerPolicy = routePolicy('/player.html');
    expect(playerPolicy).toContain("default-src 'none'");
    expect(playerPolicy).toContain(`connect-src ${DEFAULT_SHARE_ORIGIN}`);
    expect(playerPolicy).toContain("img-src 'self' data:");
    expect(playerPolicy).toContain("worker-src 'none'");
    expect(playerPolicy).toContain('frame-ancestors https:');
    expect(playerPolicy).not.toContain("frame-ancestors 'none'");
    expect(playerPolicy).toContain('Cross-Origin-Resource-Policy: cross-origin');
    for (const header of COMMON_HEADERS) expect(playerPolicy).toContain(header);
  });
});
