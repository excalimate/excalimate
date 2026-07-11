#!/usr/bin/env node
import { FileCheckpointStore, MemoryCheckpointStore } from './checkpoint-store.js';
import { startHTTPServer } from './httpServer.js';
import type { HTTPServerOptions } from './httpServer.js';
import { createRequestId } from './requestContext.js';
import { createServer } from './server.js';
import { startStdioServer } from './stdioServer.js';

interface CLIOptions extends HTTPServerOptions {
  stdio: boolean;
  help: boolean;
}

const HELP = `Excalimate MCP server

Usage:
  excalimate-mcp [options]

Transport:
  --stdio                      Use stdio instead of Streamable HTTP
  -H, --host <host>            Bind host (default: 127.0.0.1)
  -p, --port <port>            Bind port (default: 3001)

HTTP security:
  --auth-token <token>         Bearer token (required for non-loopback hosts)
  --allowed-origins <list>     Comma-separated browser origins
  --allowed-hosts <list>       Comma-separated Host values (required for wildcard binding)
  -h, --help                   Show this help

Environment:
  EXCALIMATE_HOST, PORT, EXCALIMATE_AUTH_TOKEN,
  EXCALIMATE_ALLOWED_ORIGINS (CORS_ORIGIN remains supported),
  EXCALIMATE_ALLOWED_HOSTS, EXCALIMATE_BODY_LIMIT_BYTES,
  EXCALIMATE_REQUEST_TIMEOUT_MS, EXCALIMATE_MAX_SESSIONS,
  EXCALIMATE_MAX_SSE_CLIENTS, EXCALIMATE_SESSION_TTL_MS

HTTP mode binds to loopback by default. Exposing it to a network requires an
authentication token and strict allowed-host configuration for wildcard binds.`;

function argumentValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${name} requires a value`);
  return value;
}

export function parseCLIOptions(args: string[]): CLIOptions {
  const options: CLIOptions = { stdio: false, help: false };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const separatorIndex = argument.indexOf('=');
    const name = separatorIndex === -1 ? argument : argument.slice(0, separatorIndex);
    const inlineValue = separatorIndex === -1 ? undefined : argument.slice(separatorIndex + 1);
    const readValue = () => inlineValue ?? argumentValue(args, index++, name);

    switch (name) {
      case '--stdio':
        options.stdio = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--host':
      case '-H':
        options.host = readValue();
        break;
      case '--port':
      case '-p':
        options.port = Number(readValue());
        break;
      case '--auth-token':
        options.authToken = readValue();
        break;
      case '--allowed-origins':
        options.allowedOrigins = readValue().split(',').map((entry) => entry.trim()).filter(Boolean);
        break;
      case '--allowed-hosts':
        options.allowedHosts = readValue().split(',').map((entry) => entry.trim()).filter(Boolean);
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseCLIOptions(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.stdio) {
    await startStdioServer(() => createServer(new FileCheckpointStore()));
    return;
  }

  const {
    stdio: _stdio,
    help: _help,
    ...httpOptions
  } = options;
  await startHTTPServer(
    (onStateChange, resourceLimits) =>
      createServer(new MemoryCheckpointStore(), onStateChange, { resourceLimits }),
    httpOptions,
  );
}

process.on('unhandledRejection', () => {
  const requestId = createRequestId();
  console.error(`[excalimate] Unhandled rejection (request ID: ${requestId})`);
});
process.on('uncaughtException', () => {
  const requestId = createRequestId();
  console.error(`[excalimate] Uncaught exception (request ID: ${requestId})`);
  process.exitCode = 1;
});

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  console.error(`[excalimate] Startup failed: ${message}`);
  process.exitCode = 1;
});
