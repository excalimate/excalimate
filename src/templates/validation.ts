import type { ProjectDocument } from '@excalimate/project-schema';

const ALLOWED_TEMPLATE_FILE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

export function validateTemplateDocumentSecurity(document: ProjectDocument): void {
  assertNoExternalReferences(document);
  for (const [fileId, value] of Object.entries(document.scene.files)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Template file "${fileId}" is invalid`);
    }
    const file = value as Record<string, unknown>;
    const mimeType = file['mimeType'];
    const dataURL = file['dataURL'];
    if (typeof mimeType !== 'string' || !ALLOWED_TEMPLATE_FILE_MIME_TYPES.has(mimeType)) {
      throw new Error(`Template file "${fileId}" uses an unsupported MIME type`);
    }
    if (typeof dataURL !== 'string' || !dataURL.startsWith(`data:${mimeType};base64,`)) {
      throw new Error(`Template file "${fileId}" is not a local embedded asset`);
    }
  }
}

function assertNoExternalReferences(value: unknown): void {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === 'string') {
      if (/(?:https?:)?\/\//i.test(current)) {
        throw new Error('Template project contains an external asset URL');
      }
    } else if (Array.isArray(current)) {
      stack.push(...current);
    } else if (current && typeof current === 'object') {
      stack.push(...Object.values(current));
    }
  }
}
