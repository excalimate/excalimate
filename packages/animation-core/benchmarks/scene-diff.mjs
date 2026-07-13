import { diffSceneStates } from '../dist/index.js';

const sizes = [1_000, 10_000];

console.log('\nScene-diff benchmark');
for (const size of sizes) {
  const makeState = (id, offset) => ({
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    elements: Array.from({ length: size }, (_, index) => ({
      id: `element-${index}`,
      type: index % 5 === 0 ? 'text' : 'rectangle',
      x: (index % 100) * 120 + offset,
      y: Math.floor(index / 100) * 80,
      width: 100 + (index % 3),
      height: 60,
      angle: index % 17 === 0 ? offset / 100 : 0,
      opacity: 1,
      present: true,
      groupIds: index % 4 === 0 ? [`group-${Math.floor(index / 4)}`] : [],
      boundElementIds: [],
    })),
  });
  const from = makeState('from', 0);
  const to = makeState('to', 10);
  const iterations = size === 1_000 ? 20 : 5;
  const start = performance.now();
  let changes = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    changes += diffSceneStates(from, to).changes.length;
  }
  const elapsed = performance.now() - start;
  console.log(
    JSON.stringify({
      elements: size,
      iterations,
      averageMilliseconds: Math.round((elapsed / iterations) * 100) / 100,
      averageChanges: Math.round(changes / iterations),
    }),
  );
}
