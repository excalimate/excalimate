import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(
  readFileSync(resolve('dist', '.vite', 'manifest.json'), 'utf8'),
);
const entries = new Map(Object.entries(manifest));
const editorKey = findEntry('index.html');
const playerKey = findEntry('player.html');
const editorInitial = collect(editorKey, false);
const playerGraph = collect(playerKey, true);
const requiredLazyModules = [
  'src/services/export/job.ts',
  'src/services/export/exportMP4.ts',
  'src/services/export/exportWebM.ts',
  'src/services/export/exportGIF.ts',
  'src/services/export/exportSVG.ts',
  'src/services/export/lottie/exportLottie.ts',
];
const lazyEntries = requiredLazyModules.map((modulePath) => {
  const expectedName = modulePath
    .slice(modulePath.lastIndexOf('/') + 1)
    .replace(/\.ts$/, '');
  const key = [...entries.keys()].find(
    (candidate) =>
      normalize(candidate) === modulePath ||
      normalize(entries.get(candidate)?.src ?? '') === modulePath ||
      entries.get(candidate)?.name === expectedName,
  );
  if (!key) throw new Error(`Missing lazy export chunk for ${modulePath}`);
  const entry = entries.get(key);
  if (!entry?.isDynamicEntry) {
    throw new Error(`${modulePath} is not emitted as a dynamic entry`);
  }
  if (editorInitial.has(key) || editorInitial.has(entry.file)) {
    throw new Error(`${modulePath} leaked into the editor initial graph`);
  }
  if (playerGraph.has(key) || playerGraph.has(entry.file)) {
    throw new Error(`${modulePath} leaked into the hosted player graph`);
  }
  return { module: modulePath, file: entry.file };
});

const playerFiles = new Set(
  [...playerGraph]
    .map((key) => entries.get(key)?.file ?? key)
    .filter(Boolean),
);
for (const lazy of lazyEntries) {
  if (playerFiles.has(lazy.file)) {
    throw new Error(`Player graph shares export chunk ${lazy.file}`);
  }
}

const report = {
  editorEntry: editorKey,
  playerEntry: playerKey,
  editorInitialChunks: editorInitial.size,
  playerGraphChunks: playerGraph.size,
  lazyEntries,
  isolated: true,
};
console.log(JSON.stringify(report, null, 2));

function findEntry(source) {
  const key = [...entries.keys()].find(
    (candidate) =>
      entries.get(candidate)?.isEntry &&
      normalize(entries.get(candidate)?.src ?? candidate).endsWith(source),
  );
  if (!key) throw new Error(`Missing ${source} build entry`);
  return key;
}

function collect(rootKey, includeDynamic) {
  const visited = new Set();
  const queue = [rootKey];
  while (queue.length > 0) {
    const key = queue.pop();
    if (!key || visited.has(key)) continue;
    visited.add(key);
    const entry = entries.get(key);
    if (!entry) continue;
    if (entry.file) visited.add(entry.file);
    queue.push(...(entry.imports ?? []));
    if (includeDynamic) queue.push(...(entry.dynamicImports ?? []));
  }
  return visited;
}

function normalize(value) {
  return value.replace(/\\/g, '/');
}
