/**
 * MCP tool: share_project
 *
 * Creates an E2E encrypted share URL containing the complete project state.
 * Uploads to the Excalimate cloud share service (Cloudflare Worker + R2)
 * so links persist even after the MCP server restarts.
 *
 * Uses AES-256-GCM encryption — the key is returned in the URL hash
 * fragment and never stored on any server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import type { StateContext } from './stateContext.js';

const gzipAsync = promisify(gzip);

const DEFAULT_SHARE_API = 'https://share.excalimate.com';

/**
 * Encrypt data with AES-256-GCM.
 * Returns: [IV (12 bytes)] [ciphertext + GCM auth tag]
 */
function encrypt(plaintext: Buffer): { encrypted: Buffer; keyBase64url: string } {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const result = Buffer.concat([iv, enc, tag]);
  const keyBase64url = key.toString('base64url');
  return { encrypted: result, keyBase64url };
}

export function registerShareTools(
  server: McpServer,
  ctx: StateContext,
): void {
  server.tool(
    'share_project',
    'Create an E2E encrypted share URL for the current project. Uploads to the Excalimate cloud share service so links persist permanently (30 days). The encryption key is in the URL hash fragment (never sent to any server). Returns the shareable URL.',
    {
      baseUrl: z.string().optional().describe('Base URL for the share link (default: https://app.excalimate.com)'),
      shareApi: z.string().optional().describe('Share service API URL (default: https://share.excalimate.com)'),
    },
    async ({ baseUrl, shareApi }) => {
      const state = ctx.getState();
      if (!state.scene.elements || state.scene.elements.length === 0) {
        return { content: [{ type: 'text', text: 'Error: No elements in the scene. Create a scene first.' }] };
      }

      try {
        const payload = JSON.stringify({
          scene: state.scene,
          timeline: state.timeline,
          clipStart: state.clipStart,
          clipEnd: state.clipEnd,
          cameraFrame: state.cameraFrame,
        });

        const compressed = await gzipAsync(Buffer.from(payload, 'utf-8'));
        const { encrypted, keyBase64url } = encrypt(compressed);

        // Upload to the cloud share service (persists across MCP server restarts)
        const apiUrl = shareApi ?? process.env.EXCALIMATE_SHARE_API ?? DEFAULT_SHARE_API;
        const response = await fetch(`${apiUrl}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Uint8Array(encrypted),
        });

        if (!response.ok) {
          const err = await response.text();
          return { content: [{ type: 'text', text: `Error uploading share: ${err}` }] };
        }

        const { id } = await response.json() as { id: string };

        const appBase = baseUrl ?? 'https://app.excalimate.com';
        const fullUrl = `${appBase}/#share=${id},${keyBase64url}`;

        return {
          content: [{
            type: 'text',
            text: `Share URL created:\n${fullUrl}\n\n` +
              `Elements: ${state.scene.elements.length}, ` +
              `Tracks: ${state.timeline.tracks.length}, ` +
              `Encrypted size: ${(encrypted.length / 1024).toFixed(1)} KB\n\n` +
              `Link is valid for 30 days. The encryption key is in the URL hash — no server can read the content.`,
          }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error creating share: ${e}` }] };
      }
    },
  );
}
