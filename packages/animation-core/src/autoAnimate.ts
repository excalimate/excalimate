export type AutoAnimateScope = 'selection' | 'diagram';

export type AutoAnimateStrategy =
  | 'hierarchical'
  | 'radial'
  | 'timeline'
  | 'linear-left-to-right'
  | 'linear-top-to-bottom'
  | 'stable-z-order';

export type AutoAnimateConfidenceBand = 'low' | 'medium' | 'high';

export interface AutoAnimateElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isDeleted?: boolean;
  groupIds?: readonly string[];
  containerId?: string | null;
  boundElements?: readonly { id: string; type: string }[];
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
}

export interface AutoAnimateRequest {
  elements: readonly AutoAnimateElement[];
  scope: AutoAnimateScope;
  selectedElementIds?: readonly string[];
}

export interface AutoAnimateReason {
  code:
    | 'directed-graph'
    | 'network-center'
    | 'horizontal-flow'
    | 'vertical-flow'
    | 'sparse-layout'
    | 'selection-scope'
    | 'cycle-fallback'
    | 'stable-fallback';
  message: string;
}

export interface SemanticTarget {
  id: string;
  type: 'node' | 'connector';
  elementIds: readonly string[];
  centerX: number;
  centerY: number;
  zIndex: number;
  sourceId?: string;
  destinationId?: string;
}

export interface AutoAnimateRecipe {
  targetIds: readonly string[];
  preset: 'fade' | 'draw' | 'pop';
  startMs: number;
  durationMs: number;
  staggerMs: number;
}

export interface AutoAnimateAnalysis {
  scope: AutoAnimateScope;
  strategy: AutoAnimateStrategy;
  confidence: number;
  confidenceBand: AutoAnimateConfidenceBand;
  ambiguous: boolean;
  reasons: readonly AutoAnimateReason[];
  semanticTargets: readonly SemanticTarget[];
  orderedTargetIds: readonly string[];
  recipes: readonly AutoAnimateRecipe[];
}

interface MutableSemanticTarget {
  id: string;
  type: 'node' | 'connector';
  elementIds: string[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  zIndex: number;
  sourceId?: string;
  destinationId?: string;
}

interface GraphData {
  nodes: SemanticTarget[];
  connectors: SemanticTarget[];
  outgoing: Map<string, SemanticTarget[]>;
  incomingCount: Map<string, number>;
  edgeCount: number;
  hasCycle: boolean;
}

interface ScoredStrategy {
  strategy: AutoAnimateStrategy;
  score: number;
}

const STRATEGY_ORDER: readonly AutoAnimateStrategy[] = [
  'hierarchical',
  'radial',
  'timeline',
  'linear-left-to-right',
  'linear-top-to-bottom',
  'stable-z-order',
];

function compareStable(left: SemanticTarget, right: SemanticTarget): number {
  return left.zIndex - right.zIndex || left.id.localeCompare(right.id);
}

function confidenceBand(confidence: number): AutoAnimateConfidenceBand {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function isConnector(type: string): boolean {
  return type === 'arrow' || type === 'line';
}

function addElementBounds(
  target: MutableSemanticTarget,
  element: AutoAnimateElement,
): void {
  target.minX = Math.min(target.minX, element.x, element.x + element.width);
  target.minY = Math.min(target.minY, element.y, element.y + element.height);
  target.maxX = Math.max(target.maxX, element.x, element.x + element.width);
  target.maxY = Math.max(target.maxY, element.y, element.y + element.height);
  target.zIndex = Math.min(target.zIndex, element.zIndex);
  if (!target.elementIds.includes(element.id)) target.elementIds.push(element.id);
}

export function normalizeSemanticTargets(
  elements: readonly AutoAnimateElement[],
): SemanticTarget[] {
  const active = elements
    .filter((element) => !element.isDeleted)
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id));
  const byId = new Map(active.map((element) => [element.id, element]));
  const elementToTarget = new Map<string, string>();
  const targets = new Map<string, MutableSemanticTarget>();

  for (const element of active) {
    if (element.containerId && byId.has(element.containerId)) continue;
    const targetId = element.groupIds?.[0] ?? element.id;
    const targetType = isConnector(element.type) ? 'connector' : 'node';
    const existing = targets.get(targetId);
    const target =
      existing ??
      {
        id: targetId,
        type: targetType,
        elementIds: [],
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        zIndex: Number.POSITIVE_INFINITY,
      };
    if (existing && existing.type !== targetType) target.type = 'node';
    addElementBounds(target, element);
    targets.set(targetId, target);
    elementToTarget.set(element.id, targetId);
  }

