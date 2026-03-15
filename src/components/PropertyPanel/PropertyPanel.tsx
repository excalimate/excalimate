import type {
  AnimationTrack,
  Keyframe,
  AnimatableProperty,
} from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { ReactNode } from 'react';
import { ActionIcon, UnstyledButton } from '@mantine/core';
import {
  IconKeyframe, IconKeyframeFilled, IconBoxMultiple, IconShape,
  IconArrowsMove, IconArrowsMaximize,
} from '@tabler/icons-react';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { PROPERTY_CONFIG } from './propertyConfig';
import { toDisplay, toInternal } from './propertyValueAdapters';
import { usePropertyKeyframes } from './usePropertyKeyframes';
import { SelectedKeyframeEditor } from './SelectedKeyframeEditor';

export interface PropertyPanelProps {
  selectedTargets: AnimatableTarget[];
  allTargets: AnimatableTarget[];
  tracks: AnimationTrack[];
  currentTime: number;
  selectedKeyframes: { track: AnimationTrack; keyframe: Keyframe }[];
  onAddTrack: (targetId: string, targetType: 'element' | 'group', property: AnimatableProperty) => void;
  onAddOrUpdateKeyframe: (trackId: string, time: number, value: number) => void;
  onUpdateKeyframe: (trackId: string, keyframeId: string, updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>) => void;
  onDeleteKeyframe: (trackId: string, keyframeId: string) => void;
  onSelectTarget: (targetId: string) => void;
}

function TargetInfo({ target }: { target: AnimatableTarget }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-accent text-xs">{target.type === 'group' ? <IconBoxMultiple size={14} /> : <IconShape size={14} />}</span>
      <span className="text-xs font-medium truncate flex-1">{target.label}</span>
      <span className="text-[10px] text-text-muted">
        {target.type === 'group'
          ? `${target.elementIds.length} els`
          : `${Math.round(target.originalBounds.width)}×${Math.round(target.originalBounds.height)}`}
      </span>
    </div>
  );
}

