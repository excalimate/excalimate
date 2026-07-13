import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import crypto from 'node:crypto';
import { createServer as createNodeServer } from 'node:http';
import type { Server as NodeHttpServer } from 'node:http';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { ExcalimateMcpServer } from './server.js';
import type { ResourceLimits } from './server/limits.js';
import type { StateChangeListener, StateDelta } from './server/stateContext.js';
import { createRequestId, runWithRequestId } from './requestContext.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://app.excalimate.com',
  'https://excalimate.com',
  'https://www.excalimate.com',
];

export interface HTTPServerOptions {
  host?: string;
  port?: number;
  authToken?: string;
  allowedOrigins?: string[];
  allowedHosts?: string[];
  bodyLimitBytes?: number;
  requestTimeoutMs?: number;
  maxSessions?: number;
  maxSseClients?: number;
  sessionTtlMs?: number;
  cleanupIntervalMs?: number;
  maxRequestsPerMinute?: number;
  resourceLimits?: Partial<ResourceLimits>;
  installSignalHandlers?: boolean;
}

export interface ResolvedHTTPServerOptions {
  host: string;
  port: number;
  authToken?: string;
  allowedOrigins: string[];
  allowedHosts: string[];
  bodyLimitBytes: number;
  requestTimeoutMs: number;
  maxSessions: number;
  maxSseClients: number;
  sessionTtlMs: number;
  cleanupIntervalMs: number;
  maxRequestsPerMinute: number;
  resourceLimits?: Partial<ResourceLimits>;
  installSignalHandlers: boolean;
  loopback: boolean;
}

export interface HTTPServerHandle {
  readonly server: NodeHttpServer;
  readonly host: string;
  readonly port: number;
  close: () => Promise<void>;
  getStats: () => {
    sessions: number;
    pendingSessions: number;
    sseClients: number;
  };
}

export type HTTPServerFactory = (
  onStateChange: StateChangeListener,
  resourceLimits?: Partial<ResourceLimits>,
) => ExcalimateMcpServer;

interface SessionRecord {
  server: ExcalimateMcpServer;
  transport: StreamableHTTPServerTransport;
  previewId: string;
  previewAccessKey?: string;
  sseClients: Set<Response>;
  lastActivity: number;
  sessionId?: string;
  closing: boolean;
  closePromise?: Promise<void>;
  broadcastQueue: Promise<void>;
  activeRequests: number;
  abortControllers: Set<AbortController>;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  allowZero = false,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`Invalid ${name}`);
  }
  return parsed;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
}

export function isLoopbackHost(host: string): boolean {
  const normalized = normalizeHostname(host);
  return normalized === 'localhost' ||
    normalized === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function isWildcardHost(host: string): boolean {
  const normalized = normalizeHostname(host);
  return normalized === '0.0.0.0' || normalized === '::';
}

function parseList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function normalizeOrigins(origins: string[]): string[] {
  const normalized = new Set<string>();
  for (const origin of origins) {
    if (origin === '*') throw new Error('Wildcard origins are not allowed');
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('Invalid allowed origin');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Allowed origins must use HTTP or HTTPS');
    }
    normalized.add(parsed.origin);
  }
  if (normalized.size === 0) throw new Error('At least one allowed origin is required');
  return [...normalized];
}

