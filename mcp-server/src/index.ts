#!/usr/bin/env node
/**
 * Animate-Excalidraw MCP Server — Entry Point
 *
 * Supports two transports:
 *   --stdio    : For Claude Desktop / Copilot CLI
 *   (default)  : Streamable HTTP on port 3001
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import { FileCheckpointStore } from './checkpoint-store.js';
import { createServer, getSharedState } from './server.js';

async function startStdioServer(factory: () => McpServer): Promise<void> {
  await factory().connect(new StdioServerTransport());
}

async function startHTTPServer(factoryWithSSE: (sseClients: Set<Response>) => McpServer): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(cors());

  // Parse JSON only for non-share routes (share uses raw binary)
  app.use((req, res, next) => {
    if (req.path === '/share' && req.method === 'POST') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // SSE clients for live state broadcasting
  const sseClients = new Set<Response>();

  // Factory that wires SSE broadcasting
  const factory = () => factoryWithSSE(sseClients);

  // Session map: keep server + transport alive across requests
  const sessions = new Map<
    string,
    { server: McpServer; transport: StreamableHTTPServerTransport }
  >();

  app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Route to existing session
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('MCP session error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
      return;
    }

    // New session
    const server = factory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) sessions.delete(sid);
      server.close().catch(() => {});
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Store session after first successful request (session ID is now set)
      const sid = transport.sessionId;
      if (sid) {
        sessions.set(sid, { server, transport });
      }
    } catch (error) {
      console.error('MCP error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // SSE endpoint — web app connects here to receive live state updates
  app.get('/live', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });

  // Current state endpoint
  app.get('/state', (_req: Request, res: Response) => {
    res.json(getSharedState());
  });

  // ── E2E Encrypted Sharing ──────────────────────────────────────
  // The server only stores encrypted blobs. It never sees the encryption key.
  const shareStore = new Map<string, Buffer>();
  const MAX_SHARE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_SHARES = 500;

  // Upload encrypted blob
  app.post('/share', express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req: Request, res: Response) => {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const body = req.body as Buffer | undefined;
    if (!body || body.length === 0) {
      res.status(400).json({ error: 'Empty body. Send as application/octet-stream.' });
      return;
    }
    if (body.length > MAX_SHARE_SIZE) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }
    // Evict oldest if over limit
    if (shareStore.size >= MAX_SHARES) {
      const oldest = shareStore.keys().next().value;
      if (oldest !== undefined) shareStore.delete(oldest);
    }
    shareStore.set(id, body);
    res.json({ id, url: `/share/${id}` });
  });

  // Download encrypted blob
  app.get('/share/:id', (req: Request, res: Response) => {
    const data = shareStore.get(req.params.id as string);
    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
  });

  app.listen(port, () => {
    console.log(`Animate-Excalidraw MCP server listening on http://localhost:${port}/mcp`);
    console.log(`Live preview SSE at http://localhost:${port}/live`);
  });

  const shutdown = () => {
    console.log('\nShutting down...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  const store = new FileCheckpointStore();

  if (process.argv.includes('--stdio')) {
    const factory = () => createServer(store);
    await startStdioServer(factory);
  } else {
    await startHTTPServer((sseClients) => {
      return createServer(store, (state) => {
        // Broadcast state to all SSE clients
        const data = JSON.stringify({ type: 'state', state });
        for (const client of sseClients) {
          client.write(`data: ${data}\n\n`);
        }
      });
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
