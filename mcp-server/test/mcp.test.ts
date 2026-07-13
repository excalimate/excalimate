import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { parseProjectDocument } from '@excalimate/project-schema';
import type { CheckpointStore } from '../src/checkpoint-store.js';
import { MemoryCheckpointStore } from '../src/checkpoint-store.js';
import {
  resolveHTTPServerOptions,
  startHTTPServer,
} from '../src/httpServer.js';
import type { HTTPServerHandle, HTTPServerOptions } from '../src/httpServer.js';
import { createServer } from '../src/server.js';
import type { ExcalimateMcpServer } from '../src/server.js';
import {
  createDefaultState,
  parseServerState,
} from '../src/state.js';
import type { StateDelta } from '../src/server/stateContext.js';
import type { ServerState } from '../src/types.js';

const ALLOWED_ORIGIN = 'https://app.excalimate.com';
const MCP_HEADERS = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
};

const LEGACY_TOOL_NAMES = [
  'read_me',
  'get_examples',
  'create_scene',
  'add_elements',
  'remove_elements',
  'update_elements',
  'get_scene',
  'clear_scene',
  'delete_items',
  'add_keyframe',
  'add_keyframes_batch',
  'remove_keyframe',
  'create_sequence',
  'set_clip_range',
  'get_timeline',
  'clear_animation',
  'add_scale_animation',
  'set_camera_frame',
  'add_camera_keyframe',
  'add_camera_keyframes_batch',
  'create_animated_scene',
  'are_items_in_line',
  'is_camera_centered',
  'items_visible_in_camera',
  'animations_of_item',
  'save_checkpoint',
  'load_checkpoint',
  'list_checkpoints',
  'share_project',
] as const;

const ACTION_TOOL_NAMES = [
  'auto_animate',
  'apply_animation_preset',
  'upsert_action_sequence',
  'get_action_sequence',
  'create_camera_move',
  'validate_project',
] as const;

interface RawSession {
  sessionId: string;
  previewUrl: string;
}

async function startTestServer(
  options: HTTPServerOptions = {},
  configure?: (server: ExcalimateMcpServer) => void,
): Promise<HTTPServerHandle> {
  return startHTTPServer((listener, resourceLimits) => {
    const server = createServer(new MemoryCheckpointStore(), listener, { resourceLimits });
    configure?.(server);
    return server;
  }, {
    host: '127.0.0.1',
    port: 0,
    installSignalHandlers: false,
    cleanupIntervalMs: 10,
    ...options,
  });
}

function serverBase(handle: HTTPServerHandle): string {
  return `http://127.0.0.1:${handle.port}`;
}

function parseMcpResponse(text: string): Record<string, unknown> {
  const dataLines = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6));
  return JSON.parse(dataLines.at(-1) ?? text) as Record<string, unknown>;
}

