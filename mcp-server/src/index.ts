#!/usr/bin/env node
/**
 * Excalimate MCP Server — Entry Point
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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { FileCheckpointStore } from './checkpoint-store.js';
import { createServer, getSharedState } from './server.js';

async function startStdioServer(factory: () => McpServer): Promise<void> {
  await factory().connect(new StdioServerTransport());
}

async function startHTTPServer(factoryWithSSE: (sseClients: Set<Response>, broadcastSSE: (data: string) => void) => McpServer): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false })); // Security headers
  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? '*',
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Stricter rate limit for share uploads
  const shareLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10, // 10 shares per minute
    standardHeaders: true,
    legacyHeaders: false,
  });

  const jsonMiddleware = express.json();

  // Parse JSON only for non-share routes (share uses raw binary)
  app.use((req, res, next) => {
    if (req.path === '/share' && req.method === 'POST') {
      next();
    } else {
      jsonMiddleware(req, res, next);
    }
  });

  // SSE clients for live state broadcasting
  const sseClients = new Set<Response>();

  /** Safely broadcast to all SSE clients, removing dead ones on failure. */
  function broadcastSSE(data: string): void {
    for (const client of sseClients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Factory that wires SSE broadcasting
  const factory = () => factoryWithSSE(sseClients, broadcastSSE);

  // Session map: keep server + transport alive across requests
  const sessions = new Map<
    string,
    { server: McpServer; transport: StreamableHTTPServerTransport; lastActivity: number }
  >();

  // Periodically clean up stale sessions (no activity for 30 minutes)
  const SESSION_TTL_MS = 30 * 60 * 1000;
  const sessionCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [sid, session] of sessions) {
      if (now - session.lastActivity > SESSION_TTL_MS) {
        sessions.delete(sid);
      }
    }
  }, 60 * 1000);
  sessionCleanupTimer.unref();

  app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Route to existing session
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      session.lastActivity = Date.now();
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
      // Don't call server.close() here — it would call transport.close()
      // again, causing infinite recursion. The SDK handles cleanup internally.
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Store session after first successful request (session ID is now set)
      const sid = transport.sessionId;
      if (sid) {
        sessions.set(sid, { server, transport, lastActivity: Date.now() });
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
  app.post('/share', shareLimiter, express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req: Request, res: Response) => {
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
    console.log(`Excalimate MCP server listening on http://localhost:${port}/mcp`);
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
  // Prevent cascading unhandled rejections from crashing the process
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  const store = new FileCheckpointStore();

  if (process.argv.includes('--stdio')) {
    const factory = () => createServer(store);
    await startStdioServer(factory);
  } else {
    await startHTTPServer((_sseClients, broadcastSSE) => {
      return createServer(store, (state) => {
        try {
          const data = JSON.stringify({ type: 'state', state });
          broadcastSSE(data);
        } catch (err) {
          console.error('Failed to broadcast state:', err);
        }
      });
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
