#!/usr/bin/env node
import { FileCheckpointStore } from './checkpoint-store.js';
import { createServer } from './server.js';
import { startStdioServer } from './stdioServer.js';
import { startHTTPServer } from './httpServer.js';

async function main() {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  const store = new FileCheckpointStore();

  if (process.argv.includes('--stdio')) {
    await startStdioServer(() => createServer(store));
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
