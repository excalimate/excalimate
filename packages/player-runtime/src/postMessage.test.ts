import { describe, expect, it } from 'vitest';
import { createTestPlayerPackage } from './package.test.js';
import { PlayerRuntime } from './player.js';
import {
  PLAYER_MESSAGE_CHANNEL,
  createPlayerMessageBridge,
  parseAllowedOrigins,
} from './postMessage.js';
import type {
  PlayerSceneAdapter,
  PlayerTimingDriver,
} from './types.js';

function createHostWindow() {
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  const messages: Array<{ message: unknown; origin: string }> = [];
  const parent = {
    postMessage(message: unknown, origin: string) {
      messages.push({ message, origin });
    },
  };
  const host = {
    parent,
    addEventListener(
      type: string,
      next: (event: MessageEvent<unknown>) => void,
    ) {
      if (type === 'message') listener = next;
    },
    removeEventListener() {
      listener = null;
    },
  };
  return {
    host: host as unknown as Window,
    parent: parent as unknown as MessageEventSource,
    messages,
    dispatch(event: MessageEvent<unknown>) {
      listener?.(event);
    },
  };
}

describe('player postMessage bridge', () => {
  it('requires explicit valid origins', () => {
    expect(parseAllowedOrigins('https://embed.example,https://docs.example')).toEqual([
      'https://embed.example',
      'https://docs.example',
    ]);
    expect(() => parseAllowedOrigins('*')).toThrow('explicit');
    expect(() => parseAllowedOrigins('https://embed.example/path')).toThrow(
      'Invalid',
    );
  });

  it('accepts only parent commands from configured origins and emits state only', () => {
    const host = createHostWindow();
    const scene: PlayerSceneAdapter = {
      applyFrame() {},
      destroy() {},
    };
    const timing: PlayerTimingDriver = {
      now: () => 0,
      request: () => 1,
      cancel() {},
    };
    const player = new PlayerRuntime(createTestPlayerPackage(), {
      sceneAdapter: scene,
      timing,
    });
    const destroyBridge = createPlayerMessageBridge(player, {
      allowedOrigins: ['https://embed.example'],
      hostWindow: host.host,
    });
    const play = {
      channel: PLAYER_MESSAGE_CHANNEL,
      type: 'command',
      command: 'play',
    };

    host.dispatch(
      new MessageEvent('message', {
        origin: 'https://attacker.example',
        source: host.parent,
        data: play,
      }),
    );
    expect(player.getState().playing).toBe(false);
    host.dispatch(
      new MessageEvent('message', {
        origin: 'https://embed.example',
        source: host.parent,
        data: play,
      }),
    );
    expect(player.getState().playing).toBe(true);
    expect(host.messages.at(-1)?.origin).toBe('https://embed.example');
    expect(host.messages.at(-1)?.message).toMatchObject({
      channel: PLAYER_MESSAGE_CHANNEL,
      type: 'state',
    });
    expect(JSON.stringify(host.messages)).not.toMatch(
      /scene|project|svg|share|key|deleteSecret/i,
    );

    destroyBridge();
    player.destroy();
  });
});
