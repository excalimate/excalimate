#!/usr/bin/env node
import { FileCheckpointStore } from './checkpoint-store.js';
import { createServer } from './server.js';
import { startStdioServer } from './stdioServer.js';
import { startHTTPServer } from './httpServer.js';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);

/** Parse --port=NNNN or --port NNNN from argv */
function parsePort(): number | undefined {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--port=')) {
      return parseInt(arg.slice('--port='.length), 10);
    }
    if (arg === '--port' && process.argv[i + 1]) {
      return parseInt(process.argv[i + 1], 10);
    }
    if (arg === '-p' && process.argv[i + 1]) {
      return parseInt(process.argv[i + 1], 10);
    }
  }
  return undefined;
}

async function main() {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  const store = new FileCheckpointStore();
  const cliPort = parsePort();

  if (process.argv.includes('--stdio')) {
    await startStdioServer(() => createServer(store));
  } else {
    await startHTTPServer((_sseClients, broadcastSSE) => {
      return createServer(store, (delta) => {
        const json = JSON.stringify({ type: 'state', state: delta });
        // Compress payloads >512 bytes with gzip+base64 to reduce SSE bandwidth.
        // Small payloads aren't worth the overhead.
        if (json.length > 512) {
          gzipAsync(json).then(
            (buf) => broadcastSSE(JSON.stringify({ type: 'gz', data: buf.toString('base64') })),
            (err) => console.error('Failed to compress broadcast:', err),
          );
        } else {
          broadcastSSE(json);
        }
      });
    }, cliPort);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