  for (const element of active) {
    if (!element.containerId) continue;
    const containerTargetId = elementToTarget.get(element.containerId);
    const target = containerTargetId ? targets.get(containerTargetId) : undefined;
    if (!target) continue;
    addElementBounds(target, element);
    elementToTarget.set(element.id, target.id);
  }

  for (const element of active) {
    const target = targets.get(elementToTarget.get(element.id) ?? '');
    if (!target || target.type !== 'connector') continue;
    const sourceId = element.startBinding?.elementId;
    const destinationId = element.endBinding?.elementId;
    const semanticSource = sourceId ? elementToTarget.get(sourceId) : undefined;
    const semanticDestination = destinationId
      ? elementToTarget.get(destinationId)
      : undefined;
    if (semanticSource && semanticSource !== target.id) {
      target.sourceId = semanticSource;
    }
    if (semanticDestination && semanticDestination !== target.id) {
      target.destinationId = semanticDestination;
    }
  }

  return [...targets.values()]
    .map((target) => ({
      id: target.id,
      type: target.type,
      elementIds: [...target.elementIds].sort(),
      centerX: (target.minX + target.maxX) / 2,
      centerY: (target.minY + target.maxY) / 2,
      zIndex: target.zIndex,
      ...(target.sourceId ? { sourceId: target.sourceId } : {}),
      ...(target.destinationId ? { destinationId: target.destinationId } : {}),
    }))
    .sort(compareStable);
}

function buildGraph(targets: readonly SemanticTarget[]): GraphData {
  const nodes = targets.filter((target) => target.type === 'node');
  const nodeIds = new Set(nodes.map((node) => node.id));
  const connectors = targets.filter((target) => target.type === 'connector');
  const outgoing = new Map<string, SemanticTarget[]>();
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  let edgeCount = 0;

  for (const connector of connectors) {
    if (
      !connector.sourceId ||
      !connector.destinationId ||
      !nodeIds.has(connector.sourceId) ||
      !nodeIds.has(connector.destinationId)
    ) {
      continue;
    }
    edgeCount += 1;
    const sourceConnectors = outgoing.get(connector.sourceId) ?? [];
    sourceConnectors.push(connector);
    sourceConnectors.sort(compareStable);
    outgoing.set(connector.sourceId, sourceConnectors);
    incomingCount.set(
      connector.destinationId,
      (incomingCount.get(connector.destinationId) ?? 0) + 1,
    );
  }

  const remainingIncoming = new Map(incomingCount);
  const ready = nodes
    .filter((node) => (remainingIncoming.get(node.id) ?? 0) === 0)
    .sort(compareStable);
  let visited = 0;
  while (ready.length > 0) {
    const node = ready.shift()!;
    visited += 1;
    for (const connector of outgoing.get(node.id) ?? []) {
      const destinationId = connector.destinationId!;
      const nextCount = (remainingIncoming.get(destinationId) ?? 0) - 1;
      remainingIncoming.set(destinationId, nextCount);
      if (nextCount === 0) {
        const destination = nodes.find((candidate) => candidate.id === destinationId);
        if (destination) {
          ready.push(destination);
          ready.sort(compareStable);
        }
      }
    }
  }

  return {
    nodes,
    connectors,
    outgoing,
    incomingCount,
    edgeCount,
    hasCycle: visited !== nodes.length && edgeCount > 0,
  };
}

function spread(
  nodes: readonly SemanticTarget[],
  coordinate: 'centerX' | 'centerY',
): number {
  if (nodes.length < 2) return 0;
  const values = nodes.map((node) => node[coordinate]);
  return Math.max(...values) - Math.min(...values);
}

function scoreStrategies(graph: GraphData): ScoredStrategy[] {
  const { nodes, edgeCount, hasCycle, outgoing, incomingCount } = graph;
  const xSpread = spread(nodes, 'centerX');
  const ySpread = spread(nodes, 'centerY');
  const totalSpread = Math.max(1, xSpread + ySpread);
  const xShare = xSpread / totalSpread;
  const yShare = ySpread / totalSpread;
  const edgeDensity =
    nodes.length > 1 ? edgeCount / Math.max(1, nodes.length - 1) : 0;
  const degrees = nodes.map(
    (node) =>
      (outgoing.get(node.id)?.length ?? 0) + (incomingCount.get(node.id) ?? 0),
  );
  const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
  const centralization =
    edgeCount > 0 ? maxDegree / Math.max(1, edgeCount * 2) : 0;
  const scores: ScoredStrategy[] = [];

  if (edgeCount > 0 && !hasCycle) {
    scores.push({
      strategy: 'hierarchical',
      score: Math.min(0.95, 0.72 + Math.min(0.23, edgeDensity * 0.2)),
    });
  }
  if (nodes.length >= 4 && edgeCount >= nodes.length - 1 && centralization >= 0.3) {
    scores.push({
      strategy: 'radial',
      score: Math.min(0.9, 0.61 + centralization * 0.32),
    });
  }
  if (nodes.length >= 3 && xShare >= 0.72 && edgeDensity <= 1.1) {
    scores.push({
      strategy: 'timeline',
      score: Math.min(0.88, 0.61 + xShare * 0.25),
    });
  }
  if (nodes.length >= 2 && xShare >= 0.55) {
    scores.push({
      strategy: 'linear-left-to-right',
      score: Math.min(0.79, 0.48 + xShare * 0.31),
    });
  }
  if (nodes.length >= 2 && yShare >= 0.55) {
    scores.push({
      strategy: 'linear-top-to-bottom',
      score: Math.min(0.79, 0.48 + yShare * 0.31),
    });
  }
  scores.push({
    strategy: 'stable-z-order',
    score: nodes.length <= 1 ? 0.34 : hasCycle ? 0.48 : 0.43,
  });

  return scores.sort(
    (left, right) =>
      right.score - left.score ||
      STRATEGY_ORDER.indexOf(left.strategy) -
        STRATEGY_ORDER.indexOf(right.strategy),
  );
}

