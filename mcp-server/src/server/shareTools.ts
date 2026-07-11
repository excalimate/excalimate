import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { StateContext } from './stateContext.js';
import { toolError } from './limits.js';

export function registerShareTools(
  server: McpServer,
  ctx: StateContext,
): void {
  ctx.tool(
    'share_project',
    'Deprecated: direct MCP uploads are unavailable because the share Worker intentionally rejects originless writes and no authenticated server-to-server contract exists.',
    {
      baseUrl: z.string().url().max(2_048).optional().describe(
        'Deprecated compatibility input; no upload is attempted.',
      ),
      shareApi: z.string().url().max(2_048).optional().describe(
        'Deprecated compatibility input; no upload is attempted.',
      ),
    },
    async () =>
      toolError(
        'share_project is deprecated and did not upload any content. ' +
          'Use save_checkpoint, export/import the V2 project document, then create the share from the authenticated browser UI. ' +
          'The share Worker rejects originless MCP writes and Excalimate does not currently expose an authenticated MCP server-to-server sharing contract.',
      ),
  );
}