async function initialize(
  handle: HTTPServerHandle,
  extraHeaders: Record<string, string> = {},
): Promise<RawSession> {
  const response = await fetch(`${serverBase(handle)}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, ...extraHeaders },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'excalimate-test', version: '1.0.0' },
      },
    }),
  });
  const initializationBody = await response.text();
  assert.equal(response.status, 200, initializationBody);
  const sessionId = response.headers.get('mcp-session-id');
  const previewUrl = response.headers.get('x-excalimate-preview-url');
  assert.ok(sessionId);
  assert.ok(previewUrl);
  const initialized = await fetch(`${serverBase(handle)}/mcp`, {
    method: 'POST',
    headers: {
      ...MCP_HEADERS,
      ...extraHeaders,
      'mcp-session-id': sessionId,
      'mcp-protocol-version': '2025-06-18',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });
  const initializedBody = await initialized.text();
  assert.ok(initialized.ok, initializedBody);
  return { sessionId, previewUrl };
}

async function rawStatus(
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; requestId?: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { headers }, (response) => {
      response.resume();
      response.on('end', () => resolve({
        status: response.statusCode ?? 0,
        requestId: typeof response.headers['x-request-id'] === 'string'
          ? response.headers['x-request-id']
          : undefined,
      }));
    });
    request.on('error', reject);
    request.end();
  });
}

async function callRawTool(
  handle: HTTPServerHandle,
  session: RawSession,
  name: string,
  args: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(`${serverBase(handle)}/mcp`, {
    method: 'POST',
    headers: {
      ...MCP_HEADERS,
      ...extraHeaders,
      'mcp-session-id': session.sessionId,
      'mcp-protocol-version': '2025-06-18',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 100_000),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const text = await response.text();
  assert.equal(response.status, 200, text);
  return parseMcpResponse(text);
}

async function createInMemoryClient(
  store: CheckpointStore,
  deltas: StateDelta[] = [],
  resourceLimits: Parameters<typeof createServer>[2]['resourceLimits'] = {},
) {
  const server = createServer(store, (delta) => deltas.push(delta), { resourceLimits });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    server,
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function toolText(result: Awaited<ReturnType<Client['callTool']>>): string {
  return result.content
    .filter((entry) => entry.type === 'text')
    .map((entry) => 'text' in entry ? entry.text : '')
    .join('\n');
}

function rawToolText(message: Record<string, unknown>): string {
  const result = message.result as {
    content?: Array<{ type?: string; text?: string }>;
  } | undefined;
  return result?.content
    ?.filter((entry) => entry.type === 'text')
    .map((entry) => entry.text ?? '')
    .join('\n') ?? '';
}

test('HTTP defaults to loopback and enforces Host, Origin, and browser context', async () => {
  const resolved = resolveHTTPServerOptions({
    host: '127.0.0.1',
    port: 0,
    installSignalHandlers: false,
  });
  assert.equal(resolved.host, '127.0.0.1');
  assert.equal(resolved.loopback, true);
  assert.throws(
    () => resolveHTTPServerOptions({ host: '0.0.0.0', allowedHosts: ['example.test'] }),
    /authentication token/,
  );
  assert.throws(
    () => resolveHTTPServerOptions({
      host: '0.0.0.0',
      authToken: 'a-secure-token-123',
    }),
    /allowed hosts/,
  );

  const handle = await startTestServer();
  try {
    const address = handle.server.address();
    assert.equal(typeof address === 'object' && address?.address, '127.0.0.1');

    const badHost = await rawStatus(`${serverBase(handle)}/state`, {
      Host: `evil.example:${handle.port}`,
    });
    assert.equal(badHost.status, 421);
    assert.match(badHost.requestId ?? '', /^[A-Za-z0-9_-]{16}$/);

    const badOrigin = await fetch(`${serverBase(handle)}/state?preview=missing`, {
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(badOrigin.status, 403);

    const fetchMetadataWithoutOrigin = await fetch(`${serverBase(handle)}/state?preview=missing`, {
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    assert.equal(fetchMetadataWithoutOrigin.status, 403);

    const allowed = await fetch(`${serverBase(handle)}/state?preview=missing`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    assert.equal(allowed.status, 404);
    assert.equal(allowed.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  } finally {
    await handle.close();
  }
});

test('auth, body, session, and SSE limits return sanitized protocol errors', async () => {
  const token = 'test-auth-token-12345';
  const handle = await startTestServer({
    authToken: token,
    bodyLimitBytes: 512,
    maxSessions: 1,
    maxSseClients: 1,
  });
  try {
    const unauthorized = await fetch(`${serverBase(handle)}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: '{}',
    });
    assert.equal(unauthorized.status, 401);

    const oversized = await fetch(`${serverBase(handle)}/mcp`, {
      method: 'POST',
      headers: {
        ...MCP_HEADERS,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ payload: 'x'.repeat(1_000) }),
    });
    assert.equal(oversized.status, 413);
    const oversizedBody = await oversized.text();
    assert.doesNotMatch(oversizedBody, /stack|SyntaxError/i);
    assert.match(oversizedBody, /requestId/);

    const authHeaders = { Authorization: `Bearer ${token}` };
    const session = await initialize(handle, authHeaders);
    assert.match(session.previewUrl, /\/p\/[A-Za-z0-9_-]{32}\/[A-Za-z0-9_-]{43}$/);
    const previewId = new URL(session.previewUrl).pathname.split('/')[2];
    const leakedMasterToken = await fetch(
      `${serverBase(handle)}/state?preview=${previewId}&token=${encodeURIComponent(token)}`,
    );
    assert.equal(leakedMasterToken.status, 401);

    const secondSession = await fetch(`${serverBase(handle)}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...authHeaders },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'second', version: '1.0.0' },
        },
      }),
    });
    assert.equal(secondSession.status, 503);

    const firstAbort = new AbortController();
    const firstSse = await fetch(`${session.previewUrl}/live`, {
      headers: { Origin: ALLOWED_ORIGIN },
      signal: firstAbort.signal,
    });
    assert.equal(firstSse.status, 200);
    assert.equal(firstSse.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
    assert.notEqual(firstSse.headers.get('access-control-allow-origin'), '*');
    const firstEvent = await firstSse.body?.getReader().read();
    assert.match(new TextDecoder().decode(firstEvent?.value), /"snapshot":".*\/state"/);

    const secondSse = await fetch(`${session.previewUrl}/live`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    assert.equal(secondSse.status, 503);
    firstAbort.abort();
  } finally {
    await handle.close();
  }
});

test('preview IDs isolate sessions and snapshots carry monotonic metadata', async () => {
  const handle = await startTestServer({ maxSessions: 2 });
  try {
    const first = await initialize(handle);
    const second = await initialize(handle);
    assert.notEqual(first.previewUrl, second.previewUrl);

    await callRawTool(handle, first, 'create_scene', {
      elements: JSON.stringify([{ id: 'first', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }]),
    });
    await callRawTool(handle, second, 'create_scene', {
      elements: JSON.stringify([{ id: 'second', type: 'ellipse', x: 0, y: 0, width: 10, height: 10 }]),
    });
    await callRawTool(handle, first, 'save_checkpoint', { id: 'private' });
    const secondCheckpoints = await callRawTool(handle, second, 'list_checkpoints', {});
    assert.equal(rawToolText(secondCheckpoints), 'No checkpoints saved.');
    const crossSessionLoad = await callRawTool(handle, second, 'load_checkpoint', {
      id: 'private',
    });
    assert.match(rawToolText(crossSessionLoad), /not found/);
    await callRawTool(handle, first, 'add_keyframes_batch', {
      keyframes: [{
        targetId: 'first',
        property: 'opacity',
        time: 100,
        value: 0.5,
      }],
    });

    const firstState = await (await fetch(`${first.previewUrl}/state`, {
      headers: { Origin: ALLOWED_ORIGIN },
    })).json() as ServerState & { revision: number; sequence: number };
    const secondState = await (await fetch(`${second.previewUrl}/state`, {
      headers: { Origin: ALLOWED_ORIGIN },
    })).json() as ServerState & { revision: number; sequence: number };
    assert.deepEqual(firstState.scene.elements.map((entry) => entry.id), ['first']);
    assert.deepEqual(secondState.scene.elements.map((entry) => entry.id), ['second']);
    assert.equal(firstState.revision, 2);
    assert.equal(firstState.sequence, 2);
    assert.equal(secondState.revision, 1);
    assert.equal(secondState.sequence, 1);
  } finally {
    await handle.close();
  }
});

test('revisioned deltas detect same-count keyframe edits and legacy arrays remain compatible', async () => {
  class EditableStore implements CheckpointStore {
    state: ServerState | null = null;
    async save(_id: string, state: ServerState): Promise<void> {
      this.state = structuredClone(state);
    }
    async load(): Promise<ServerState | null> {
      return this.state ? structuredClone(this.state) : null;
    }
    async list(): Promise<string[]> {
      return this.state ? ['editable'] : [];
    }
  }

  const store = new EditableStore();
  const deltas: StateDelta[] = [];
  const connection = await createInMemoryClient(store, deltas);
  try {
    const tools = await connection.client.listTools();
    const toolNames = new Set(tools.tools.map((tool) => tool.name));
    assert.equal(tools.tools.length, 35);
    assert.deepEqual(
      LEGACY_TOOL_NAMES.filter((toolName) => !toolNames.has(toolName)),
      [],
    );
    assert.deepEqual(
      ACTION_TOOL_NAMES.filter((toolName) => !toolNames.has(toolName)),
      [],
    );
    const legacyScene = await connection.client.callTool({
      name: 'create_scene',
      arguments: {
        elements: JSON.stringify([{ id: 'box', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }]),
      },
    });
    assert.match(toolText(legacyScene), /Deprecated/);
    const legacy = await connection.client.callTool({
      name: 'add_keyframes_batch',
      arguments: {
        keyframes: JSON.stringify([{
          targetId: 'box',
          property: 'opacity',
          time: 100,
          value: 0.5,
        }]),
      },
    });
    assert.match(toolText(legacy), /Deprecated/);
    const capturedAddDelta = deltas.at(-1);
    const capturedTrack = connection.server.stateContext.getState().timeline.tracks[0];
    await connection.client.callTool({
      name: 'remove_keyframe',
      arguments: {
        trackId: capturedTrack.id,
        keyframeId: capturedTrack.keyframes[0].id,
      },
    });
    assert.equal(capturedAddDelta?.timeline?.upsertedTracks[0].keyframes.length, 1);
    await connection.client.callTool({
      name: 'add_keyframe',
      arguments: {
        targetId: 'box',
        property: 'opacity',
        time: 100,
        value: 0.5,
      },
    });
    await connection.client.callTool({
      name: 'save_checkpoint',
      arguments: { id: 'editable' },
    });
    assert.ok(store.state);
    store.state.timeline.tracks[0].keyframes[0].value = 0.75;
    await connection.client.callTool({
      name: 'load_checkpoint',
      arguments: { id: 'editable' },
    });

    const lastDelta = deltas.at(-1);
    assert.ok(lastDelta?.timeline);
    assert.equal(lastDelta.timeline.upsertedTracks.length, 1);
    assert.equal(lastDelta.timeline.upsertedTracks[0].keyframes.length, 1);
    assert.equal(lastDelta.timeline.upsertedTracks[0].keyframes[0].value, 0.75);
    assert.equal(lastDelta.baseRevision + 1, lastDelta.revision);
    assert.equal(lastDelta.sequence, lastDelta.revision);
  } finally {
    await connection.close();
  }
});

test('V2 codecs and checkpoints accept legacy MCP state without weakening validation', async () => {
  const state = createDefaultState();
  const store = new MemoryCheckpointStore();
  await store.save('v2-codec', state);
  const loaded = await store.load('v2-codec');
  assert.deepEqual(loaded, state);
  assert.equal(parseProjectDocument(loaded).version, '2.0.0');

  const legacyRaw = {
    scene: {
      elements: [{
        id: 'legacy-box',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }],
      files: {},
    },
    timeline: {
      id: 'legacy-timeline',
      name: 'Legacy',
      duration: 1_000,
      fps: 30,
      tracks: [],
    },
    clipStart: 0,
    clipEnd: 1_000,
    cameraFrame: {
      aspectRatio: '16:9',
      width: 1_200,
      x: 0,
      y: 0,
    },
  };
  const legacy = parseServerState(legacyRaw);
  assert.equal(legacy.version, '2.0.0');
  assert.equal(legacy.scene.appState instanceof Object, true);
  assert.equal(legacy.playback.clipEnd, 1_000);
  assert.deepEqual(legacy.authoring?.actions, []);
  assert.throws(
    () => parseServerState({ version: '2.0.0', scene: {} }),
    /Invalid V2 project/,
  );

  const legacyConnection = await createInMemoryClient({
    async save() {},
    async load() {
      return legacyRaw as unknown as ServerState;
    },
    async list() {
      return ['legacy'];
    },
  });

  try {
    const imported = await legacyConnection.client.callTool({
      name: 'load_checkpoint',
      arguments: { id: 'legacy' },
    });
    assert.notEqual(imported.isError, true);
    assert.equal(
      legacyConnection.server.stateContext.getState().version,
      '2.0.0',
    );
    assert.deepEqual(
      legacyConnection.server.stateContext
        .getState()
        .scene.elements.map((element) => element.id),
      ['legacy-box'],
    );
  } finally {
    await legacyConnection.close();
  }
});

test('MCP publication depends only on browser-neutral shared runtimes', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    dependencies: Record<string, string>;
    files: string[];
    publishConfig: { provenance?: boolean };
  };
  assert.equal(
    packageJson.dependencies['@excalimate/project-schema'],
    '^0.5.0-rc.1',
  );
  assert.equal(
    packageJson.dependencies['@excalimate/animation-core'],
    '^0.5.0-rc.1',
  );
  assert.equal(packageJson.dependencies['@excalimate/player-runtime'], undefined);
  assert.equal(packageJson.dependencies['@excalimate/export-runtime'], undefined);
  assert.equal(packageJson.files.includes('../src'), false);
  assert.equal(packageJson.publishConfig.provenance, true);
});

test('action tools are deterministic, preserve customization, and emit authoring deltas', async () => {
  const deltas: StateDelta[] = [];
  const connection = await createInMemoryClient(
    new MemoryCheckpointStore(),
    deltas,
  );
  try {
    const scene = await connection.client.callTool({
      name: 'create_scene',
      arguments: {
        elements: [
          {
            id: 'top',
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 100,
            height: 50,
          },
          {
            id: 'bottom',
            type: 'text',
            x: 0,
            y: 100,
            width: 100,
            height: 20,
            text: 'Bottom',
          },
          {
            id: 'connector',
            type: 'arrow',
            x: 0,
            y: 50,
            width: 10,
            height: 50,
          },
          {
            id: 'badge',
            type: 'ellipse',
            x: 150,
            y: 0,
            width: 30,
            height: 30,
          },
        ],
      },
    });
    assert.notEqual(scene.isError, true);
    assert.doesNotMatch(toolText(scene), /Deprecated/);

    const autoInput = {
      scope: { elementIds: ['bottom', 'top'] },
      style: { intensity: 'balanced' },
    };
    const missingStyle = await connection.client.callTool({
      name: 'auto_animate',
      arguments: { scope: { elementIds: ['top'] } },
    });
    assert.equal(missingStyle.isError, true);
    const auto = await connection.client.callTool({
      name: 'auto_animate',
      arguments: autoInput,
    });
    assert.notEqual(auto.isError, true);
    assert.match(toolText(auto), /strategy=sequence/);
    assert.match(toolText(auto), /confidence=0\.86/);

    const firstState = structuredClone(
      connection.server.stateContext.getState(),
    );
    const firstAction = firstState.authoring?.actions[0];
    assert.ok(firstAction);
    assert.equal(firstAction.status, 'managed');
    assert.deepEqual(firstAction.targetIds, ['top', 'bottom']);
    assert.ok(firstAction.ownership.length > 0);
    assert.ok(deltas.at(-1)?.authoring?.upsertedActions.length);
    assert.ok((firstState.authoring?.documentRevision ?? 0) > 0);
    assert.ok((firstState.authoring?.timelineRevision ?? 0) > 0);

    const repeat = await connection.client.callTool({
      name: 'auto_animate',
      arguments: autoInput,
    });
    assert.notEqual(repeat.isError, true);
    const repeatedAction =
      connection.server.stateContext.getState().authoring?.actions[0];
    assert.deepEqual(repeatedAction?.ownership, firstAction.ownership);
    assert.equal(repeatedAction?.generatedHash, firstAction.generatedHash);

    const retimed = await connection.client.callTool({
      name: 'upsert_action_sequence',
      arguments: {
        sequence: {
          actions: [{
            id: firstAction.id,
            type: 'sequence',
            targetIds: ['top', 'bottom'],
            timing: {
              startMs: 100,
              durationMs: 600,
              staggerMs: 200,
              startMode: 'absolute',
            },
            easing: 'easeOut',
            parameters: { property: 'opacity' },
          }],
        },
      },
    });
    assert.notEqual(retimed.isError, true);
    const retimeDelta = deltas.at(-1);
    assert.equal(
      retimeDelta?.authoring?.upsertedActions[0]?.timing.durationMs,
      600,
    );

    const lowLevelEdit = await connection.client.callTool({
      name: 'add_keyframe',
      arguments: {
        targetId: 'top',
        property: 'opacity',
        time: 900,
        value: 0.5,
      },
    });
    assert.notEqual(lowLevelEdit.isError, true);
    assert.equal(
      connection.server.stateContext.getState().authoring?.actions[0]?.status,
      'customized',
    );
    const protectedResult = await connection.client.callTool({
      name: 'upsert_action_sequence',
      arguments: {
        sequence: {
          actions: [{
            id: firstAction.id,
            type: 'sequence',
            targetIds: ['top', 'bottom'],
            timing: {
              startMs: 0,
              durationMs: 500,
              staggerMs: 220,
              startMode: 'absolute',
            },
            parameters: { property: 'opacity' },
          }],
        },
      },
    });
    assert.equal(protectedResult.isError, true);
    assert.match(toolText(protectedResult), /refusing to silently replace/);

    const draw = await connection.client.callTool({
      name: 'apply_animation_preset',
      arguments: {
        preset: {
          name: 'draw',
          targetIds: ['connector'],
          timing: {
            startMs: 0,
            durationMs: 500,
            staggerMs: 0,
            startMode: 'absolute',
          },
        },
      },
    });
    assert.notEqual(draw.isError, true);
    const drawAction = connection.server.stateContext
      .getState()
      .authoring?.actions.find((action) =>
        action.targetIds.includes('connector'),
      );
    assert.ok(drawAction);
    const drawTrack = connection.server.stateContext
      .getState()
      .timeline.tracks.find((track) =>
        drawAction.ownership.some(
          (ownership) => ownership.trackId === track.id,
        ),
      );
    assert.ok(drawTrack?.keyframes[0]);
    await connection.client.callTool({
      name: 'remove_keyframe',
      arguments: {
        trackId: drawTrack.id,
        keyframeId: drawTrack.keyframes[0].id,
      },
    });
    assert.equal(
      connection.server.stateContext
        .getState()
        .authoring?.actions.find((action) => action.id === drawAction.id)
        ?.status,
      'detached',
    );

    const camera = await connection.client.callTool({
      name: 'create_camera_move',
      arguments: {
        move: {
          x: 100,
          scale: 1.2,
          timing: {
            startMs: 0,
            durationMs: 800,
            staggerMs: 0,
            startMode: 'absolute',
          },
        },
      },
    });
    assert.notEqual(camera.isError, true);

    const upsert = await connection.client.callTool({
      name: 'upsert_action_sequence',
      arguments: {
        sequence: {
          actions: [{
            id: 'badge-pop',
            type: 'pop',
            targetIds: ['badge'],
            timing: {
              startMs: 0,
              durationMs: 300,
              staggerMs: 0,
              startMode: 'absolute',
            },
          }],
        },
      },
    });
    assert.notEqual(upsert.isError, true);
    const actionSequence = await connection.client.callTool({
      name: 'get_action_sequence',
      arguments: {},
    });
    assert.match(toolText(actionSequence), /badge-pop/);

    const validation = await connection.client.callTool({
      name: 'validate_project',
      arguments: {},
    });
    assert.notEqual(validation.isError, true);
    assert.match(toolText(validation), /valid V2/);
    const invalidValidation = await connection.client.callTool({
      name: 'validate_project',
      arguments: {
        input: {
          project: { version: '2.0.0' },
        },
      },
    });
    assert.equal(invalidValidation.isError, true);
    assert.match(toolText(invalidValidation), /Invalid V2 project/);

    const snapshot = connection.server.stateContext.getSnapshot();
    const {
      clipStart: _clipStart,
      clipEnd: _clipEnd,
      cameraFrame: _cameraFrame,
      revision,
      sequence,
      ...project
    } = snapshot;
    assert.equal(revision, sequence);
    assert.equal(parseProjectDocument(project).version, '2.0.0');
  } finally {
    await connection.close();
  }
});

test('action limits and unsupported sharing fail at the protocol level', async () => {
  const connection = await createInMemoryClient(
    new MemoryCheckpointStore(),
    [],
    { maxActions: 1, maxTargetsPerAction: 1 },
  );
  try {
    await connection.client.callTool({
      name: 'create_scene',
      arguments: {
        elements: [
          { id: 'one', type: 'rectangle' },
          { id: 'two', type: 'rectangle' },
        ],
      },
    });
    const boundedTargets = await connection.client.callTool({
      name: 'apply_animation_preset',
      arguments: {
        preset: {
          name: 'fade',
          targetIds: ['one', 'two'],
          timing: {
            startMs: 0,
            durationMs: 100,
            staggerMs: 0,
            startMode: 'absolute',
          },
        },
      },
    });
    assert.equal(boundedTargets.isError, true);

    const missingTarget = await connection.client.callTool({
      name: 'apply_animation_preset',
      arguments: {
        preset: {
          name: 'fade',
          targetIds: ['missing'],
          timing: {
            startMs: 0,
            durationMs: 100,
            staggerMs: 0,
            startMode: 'absolute',
          },
        },
      },
    });
    assert.equal(missingTarget.isError, true);
    assert.match(toolText(missingTarget), /Unknown action target/);

    const share = await connection.client.callTool({
      name: 'share_project',
      arguments: {},
    });
    assert.equal(share.isError, true);
    assert.match(toolText(share), /did not upload any content/);
    assert.match(toolText(share), /save_checkpoint/);
    assert.match(toolText(share), /authenticated browser UI/);
  } finally {
    await connection.close();
  }
});

test('mutations are serialized and expanded sequences are rejected before allocation', async () => {
  const delayedFailureStore: CheckpointStore = {
    async save() {
      await delay(30);
      throw new Error('delayed failure');
    },
    async load() {
      return null;
    },
    async list() {
      return [];
    },
  };
  const serialized = await createInMemoryClient(delayedFailureStore);
  try {
    const save = serialized.client.callTool({
      name: 'save_checkpoint',
      arguments: { id: 'delayed' },
    });
    const create = serialized.client.callTool({
      name: 'create_scene',
      arguments: {
        elements: JSON.stringify([{
          id: 'survives',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        }]),
      },
    });
    const [saveResult, createResult] = await Promise.all([save, create]);
    assert.equal(saveResult.isError, true);
    assert.notEqual(createResult.isError, true);
    assert.deepEqual(
      serialized.server.stateContext.getState().scene.elements.map((element) => element.id),
      ['survives'],
    );
  } finally {
    await serialized.close();
  }

  const bounded = await createInMemoryClient(new MemoryCheckpointStore(), [], {
    maxTotalKeyframes: 10,
  });
  try {
    const result = await bounded.client.callTool({
      name: 'create_animated_scene',
      arguments: {
        elements: '[]',
        sequences: [{
          elementIds: ['a', 'b', 'c', 'd', 'e'],
          startTime: 100,
          delay: 100,
          duration: 100,
        }],
      },
    });
    assert.equal(result.isError, true);
    assert.match(toolText(result), /total keyframe limit/);
    assert.equal(bounded.server.stateContext.getState().timeline.tracks.length, 0);
  } finally {
    await bounded.close();
  }

  const throwingServer = createServer(
    new MemoryCheckpointStore(),
    () => {
      throw new Error('listener failure');
    },
  );
  const throwingClient = new Client({ name: 'listener-test', version: '1.0.0' });
  const [throwingClientTransport, throwingServerTransport] =
    InMemoryTransport.createLinkedPair();
  await throwingServer.connect(throwingServerTransport);
  await throwingClient.connect(throwingClientTransport);
  try {
    const result = await throwingClient.callTool({
      name: 'create_scene',
      arguments: {
        elements: JSON.stringify([{
          id: 'committed',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        }]),
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(throwingServer.stateContext.getRevision(), 1);
    assert.deepEqual(
      throwingServer.stateContext.getState().scene.elements.map((element) => element.id),
      ['committed'],
    );
  } finally {
    await throwingClient.close();
    await throwingServer.close();
  }
});

test('SSE broadcasts preserve revision order across large and small deltas', async () => {
  const handle = await startTestServer();
  try {
    const session = await initialize(handle);
    const controller = new AbortController();
    const response = await fetch(`${session.previewUrl}/live`, {
      headers: { Origin: ALLOWED_ORIGIN },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    const reader = response.body?.getReader();
    assert.ok(reader);
    let buffered = '';
    const nextEvent = async (): Promise<string> => {
      while (!buffered.includes('\n\n')) {
        const chunk = await reader.read();
        assert.equal(chunk.done, false);
        buffered += new TextDecoder().decode(chunk.value);
      }
      const separator = buffered.indexOf('\n\n');
      const event = buffered.slice(0, separator);
      buffered = buffered.slice(separator + 2);
      return event;
    };

    await nextEvent();
    await callRawTool(handle, session, 'create_scene', {
      elements: JSON.stringify([{
        id: 'large',
        type: 'text',
        text: 'x'.repeat(5_000),
        x: 0,
        y: 0,
        width: 100,
        height: 20,
      }]),
    });
    await callRawTool(handle, session, 'set_clip_range', { start: 0, end: 1_000 });

    const revisions: number[] = [];
    while (revisions.length < 2) {
      const event = await nextEvent();
      const data = event.split('\n').find((line) => line.startsWith('data: '));
      assert.ok(data);
      const payload = JSON.parse(data.slice(6)) as {
        revision?: number;
        state?: { revision?: number };
      };
      revisions.push(payload.revision ?? payload.state?.revision ?? -1);
    }
    assert.deepEqual(revisions, [1, 2]);
    controller.abort();
  } finally {
    await handle.close();
  }
});

test('nested validation, mutation rates, resource rollback, and errors are safe', async () => {
  const failingStore: CheckpointStore = {
    async save() {
      throw new Error('SECRET_INTERNAL_STACK_TEXT');
    },
    async load() {
      return null;
    },
    async list() {
      return [];
    },
  };
  const connection = await createInMemoryClient(failingStore, [], {
    maxMutationsPerWindow: 2,
    maxTotalKeyframes: 1,
  });
  try {
    const invalid = await connection.client.callTool({
      name: 'add_keyframes_batch',
      arguments: {
        keyframes: [{
          targetId: 'box',
          property: 'opacity',
          time: -1,
          value: 1,
        }],
      },
    });
    assert.equal(invalid.isError, true);

    const overLimit = await connection.client.callTool({
      name: 'add_keyframes_batch',
      arguments: {
        keyframes: [
          { targetId: 'box', property: 'opacity', time: 0, value: 0 },
          { targetId: 'box', property: 'opacity', time: 100, value: 1 },
        ],
      },
    });
    assert.equal(overLimit.isError, true);
    assert.equal(connection.server.stateContext.getState().timeline.tracks.length, 0);

    const internal = await connection.client.callTool({
      name: 'save_checkpoint',
      arguments: { id: 'safe-error' },
    });
    assert.equal(internal.isError, true);
    const text = toolText(internal);
    assert.doesNotMatch(text, /SECRET_INTERNAL_STACK_TEXT/);
    assert.match(text, /Internal tool error \(request ID: [A-Za-z0-9_-]{16}\)/);

    const rateLimited = await connection.client.callTool({
      name: 'clear_animation',
      arguments: {},
    });
    assert.equal(rateLimited.isError, true);
    assert.match(toolText(rateLimited), /Mutation rate limit/);
  } finally {
    await connection.close();
  }
});

test('request timeout and stale cleanup close transports and preview SSE clients', async () => {
  let closeCalls = 0;
  const handle = await startTestServer({
    requestTimeoutMs: 25,
    sessionTtlMs: 40,
    maxSessions: 1,
  }, (server) => {
    const originalClose = server.close.bind(server);
    server.close = async () => {
      closeCalls++;
      await originalClose();
    };
    server.stateContext.tool('slow_test_tool', 'Test-only slow tool', {}, async () => {
      await delay(100);
      return { content: [{ type: 'text', text: 'done' }] };
    });
  });
  try {
    const session = await initialize(handle);
    const timeoutResponse = await fetch(`${serverBase(handle)}/mcp`, {
      method: 'POST',
      headers: {
        ...MCP_HEADERS,
        'mcp-session-id': session.sessionId,
        'mcp-protocol-version': '2025-06-18',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'slow_test_tool', arguments: {} },
      }),
    });
    assert.equal(timeoutResponse.status, 504);
    assert.match(await timeoutResponse.text(), /requestId/);
    const blockedWhileRunning = await fetch(`${serverBase(handle)}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'blocked', version: '1.0.0' },
        },
      }),
    });
    assert.equal(blockedWhileRunning.status, 503);
    await delay(100);
    assert.ok(closeCalls >= 1);

    const cleanupSession = await initialize(handle);
    const controller = new AbortController();
    const sse = await fetch(`${cleanupSession.previewUrl}/live`, {
      headers: { Origin: ALLOWED_ORIGIN },
      signal: controller.signal,
    });
    assert.equal(sse.status, 200);
    await delay(100);
    const staleState = await fetch(`${cleanupSession.previewUrl}/state`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    assert.equal(staleState.status, 404);
    assert.equal(handle.getStats().sessions, 0);
    assert.equal(handle.getStats().sseClients, 0);
    controller.abort();
  } finally {
    await handle.close();
  }
});

