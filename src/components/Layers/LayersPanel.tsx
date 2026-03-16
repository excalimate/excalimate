import { useCallback, useState, useMemo, useRef, type ReactNode, createElement } from 'react';
import {
  IconRectangle, IconOval, IconSquareRotated, IconLine, IconArrowRight,
  IconTypography, IconBrush, IconPhoto, IconMovie, IconBoxMultiple, IconShape,
  IconChevronDown, IconChevronRight, IconKeyframeFilled,
  IconLayoutSidebarLeftCollapse,
} from '@tabler/icons-react';
import { ActionIcon, Tooltip } from '@mantine/core';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { AnimationTrack } from '../../types/animation';
import { useUIStore } from '../../stores/uiStore';

interface LayersPanelProps {
  targets: AnimatableTarget[];
  tracks: AnimationTrack[];
  selectedElementIds: string[];
  onSelectElements: (ids: string[]) => void;
}

const ic = (Comp: typeof IconRectangle) => createElement(Comp, { size: 12 });

const TYPE_ICONS: Record<string, ReactNode> = {
  rectangle: ic(IconRectangle),
  ellipse: ic(IconOval),
  diamond: ic(IconSquareRotated),
  line: ic(IconLine),
  arrow: ic(IconArrowRight),
  text: ic(IconTypography),
  freedraw: ic(IconBrush),
  image: ic(IconPhoto),
  frame: ic(IconMovie),
  group: ic(IconBoxMultiple),
  element: ic(IconShape),
};

function getIcon(target: AnimatableTarget): ReactNode {
  if (target.type === 'group') return TYPE_ICONS.group;
  // Use the actual Excalidraw element type for icon lookup
  if (target.elementType && TYPE_ICONS[target.elementType]) {
    return TYPE_ICONS[target.elementType];
  }
  return TYPE_ICONS.element;
}

/**
 * Build a tree of targets for hierarchical display.
 * Uses parentGroupId to determine parent-child relationships.
 */
interface TreeNode {
  target: AnimatableTarget;
  children: TreeNode[]; // child groups + direct element children
}

function buildTree(targets: AnimatableTarget[]): TreeNode[] {
  const targetMap = new Map<string, AnimatableTarget>();
  for (const t of targets) targetMap.set(t.id, t);

  // Collect direct children for each parent (group or root)
  const childrenOf = new Map<string | undefined, AnimatableTarget[]>();
  for (const t of targets) {
    const parentId = t.parentGroupId;
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(t);
  }

  function buildNodes(parentId: string | undefined): TreeNode[] {
    const children = childrenOf.get(parentId) ?? [];
    // Camera frame first at root level
    if (parentId === undefined) {
      children.sort((a, b) => {
        const aIsCam = a.id === '__camera_frame__' ? 0 : 1;
        const bIsCam = b.id === '__camera_frame__' ? 0 : 1;
        return aIsCam - bIsCam;
      });
    }
    return children.map((target) => ({
      target,
      children: target.type === 'group' ? buildNodes(target.id) : [],
    }));
  }

  return buildNodes(undefined);
}

