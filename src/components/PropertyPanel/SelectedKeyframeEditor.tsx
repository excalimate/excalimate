import type { AnimationTrack, Keyframe, EasingType } from '../../types/animation';
import { NumberInput } from '../common/NumberInput';
import { Dropdown } from '../common/Dropdown';
import { PROPERTY_CONFIG, EASING_OPTIONS } from './propertyConfig';
import { toDisplay, toInternal } from './propertyValueAdapters';

type SelectedKeyframeEditorProps = {
  track: AnimationTrack;
  keyframe: Keyframe;
  onUpdate: (updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>) => void;
  onDelete: () => void;
};

export function SelectedKeyframeEditor({
  track,
  keyframe,
  onUpdate,
  onDelete,
}: SelectedKeyframeEditorProps) {
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
