import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {
  compileTimeline,
  computeCompiledFrame,
  generatedContentHash,
} from '../packages/animation-core/dist/index.js';
import { parseProjectDocument } from '../packages/project-schema/dist/index.js';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const manifestPath = path.join(publicRoot, 'templates', 'v1', 'manifest.json');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedCategories = new Set(['software', 'infrastructure', 'data', 'business', 'education']);
const allowedFileMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

assertExactKeys(manifest, ['schemaVersion', 'templates'], 'manifest');
assert(manifest.schemaVersion === 1, 'Unsupported template manifest version');
assert(Array.isArray(manifest.templates), 'Manifest templates must be an array');
assert(manifest.templates.length > 0 && manifest.templates.length <= 100, 'Invalid template count');

const ids = new Set();
for (const [index, template] of manifest.templates.entries()) {
  const label = `templates[${index}]`;
  assertExactKeys(
    template,
    [
      'id',
      'version',
      'minAppVersion',
      'title',
      'description',
      'category',
      'tags',
      'aspectRatio',
      'poster',
      'preview',
      'contentHash',
      'projectAssetPath',
    ],
    label,
  );
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.id), `${label} has an invalid id`);
  assert(!ids.has(template.id), `Duplicate template id "${template.id}"`);
  ids.add(template.id);
  assertSemver(template.version, `${label}.version`);
  assertSemver(template.minAppVersion, `${label}.minAppVersion`);
  assert(
    compareSemver(template.minAppVersion, packageJson.version) <= 0,
    `${label} requires a newer application version`,
  );
  assert(typeof template.title === 'string' && template.title.length > 0, `${label} has no title`);
  assert(
    typeof template.description === 'string' &&
      template.description.length > 0 &&
      template.description.length <= 240,
    `${label} has an invalid description`,
  );
  assert(allowedCategories.has(template.category), `${label} has an invalid category`);
  assert(
    Array.isArray(template.tags) &&
      template.tags.length > 0 &&
      template.tags.length <= 8 &&
      template.tags.every((tag) => typeof tag === 'string' && tag.length > 0),
    `${label} has invalid tags`,
  );
  assert(
    ['16:9', '4:3', '1:1', '3:2'].includes(template.aspectRatio),
    `${label} has an invalid aspect ratio`,
  );
  assertHash(template.contentHash, `${label}.contentHash`);
  assertSafeAssetPath(template.projectAssetPath, `/templates/v1/${template.id}/`);

  assertExactKeys(
    template.poster,
    ['path', 'mimeType', 'width', 'height', 'byteLength', 'contentHash'],
    `${label}.poster`,
  );
  assertSafeAssetPath(template.poster.path, `/templates/v1/${template.id}/`);
  assert(template.poster.mimeType === 'image/svg+xml', `${label} poster MIME is unsupported`);
  assert(
    Number.isInteger(template.poster.width) &&
      template.poster.width > 0 &&
      Number.isInteger(template.poster.height) &&
      template.poster.height > 0,
    `${label} poster dimensions are invalid`,
  );
  assert(
    Number.isInteger(template.poster.byteLength) &&
      template.poster.byteLength > 0 &&
      template.poster.byteLength <= 512 * 1024,
    `${label} poster payload is oversized`,
  );
  assertHash(template.poster.contentHash, `${label}.poster.contentHash`);

  assertExactKeys(template.preview, ['mode', 'posterPath', 'playerPackage'], `${label}.preview`);
  assert(template.preview.mode === 'poster', `${label} preview mode is unsupported`);
  assert(template.preview.posterPath === template.poster.path, `${label} preview poster mismatch`);
  assert(
    template.preview.playerPackage === null,
    `${label} unexpectedly includes a player package`,
  );

  const projectBytes = await readSafeAsset(template.projectAssetPath);
  assert(projectBytes.byteLength <= 1024 * 1024, `${label} project payload is oversized`);
  assert(sha256(projectBytes) === template.contentHash, `${label} project hash mismatch`);
  const projectText = projectBytes.toString('utf8');
  assertNoExternalReferences(JSON.parse(projectText), `${label} project`);
  const firstLoad = parseProjectDocument(JSON.parse(projectText));
  const secondLoad = parseProjectDocument(JSON.parse(projectText));
  assert(
    JSON.stringify(firstLoad) === JSON.stringify(secondLoad),
    `${label} project load is non-deterministic`,
  );
  validateSceneFiles(firstLoad.scene.files, label);
  validateManagedOwnership(firstLoad, label);
  computeCompiledFrame(
    compileTimeline(firstLoad.timeline, firstLoad.authoring?.timelineRevision ?? 0),
    Math.min(500, firstLoad.playback.clipEnd),
  );

  const posterBytes = await readSafeAsset(template.poster.path);
  assert(posterBytes.byteLength === template.poster.byteLength, `${label} poster size mismatch`);
  assert(sha256(posterBytes) === template.poster.contentHash, `${label} poster hash mismatch`);
  validateSvgPoster(posterBytes.toString('utf8'), template, label);
}

