import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const manifestPath = resolve('dist', '.vite', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const playerKey = Object.keys(manifest).find(
  (key) => manifest[key]?.isEntry && manifest[key]?.src === 'player.html',
);
if (!playerKey) throw new Error('Player entry is missing from the Vite manifest');

const files = new Set();
const visited = new Set();
function collect(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Missing manifest entry "${key}"`);
  if (entry.file) files.add(entry.file);
  for (const css of entry.css ?? []) files.add(css);
  for (const imported of [
    ...(entry.imports ?? []),
    ...(entry.dynamicImports ?? []),
  ]) {
    collect(imported);
  }
}
collect(playerKey);

const assets = [...files]
  .filter((file) => /\.(?:css|js)$/.test(file))
  .map((file) => {
    const bytes = readFileSync(resolve('dist', file));
    return {
      file,
      rawBytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
    };
  });
const javascriptGzipBytes = assets
  .filter((asset) => asset.file.endsWith('.js'))
  .reduce((total, asset) => total + asset.gzipBytes, 0);
const cssGzipBytes = assets
  .filter((asset) => asset.file.endsWith('.css'))
  .reduce((total, asset) => total + asset.gzipBytes, 0);
const totalGzipBytes = javascriptGzipBytes + cssGzipBytes;
const budgetBytes = 150 * 1024;
const report = {
  entry: playerKey,
  assets,
  javascriptGzipBytes,
  cssGzipBytes,
  totalGzipBytes,
  budgetBytes,
  withinBudget: javascriptGzipBytes <= budgetBytes,
};
console.log(JSON.stringify(report, null, 2));
if (!report.withinBudget) {
  throw new Error(
    `Player JavaScript is ${(javascriptGzipBytes / 1024).toFixed(1)} KB gzip; budget is 150 KB`,
  );
}
