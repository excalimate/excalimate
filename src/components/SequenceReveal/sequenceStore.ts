import { useEffect, useState } from 'react';

export interface RevealSequence {
  id: string;
  name: string;
  elementIds: string[];
  property: 'opacity' | 'drawProgress';
  startTime: number;
  delay: number;
  duration: number;
}

let _sequences: RevealSequence[] = [];
let _listeners: Array<() => void> = [];

export function getSequences(): RevealSequence[] {
  return _sequences;
}

export function setSequences(seqs: RevealSequence[]): void {
  _sequences = seqs;
  _listeners.forEach((fn) => fn());
}

export function useSequences(): RevealSequence[] {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.push(listener);

    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  return _sequences;
}
