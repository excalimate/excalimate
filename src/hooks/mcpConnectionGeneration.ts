export interface McpConnectionGeneration {
  next(): number;
  isCurrent(generation: number): boolean;
  invalidate(): void;
}

export function createMcpConnectionGeneration(): McpConnectionGeneration {
  let current = 0;
  return {
    next(): number {
      current += 1;
      return current;
    },
    isCurrent(generation: number): boolean {
      return generation === current;
    },
    invalidate(): void {
      current += 1;
    },
  };
}
