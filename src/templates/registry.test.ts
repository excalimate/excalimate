import { describe, expect, it } from 'vitest';
import { compileTimeline, computeCompiledFrame } from '@excalimate/animation-core';
import { GENERATED_TEMPLATE_MANIFEST } from './generatedManifest';
import { filterTemplates, loadTemplateDocument, templateManifest } from './registry';
import { TemplateManifestSchema } from './schema';
import { createSyntheticV2Project } from '../test-fixtures/projectDocuments';
import { validateTemplateDocumentSecurity } from './validation';

describe('template registry', () => {
  it('uses a strict manifest and rejects duplicates and unsafe paths', () => {
    expect(TemplateManifestSchema.parse(GENERATED_TEMPLATE_MANIFEST)).toEqual(templateManifest);
    expect(() =>
      TemplateManifestSchema.parse({
        ...GENERATED_TEMPLATE_MANIFEST,
        templates: [
          GENERATED_TEMPLATE_MANIFEST.templates[0],
          GENERATED_TEMPLATE_MANIFEST.templates[0],
        ],
      }),
    ).toThrow(/Duplicate template id/);
    expect(() =>
      TemplateManifestSchema.parse({
        ...GENERATED_TEMPLATE_MANIFEST,
        templates: [
          {
            ...GENERATED_TEMPLATE_MANIFEST.templates[0],
            projectAssetPath: '/templates/v1/../project.json',
          },
        ],
      }),
    ).toThrow(/safe local paths/);
  });

  it('loads a validated source as fresh playable editable copies', async () => {
    const source = createSyntheticV2Project();
    const json = JSON.stringify(source);
    const bytes = new TextEncoder().encode(json);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const contentHash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const template = {
      ...templateManifest.templates[0]!,
      contentHash,
    };
    const fetcher: typeof fetch = async () => new Response(bytes.slice(), { status: 200 });

    const first = await loadTemplateDocument(template, fetcher);
    const second = await loadTemplateDocument(template, fetcher);

    expect(first.metadata.id).not.toBe(second.metadata.id);
    expect(first.metadata.id).not.toBe(source.metadata.id);
    const compiled = compileTimeline(first.timeline, 1);
    expect(() => computeCompiledFrame(compiled, 500)).not.toThrow();
    first.scene.elements[0]!.x = 999;
    expect(second.scene.elements[0]!.x).not.toBe(999);
    expect(source.scene.elements[0]!.x).not.toBe(999);
  });

  it('rejects content that does not match the manifest hash', async () => {
    const template = templateManifest.templates[0]!;
    await expect(
      loadTemplateDocument(
        template,
        async () => new Response('{"version":"2.0.0"}', { status: 200 }),
      ),
    ).rejects.toThrow(/integrity/);
  });

  it('filters by category and searchable metadata without loading documents', () => {
    expect(filterTemplates('oauth', null).map((template) => template.id)).toEqual(['oauth-flow']);
    expect(filterTemplates('', 'education').map((template) => template.id)).toEqual([
      'educational-explainer',
    ]);
  });

  it('rejects external assets and unsupported file MIME types', () => {
    const external = createSyntheticV2Project();
    external.scene.appState = { source: 'https://private.example/asset.png' };
    expect(() => validateTemplateDocumentSecurity(external)).toThrow(/external asset URL/);

    const unsafeMime = createSyntheticV2Project();
    unsafeMime.scene.files = {
      unsafe: {
        mimeType: 'text/html',
        dataURL: 'data:text/html;base64,PGgxPk5vPC9oMT4=',
      },
    };
    expect(() => validateTemplateDocumentSecurity(unsafeMime)).toThrow(/unsupported MIME type/);
  });
});
