// @vitest-environment node

import { generateKeyPairSync } from 'node:crypto';
import { importPKCS8 } from 'jose';
import { describe, expect, it } from 'vitest';
import { normalizeGitHubPrivateKey } from './github';

describe('GitHub App private keys', () => {
  it('converts GitHub PKCS#1 RSA keys to importable PKCS#8', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

    const normalized = normalizeGitHubPrivateKey(pkcs1);

    expect(normalized).toContain('BEGIN PRIVATE KEY');
    await expect(importPKCS8(normalized, 'RS256')).resolves.toBeDefined();
  });

  it('preserves PKCS#8 keys', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pkcs8 = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim();
    expect(normalizeGitHubPrivateKey(pkcs8)).toBe(pkcs8);
  });
});
