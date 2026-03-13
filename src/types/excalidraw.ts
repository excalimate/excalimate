import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';

export interface ExcalidrawSceneData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface AnimatableTarget {
  id: string;
  type: 'element' | 'group';
  label: string;
  elementIds: string[];
  originalBounds: Bounds;
  originalAngle: number;
  zIndex: number;
  /** For elements: their innermost group. For groups: their parent group. */
  parentGroupId?: string;
  /** The Excalidraw element type (e.g. 'arrow', 'line', 'rectangle'). Only set for type='element'. */
  elementType?: string;
  /** Raw element x/y/width/height from Excalidraw (width/height can be negative for arrows).
   *  Used by getAnimatedBounds to match applyAnimationToElements behavior. */
  rawOrigin?: {
    x: number; y: number; width: number; height: number;
    /** For linear elements: min/max point offsets relative to origin */
    pointsMinX?: number; pointsMaxX?: number;
    pointsMinY?: number; pointsMaxY?: number;
  };
}
