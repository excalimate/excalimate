import { analyzeAutoAnimate } from '../dist/index.js';

const sizes = [25, 100, 500];

console.log('\nAuto-animate analyzer benchmark');
for (const size of sizes) {
  const elements = [];
  for (let index = 0; index < size; index += 1) {
    elements.push({
      id: `node-${index}`,
      type: 'rectangle',
      x: (index % 20) * 140,
      y: Math.floor(index / 20) * 100,
      width: 100,
      height: 60,
      zIndex: index,
    });
    if (index > 0) {
      elements.push({
        id: `arrow-${index - 1}-${index}`,
        type: 'arrow',
        x: 0,
        y: 0,
        width: 100,
        height: 10,
        zIndex: size + index,
        startBinding: { elementId: `node-${index - 1}` },
        endBinding: { elementId: `node-${index}` },
      });
    }
  }

  const iterations = Math.max(5, Math.floor(2_000 / size));
  const start = performance.now();
  let recipeCount = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    recipeCount += analyzeAutoAnimate({ elements, scope: 'diagram' }).recipes.length;
  }
  const elapsed = performance.now() - start;
  console.log(
    JSON.stringify({
      nodes: size,
      elements: elements.length,
      iterations,
      analysesPerSecond: Math.round((iterations / elapsed) * 1_000),
      averageRecipes: Math.round(recipeCount / iterations),
    }),
  );
}
