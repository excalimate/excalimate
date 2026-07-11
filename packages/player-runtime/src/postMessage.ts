import type { PlayerRuntime } from './player.js';
import type { PlayerState } from './types.js';

export const PLAYER_MESSAGE_CHANNEL = 'excalimate-player-v1' as const;

export type PlayerCommand =
  | { channel: typeof PLAYER_MESSAGE_CHANNEL; type: 'command'; command: 'play' }
  | { channel: typeof PLAYER_MESSAGE_CHANNEL; type: 'command'; command: 'pause' }
  | {
      channel: typeof PLAYER_MESSAGE_CHANNEL;
      type: 'command';
      command: 'seek';
      timeMs: number;
    }
  | {
      channel: typeof PLAYER_MESSAGE_CHANNEL;
      type: 'command';
      command: 'rate';
      rate: number;
    }
  | { channel: typeof PLAYER_MESSAGE_CHANNEL; type: 'command'; command: 'state' };

export type PlayerEvent =
  | {
      channel: typeof PLAYER_MESSAGE_CHANNEL;
      type: 'state';
      state: PlayerState;
    }
  | {
      channel: typeof PLAYER_MESSAGE_CHANNEL;
      type: 'error';
      message: string;
    };

export interface PlayerMessageBridgeOptions {
  allowedOrigins: readonly string[];
  hostWindow?: Window;
}

export function parseAllowedOrigins(value: string | undefined): readonly string[] {
  if (!value?.trim()) return [];
  const origins = new Set<string>();
  for (const candidate of value.split(',')) {
    const trimmed = candidate.trim();
    if (!trimmed || trimmed === '*') {
      throw new Error('Player message origins must be explicit');
    }
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error(`Invalid player message origin "${trimmed}"`);
    }
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.origin !== trimmed
    ) {
      throw new Error(`Invalid player message origin "${trimmed}"`);
    }
    origins.add(url.origin);
  }
  return [...origins];
}

export function createPlayerMessageBridge(
  player: PlayerRuntime,
  options: PlayerMessageBridgeOptions,
): () => void {
  const hostWindow = options.hostWindow ?? window;
  const allowedOrigins = new Set(options.allowedOrigins);
  let activeOrigin: string | null = null;

  const post = (event: PlayerEvent): void => {
    if (!activeOrigin || hostWindow.parent === hostWindow) return;
    hostWindow.parent.postMessage(event, activeOrigin);
  };
  const unsubscribe = player.subscribe((state) => {
    post({ channel: PLAYER_MESSAGE_CHANNEL, type: 'state', state: { ...state } });
  });
  const onMessage = (event: MessageEvent<unknown>): void => {
    if (
      event.source !== hostWindow.parent ||
      !allowedOrigins.has(event.origin) ||
      !isPlayerCommand(event.data)
    ) {
      return;
    }
    activeOrigin = event.origin;
    try {
      if (event.data.command === 'play') player.play();
      else if (event.data.command === 'pause') player.pause();
      else if (event.data.command === 'seek') player.seek(event.data.timeMs);
      else if (event.data.command === 'rate') player.setRate(event.data.rate);
      else {
        post({
          channel: PLAYER_MESSAGE_CHANNEL,
          type: 'state',
          state: { ...player.getState() },
        });
      }
    } catch (error) {
      post({
        channel: PLAYER_MESSAGE_CHANNEL,
        type: 'error',
        message: error instanceof Error ? error.message : 'Player command failed',
      });
    }
  };
  hostWindow.addEventListener('message', onMessage);

  return () => {
    unsubscribe();
    hostWindow.removeEventListener('message', onMessage);
  };
}

function isPlayerCommand(input: unknown): input is PlayerCommand {
  if (typeof input !== 'object' || input === null) return false;
  const record = input as Record<string, unknown>;
  if (
    record['channel'] !== PLAYER_MESSAGE_CHANNEL ||
    record['type'] !== 'command'
  ) {
    return false;
  }
  const command = record['command'];
  if (command === 'play' || command === 'pause' || command === 'state') {
    return Object.keys(record).length === 3;
  }
  if (command === 'seek') {
    return Object.keys(record).length === 4 && typeof record['timeMs'] === 'number';
  }
  if (command === 'rate') {
    return Object.keys(record).length === 4 && typeof record['rate'] === 'number';
  }
  return false;
}