const generatedSource = await readFile(
  path.join(root, 'src', 'templates', 'generatedManifest.ts'),
  'utf8',
);
const generatedModuleSource = ts.transpileModule(generatedSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const generatedModule = await import(
  `data:text/javascript;base64,${Buffer.from(generatedModuleSource).toString('base64')}`
);
assert(
  JSON.stringify(generatedModule.GENERATED_TEMPLATE_MANIFEST) === JSON.stringify(manifest),
  'Public and application template manifests do not match',
);

console.log(`Validated ${manifest.templates.length} curated templates.`);

async function readSafeAsset(assetPath) {
  const relative = decodeURIComponent(assetPath).replace(/^\/+/, '');
  const candidate = path.resolve(publicRoot, relative);
  const publicRealPath = await realpath(publicRoot);
  const candidateRealPath = await realpath(candidate);
  assert(
    candidateRealPath.startsWith(`${publicRealPath}${path.sep}`),
    `Template asset escapes the public directory: ${assetPath}`,
  );
  return readFile(candidateRealPath);
}

function assertSafeAssetPath(assetPath, requiredPrefix) {
  assert(typeof assetPath === 'string', 'Template asset path must be a string');
  assert(
    assetPath.startsWith(requiredPrefix),
    `Template asset path must start with ${requiredPrefix}`,
  );
  const decoded = decodeURIComponent(assetPath);
  assert(
    !decoded.includes('..') &&
      !decoded.includes('\\') &&
      !decoded.includes('\0') &&
      !/^https?:/i.test(decoded),
    `Unsafe template asset path: ${assetPath}`,
  );
}

function validateSceneFiles(files, label) {
  for (const [fileId, file] of Object.entries(files)) {
    assert(file && typeof file === 'object', `${label} file "${fileId}" is invalid`);
    assert(
      allowedFileMimeTypes.has(file.mimeType),
      `${label} file "${fileId}" has an unsupported MIME type`,
    );
    assert(
      typeof file.dataURL === 'string' && file.dataURL.startsWith(`data:${file.mimeType};base64,`),
      `${label} file "${fileId}" is not a local embedded asset`,
    );
  }
}

function validateManagedOwnership(project, label) {
  const tracksById = new Map(project.timeline.tracks.map((track) => [track.id, track]));
  for (const action of project.authoring?.actions ?? []) {
    if (action.status !== 'managed') continue;
    const tracks = action.ownership.map((ownership) => {
      const track = tracksById.get(ownership.trackId);
      assert(track, `${label} has stale action ownership`);
      assert(
        track.managedActionId === action.id,
        `${label} generated track ownership does not match its action`,
      );
      return track;
    });
    assert(
      generatedContentHash(tracks) === action.generatedHash,
      `${label} managed action hash mismatch`,
    );
  }
}

function validateSvgPoster(svg, template, label) {
  assert(
    !/<(?:script|foreignObject|iframe|object|embed)\b/i.test(svg),
    `${label} poster contains unsafe SVG content`,
  );
  assert(!/\b(?:href|xlink:href)\s*=/i.test(svg), `${label} poster contains an external reference`);
  assert(!/(?:url\s*\(|@import)/i.test(svg), `${label} poster contains remote styling`);
  assert(
    new RegExp(`\\bwidth="${template.poster.width}"`).test(svg) &&
      new RegExp(`\\bheight="${template.poster.height}"`).test(svg),
    `${label} poster dimensions do not match the manifest`,
  );
}

function assertNoExternalReferences(value, label) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === 'string') {
      assert(!/(?:https?:)?\/\//i.test(current), `${label} contains an external asset URL`);
    } else if (Array.isArray(current)) {
      stack.push(...current);
    } else if (current && typeof current === 'object') {
      stack.push(...Object.values(current));
    }
  }
}

function assertExactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} contains missing or unknown fields`,
  );
}

function assertSemver(value, label) {
  assert(
    typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value),
    `${label} must be semantic version`,
  );
}

function compareSemver(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function assertHash(value, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), `${label} is invalid`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
