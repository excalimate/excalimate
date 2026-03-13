import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AnimationProject } from '../core/models/Project';
import { createProject } from '../core/models/Project';
import type { ExcalidrawSceneData, AnimatableTarget } from '../types/excalidraw';

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:2';

export interface CameraFrame {
  aspectRatio: AspectRatio;
  /** Width in scene coordinate units. Height derived from aspect ratio. */
  width: number;
  /** Center X in scene coordinates */
  x: number;
  /** Center Y in scene coordinates */
  y: number;
}

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:2': 3 / 2,
};

/** Final export resolutions (width in pixels). Height derived from aspect ratio. */
export const EXPORT_WIDTHS: Record<AspectRatio, number> = {
  '16:9': 1920,
  '4:3': 1440,
  '1:1': 1080,
  '3:2': 1620,
};

export const CAMERA_FRAME_TARGET_ID = '__camera_frame__';

export function getFrameHeight(frame: CameraFrame): number {
  return frame.width / ASPECT_RATIOS[frame.aspectRatio];
}

export function getExportResolution(ratio: AspectRatio): { width: number; height: number } {
  const w = EXPORT_WIDTHS[ratio];
  return { width: w, height: Math.round(w / ASPECT_RATIOS[ratio]) };
}

interface ProjectState {
  // State
  project: AnimationProject | null;
  targets: AnimatableTarget[];
  isDirty: boolean;
  cameraFrame: CameraFrame;

  // Actions
  createNewProject: (name: string, scene: ExcalidrawSceneData) => void;
  loadProject: (project: AnimationProject) => void;
  updateScene: (scene: ExcalidrawSceneData) => void;
  updateProjectName: (name: string) => void;
  setTargets: (targets: AnimatableTarget[]) => void;
  markClean: () => void;
  groupElements: (selectedIds: string[]) => void;
  ungroupTarget: (groupId: string) => void;
  setCameraAspectRatio: (ratio: AspectRatio) => void;
  setCameraFrame: (frame: Partial<CameraFrame>) => void;
  fitFrameToScene: () => void;

  // Selectors
  getTarget: (id: string) => AnimatableTarget | undefined;
  getElementTargets: () => AnimatableTarget[];
  getGroupTargets: () => AnimatableTarget[];
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: null,
  targets: [],
  isDirty: false,
  cameraFrame: { aspectRatio: '16:9', width: 1280, x: 640, y: 360 },

  createNewProject: (name: string, scene: ExcalidrawSceneData): void => {
    set({ project: createProject(name, scene), isDirty: false });
  },

  loadProject: (project: AnimationProject): void => {
    set({ project, isDirty: false });
  },

  updateScene: (scene: ExcalidrawSceneData): void => {
    const { project } = get();
    if (!project) return;
    set({
      project: { ...project, scene, updatedAt: new Date().toISOString() },
      isDirty: true,
    });
  },

  updateProjectName: (name: string): void => {
    const { project } = get();
    if (!project) return;
    set({
      project: { ...project, name, updatedAt: new Date().toISOString() },
      isDirty: true,
    });
  },

  setTargets: (targets: AnimatableTarget[]): void => {
    set({ targets });
    // Auto-fit camera frame on first load (when frame is at default position)
    const { cameraFrame } = get();
    if (cameraFrame.x === 640 && cameraFrame.y === 360) {
      get().fitFrameToScene();
    }
  },

  markClean: (): void => {
    set({ isDirty: false });
  },

  groupElements: (selectedIds: string[]): void => {
    if (selectedIds.length < 2) return;
    const { targets } = get();
    const newGroupId = nanoid(8);

    // Gather all leaf element IDs from the selected items (elements + group members)
    const allElementIds: string[] = [];
    for (const id of selectedIds) {
      const target = targets.find((t) => t.id === id);
      if (!target) continue;
      if (target.type === 'group') {
        for (const eid of target.elementIds) {
          if (!allElementIds.includes(eid)) allElementIds.push(eid);
        }
      } else {
        if (!allElementIds.includes(id)) allElementIds.push(id);
      }
    }
    if (allElementIds.length === 0) return;

    // Determine common parent of selected items (they should share a parentGroupId)
    const selectedTargets = selectedIds.map((id) => targets.find((t) => t.id === id)).filter(Boolean) as AnimatableTarget[];
    const parentIds = new Set(selectedTargets.map((t) => t.parentGroupId));
    const commonParent = parentIds.size === 1 ? selectedTargets[0].parentGroupId : undefined;

    // Compute bounding box
    const memberTargets = allElementIds
      .map((id) => targets.find((t) => t.id === id && t.type === 'element'))
      .filter(Boolean) as AnimatableTarget[];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of memberTargets) {
      minX = Math.min(minX, t.originalBounds.x);
      minY = Math.min(minY, t.originalBounds.y);
      maxX = Math.max(maxX, t.originalBounds.x + t.originalBounds.width);
      maxY = Math.max(maxY, t.originalBounds.y + t.originalBounds.height);
    }

