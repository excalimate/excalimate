/**
 * Seeded PRNG (mulberry32) — deterministic random numbers for reproducible fixtures.
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#6741d9', '#0c8599', '#e8590c'];
const BG_COLORS = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#d0bfff', '#99e9f2', '#ffd8a8'];
const EASINGS = ['easeOut', 'easeInOutCubic', 'easeOutBack', 'easeInOut', 'easeOutCubic'] as const;
const PROPERTIES = ['opacity', 'translateX', 'translateY', 'drawProgress', 'scaleX'] as const;

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export interface FixtureElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  [key: string]: unknown;
}

export interface FixtureKeyframe {
  targetId: string;
  property: string;
  time: number;
  value: number;
  easing?: string;
}

export interface FixtureScene {
  elements: FixtureElement[];
  keyframes: FixtureKeyframe[];
  sequences: { elementIds: string[]; property: string; startTime: number; delay: number; duration: number }[];
  clipEnd: number;
  cameraFrame: { x: number; y: number; width: number; aspectRatio: '16:9' };
}

function generateElements(count: number, rand: () => number): FixtureElement[] {
  const elements: FixtureElement[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  const spacing = 250;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 100 + col * spacing;
    const y = 100 + row * spacing;
    const r = rand();

    let el: FixtureElement;
    if (r < 0.35) {
      // Rectangle
      el = {
        id: `el-${i}`,
        type: 'rectangle',
        x, y,
        width: 120 + Math.floor(rand() * 80),
        height: 60 + Math.floor(rand() * 40),
        strokeColor: pick(STROKE_COLORS, rand),
        backgroundColor: pick(BG_COLORS, rand),
        fillStyle: 'solid',
        strokeWidth: 2,
      };
    } else if (r < 0.50) {
      // Ellipse
      el = {
        id: `el-${i}`,
        type: 'ellipse',
        x, y,
        width: 100 + Math.floor(rand() * 60),
        height: 100 + Math.floor(rand() * 60),
        strokeColor: pick(STROKE_COLORS, rand),
        backgroundColor: pick(BG_COLORS, rand),
        fillStyle: 'solid',
        strokeWidth: 2,
      };
    } else if (r < 0.60) {
      // Diamond
      el = {
        id: `el-${i}`,
        type: 'diamond',
        x, y,
        width: 100 + Math.floor(rand() * 40),
        height: 100 + Math.floor(rand() * 40),
        strokeColor: pick(STROKE_COLORS, rand),
        backgroundColor: pick(BG_COLORS, rand),
        fillStyle: 'solid',
        strokeWidth: 2,
      };
    } else if (r < 0.80) {
      // Arrow
      const dx = 150 + Math.floor(rand() * 100);
      el = {
        id: `el-${i}`,
        type: 'arrow',
        x, y: y + 30,
        width: dx,
        height: 0,
        strokeColor: pick(STROKE_COLORS, rand),
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        points: [[0, 0], [dx, 0]],
        endArrowhead: 'arrow',
      };
    } else {
      // Text
      const texts = ['Server', 'Client', 'Database', 'API', 'Cache', 'Queue', 'Auth', 'Gateway'];
      el = {
        id: `el-${i}`,
        type: 'text',
        x, y,
        width: 100,
        height: 30,
        strokeColor: pick(STROKE_COLORS, rand),
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        text: pick(texts, rand),
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'center',
      };
    }

    elements.push(el);
  }

  return elements;
}

function generateKeyframes(elements: FixtureElement[], count: number, rand: () => number): FixtureKeyframe[] {
  const keyframes: FixtureKeyframe[] = [];
  const targetIds = elements.map(el => el.id);

  for (let i = 0; i < count; i++) {
    const targetId = targetIds[i % targetIds.length];
    const el = elements[i % elements.length];
    const prop = pick(PROPERTIES, rand);
    const stagger = Math.floor(i / targetIds.length) * 500;
    const baseTime = (i % targetIds.length) * 300 + stagger;

    // Property-appropriate values
    if (prop === 'opacity') {
      keyframes.push({ targetId, property: 'opacity', time: baseTime, value: 0 });
      keyframes.push({ targetId, property: 'opacity', time: baseTime + 500, value: 1, easing: pick(EASINGS, rand) });
    } else if (prop === 'translateX' || prop === 'translateY') {
      const offset = -200 + Math.floor(rand() * 400);
      keyframes.push({ targetId, property: prop, time: baseTime, value: offset });
      keyframes.push({ targetId, property: prop, time: baseTime + 800, value: 0, easing: pick(EASINGS, rand) });
    } else if (prop === 'drawProgress' && (el.type === 'arrow' || el.type === 'line')) {
      keyframes.push({ targetId, property: 'drawProgress', time: baseTime, value: 0 });
      keyframes.push({ targetId, property: 'drawProgress', time: baseTime + 1000, value: 1, easing: 'easeInOut' });
    } else if (prop === 'scaleX') {
      keyframes.push({ targetId, property: 'scaleX', time: baseTime, value: 0.3 });
      keyframes.push({ targetId, property: 'scaleX', time: baseTime + 600, value: 1, easing: 'easeOutBack' });
      keyframes.push({ targetId, property: 'scaleY', time: baseTime, value: 0.3 });
      keyframes.push({ targetId, property: 'scaleY', time: baseTime + 600, value: 1, easing: 'easeOutBack' });
    } else {
      // Fallback to opacity
      keyframes.push({ targetId, property: 'opacity', time: baseTime, value: 0 });
      keyframes.push({ targetId, property: 'opacity', time: baseTime + 500, value: 1, easing: pick(EASINGS, rand) });
    }
  }

  return keyframes;
}

export function generateScene(elementCount: number, keyframeCount: number, seed: number): FixtureScene {
  const rand = mulberry32(seed);
  const elements = generateElements(elementCount, rand);
  const keyframes = generateKeyframes(elements, keyframeCount, rand);

  // Compute scene bounds for camera
  let maxX = 0, maxY = 0;
  for (const el of elements) {
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  const maxTime = keyframes.reduce((m, kf) => Math.max(m, kf.time), 0);

  return {
    elements,
    keyframes,
    sequences: [],
    clipEnd: maxTime + 500,
    cameraFrame: {
      x: Math.round(maxX / 2),
      y: Math.round(maxY / 2),
      width: Math.round(maxX + 200),
      aspectRatio: '16:9',
    },
  };
}
