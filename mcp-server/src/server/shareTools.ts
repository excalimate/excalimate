/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MCP tool: share_project
 *
 * Creates an E2E encrypted share URL containing the complete project state.
 * Uses AES-256-GCM encryption — the key is returned to the AI in the URL
 * hash fragment and never stored on the server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import type { StateContext } from './stateContext.js';

const gzipAsync = promisify(gzip);

/**
 * Encrypt data with AES-256-GCM.
 * Returns: [IV (12 bytes)] [ciphertext + GCM auth tag]
 */
function encrypt(plaintext: Buffer): { encrypted: Buffer; keyBase64url: string } {
  const key = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes

  // Layout: [IV (12)] [ciphertext] [GCM tag (16)]
  const result = Buffer.concat([iv, enc, tag]);

  // Export key as base64url (no padding) for shortest URL
  const keyBase64url = key.toString('base64url');

  return { encrypted: result, keyBase64url };
}

export function registerShareTools(
  server: McpServer,
  ctx: StateContext,
  serverPort: number,
): void {
  server.tool(
    'share_project',
    'Create an E2E encrypted share URL for the current project. The URL contains the encryption key in the hash fragment (never sent to the server). Returns the shareable URL.',
    {
      baseUrl: z.string().optional().describe('Base URL for the share link (default: https://excalimate.com)'),
    },
    async ({ baseUrl }) => {
      const state = ctx.getState();
      if (!state.scene.elements || state.scene.elements.length === 0) {
        return { content: [{ type: 'text', text: 'Error: No elements in the scene. Create a scene first.' }] };
      }

      try {
        // Build the full project payload
        const payload = JSON.stringify({
          scene: state.scene,
          timeline: state.timeline,
          clipStart: state.clipStart,
          clipEnd: state.clipEnd,
          cameraFrame: state.cameraFrame,
        });

        // Compress + encrypt
        const compressed = await gzipAsync(Buffer.from(payload, 'utf-8'));
        const { encrypted, keyBase64url } = encrypt(compressed);

        // Upload to the local share endpoint
        const shareUrl = `http://localhost:${serverPort}/share`;
        const response = await fetch(shareUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Uint8Array(encrypted),
        });

        if (!response.ok) {
          const err = await response.text();
          return { content: [{ type: 'text', text: `Error uploading share: ${err}` }] };
        }

        const { id } = await response.json() as { id: string };

        // Build the shareable URL — key in hash fragment (never sent to server)
        const appBase = baseUrl ?? 'https://excalimate.com';
        const fullUrl = `${appBase}/#share=${id},${keyBase64url}`;

        return {
          content: [{
            type: 'text',
            text: `Share URL created:\n${fullUrl}\n\n` +
              `Elements: ${state.scene.elements.length}, ` +
              `Tracks: ${state.timeline.tracks.length}, ` +
              `Encrypted size: ${(encrypted.length / 1024).toFixed(1)} KB\n\n` +
              `The encryption key is in the URL hash — the server only stores an encrypted blob it cannot read.`,
          }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error creating share: ${e}` }] };
      }
    },
  );
}