    // Create new group target
    const groupCount = targets.filter((t) => t.type === 'group').length;
    const newGroup: AnimatableTarget = {
      id: newGroupId,
      type: 'group',
      label: `Group ${groupCount + 1}`,
      elementIds: allElementIds,
      originalBounds: {
        x: minX, y: minY,
        width: maxX - minX, height: maxY - minY,
        centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
      },
      originalAngle: 0,
      zIndex: -1,
      parentGroupId: commonParent,
    };

    // Update parentGroupId: selected items become children of new group
    const updatedTargets = targets.map((t) => {
      if (selectedIds.includes(t.id)) {
        return { ...t, parentGroupId: newGroupId };
      }
      return t;
    });

    // Also update the parent group's elementIds if it exists
    const finalTargets = updatedTargets.map((t) => {
      if (t.type === 'group' && t.id === commonParent) {
        // Add the new group's elements to parent's elementIds (they should already be there)
        return t;
      }
      return t;
    });

    set({ targets: [...finalTargets, newGroup], isDirty: true });
  },

  ungroupTarget: (groupId: string): void => {
    const { targets } = get();
    const group = targets.find((t) => t.id === groupId && t.type === 'group');
    if (!group) return;

    const parentId = group.parentGroupId;

    // Move direct children of this group up to the parent level
    const updatedTargets = targets
      .filter((t) => t.id !== groupId) // remove the group
      .map((t) => {
        if (t.parentGroupId === groupId) {
          return { ...t, parentGroupId: parentId };
        }
        return t;
      });

    set({ targets: updatedTargets, isDirty: true });
  },

  setCameraAspectRatio: (ratio: AspectRatio): void => {
    set((state) => ({
      cameraFrame: { ...state.cameraFrame, aspectRatio: ratio },
      isDirty: true,
    }));
  },

  setCameraFrame: (frame: Partial<CameraFrame>): void => {
    set((state) => ({
      cameraFrame: { ...state.cameraFrame, ...frame },
      isDirty: true,
    }));
  },

  fitFrameToScene: (): void => {
    const { targets, cameraFrame } = get();
    const elements = targets.filter(
      (t) => t.type === 'element' && t.id !== CAMERA_FRAME_TARGET_ID,
    );
    if (elements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of elements) {
      minX = Math.min(minX, t.originalBounds.x);
      minY = Math.min(minY, t.originalBounds.y);
      maxX = Math.max(maxX, t.originalBounds.x + t.originalBounds.width);
      maxY = Math.max(maxY, t.originalBounds.y + t.originalBounds.height);
    }

    const sceneW = maxX - minX;
    const sceneH = maxY - minY;
    const sceneCX = (minX + maxX) / 2;
    const sceneCY = (minY + maxY) / 2;

    // Fit frame to scene with padding, respecting aspect ratio
    // Frame should contain ALL content with some breathing room
    const ratio = ASPECT_RATIOS[cameraFrame.aspectRatio];
    const padding = 60;
    const fitByWidth = sceneW + padding;
    const fitByHeight = (sceneH + padding) * ratio;
    const frameW = Math.max(fitByWidth, fitByHeight);

    set({
      cameraFrame: { ...cameraFrame, width: frameW, x: sceneCX, y: sceneCY },
    });
  },

  getTarget: (id: string): AnimatableTarget | undefined => {
    return get().targets.find((t) => t.id === id);
  },

  getElementTargets: (): AnimatableTarget[] => {
    return get().targets.filter((t) => t.type === 'element');
  },

  getGroupTargets: (): AnimatableTarget[] => {
    return get().targets.filter((t) => t.type === 'group');
  },
}));
