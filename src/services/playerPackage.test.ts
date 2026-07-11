import { describe, expect, it, vi } from 'vitest';
import { createSyntheticV2Project } from '../test-fixtures/projectDocuments';
import { generatePlayerPackage } from './playerPackage';

interface MockExportOptions {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  exportPadding?: number;
}

const exportToSvg = vi.hoisted(() =>
  vi.fn(async (_options?: MockExportOptions) =>
    new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs/><g><rect width="100" height="100"/></g></svg>',
      'image/svg+xml',
    ).documentElement,
  ),
);

vi.mock('@excalidraw/excalidraw', () => ({
  getNonDeletedElements: (elements: readonly unknown[]) => elements,
  getCommonBounds: () => [-10, -20, 90, 80],
  exportToSvg,
}));

describe('editor PlayerPackage generation', () => {
  it('lazily exports, marks, sanitizes, and bounds a static SVG scene', async () => {
    const project = createSyntheticV2Project();
    const playerPackage = await generatePlayerPackage(project, []);

    expect(playerPackage.scene.svg).toContain(
      'data-excalimate-id="synthetic-rectangle"',
    );
    expect(playerPackage.scene.svg).toContain(
      'data-excalimate-scene="true"',
    );
    expect(playerPackage.playback.camera).toMatchObject({
      sceneOffsetX: 10,
      sceneOffsetY: 20,
    });

    expect(playerPackage.animation.timeline).toEqual(project.timeline);
    expect(playerPackage.dimensions).toEqual({
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    });
    expect(exportToSvg.mock.calls[0]?.[0]).toMatchObject({
      exportPadding: 0,
      appState: {
        exportEmbedScene: false,
        frameRendering: {
          enabled: true,
          clip: false,
          name: false,
          outline: false,
        },
      },
    });
  });

  it('preserves the safe Excalidraw dark-mode filter', async () => {
    const project = createSyntheticV2Project();
    exportToSvg.mockImplementationOnce(async (options?: MockExportOptions) => {
      expect(options?.appState).toMatchObject({
        exportWithDarkMode: true,
        viewBackgroundColor: '#ffffff',
      });
      return new DOMParser().parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" filter="invert(93%) hue-rotate(180deg)"><defs/><g><rect width="100" height="100"/></g></svg>',
        'image/svg+xml',
      ).documentElement;
    });

    const playerPackage = await generatePlayerPackage(project, [], {
      theme: 'dark',
    });
    expect(playerPackage.scene.svg).toContain(
      'filter="invert(93%) hue-rotate(180deg)"',
    );
    const document = new DOMParser().parseFromString(
      playerPackage.scene.svg,
      'image/svg+xml',
    );
    expect(document.documentElement.hasAttribute('filter')).toBe(false);
    expect(
      document
        .querySelector('[data-excalimate-scene="true"]')
        ?.getAttribute('filter'),
    ).toBe('invert(93%) hue-rotate(180deg)');
  });

  it('matches bound-text and iframe export ordering without preserving links', async () => {
    interface MockElement {
      id: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      link?: string | null;
      containerId?: string | null;
      boundElements?: Array<{ id: string; type: string }> | null;
    }

    const project = createSyntheticV2Project();
    const rectangle = {
      ...project.scene.elements[0],
      link: 'https://example.com',
      boundElements: [{ id: 'bound-label', type: 'text' }],
    };
    const ellipse = {
      ...rectangle,
      id: 'ellipse',
      type: 'ellipse',
      link: null,
      boundElements: null,
    };
    const label = {
      ...rectangle,
      id: 'bound-label',
      type: 'text',
      link: null,
      containerId: rectangle.id,
      boundElements: null,
    };
    const iframe = {
      ...rectangle,
      id: 'embed',
      type: 'embeddable',
      link: null,
      boundElements: null,
    };
    project.scene.elements = [rectangle, iframe, ellipse, label];
    exportToSvg.mockImplementationOnce(
      async (options?: MockExportOptions) => {
        const elements = options?.elements as MockElement[];
        expect(elements.find((element) => element.id === rectangle.id)?.link).toBeNull();
        const fills = ['red', 'green', 'blue', 'black'];
        return new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs/>${fills.map((fill) => `<g><rect fill="${fill}" width="1" height="1"/></g>`).join('')}</svg>`,
          'image/svg+xml',
        ).documentElement;
      },
    );

    const playerPackage = await generatePlayerPackage(project, []);
    const document = new DOMParser().parseFromString(
      playerPackage.scene.svg,
      'image/svg+xml',
    );

    expect(
      document
        .querySelector(`[data-excalimate-id="${rectangle.id}"] rect`)
        ?.getAttribute('fill'),
    ).toBe('red');
    expect(
      document
        .querySelector('[data-excalimate-id="bound-label"] rect')
        ?.getAttribute('fill'),
    ).toBe('green');
    expect(
      document
        .querySelector('[data-excalimate-id="ellipse"] rect')
        ?.getAttribute('fill'),
    ).toBe('blue');
    expect(
      document
        .querySelector('[data-excalimate-id="embed"] rect')
        ?.getAttribute('fill'),
    ).toBe('black');
    expect(
      document
        .querySelector('[data-excalimate-id="bound-label"]')
        ?.getAttribute('data-excalimate-bound-to'),
    ).toBe(rectangle.id);
  });
});
