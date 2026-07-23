import { readFileSync } from 'node:fs';

const releaseVersion = '0.5.0';
const packagePaths = [
  'package.json',
  'packages/project-schema/package.json',
  'packages/animation-core/package.json',
  'packages/player-runtime/package.json',
  'packages/export-runtime/package.json',
  'mcp-server/package.json',
  'share-worker/package.json',
];

for (const path of packagePaths) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.version !== releaseVersion) {
    throw new Error(`${path} has version ${manifest.version}; expected ${releaseVersion}`);
  }
}

for (const path of [
  'packages/project-schema/package.json',
  'packages/animation-core/package.json',
  'mcp-server/package.json',
]) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.publishConfig?.provenance !== true) {
    throw new Error(`${path} must retain npm provenance metadata`);
  }
}

for (const path of ['packages/animation-core/package.json', 'mcp-server/package.json']) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith('@excalimate/') && range !== `^${releaseVersion}`) {
      throw new Error(`${path}: ${name} uses ${range}; expected ^${releaseVersion}`);
    }
  }
}

console.log(
  JSON.stringify({
    releaseVersion,
    packageCount: packagePaths.length,
    provenancePackages: 3,
    schemaVersion: '2.0.0',
    playerPackageVersion: '1.0.0',
    playerRuntimeVersion: '1.0.0',
  }),
);