function topologicalOrder(graph: GraphData): SemanticTarget[] {
  const remainingIncoming = new Map(graph.incomingCount);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const ready = graph.nodes
    .filter((node) => (remainingIncoming.get(node.id) ?? 0) === 0)
    .sort(
      (left, right) =>
        left.centerY - right.centerY ||
        left.centerX - right.centerX ||
        compareStable(left, right),
    );
  const ordered: SemanticTarget[] = [];
  while (ready.length > 0) {
    const node = ready.shift()!;
    ordered.push(node);
    for (const connector of graph.outgoing.get(node.id) ?? []) {
      const destinationId = connector.destinationId!;
      const nextCount = (remainingIncoming.get(destinationId) ?? 0) - 1;
      remainingIncoming.set(destinationId, nextCount);
      if (nextCount === 0) {
        const destination = byId.get(destinationId);
        if (destination) {
          ready.push(destination);
          ready.sort(
            (left, right) =>
              left.centerY - right.centerY ||
              left.centerX - right.centerX ||
              compareStable(left, right),
          );
        }
      }
    }
  }
  return ordered.length === graph.nodes.length
    ? ordered
    : graph.nodes.slice().sort(compareStable);
}

function radialOrder(graph: GraphData): SemanticTarget[] {
  const degree = (node: SemanticTarget) =>
    (graph.outgoing.get(node.id)?.length ?? 0) +
    (graph.incomingCount.get(node.id) ?? 0);
  const center =
    graph.nodes
      .slice()
      .sort(
        (left, right) =>
          degree(right) - degree(left) || compareStable(left, right),
      )[0] ?? null;
  if (!center) return [];
  return graph.nodes.slice().sort((left, right) => {
    if (left.id === center.id) return -1;
    if (right.id === center.id) return 1;
    const leftDistance = Math.hypot(
      left.centerX - center.centerX,
      left.centerY - center.centerY,
    );
    const rightDistance = Math.hypot(
      right.centerX - center.centerX,
      right.centerY - center.centerY,
    );
    const leftAngle = Math.atan2(
      left.centerY - center.centerY,
      left.centerX - center.centerX,
    );
    const rightAngle = Math.atan2(
      right.centerY - center.centerY,
      right.centerX - center.centerX,
    );
    return (
      leftDistance - rightDistance ||
      leftAngle - rightAngle ||
      compareStable(left, right)
    );
  });
}

function orderNodes(
  strategy: AutoAnimateStrategy,
  graph: GraphData,
): SemanticTarget[] {
  if (strategy === 'hierarchical') return topologicalOrder(graph);
  if (strategy === 'radial') return radialOrder(graph);
  if (
    strategy === 'timeline' ||
    strategy === 'linear-left-to-right'
  ) {
    return graph.nodes
      .slice()
      .sort(
        (left, right) =>
          left.centerX - right.centerX ||
          left.centerY - right.centerY ||
          compareStable(left, right),
      );
  }
  if (strategy === 'linear-top-to-bottom') {
    return graph.nodes
      .slice()
      .sort(
        (left, right) =>
          left.centerY - right.centerY ||
          left.centerX - right.centerX ||
          compareStable(left, right),
      );
  }
  return graph.nodes.slice().sort(compareStable);
}

