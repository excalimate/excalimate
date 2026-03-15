/* eslint-disable @typescript-eslint/no-explicit-any */

let _elementIndexCounter = 0;

export function normalizeElement(el: any): any {
  const index = el.index ?? `a${_elementIndexCounter++}`;

  return {
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    groupIds: [],
    frameId: null,
    index,
    roundness: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    isDeleted: false,
    ...(el.type === 'text' ? {
      fontSize: 20,
      fontFamily: 5,
      textAlign: 'left',
      verticalAlign: 'top',
      lineHeight: 1.25,
      baseline: 0,
      containerId: null,
      originalText: el.text ?? '',
      autoResize: true,
    } : {}),
    ...(el.type === 'arrow' || el.type === 'line' ? {
      points: el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]],
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: el.type === 'arrow' ? 'arrow' : null,
      lastCommittedPoint: null,
    } : {}),
    ...el,
    opacity: 100,
    ...(el.type === 'text' && !el.containerId ? { autoResize: true } : {}),
    seed: el.seed ?? (Math.random() * 2147483647 | 0),
    version: el.version ?? 1,
    versionNonce: el.versionNonce ?? (Math.random() * 2147483647 | 0),
  };
}

export function normalizeElements(elements: any[]): any[] {
  return elements.map(normalizeElement);
}