function LayerNode({
  node,
  depth,
  trackCountForTarget,
  isSelected,
  isDirectlySelected,
  onSelect,
  expandedGroups,
  toggleExpand,
}: {
  node: TreeNode;
  depth: number;
  trackCountForTarget: (id: string) => number;
  isSelected: (id: string) => boolean;
  isDirectlySelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  expandedGroups: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const { target, children } = node;
  const isGroup = target.type === 'group';
  const expanded = isGroup && expandedGroups.has(target.id);
  const trackCount = trackCountForTarget(target.id);
  const paddingLeft = 8 + depth * 16;

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-1.5 cursor-pointer border-b border-border/50 transition-colors select-none ${
          isDirectlySelected(target.id)
            ? 'bg-accent-muted text-accent'
            : isSelected(target.id)
              ? 'bg-accent-muted/50 text-accent/80'
              : 'hover:bg-surface text-text-muted'
        }`}
        style={{ paddingLeft, paddingRight: 8 }}
        onClick={(e) => onSelect(target.id, e)}
      >
        {isGroup && (
          <span
            className="text-[10px] select-none opacity-60 hover:opacity-100 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); toggleExpand(target.id); }}
          >
            {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          </span>
        )}
        <span className={isGroup ? 'text-accent' : 'opacity-60'}>
          {getIcon(target)}
        </span>
        <span className="flex-1 truncate font-medium text-xs">{target.label}</span>
        {!isGroup && target.elementType && (
          <span className="text-[9px] text-text-muted opacity-60">
            {target.elementType}
          </span>
        )}
        {isGroup && (
          <span className="text-[9px] text-text-muted">
            {children.length}
          </span>
        )}
        {trackCount > 0 && (
          <span className="text-[9px] text-accent ml-1 flex items-center gap-0.5"><IconKeyframeFilled size={8} />{trackCount}</span>
        )}
      </div>
      {isGroup && expanded && children.map((child) => (
        <LayerNode
          key={child.target.id}
          node={child}
          depth={depth + 1}
          trackCountForTarget={trackCountForTarget}
          isSelected={isSelected}
          isDirectlySelected={isDirectlySelected}
          onSelect={onSelect}
          expandedGroups={expandedGroups}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

export function LayersPanel({
  targets,
  tracks,
  selectedElementIds,
  onSelectElements,
}: LayersPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Track last clicked ID for shift-range selection
  const lastClickedRef = useRef<string | null>(null);

  const tree = useMemo(() => buildTree(targets), [targets]);

  // Flat list of target IDs in display order + index lookup for shift-range selection
  const { flatIds, flatIdIndex } = useMemo(() => {
    const ids: string[] = [];
    function collect(nodes: TreeNode[]) {
      for (const node of nodes) {
        ids.push(node.target.id);
        if (node.children.length > 0) collect(node.children);
      }
    }
    collect(tree);
    const index = new Map<string, number>();
    for (let i = 0; i < ids.length; i++) index.set(ids[i], i);
    return { flatIds: ids, flatIdIndex: index };
  }, [tree]);

  // Pre-build track count map for O(1) lookup per node
  const trackCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tracks) {
      map.set(t.targetId, (map.get(t.targetId) ?? 0) + 1);
    }
    return map;
  }, [tracks]);

  const trackCountForTarget = useCallback(
    (targetId: string) => trackCountMap.get(targetId) ?? 0,
    [trackCountMap],
  );

  // Build a set of selected IDs including children of selected groups
  const selectedSet = useMemo(() => {
    const set = new Set(selectedElementIds);
    const targetById = new Map<string, AnimatableTarget>();
    for (const t of targets) targetById.set(t.id, t);
    for (const id of selectedElementIds) {
      const target = targetById.get(id);
      if (target?.type === 'group') {
        for (const eid of target.elementIds) set.add(eid);
      }
    }
    return set;
  }, [selectedElementIds, targets]);

  const directSelectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const isSelected = useCallback(
    (id: string) => selectedSet.has(id),
    [selectedSet],
  );

  const isDirectlySelected = useCallback(
    (id: string) => directSelectedSet.has(id),
    [directSelectedSet],
  );

  const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRef.current) {
      const fromIdx = flatIdIndex.get(lastClickedRef.current);
      const toIdx = flatIdIndex.get(id);
      if (fromIdx !== undefined && toIdx !== undefined) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        const rangeIds = flatIds.slice(start, end + 1);
        const merged = new Set(selectedElementIds);
        for (const rid of rangeIds) merged.add(rid);
        onSelectElements([...merged]);
      } else {
        onSelectElements([id]);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (directSelectedSet.has(id)) {
        onSelectElements(selectedElementIds.filter(sid => sid !== id));
      } else {
        onSelectElements([...selectedElementIds, id]);
      }
    } else {
      onSelectElements([id]);
    }
    lastClickedRef.current = id;
  }, [flatIds, flatIdIndex, directSelectedSet, selectedElementIds, onSelectElements]);

  const toggleExpand = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Compute expanded groups: all groups minus manually collapsed ones
  const expandedGroups = useMemo(() => {
    const groupIds = targets.filter(t => t.type === 'group').map(t => t.id);
    return new Set(groupIds.filter(id => !collapsedGroups.has(id)));
  }, [targets, collapsedGroups]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          Layers
        </span>
        <Tooltip label="Collapse layers" position="right">
          <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => useUIStore.getState().toggleLayersPanel()}>
            <IconLayoutSidebarLeftCollapse size={14} />
          </ActionIcon>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto text-xs">
        {tree.map((node) => (
          <LayerNode
            key={node.target.id}
            node={node}
            depth={0}
            trackCountForTarget={trackCountForTarget}
            isSelected={isSelected}
            isDirectlySelected={isDirectlySelected}
            onSelect={handleSelect}
            expandedGroups={expandedGroups}
            toggleExpand={toggleExpand}
          />
        ))}

        {targets.length === 0 && (
          <div className="p-4 text-center text-text-muted">
            <p className="text-xs">No elements yet.</p>
            <p className="text-[10px] mt-1 opacity-60">Draw in Edit mode or import a file.</p>
          </div>
        )}
      </div>
    </div>
  );
}
