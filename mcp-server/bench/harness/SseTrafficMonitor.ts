import { gzipSync } from 'node:zlib';
import type { StateDelta } from '../../src/server/stateContext.js';

export interface SseMessage {
  areas: string;
  rawBytes: number;
  compressedBytes: number;
}

export interface TrafficReport {
  messageCount: number;
  totalRawBytes: number;
  totalCompressedBytes: number;
  compressionRatio: number;
  messages: SseMessage[];
}

/**
 * Intercepts SSE deltas to measure bandwidth.
 * Pass createListener() as the onStateChange callback to createServer().
 */
export class SseTrafficMonitor {
  messages: SseMessage[] = [];
  totalRawBytes = 0;
  totalCompressedBytes = 0;

  createListener(): (delta: StateDelta) => void {
    return (delta: StateDelta) => {
      const raw = JSON.stringify({ type: 'state', state: delta });
      const rawBytes = Buffer.byteLength(raw, 'utf8');
      let compressedBytes = rawBytes;

      if (rawBytes > 512) {
        const compressed = gzipSync(raw).toString('base64');
        compressedBytes = Buffer.byteLength(
          JSON.stringify({ type: 'gz', data: compressed }),
          'utf8',
        );
      }

      const areas = Object.keys(delta).join('+');
      this.messages.push({ areas, rawBytes, compressedBytes });
      this.totalRawBytes += rawBytes;
      this.totalCompressedBytes += compressedBytes;
    };
  }

  report(): TrafficReport {
    return {
      messageCount: this.messages.length,
      totalRawBytes: this.totalRawBytes,
      totalCompressedBytes: this.totalCompressedBytes,
      compressionRatio: this.totalRawBytes > 0
        ? 1 - this.totalCompressedBytes / this.totalRawBytes
        : 0,
      messages: this.messages,
    };
  }

  reset(): void {
    this.messages = [];
    this.totalRawBytes = 0;
    this.totalCompressedBytes = 0;
  }
}