test('built CLI help and stdio initialization remain compatible', async () => {
  const cwd = new URL('..', import.meta.url);
  const help = await new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['dist/index.js', '--help'], { cwd });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout }));
  });
  assert.equal(help.code, 0);
  assert.match(help.stdout, /default: 127\.0\.0\.1/);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'dist/index.js',
      '--host=127.0.0.1',
      '--port=0',
      '--auth-token=short=1234567890123456',
    ], { cwd });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('inline token test timed out'));
    }, 3_000);
    let output = '';
    const inspect = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('MCP server listening')) {
        clearTimeout(timer);
        child.kill();
        resolve();
      } else if (output.includes('Startup failed')) {
        clearTimeout(timer);
        child.kill();
        reject(new Error(output));
      }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  const stdioResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn(process.execPath, ['dist/index.js', '--stdio'], { cwd });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('stdio test timed out'));
    }, 3_000);
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const line = stdout.split(/\r?\n/).find(Boolean);
      if (!line) return;
      clearTimeout(timer);
      child.kill();
      resolve(JSON.parse(line) as Record<string, unknown>);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'stdio-test', version: '1.0.0' },
      },
    })}\n`);
  });
  assert.equal(stdioResult.jsonrpc, '2.0');
  assert.equal(stdioResult.id, 1);
  assert.ok(stdioResult.result);
});
