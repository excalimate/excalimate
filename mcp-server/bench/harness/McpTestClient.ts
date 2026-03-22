import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from '../../src/server.js';
import type { CheckpointStore } from '../../src/checkpoint-store.js';
import type { StateDelta } from '../../src/server/stateContext.js';

export interface ToolCallResult {
  name: string;
  text: string;
  durationMs: number;
}

/**
 * In-process MCP client that calls tools on a real McpServer instance
 * via the SDK's InMemoryTransport. No HTTP, no network — pure function call timing.
 */
export class McpTestClient {
  private client: Client;
  private server: McpServer;
  private clientTransport: InMemoryTransport;
  private serverTransport: InMemoryTransport;

  private constructor(
    client: Client,
    server: McpServer,
    clientTransport: InMemoryTransport,
    serverTransport: InMemoryTransport,
  ) {
    this.client = client;
    this.server = server;
    this.clientTransport = clientTransport;
    this.serverTransport = serverTransport;
  }

  static async create(
    store: CheckpointStore,
    onStateChange?: (delta: StateDelta) => void,
  ): Promise<McpTestClient> {
    const server = createServer(store, onStateChange);
    const client = new Client({ name: 'bench-client', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    return new McpTestClient(client, server, clientTransport, serverTransport);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const start = performance.now();
    const result = await this.client.callTool({ name, arguments: args });
    const durationMs = performance.now() - start;

    const text = result.content
      ?.filter((c: { type: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('\n') ?? '';

    return { name, text, durationMs };
  }

  async callToolSequence(
    calls: { name: string; args: Record<string, unknown> }[],
  ): Promise<{ totalDurationMs: number; results: ToolCallResult[] }> {
    const results: ToolCallResult[] = [];
    const start = performance.now();

    for (const call of calls) {
      results.push(await this.callTool(call.name, call.args));
    }

    return { totalDurationMs: performance.now() - start, results };
  }

  async close(): Promise<void> {
    await this.clientTransport.close();
    await this.serverTransport.close();
  }
}