export function resolveHTTPServerOptions(
  input: HTTPServerOptions = {},
): ResolvedHTTPServerOptions {
  const host = input.host ?? process.env.EXCALIMATE_HOST ?? process.env.HOST ?? '127.0.0.1';
  const loopback = isLoopbackHost(host);
  const authToken = input.authToken ?? process.env.EXCALIMATE_AUTH_TOKEN;
  if (authToken !== undefined && authToken.length < 16) {
    throw new Error('Authentication tokens must be at least 16 characters');
  }
  if (!loopback && !authToken) {
    throw new Error('Non-loopback HTTP binding requires an explicit authentication token');
  }

  const configuredHosts =
    input.allowedHosts ?? parseList(process.env.EXCALIMATE_ALLOWED_HOSTS);
  if (isWildcardHost(host) && (!configuredHosts || configuredHosts.length === 0)) {
    throw new Error('Wildcard binding requires explicit allowed hosts');
  }
  const allowedHosts = configuredHosts ?? (
    loopback
      ? ['localhost', '127.0.0.1', '::1', host]
      : [host]
  );
  const normalizedHosts = [...new Set(allowedHosts.map(normalizeHostname))];
  if (normalizedHosts.some((entry) => entry === '' || isWildcardHost(entry))) {
    throw new Error('Allowed hosts must be concrete hostnames or IP addresses');
  }

  const configuredOrigins =
    input.allowedOrigins ??
    parseList(process.env.EXCALIMATE_ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN) ??
    DEFAULT_ALLOWED_ORIGINS;

  return {
    host,
    port: input.port ?? parseInteger(process.env.PORT, 3001, 'port', true),
    authToken,
    allowedOrigins: normalizeOrigins(configuredOrigins),
    allowedHosts: normalizedHosts,
    bodyLimitBytes: input.bodyLimitBytes ??
      parseInteger(process.env.EXCALIMATE_BODY_LIMIT_BYTES, 1024 * 1024, 'body limit'),
    requestTimeoutMs: input.requestTimeoutMs ??
      parseInteger(process.env.EXCALIMATE_REQUEST_TIMEOUT_MS, 30_000, 'request timeout'),
    maxSessions: input.maxSessions ??
      parseInteger(process.env.EXCALIMATE_MAX_SESSIONS, 16, 'session limit'),
    maxSseClients: input.maxSseClients ??
      parseInteger(process.env.EXCALIMATE_MAX_SSE_CLIENTS, 32, 'SSE client limit'),
    sessionTtlMs: input.sessionTtlMs ??
      parseInteger(process.env.EXCALIMATE_SESSION_TTL_MS, 30 * 60_000, 'session TTL'),
    cleanupIntervalMs: input.cleanupIntervalMs ??
      parseInteger(process.env.EXCALIMATE_CLEANUP_INTERVAL_MS, 60_000, 'cleanup interval'),
    maxRequestsPerMinute: input.maxRequestsPerMinute ??
      parseInteger(process.env.EXCALIMATE_MAX_REQUESTS_PER_MINUTE, 200, 'request rate limit'),
    resourceLimits: input.resourceLimits,
    installSignalHandlers: input.installSignalHandlers ?? true,
    loopback,
  };
}

function parseHostHeader(value: string): { hostname: string; port?: number } | null {
  if (value.includes(',') || value.includes('/') || value.includes('@')) return null;
  try {
    const parsed = new URL(`http://${value}`);
    const port = parsed.port === '' ? undefined : Number(parsed.port);
    if (port !== undefined && (!Number.isSafeInteger(port) || port <= 0 || port > 65_535)) {
      return null;
    }
    return { hostname: normalizeHostname(parsed.hostname), port };
  } catch {
    return null;
  }
}

function secureEqual(actual: string | undefined, expected: string | undefined): boolean {
  if (actual === undefined || expected === undefined) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length &&
    crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function bearerToken(req: Request): string | undefined {
  const authorization = req.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return req.get('x-excalimate-token');
}

function rpcId(req: Request): string | number | null {
  const body = req.body as { id?: unknown } | undefined;
  return typeof body?.id === 'string' || typeof body?.id === 'number' ? body.id : null;
}

function sendProtocolError(
  req: Request,
  res: Response,
  status: number,
  code: number,
  message: string,
): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  const requestId = res.locals.requestId as string;
  res.status(status).json({
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data: { requestId },
    },
    id: rpcId(req),
  });
}

function discardLateResponseWrites(res: Response): void {
  // The SDK may finish a handler after our deadline response. Replace only the
  // already-ended response's write methods so that late protocol output cannot
  // emit ERR_HTTP_HEADERS_SENT stacks or corrupt a reused socket.
  Object.defineProperties(res, {
    writeHead: { configurable: true, value: () => res },
    setHeader: { configurable: true, value: () => res },
    write: { configurable: true, value: () => false },
    end: { configurable: true, value: () => res },
  });
}

function previewAccessKey(authToken: string | undefined, previewId: string): string | undefined {
  if (!authToken) return undefined;
  return crypto.createHmac('sha256', authToken).update(previewId).digest('base64url');
}

function previewPath(record: SessionRecord): string {
  return record.previewAccessKey
    ? `/p/${record.previewId}/${record.previewAccessKey}`
    : `/p/${record.previewId}`;
}

