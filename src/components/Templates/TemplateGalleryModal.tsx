import {
  Alert,
  AspectRatio,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconAlertCircle, IconSearch, IconTemplate } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProjectDocumentIntoStores } from '../../services/ProjectDocumentService';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import { useUIStore } from '../../stores/uiStore';
import { filterTemplates, loadTemplateDocument, templateManifest } from '../../templates/registry';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '../../templates/schema';

interface TemplateGalleryModalProps {
  opened: boolean;
  onClose: () => void;
  onTemplateUsed: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  ...TEMPLATE_CATEGORIES.map((category) => ({
    value: category,
    label: category[0]!.toUpperCase() + category.slice(1),
  })),
];

export function TemplateGalleryModal({
  opened,
  onClose,
  onTemplateUsed,
}: TemplateGalleryModalProps) {
  const mobile = useMediaQuery('(max-width: 47.99em)', false);
  const reducedMotion = useReducedMotion();
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState(templateManifest.templates[0]?.id ?? '');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(
    () => filterTemplates(query, category === 'all' ? null : category),
    [category, query],
  );
  const selected = filtered.find((template) => template.id === selectedId) ?? filtered[0];

  useEffect(() => {
    if (!opened) return;
    trackCreatorEvent('creator_template_gallery', { action: 'open' });
  }, [opened]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const moveFocus = (index: number, direction: -1 | 1) => {
    if (filtered.length === 0) return;
    const nextIndex = (index + direction + filtered.length) % filtered.length;
    setSelectedId(filtered[nextIndex]!.id);
    cardRefs.current[nextIndex]?.focus();
  };

  const handleUseTemplate = async () => {
    if (!selected) return;
    try {
      setError(null);
      setLoadingId(selected.id);
      const document = await loadTemplateDocument(selected);
      loadProjectDocumentIntoStores(document, { activateAnimationMode: false });
      useUIStore.getState().setStartSurfaceDismissed(true);
      trackCreatorEvent('creator_template_used', {
        category: selected.category,
        aspect_ratio: selected.aspectRatio,
      });
      onTemplateUsed();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The local template could not be loaded.',
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Start from a template"
      size="xl"
      fullScreen={mobile}
      centered={!mobile}
      closeButtonProps={{ 'aria-label': 'Close template gallery' }}
    >
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          Curated local projects load as editable copies. Template content never leaves this device.
        </Text>
        <Group align="flex-end" grow wrap="wrap">
          <TextInput
            label="Search templates"
            placeholder="Search title, description, or tag"
            leftSection={<IconSearch size={17} aria-hidden="true" />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onBlur={() => {
              if (query.trim()) {
                trackCreatorEvent('creator_template_gallery', {
                  action: 'search',
                });
              }
            }}
          />
          <Select
            label="Category"
            data={CATEGORY_OPTIONS}
            value={category}
            allowDeselect={false}
            onChange={(value) => {
              const next = (value ?? 'all') as TemplateCategory | 'all';
              setCategory(next);
              trackCreatorEvent('creator_template_gallery', {
                action: 'category',
                category: next,
              });
            }}
          />
        </Group>

        {error && (
          <Alert
            color="red"
            title="Template could not be opened"
            icon={<IconAlertCircle size={18} aria-hidden="true" />}
            aria-live="assertive"
          >
            {error}
          </Alert>
        )}

        <Text size="sm" c="dimmed" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'template' : 'templates'}
        </Text>

        <ScrollArea h={mobile ? 'calc(100vh - 330px)' : 430} type="auto">
          {filtered.length === 0 ? (
            <Paper withBorder radius="md" p="xl">
              <Stack align="center" gap="xs">
                <IconTemplate size={30} color="var(--mantine-color-dimmed)" aria-hidden="true" />
                <Title order={3} size="h4">
                  No matching templates
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  Clear the search or choose another category.
                </Text>
              </Stack>
            </Paper>
          ) : (
            <Box role="listbox" aria-label="Curated templates">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {filtered.map((template, index) => {
                  const active = template.id === selected?.id;
                  return (
                    <UnstyledButton
                      key={template.id}
                      ref={(node) => {
                        cardRefs.current[index] = node;
                      }}
                      role="option"
                      aria-selected={active}
                      aria-label={`${template.title}. ${template.description}`}
                      onFocus={() => setSelectedId(template.id)}
                      onClick={() => setSelectedId(template.id)}
                      onDoubleClick={() => void handleUseTemplate()}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                          event.preventDefault();
                          moveFocus(index, 1);
                        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                          event.preventDefault();
                          moveFocus(index, -1);
                        }
                      }}
                      style={{ borderRadius: 'var(--mantine-radius-md)' }}
                    >
                      <Paper
                        withBorder
                        radius="md"
                        p="sm"
                        h="100%"
                        data-selected={active || undefined}
                        style={{
                          borderColor: active ? 'var(--mantine-primary-color-filled)' : undefined,
                          outline: active
                            ? '2px solid var(--mantine-primary-color-light)'
                            : undefined,
                        }}
                      >
                        <Stack gap="sm">
                          <AspectRatio ratio={16 / 9}>
                            <Image
                              src={template.poster.path}
                              alt={`${template.title} poster`}
                              loading="lazy"
                              fit="contain"
                              radius="sm"
                              data-reduced-motion={reducedMotion || undefined}
                            />
                          </AspectRatio>
                          <Stack gap={4}>
                            <Group justify="space-between" align="flex-start">
                              <Text fw={700}>{template.title}</Text>
                              <Badge variant="light">{template.category}</Badge>
                            </Group>
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {template.description}
                            </Text>
                            <Group gap={5}>
                              {template.tags.map((tag) => (
                                <Badge key={tag} size="xs" variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </Group>
                          </Stack>
                        </Stack>
                      </Paper>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </Box>
          )}
        </ScrollArea>

        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="sm" fw={600}>
            {selected ? `${selected.title} - ${selected.aspectRatio}` : 'Choose a template'}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              leftSection={<IconTemplate size={18} aria-hidden="true" />}
              disabled={!selected}
              loading={loadingId !== null}
              onClick={() => void handleUseTemplate()}
            >
              Use template
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
