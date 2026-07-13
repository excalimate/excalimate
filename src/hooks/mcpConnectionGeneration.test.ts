import { describe, expect, it } from 'vitest';
import { createMcpConnectionGeneration } from './mcpConnectionGeneration';

describe('MCP connection generations', () => {
  it('invalidates asynchronous work from replaced and disconnected connections', () => {
    const generations = createMcpConnectionGeneration();
    const first = generations.next();
    expect(generations.isCurrent(first)).toBe(true);

    const second = generations.next();
    expect(generations.isCurrent(first)).toBe(false);
    expect(generations.isCurrent(second)).toBe(true);

    generations.invalidate();
    expect(generations.isCurrent(second)).toBe(false);
  });
});