function reasonsFor(
  strategy: AutoAnimateStrategy,
  scope: AutoAnimateScope,
  hasCycle: boolean,
): AutoAnimateReason[] {
  const reasons: AutoAnimateReason[] = [];
  if (scope === 'selection') {
    reasons.push({
      code: 'selection-scope',
      message: 'Only the selected semantic groups were analyzed.',
    });
  }
  if (hasCycle && strategy !== 'radial') {
    reasons.push({
      code: 'cycle-fallback',
      message: 'The connector graph contains a cycle, so a stable spatial order is used.',
    });
  }
  if (strategy === 'hierarchical') {
    reasons.push({
      code: 'directed-graph',
      message: 'Connector direction forms an acyclic hierarchy.',
    });
  } else if (strategy === 'radial') {
    reasons.push({
      code: 'network-center',
      message: 'A well-connected center supports a center-out reveal.',
    });
  } else if (
    strategy === 'timeline' ||
    strategy === 'linear-left-to-right'
  ) {
    reasons.push({
      code: 'horizontal-flow',
      message: 'The layout has a stable left-to-right reading order.',
    });
  } else if (strategy === 'linear-top-to-bottom') {
    reasons.push({
      code: 'vertical-flow',
      message: 'The layout has a stable top-to-bottom reading order.',
    });
  } else {
    reasons.push({
      code: 'stable-fallback',
      message: 'No strong structure was detected, so canvas stacking order is used.',
    });
  }
  return reasons;
}

function createRecipes(
  strategy: AutoAnimateStrategy,
  orderedNodes: readonly SemanticTarget[],
  graph: GraphData,
): AutoAnimateRecipe[] {
  const recipes: AutoAnimateRecipe[] = [];
  const emittedConnectors = new Set<string>();
  let startMs = 0;
  for (const node of orderedNodes) {
    const nodeTargetIds = node.elementIds.includes(node.id)
      ? node.elementIds
      : [node.id];
    recipes.push({
      targetIds: nodeTargetIds,
      preset: strategy === 'radial' ? 'pop' : 'fade',
      startMs,
      durationMs: 420,
      staggerMs: 0,
    });
    startMs += 220;
    for (const connector of graph.outgoing.get(node.id) ?? []) {
      if (emittedConnectors.has(connector.id)) continue;
      emittedConnectors.add(connector.id);
      const connectorTargetIds = connector.elementIds.includes(connector.id)
        ? connector.elementIds
        : [connector.id];
      recipes.push({
        targetIds: connectorTargetIds,
        preset: 'draw',
        startMs,
        durationMs: 520,
        staggerMs: 0,
      });
      startMs += 160;
    }
  }
  for (const connector of graph.connectors.slice().sort(compareStable)) {
    if (emittedConnectors.has(connector.id)) continue;
    const connectorTargetIds = connector.elementIds.includes(connector.id)
      ? connector.elementIds
      : [connector.id];
    recipes.push({
      targetIds: connectorTargetIds,
      preset: 'draw',
      startMs,
      durationMs: 520,
      staggerMs: 0,
    });
    startMs += 160;
  }
  return recipes;
}

export function analyzeAutoAnimate(
  request: AutoAnimateRequest,
): AutoAnimateAnalysis {
  const normalized = normalizeSemanticTargets(request.elements);
  const selectedIds = new Set(request.selectedElementIds ?? []);
  const scoped =
    request.scope === 'selection'
      ? normalized.filter(
          (target) =>
            selectedIds.has(target.id) ||
            target.elementIds.some((id) => selectedIds.has(id)),
        )
      : normalized;
  const selectedSemanticIds = new Set(scoped.map((target) => target.id));
  const targets = scoped.map((target) => ({
    ...target,
    ...(target.sourceId && selectedSemanticIds.has(target.sourceId)
      ? { sourceId: target.sourceId }
      : { sourceId: undefined }),
    ...(target.destinationId && selectedSemanticIds.has(target.destinationId)
      ? { destinationId: target.destinationId }
      : { destinationId: undefined }),
  }));
  const graph = buildGraph(targets);
  const scored = scoreStrategies(graph);
  const winner = scored[0]!;
  const runnerUp = scored[1];
  const confidence = Number(winner.score.toFixed(2));
  const ambiguous =
    confidence < 0.6 ||
    (runnerUp !== undefined && winner.score - runnerUp.score < 0.06);
  const orderedNodes = orderNodes(winner.strategy, graph);
  const orderedConnectors = graph.connectors
    .slice()
    .sort(compareStable)
    .map((connector) => connector.id);

  return {
    scope: request.scope,
    strategy: winner.strategy,
    confidence,
    confidenceBand: confidenceBand(confidence),
    ambiguous,
    reasons: reasonsFor(winner.strategy, request.scope, graph.hasCycle),
    semanticTargets: targets,
    orderedTargetIds: [
      ...orderedNodes.map((node) => node.id),
      ...orderedConnectors,
    ],
    recipes: createRecipes(winner.strategy, orderedNodes, graph),
  };
}
