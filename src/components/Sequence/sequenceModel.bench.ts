import { describe, test } from 'vitest';
import type { AnimationAction } from '@excalimate/project-schema';
import {
  buildSequenceRows,
  getVirtualActionWindow,
  moveActionIdToIndex,
} from './sequenceModel';

const actions: AnimationAction[] = Array.from({ length: 1_000 }, (_, index) => ({
  id: `action-${index}`,
  type: 'fade',
  preset: 'fade',
  targetIds: [`element-${index}`],
  timing: {
    startMs: 0,
    durationMs: 500,
    staggerMs: 0,
    startMode: index === 0 ? 'absolute' : 'afterPrevious',
  },
  easing: 'easeOut',
  parameters: {},
  ownership: [],
  generatedHash: 'empty',
  status: 'managed',
}));

const targets = actions.map((action, index) => ({
  id: action.targetIds[0]!,
  type: 'element' as const,
  label: `Element ${index}`,
  elementIds: [action.targetIds[0]!],
  originalBounds: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    centerX: 50,
    centerY: 50,
  },
  originalAngle: 0,
  zIndex: index,
}));

describe('Sequence interaction model', () => {
  test('derive 1,000 action rows', async ({ bench }) => {
    const buildRows = buildSequenceRows;
    await bench('derive 1,000 action rows', () => {
      buildRows(actions, [], targets);
    }).run();
  });

  test('move an action in a 1,000-row list', async ({ bench }) => {
    const moveAction = moveActionIdToIndex;
    await bench('move an action in a 1,000-row list', () => {
      moveAction(
        actions.map((action) => action.id),
        'action-750',
        250,
      );
    }).run();
  });

  test('calculate a virtual window', async ({ bench }) => {
    const getWindow = getVirtualActionWindow;
    // Keep the near-zero-cost calculation from dominating CI sampling time.
    await bench('calculate a virtual window', () => {
      getWindow(1_000, 25_000, 800);
    }).run({ time: 25, warmupTime: 10 });
  });
});
