import { useCallback, useState, useMemo, type ReactNode, createElement } from 'react';
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
  onSelectElement: (id: string) => void;
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
  onSelect,
  expandedGroups,
  toggleExpand,
}: {
  node: TreeNode;
  depth: number;
  trackCountForTarget: (id: string) => number;
  isSelected: (id: string) => boolean;
  onSelect: (id: string) => void;
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
        className={`flex items-center gap-1.5 py-1.5 cursor-pointer border-b border-border/50 transition-colors ${
          isSelected(target.id)
            ? 'bg-accent-muted text-accent'
            : 'hover:bg-surface text-text-muted'
        }`}
        style={{ paddingLeft, paddingRight: 8 }}
        onClick={() => onSelect(target.id)}
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
  onSelectElement,
}: LayersPanelProps) {
  // Track manually collapsed groups (all groups expanded by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(targets), [targets]);

  const trackCountForTarget = useCallback(
    (targetId: string) => tracks.filter((t) => t.targetId === targetId).length,
    [tracks],
  );

  const isSelected = useCallback(
    (id: string) => selectedElementIds.includes(id),
    [selectedElementIds],
  );

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
            onSelect={onSelectElement}
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
