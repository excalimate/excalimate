import { nanoid } from 'nanoid';
import { parseProjectDocument } from '@excalimate/project-schema';
import type { ProjectDocument } from '@excalimate/project-schema';
import { GENERATED_TEMPLATE_MANIFEST } from './generatedManifest';
import { TemplateManifestSchema, type TemplateManifestEntry } from './schema';
import { validateTemplateDocumentSecurity } from './validation';

export const TEMPLATE_PROJECT_MAX_BYTES = 1024 * 1024;

export const templateManifest = TemplateManifestSchema.parse(GENERATED_TEMPLATE_MANIFEST);

export function filterTemplates(query: string, category: string | null): TemplateManifestEntry[] {
  const normalized = query.trim().toLocaleLowerCase('en-US');
  return templateManifest.templates.filter((template) => {
    if (category && template.category !== category) return false;
    if (!normalized) return true;
    return [template.title, template.description, template.category, ...template.tags].some(
      (value) => value.toLocaleLowerCase('en-US').includes(normalized),
    );
  });
}

export async function loadTemplateDocument(
  template: TemplateManifestEntry,
  fetcher: typeof fetch = fetch,
): Promise<ProjectDocument> {
  const response = await fetcher(template.projectAssetPath, {
    credentials: 'same-origin',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error(`Template project could not be loaded (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > TEMPLATE_PROJECT_MAX_BYTES) {
    throw new Error('Template project exceeds the local size limit');
  }
  const hash = await sha256Hex(buffer);
  if (hash !== template.contentHash) {
    throw new Error('Template project failed its integrity check');
  }
  const source = parseProjectDocument(JSON.parse(new TextDecoder().decode(buffer)) as unknown);
  validateTemplateDocumentSecurity(source);
  const now = new Date().toISOString();
  return parseProjectDocument({
    ...structuredClone(source),
    metadata: {
      ...source.metadata,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