export async function startHTTPServer(
  factory: HTTPServerFactory,
  inputOptions: HTTPServerOptions = {},
): Promise<HTTPServerHandle> {
  const options = resolveHTTPServerOptions(inputOptions);
  if (!options.loopback) {
    console.warn(
      `[excalimate] SECURITY WARNING: HTTP mode is exposed on ${options.host}. ` +
      'Token authentication, strict Host validation, and strict Origin validation are enabled.',
    );
  }

  const app = express();
  const allowedOrigins = new Set(options.allowedOrigins);
  const allowedHosts = new Set(options.allowedHosts);
  const sessions = new Map<string, SessionRecord>();
  const previews = new Map<string, SessionRecord>();
  const records = new Set<SessionRecord>();
  let pendingSessions = 0;
  let sseClientCount = 0;
  let closing = false;

  app.disable('x-powered-by');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = createRequestId();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    runWithRequestId(requestId, next);
  });
  app.use(helmet());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawHost = req.get('host');
    const parsedHost = rawHost ? parseHostHeader(rawHost) : null;
    if (
      !parsedHost ||
      !allowedHosts.has(parsedHost.hostname) ||
      (parsedHost.port !== undefined && parsedHost.port !== req.socket.localPort)
    ) {
      sendProtocolError(req, res, 421, -32600, 'Unrecognized Host header');
      return;
    }

    const origin = req.get('origin');
    // Browsers send Sec-Fetch-Site. Some non-browser fetch implementations only
    // synthesize Sec-Fetch-Mode, so treating that header alone as browser proof
    // would reject legitimate MCP clients.
    const hasFetchMetadata = req.get('sec-fetch-site') !== undefined;
    if ((origin || hasFetchMetadata) && (!origin || !allowedOrigins.has(origin))) {
      sendProtocolError(req, res, 403, -32600, 'Origin is not allowed');
      return;
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Mcp-Session-Id, X-Request-ID, X-Excalimate-Preview-URL',
      );
    }
    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, X-Excalimate-Token',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(rateLimit({
    windowMs: 60_000,
    limit: options.maxRequestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      sendProtocolError(req, res, 429, -32000, 'Request rate limit exceeded');
    },
  }));
  app.use(express.json({
    limit: options.bodyLimitBytes,
    strict: true,
  }));

  function detachRecord(record: SessionRecord): void {
    if (record.sessionId) sessions.delete(record.sessionId);
    previews.delete(record.previewId);
    for (const controller of record.abortControllers) controller.abort();
    for (const client of record.sseClients) {
      sseClientCount--;
      if (!client.writableEnded) client.end();
    }
    record.sseClients.clear();
    record.server.stateContext.close();
  }

  function closeRecord(record: SessionRecord, closeTransport = true): Promise<void> {
    if (record.closePromise) return record.closePromise;
    if (record.closing) return Promise.resolve();
    record.closing = true;
    detachRecord(record);
    record.closePromise = (async () => {
      if (!closeTransport) return;
      try {
        await record.server.close();
      } catch {
        const requestId = createRequestId();
        console.error(`[excalimate] Session cleanup failed (request ID: ${requestId})`);
      }
    })();
    void record.closePromise.finally(() => {
      if (record.activeRequests === 0) records.delete(record);
    });
    return record.closePromise;
  }

  async function broadcast(record: SessionRecord, delta: StateDelta): Promise<void> {
    if (record.closing || record.sseClients.size === 0) return;
    const data = JSON.stringify({ type: 'state', state: delta });

    for (const client of [...record.sseClients]) {
      if (client.destroyed || client.writableEnded) {
        record.sseClients.delete(client);
        sseClientCount--;
        continue;
      }
      try {
        const accepted = client.write(`id: ${delta.sequence}\ndata: ${data}\n\n`);
        if (!accepted) {
          record.sseClients.delete(client);
          sseClientCount--;
          client.end();
        }
      } catch {
        record.sseClients.delete(client);
        sseClientCount--;
        client.end();
      }
    }
  }

  function authorizeMcp(req: Request, res: Response, next: NextFunction): void {
    if (!options.authToken || secureEqual(bearerToken(req), options.authToken)) {
      next();
      return;
    }
    res.setHeader('WWW-Authenticate', 'Bearer');
    sendProtocolError(req, res, 401, -32000, 'Authentication required');
  }

  function findPreview(req: Request): SessionRecord | undefined {
    const previewId =
      (typeof req.params.previewId === 'string' ? req.params.previewId : undefined) ??
      (typeof req.query.preview === 'string' ? req.query.preview : undefined);
    return previewId ? previews.get(previewId) : undefined;
  }

  function authorizePreview(req: Request, record: SessionRecord): boolean {
    if (!options.authToken) return true;
    const accessKey = typeof req.params.accessKey === 'string'
      ? req.params.accessKey
      : undefined;
    return secureEqual(accessKey, record.previewAccessKey) ||
      secureEqual(bearerToken(req), options.authToken);
  }

  async function handleMcpRequest(
    req: Request,
    res: Response,
    record: SessionRecord,
  ): Promise<void> {
    let timedOut = false;
    const controller = new AbortController();
    record.activeRequests++;
    record.abortControllers.add(controller);
    const timer = req.method === 'GET'
      ? undefined
      : setTimeout(() => {
        timedOut = true;
        controller.abort();
        sendProtocolError(req, res, 504, -32001, 'MCP request timed out');
        discardLateResponseWrites(res);
        // Detach immediately, but let the in-flight SDK request settle before
        // closing its transport. Closing it here can strand the handler promise.
        void closeRecord(record, false);
      }, options.requestTimeoutMs);

    try {
      await runWithRequestId(
        res.locals.requestId as string,
        () => record.transport.handleRequest(req, res, req.body),
        controller.signal,
      );
    } catch {
      if (!timedOut) {
        sendProtocolError(req, res, 500, -32603, 'Internal MCP server error');
      }
      await closeRecord(record);
    } finally {
      if (timer) clearTimeout(timer);
      record.abortControllers.delete(controller);
      record.activeRequests--;
      if (timedOut) {
        try {
          await record.server.close();
        } catch {
          const requestId = createRequestId();
          console.error(`[excalimate] Timed-out session cleanup failed (request ID: ${requestId})`);
        }
      }
      if (record.closing && record.activeRequests === 0) {
        await record.closePromise;
        records.delete(record);
      }
    }
  }

  app.all('/mcp', authorizeMcp, async (req: Request, res: Response) => {
    const sessionId = req.get('mcp-session-id');
    if (sessionId) {
      const existing = sessions.get(sessionId);
      if (!existing || existing.closing) {
        sendProtocolError(req, res, 404, -32000, 'MCP session not found');
        return;
      }
      existing.lastActivity = Date.now();
      await handleMcpRequest(req, res, existing);
      return;
    }

    if (records.size >= options.maxSessions) {
      sendProtocolError(req, res, 503, -32000, 'MCP session limit reached');
      return;
    }

    pendingSessions++;
    const previewId = crypto.randomBytes(24).toString('base64url');
    const onStateChange: StateChangeListener = (delta) => {
      record.broadcastQueue = record.broadcastQueue.then(() => broadcast(record, delta)).catch(() => {
        const requestId = createRequestId();
        console.error(`[excalimate] SSE broadcast failed (request ID: ${requestId})`);
      });
    };
    let server: ExcalimateMcpServer;
    try {
      server = factory(onStateChange, options.resourceLimits);
    } catch {
      pendingSessions--;
      sendProtocolError(req, res, 500, -32603, 'Internal MCP server error');
      return;
    }
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        record.sessionId = newSessionId;
        record.lastActivity = Date.now();
        sessions.set(newSessionId, record);
        previews.set(record.previewId, record);
        pendingSessions--;

        const baseUrl = `http://${req.get('host')}${previewPath(record)}`;
        console.log(`[excalimate] Preview paired for session ${newSessionId}: ${baseUrl}`);
      },
      onsessionclosed: () => {
        void closeRecord(record);
      },
    });
    const record: SessionRecord = {
      server,
      transport,
      previewId,
      previewAccessKey: previewAccessKey(options.authToken, previewId),
      sseClients: new Set(),
      lastActivity: Date.now(),
      closing: false,
      broadcastQueue: Promise.resolve(),
      activeRequests: 0,
      abortControllers: new Set(),
    };
    records.add(record);
    res.setHeader(
      'X-Excalimate-Preview-URL',
      `http://${req.get('host')}${previewPath(record)}`,
    );
    transport.onclose = () => {
      void closeRecord(record, false);
    };

    try {
      await server.connect(transport);
      await handleMcpRequest(req, res, record);
    } catch {
      sendProtocolError(req, res, 500, -32603, 'Internal MCP server error');
      await closeRecord(record);
    } finally {
      if (!record.sessionId) {
        pendingSessions--;
        await closeRecord(record);
      }
    }
  });

  const previewRoutes = [
    '/live',
    '/p/:previewId/live',
    '/p/:previewId/:accessKey/live',
  ];
  app.get(previewRoutes, (req: Request, res: Response) => {
    const record = findPreview(req);
    if (!record || record.closing) {
      sendProtocolError(req, res, 404, -32000, 'Preview session not found');
      return;
    }
    if (!authorizePreview(req, record)) {
      sendProtocolError(req, res, 401, -32000, 'Authentication required');
      return;
    }
    if (sseClientCount >= options.maxSseClients) {
      sendProtocolError(req, res, 503, -32000, 'SSE client limit reached');
      return;
    }

    record.lastActivity = Date.now();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const snapshotPath = `${previewPath(record)}/state`;
    const accepted = res.write(`data: ${JSON.stringify({
      type: 'connected',
      revision: record.server.stateContext.getRevision(),
      sequence: record.server.stateContext.getSequence(),
      snapshot: snapshotPath,
    })}\n\n`);
    if (!accepted) {
      res.end();
      return;
    }
    record.sseClients.add(res);
    sseClientCount++;

    req.on('close', () => {
      if (record.sseClients.delete(res)) sseClientCount--;
    });
  });

  const stateRoutes = [
    '/state',
    '/p/:previewId/state',
    '/p/:previewId/:accessKey/state',
  ];
  app.get(stateRoutes, (req: Request, res: Response) => {
    const record = findPreview(req);
    if (!record || record.closing) {
      sendProtocolError(req, res, 404, -32000, 'Preview session not found');
      return;
    }
    if (!authorizePreview(req, record)) {
      sendProtocolError(req, res, 401, -32000, 'Authentication required');
      return;
    }
    record.lastActivity = Date.now();
    res.type('application/json').send(record.server.stateContext.getStateJSON());
  });

  app.use((
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const typed = error as { type?: string; status?: number };
    if (typed.type === 'entity.too.large' || typed.status === 413) {
      sendProtocolError(req, res, 413, -32600, 'JSON request body is too large');
      return;
    }
    if (typed.type === 'entity.parse.failed' || typed.status === 400) {
      sendProtocolError(req, res, 400, -32700, 'Invalid JSON request body');
      return;
    }
    sendProtocolError(req, res, 500, -32603, 'Internal HTTP server error');
  });

  const httpServer = createNodeServer(app);
  httpServer.requestTimeout = options.requestTimeoutMs;
  httpServer.headersTimeout = Math.max(options.requestTimeoutMs + 1_000, 5_000);

  const cleanupTimer = setInterval(() => {
    const staleBefore = Date.now() - options.sessionTtlMs;
    for (const record of [...sessions.values()]) {
      if (record.lastActivity < staleBefore) void closeRecord(record);
    }
  }, options.cleanupIntervalMs);
  cleanupTimer.unref();

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    httpServer.once('error', onError);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off('error', onError);
      resolve();
    });
  });

  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : options.port;
  console.log(`[excalimate] MCP server listening on http://${options.host}:${actualPort}/mcp`);
  console.log(`[excalimate] Allowed browser origins: ${options.allowedOrigins.join(', ')}`);

  let signalShutdown: (() => void) | undefined;
  const close = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    clearInterval(cleanupTimer);
    if (signalShutdown) {
      process.off('SIGINT', signalShutdown);
      process.off('SIGTERM', signalShutdown);
    }
    await Promise.all([...records].map((record) => closeRecord(record)));
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
      httpServer.closeAllConnections();
    });
  };

  if (options.installSignalHandlers) {
    signalShutdown = () => {
      void close().catch(() => {
        const requestId = createRequestId();
        console.error(`[excalimate] Graceful shutdown failed (request ID: ${requestId})`);
        process.exitCode = 1;
      });
    };
    process.on('SIGINT', signalShutdown);
    process.on('SIGTERM', signalShutdown);
  }

  return {
    server: httpServer,
    host: options.host,
    port: actualPort,
    close,
    getStats: () => ({
      sessions: sessions.size,
      pendingSessions,
      sseClients: sseClientCount,
    }),
  };
}
