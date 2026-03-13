import { useState, useMemo } from 'react';
import type {
  AnimationTrack,
  Keyframe,
  AnimatableProperty,
  EasingType,
} from '../../types/animation';
import { ANIMATABLE_PROPERTIES, EASING_TYPES, PROPERTY_DEFAULTS } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import { Button } from '../common/Button';
import { NumberInput } from '../common/NumberInput';
import { Dropdown } from '../common/Dropdown';
import { interpolate } from '../../core/engine/InterpolationEngine';

const PROPERTY_CONFIG: Record<
  AnimatableProperty,
  {
    label: string; icon: string; suffix: string;
    min?: number; max?: number; step: number;
    displayScale?: number;
  }
> = {
  opacity: { label: 'Opacity', icon: '👁', suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
  translateX: { label: 'Position X', icon: '↔', suffix: 'px', step: 1 },
  translateY: { label: 'Position Y', icon: '↕', suffix: 'px', step: 1 },
  scaleX: { label: 'Scale X', icon: '⇔', suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  scaleY: { label: 'Scale Y', icon: '⇕', suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  rotation: { label: 'Rotation', icon: '↻', suffix: '°', step: 1 },
  drawProgress: { label: 'Draw Progress', icon: '✏', suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
};

// Compound properties: adding one creates both X and Y tracks
type CompoundProperty = {
  label: string;
  icon: string;
  properties: AnimatableProperty[];
  // For camera frame, use different label
  cameraLabel?: string;
};

const COMPOUND_PROPERTIES: CompoundProperty[] = [
  { label: 'Position', icon: '⊹', properties: ['translateX', 'translateY'], cameraLabel: 'Pan' },
  { label: 'Scale', icon: '⇔', properties: ['scaleX', 'scaleY'], cameraLabel: 'Zoom' },
];

// Standalone properties (not part of a compound)
const STANDALONE_PROPERTIES: AnimatableProperty[] = ['opacity', 'rotation', 'drawProgress'];

// Camera-specific property labels
const CAMERA_LABELS: Partial<Record<AnimatableProperty, string>> = {
  translateX: 'Pan X',
  translateY: 'Pan Y',
  scaleX: 'Zoom',
  scaleY: 'Zoom Y',
};

import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

function getPropertyLabel(property: AnimatableProperty, targetId?: string): string {
  if (targetId === CAMERA_FRAME_TARGET_ID && CAMERA_LABELS[property]) {
    return CAMERA_LABELS[property]!;
  }
  return PROPERTY_CONFIG[property].label;
}

/** Convert internal value to display value */
function toDisplay(property: AnimatableProperty, internal: number): number {
  const config = PROPERTY_CONFIG[property];
  if (!config) return internal;
  return internal * (config.displayScale ?? 1);
}

/** Convert display value to internal value */
function toInternal(property: AnimatableProperty, display: number): number {
  const config = PROPERTY_CONFIG[property];
  if (!config) return display;
  return display / (config.displayScale ?? 1);
}

const EASING_OPTIONS = EASING_TYPES.map((t) => ({ value: t, label: t }));

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
      <span className="text-indigo-400 text-xs">{target.type === 'group' ? '⊞' : '◇'}</span>
      <span className="text-xs font-medium truncate flex-1">{target.label}</span>
      <span className="text-[10px] text-[var(--color-text-secondary)]">
        {target.type === 'group'
          ? `${target.elementIds.length} els`
          : `${Math.round(target.originalBounds.width)}×${Math.round(target.originalBounds.height)}`}
      </span>
    </div>
  );
}

/**
 * "Add Track" section that works with multiple selected targets.
 * Shows only properties that aren't already tracked on ALL selected targets.
 */
function AddTrackSection({
  selectedTargets,
  existingTracksByTarget,
  onAdd,
}: {
  selectedTargets: AnimatableTarget[];
  existingTracksByTarget: Map<string, Set<AnimatableProperty>>;
  onAdd: (property: AnimatableProperty) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isCamera = selectedTargets.some(t => t.id === CAMERA_FRAME_TARGET_ID);

  // Build list of addable items: compound properties + standalone properties
  type AddableItem = { key: string; label: string; icon: string; properties: AnimatableProperty[] };
  const addable: AddableItem[] = [];

  // Compound properties (Position, Scale)
  for (const cp of COMPOUND_PROPERTIES) {
    // Available if at least one target is missing ANY of the compound's properties
    const available = selectedTargets.some(t => {
      const existing = existingTracksByTarget.get(t.id);
      return cp.properties.some(p => !existing?.has(p));
    });
    if (available) {
      addable.push({
        key: cp.properties.join('+'),
        label: isCamera && cp.cameraLabel ? cp.cameraLabel : cp.label,
        icon: cp.icon,
        properties: cp.properties,
      });
    }
  }

  // Standalone properties
  for (const p of STANDALONE_PROPERTIES) {
    const available = selectedTargets.some(t => !existingTracksByTarget.get(t.id)?.has(p));
    if (available) {
      addable.push({
        key: p,
        label: PROPERTY_CONFIG[p].label,
        icon: PROPERTY_CONFIG[p].icon,
        properties: [p],
      });
    }
  }

  if (addable.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-[var(--color-border)]">
      {!isOpen ? (
        <Button variant="primary" size="sm" onClick={() => setIsOpen(true)} className="w-full">
          + Add Animation Track{selectedTargets.length > 1 ? ` (${selectedTargets.length} targets)` : ''}
        </Button>
      ) : (
        <div className="space-y-0.5">
          <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            {selectedTargets.length > 1
              ? `Add to ${selectedTargets.length} selected targets:`
              : 'Select property to animate:'}
          </div>
          {addable.map((item) => (
            <button
              key={item.key}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-indigo-500/10 text-left transition-colors"
              onClick={() => {
                for (const p of item.properties) onAdd(p);
                setIsOpen(false);
              }}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="w-full mt-1">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Live property editor for a single track.
 * Changing the value auto-creates/updates a keyframe at the current time.
 */
function TrackPropertyEditor({
  track,
  currentTime,
  onValueChange,
  onAddKeyframeAtTime,
  targetLabel,
  showTargetLabel,
}: {
  track: AnimationTrack;
  currentTime: number;
  onValueChange: (value: number) => void;
  onAddKeyframeAtTime: () => void;
  targetLabel?: string;
  showTargetLabel?: boolean;
}) {
  const config = PROPERTY_CONFIG[track.property];
  const propLabel = getPropertyLabel(track.property, track.targetId);
  const internalValue = interpolate(track.keyframes, currentTime, track.property);
  const displayValue = toDisplay(track.property, internalValue);
  const hasKeyframeAtTime = track.keyframes.some((kf) => Math.abs(kf.time - currentTime) < 1);

  const sliderMin = config.min ?? (track.property === 'rotation' ? -360 : -500);
  const sliderMax = config.max ?? (track.property === 'rotation' ? 360 : 500);

  return (
    <div className={`px-3 py-2 border-b border-[var(--color-border)] ${!track.enabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs">{config.icon}</span>
        <span className="text-xs font-medium flex-1">
          {propLabel}
          {showTargetLabel && targetLabel && (
            <span className="text-[10px] text-[var(--color-text-secondary)] ml-1">({targetLabel})</span>
          )}
        </span>
        <button
          className={`w-5 h-5 flex items-center justify-center text-sm rounded transition-colors ${
            hasKeyframeAtTime
              ? 'text-indigo-400'
              : 'text-[var(--color-text-secondary)] hover:text-indigo-400'
          }`}
          onClick={onAddKeyframeAtTime}
          title={hasKeyframeAtTime ? 'Keyframe exists at this time' : `Add keyframe at ${Math.round(currentTime)}ms`}
        >
          {hasKeyframeAtTime ? '◆' : '◇'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={config.step}
          value={displayValue}
          onChange={(e) => onValueChange(toInternal(track.property, Number(e.target.value)))}
          className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
          disabled={!track.enabled}
        />
        <input
          type="number"
          value={Number(displayValue.toFixed(config.displayScale ? 0 : 2))}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onValueChange(toInternal(track.property, v));
          }}
          step={config.step}
          min={config.min}
          max={config.max}
          className="w-16 px-1.5 py-0.5 text-xs text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          disabled={!track.enabled}
        />
        <span className="text-[10px] text-[var(--color-text-secondary)] w-4">{config.suffix}</span>
      </div>
      <div className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
        {track.keyframes.length} keyframe{track.keyframes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function SelectedKeyframeEditor({
  track,
  keyframe,
  onUpdate,
  onDelete,
}: {
  track: AnimationTrack;
  keyframe: Keyframe;
  onUpdate: (updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>) => void;
  onDelete: () => void;
}) {
  const config = PROPERTY_CONFIG[track.property] ?? { label: track.property, icon: '?', suffix: '', step: 1 };
  const displayVal = toDisplay(track.property, keyframe.value);
  return (
    <div className="px-3 py-2 border-b border-[var(--color-border)] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1">
          <span className="text-indigo-400">◆</span> {config.icon} {config.label}
        </span>
        <button className="text-[10px] text-red-400 hover:text-red-300" onClick={onDelete} title="Delete keyframe">
          ✕ Delete
        </button>
      </div>
      <NumberInput label="Time" value={keyframe.time} onChange={(v) => onUpdate({ time: Math.max(0, v) })} min={0} step={10} suffix="ms" />
      <NumberInput
        label="Value"
        value={displayVal}
        onChange={(v) => onUpdate({ value: toInternal(track.property, v) })}
        min={config.min}
        max={config.max}
        step={config.step}
        suffix={config.suffix}
      />
      <Dropdown label="Easing" value={keyframe.easing} onChange={(v) => onUpdate({ easing: v as EasingType })} options={EASING_OPTIONS} />
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

  // Auto-find keyframes at current time for selected targets (in addition to explicitly selected ones)
  const keyframesAtCurrentTime = useMemo(() => {
    const result: { track: AnimationTrack; keyframe: Keyframe }[] = [];
    const explicitIds = new Set(selectedKeyframes.map(sk => sk.keyframe.id));
    const selectedIds = new Set(selectedTargets.map(t => t.id));

    for (const track of tracks) {
      if (!selectedIds.has(track.targetId)) continue;
      for (const kf of track.keyframes) {
        if (Math.abs(kf.time - currentTime) < 1 && !explicitIds.has(kf.id)) {
          result.push({ track, keyframe: kf });
        }
      }
    }
    return result;
  }, [tracks, currentTime, selectedTargets, selectedKeyframes]);

  const allVisibleKeyframes = [...selectedKeyframes, ...keyframesAtCurrentTime];

  if (selectedTargets.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
            Animation Properties
          </div>
        </div>
        {allTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-sm text-[var(--color-text-secondary)] px-4 text-center">
            <div className="text-2xl mb-2 opacity-40">◇</div>
            <p>Draw something in the editor to get started.</p>
          </div>
        ) : (
          <div className="px-2 py-1">
            <div className="text-xs text-[var(--color-text-secondary)] px-1 py-1 mb-1">
              Select an element to animate:
            </div>
            {allTargets.map((target) => (
              <button
                key={target.id}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-indigo-500/10 text-left transition-colors"
                onClick={() => onSelectTarget(target.id)}
              >
                <span className="text-indigo-400">{target.type === 'group' ? '⊞' : '◇'}</span>
                <span className="truncate flex-1">{target.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Build target label lookup
  const targetLabelMap = new Map(selectedTargets.map((t) => [t.id, t.label]));

  // Helper: ensure track exists and set value (auto-create if needed)
  const ensureAndSet = (property: AnimatableProperty, value: number) => {
    for (const target of selectedTargets) {
      const track = tracks.find(t => t.targetId === target.id && t.property === property);
      if (track) {
        onAddOrUpdateKeyframe(track.id, currentTime, value);
      } else {
        // Auto-create track then set value
        onAddTrack(target.id, target.type, property);
      }
    }
  };

  // Helper: get current interpolated value for first selected target
  const getValue = (property: AnimatableProperty): number => {
    const track = tracks.find(t => t.property === property);
    if (track) return interpolate(track.keyframes, currentTime, track.property);
    return PROPERTY_DEFAULTS[property];
  };

  // Helper: check if keyframe exists at current time for a property
  const hasKeyframeAt = (prop: AnimatableProperty): boolean => {
    return tracks.some(t => t.property === prop && t.keyframes.some(kf => Math.abs(kf.time - currentTime) < 1));
  };

  // Helper: toggle keyframe at current time — add if missing, remove if exists
  const toggleKeyframeFor = (prop: AnimatableProperty) => {
    const has = hasKeyframeAt(prop);
    if (has) {
      // Remove the keyframe at current time
      for (const target of selectedTargets) {
        const track = tracks.find(t => t.targetId === target.id && t.property === prop);
        if (track) {
          const kf = track.keyframes.find(k => Math.abs(k.time - currentTime) < 1);
          if (kf) onDeleteKeyframe(track.id, kf.id);
        }
      }
    } else {
      // Add keyframe at current time with current value
      ensureAndSet(prop, getValue(prop));
    }
  };

  // Toggle keyframe for a compound group (Position = X+Y, Scale = X+Y)
  const toggleCompoundKeyframe = (properties: AnimatableProperty[]) => {
    const allHave = properties.every(p => hasKeyframeAt(p));
    for (const prop of properties) {
      if (allHave) {
        // Remove all keyframes in the group
        for (const target of selectedTargets) {
          const track = tracks.find(t => t.targetId === target.id && t.property === prop);
          if (track) {
            const kf = track.keyframes.find(k => Math.abs(k.time - currentTime) < 1);
            if (kf) onDeleteKeyframe(track.id, kf.id);
          }
        }
      } else {
        // Add keyframes for any missing
        if (!hasKeyframeAt(prop)) {
          ensureAndSet(prop, getValue(prop));
        }
      }
    }
  };

  // Keyframe button component
  const KfButton = ({ prop }: { prop: AnimatableProperty }) => {
    const has = hasKeyframeAt(prop);
    return (
      <button
        className={`w-4 h-4 flex items-center justify-center text-[10px] rounded transition-colors shrink-0 ${
          has ? 'text-indigo-400 hover:text-red-400' : 'text-[var(--color-text-secondary)] hover:text-indigo-400'
        }`}
        onClick={() => toggleKeyframeFor(prop)}
        title={has ? `Remove keyframe at ${Math.round(currentTime)}ms` : `Add keyframe at ${Math.round(currentTime)}ms`}
      >
        {has ? '◆' : '◇'}
      </button>
    );
  };

  // Define the property groups to show
  type PropGroup = { label: string; icon: string; properties: { prop: AnimatableProperty; label: string; suffix: string }[] };
  const groups: PropGroup[] = [
    {
      label: isCamera ? 'Pan' : 'Position',
      icon: '⊹',
      properties: [
        { prop: 'translateX', label: 'X', suffix: 'px' },
        { prop: 'translateY', label: 'Y', suffix: 'px' },
      ],
    },
    {
      label: isCamera ? 'Zoom' : 'Scale',
      icon: '⇔',
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

  return (
    <div className="flex flex-col h-full overflow-y-auto" aria-label="Properties">
      {/* Target info header */}
      <div className="border-b border-[var(--color-border)]">
        <div className="px-3 py-1 text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
          {isMulti ? `${selectedTargets.length} Selected` : 'Selected'}
        </div>
        {selectedTargets.map((target) => (
          <TargetInfo key={target.id} target={target} />
        ))}
      </div>

      <div className="px-3 py-1 text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider bg-[#1a1a2a]">
        Properties at {Math.round(currentTime)}ms
      </div>

      {/* Compound property groups (Position, Scale) — one keyframe button per group */}
      {groups.map((group) => {
        const groupProps = group.properties.map(p => p.prop);
        const allHaveKf = groupProps.every(p => hasKeyframeAt(p));
        const anyHasKf = groupProps.some(p => hasKeyframeAt(p));
        return (
          <div key={group.label} className="px-3 py-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs">{group.icon}</span>
              <span className="text-xs font-medium flex-1">{group.label}</span>
              <button
                className={`w-4 h-4 flex items-center justify-center text-[10px] rounded transition-colors shrink-0 ${
                  anyHasKf ? 'text-indigo-400 hover:text-red-400' : 'text-[var(--color-text-secondary)] hover:text-indigo-400'
                }`}
                onClick={() => toggleCompoundKeyframe(groupProps)}
                title={allHaveKf ? `Remove ${group.label} keyframe` : `Add ${group.label} keyframe`}
              >
                {anyHasKf ? '◆' : '◇'}
              </button>
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
                    <span className="text-[10px] text-[var(--color-text-secondary)] w-3">{label}</span>
                    <input
                      type="range" min={sliderMin} max={sliderMax} step={config.step}
                      value={displayVal}
                      onChange={(e) => ensureAndSet(prop, toInternal(prop, Number(e.target.value)))}
                      className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      value={Number(displayVal.toFixed(config.displayScale ? 0 : 1))}
                      onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) ensureAndSet(prop, toInternal(prop, v)); }}
                      step={config.step} min={config.min} max={config.max}
                      className="w-14 px-1 py-0.5 text-[10px] text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    <span className="text-[9px] text-[var(--color-text-secondary)] w-3">{suffix}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Standalone properties (Opacity, Rotation, Draw Progress) */}
      {standaloneProps.map(({ prop, label }) => {
        const config = PROPERTY_CONFIG[prop];
        const internalVal = getValue(prop);
        const displayVal = toDisplay(prop, internalVal);
        const sliderMin = config.min ?? (prop === 'rotation' ? -360 : -500);
        const sliderMax = config.max ?? (prop === 'rotation' ? 360 : 500);
        return (
          <div key={prop} className="px-3 py-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs">{config.icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="range" min={sliderMin} max={sliderMax} step={config.step}
                value={displayVal}
                onChange={(e) => ensureAndSet(prop, toInternal(prop, Number(e.target.value)))}
                className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
              />
              <input
                type="number"
                value={Number(displayVal.toFixed(config.displayScale ? 0 : 1))}
                onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) ensureAndSet(prop, toInternal(prop, v)); }}
                step={config.step} min={config.min} max={config.max}
                className="w-14 px-1 py-0.5 text-[10px] text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <span className="text-[9px] text-[var(--color-text-secondary)] w-3">{config.suffix}</span>
              <KfButton prop={prop} />
            </div>
          </div>
        );
      })}

      {/* Keyframes at current time / selected keyframes */}
      {allVisibleKeyframes.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider bg-[#1a1a2a]">
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
