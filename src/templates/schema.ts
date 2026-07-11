import { z } from 'zod';
import { ASPECT_RATIOS } from '@excalimate/project-schema';

export const TEMPLATE_MANIFEST_VERSION = 1 as const;
export const TEMPLATE_CATEGORIES = [
  'software',
  'infrastructure',
  'data',
  'business',
  'education',
] as const;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const localAssetPathSchema = z
  .string()
  .startsWith('/templates/v1/')
  .refine(
    (value) =>
      !value.includes('..') &&
      !value.includes('\\') &&
      !value.includes('\0') &&
      !/^https?:/i.test(value),
    'Template assets must use safe local paths',
  );

export const TemplatePosterSchema = z
  .object({
    path: localAssetPathSchema,
    mimeType: z.literal('image/svg+xml'),
    width: z.number().int().positive().max(4_096),
    height: z.number().int().positive().max(4_096),
    byteLength: z
      .number()
      .int()
      .positive()
      .max(512 * 1024),
    contentHash: hashSchema,
  })
  .strict();

export const TemplatePreviewSchema = z
  .object({
    mode: z.literal('poster'),
    posterPath: localAssetPathSchema,
    playerPackage: z
      .object({
        path: localAssetPathSchema,
        mimeType: z.literal('application/vnd.excalimate.player+json'),
        contentHash: hashSchema,
      })
      .strict()
      .nullable(),
  })
  .strict();

export const TemplateManifestEntrySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    version: semverSchema,
    minAppVersion: semverSchema,
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    category: z.enum(TEMPLATE_CATEGORIES),
    tags: z.array(z.string().min(1).max(32)).min(1).max(8),
    aspectRatio: z.enum(ASPECT_RATIOS),
    poster: TemplatePosterSchema,
    preview: TemplatePreviewSchema,
    contentHash: hashSchema,
    projectAssetPath: localAssetPathSchema,
  })
  .strict();

export const TemplateManifestSchema = z
  .object({
    schemaVersion: z.literal(TEMPLATE_MANIFEST_VERSION),
    templates: z.array(TemplateManifestEntrySchema).min(1).max(100),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = new Set<string>();
    for (const [index, template] of manifest.templates.entries()) {
      if (ids.has(template.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['templates', index, 'id'],
          message: `Duplicate template id "${template.id}"`,
        });
      }
      ids.add(template.id);
    }
  });

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export type TemplateManifestEntry = z.infer<typeof TemplateManifestEntrySchema>;
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;
