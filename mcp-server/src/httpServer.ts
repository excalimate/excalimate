import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { getSharedState } from './server.js';
import { registerShareRoutes } from './shareRoutes.js';

function getCorsOrigin() {
  const raw = process.env.CORS_ORIGIN;

  // No CORS origin configured: allow local dev + production domains
  if (!raw || !raw.trim()) {
    return ['http://localhost:5173', 'https://excalimate.com', 'https://www.excalimate.com'];
  }

  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (origins.length === 0) {
    return ['http://localhost:5173', 'https://excalimate.com', 'https://www.excalimate.com'];
  }

  if (origins.length === 1) {
    return origins[0];
  }

  // Multiple allowed origins: validate incoming origin against the list
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests without an Origin header (e.g., same-origin or non-browser clients)
    if (!origin) {
      return callback(null, true);
    }

    if (origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  };
}

export async function startHTTPServer(
  factoryWithSSE: (sseClients: Set<Response>, broadcastSSE: (data: string) => void, port: number) => McpServer,
  portOverride?: number,
): Promise<void> {
  const port = portOverride ?? parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(helmet()); // Security headers
  app.use(cors({
    origin: getCorsOrigin(),
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
  const factory = () => factoryWithSSE(sseClients, broadcastSSE, port);

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
  registerShareRoutes(app, shareLimiter);

  const httpServer = app.listen(port, () => {
    console.log(`Excalimate MCP server listening on http://localhost:${port}/mcp`);
    console.log(`Live preview SSE at http://localhost:${port}/live`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nGraceful shutdown started...');

    // 1. Stop accepting new connections
    httpServer.close();

    // 2. Stop the session cleanup timer
    clearInterval(sessionCleanupTimer);

    // 3. Close all SSE clients
    for (const client of sseClients) {
      try { client.end(); } catch { /* best-effort */ }
    }
    sseClients.clear();

    // 4. Clear MCP sessions
    sessions.clear();

    console.log('Shutdown complete.');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