export function PropertyPanel({
  selectedTargets,
  allTargets,
  tracks,
  currentTime,
  selectedKeyframes,
  onAddTrack,
  onAddOrUpdateKeyframe,
  onUpdateKeyframe,
  onDeleteKeyframe,
  onSelectTarget,
}: PropertyPanelProps) {
  const isMulti = selectedTargets.length > 1;
  const isCamera = selectedTargets.some(t => t.id === CAMERA_FRAME_TARGET_ID);

  const {
    allVisibleKeyframes,
    ensureAndSet,
    getValue,
    hasKeyframeAt,
    toggleKeyframeFor,
    toggleCompoundKeyframe,
  } = usePropertyKeyframes({
    tracks,
    currentTime,
    selectedTargets,
    selectedKeyframes,
    onAddOrUpdateKeyframe,
    onAddTrack,
    onDeleteKeyframe,
  });

  const KfButton = ({ prop }: { prop: AnimatableProperty }) => {
    const has = hasKeyframeAt(prop);
    return (
      <ActionIcon
        variant="subtle"
        color={has ? 'indigo' : 'gray'}
        size="xs"
        onClick={() => toggleKeyframeFor(prop)}
        title={has ? `Remove keyframe at ${Math.round(currentTime)}ms` : `Add keyframe at ${Math.round(currentTime)}ms`}
      >
        {has ? <IconKeyframeFilled size={14} /> : <IconKeyframe size={14} />}
      </ActionIcon>
    );
  };

  type PropGroup = { label: string; icon: ReactNode; properties: { prop: AnimatableProperty; label: string; suffix: string }[] };
  const groups: PropGroup[] = [
    {
      label: isCamera ? 'Pan' : 'Position',
      icon: <IconArrowsMove size={14} />,
      properties: [
        { prop: 'translateX', label: 'X', suffix: 'px' },
        { prop: 'translateY', label: 'Y', suffix: 'px' },
      ],
    },
    {
      label: isCamera ? 'Zoom' : 'Scale',
      icon: <IconArrowsMaximize size={14} />,
      properties: [
        { prop: 'scaleX', label: 'X', suffix: '%' },
        { prop: 'scaleY', label: 'Y', suffix: '%' },
      ],
    },
  ];

  const standaloneProps: { prop: AnimatableProperty; label: string }[] = [
    { prop: 'opacity', label: 'Opacity' },
    { prop: 'rotation', label: 'Rotation' },
    { prop: 'drawProgress', label: 'Draw Progress' },
  ];

  if (selectedTargets.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="px-3 py-2 border-b border-border">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Animation Properties
          </div>
        </div>
        {allTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-sm text-text-muted px-4 text-center">
            <IconKeyframe size={32} className="mb-2 opacity-40" />
            <p>Draw something in the editor to get started.</p>
          </div>
        ) : (
          <div className="px-2 py-1">
            <div className="text-xs text-text-muted px-1 py-1 mb-1">
              Select an element to animate:
            </div>
            {allTargets.map((target) => (
              <UnstyledButton
                key={target.id}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent-muted text-left transition-colors"
                onClick={() => onSelectTarget(target.id)}
              >
                <span className="text-accent">{target.type === 'group' ? <IconBoxMultiple size={14} /> : <IconShape size={14} />}</span>
                <span className="truncate flex-1">{target.label}</span>
              </UnstyledButton>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" aria-label="Properties">
      <div className="border-b border-border">
        <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          {isMulti ? `${selectedTargets.length} Selected` : 'Selected'}
        </div>
        {selectedTargets.map((target) => (
          <TargetInfo key={target.id} target={target} />
        ))}
      </div>

      <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider bg-surface-alt">
        Properties at {Math.round(currentTime)}ms
      </div>

      {groups.map((group) => {
        const groupProps = group.properties.map(p => p.prop);
        const allHaveKf = groupProps.every(p => hasKeyframeAt(p));
        const anyHasKf = groupProps.some(p => hasKeyframeAt(p));
        return (
          <div key={group.label} className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs">{group.icon}</span>
              <span className="text-xs font-medium flex-1">{group.label}</span>
              <ActionIcon
                variant="subtle"
                color={anyHasKf ? 'indigo' : 'gray'}
                size="xs"
                onClick={() => toggleCompoundKeyframe(groupProps)}
                title={allHaveKf ? `Remove ${group.label} keyframe` : `Add ${group.label} keyframe`}
              >
                {anyHasKf ? <IconKeyframeFilled size={14} /> : <IconKeyframe size={14} />}
              </ActionIcon>
            </div>
            <div className="space-y-1">
              {group.properties.map(({ prop, label, suffix }) => {
                const config = PROPERTY_CONFIG[prop];
                const internalVal = getValue(prop);
                const displayVal = toDisplay(prop, internalVal);
                const sliderMin = config.min ?? (prop === 'rotation' ? -360 : -500);
                const sliderMax = config.max ?? (prop === 'rotation' ? 360 : 500);
                return (
                  <div key={prop} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted w-3">{label}</span>
                    <input
                      type="range"
                      min={sliderMin}
                      max={sliderMax}
                      step={config.step}
                      value={displayVal}
                      onChange={(e) => ensureAndSet(prop, toInternal(prop, Number(e.target.value)))}
                      className="flex-1 h-1.5 accent-accent cursor-pointer"
                    />
                    <input
                      type="number"
                      value={Number(displayVal.toFixed(config.displayScale ? 0 : 1))}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) ensureAndSet(prop, toInternal(prop, v));
                      }}
                      step={config.step}
                      min={config.min}
                      max={config.max}
                      className="w-14 px-1 py-0.5 text-[10px] text-right rounded border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                    <span className="text-[9px] text-text-muted w-3">{suffix}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {standaloneProps.map(({ prop, label }) => {
        const config = PROPERTY_CONFIG[prop];
        const internalVal = getValue(prop);
        const displayVal = toDisplay(prop, internalVal);
        const sliderMin = config.min ?? (prop === 'rotation' ? -360 : -500);
        const sliderMax = config.max ?? (prop === 'rotation' ? 360 : 500);
        return (
          <div key={prop} className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs">{config.icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={config.step}
                value={displayVal}
                onChange={(e) => ensureAndSet(prop, toInternal(prop, Number(e.target.value)))}
                className="flex-1 h-1.5 accent-accent cursor-pointer"
              />
              <input
                type="number"
                value={Number(displayVal.toFixed(config.displayScale ? 0 : 1))}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) ensureAndSet(prop, toInternal(prop, v));
                }}
                step={config.step}
                min={config.min}
                max={config.max}
                className="w-14 px-1 py-0.5 text-[10px] text-right rounded border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <span className="text-[9px] text-text-muted w-3">{config.suffix}</span>
              <KfButton prop={prop} />
            </div>
          </div>
        );
      })}

      {allVisibleKeyframes.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider bg-surface-alt">
            Keyframes at {Math.round(currentTime)}ms
          </div>
          {allVisibleKeyframes.map(({ track, keyframe }) => (
            <SelectedKeyframeEditor
              key={keyframe.id}
              track={track}
              keyframe={keyframe}
              onUpdate={(updates) => onUpdateKeyframe(track.id, keyframe.id, updates)}
              onDelete={() => onDeleteKeyframe(track.id, keyframe.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}
