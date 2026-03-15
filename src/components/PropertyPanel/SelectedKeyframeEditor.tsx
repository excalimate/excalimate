import { Button } from '@mantine/core';
import { IconKeyframe, IconTrash } from '@tabler/icons-react';
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
    <div className="px-3 py-2 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1">
          <IconKeyframe size={12} className="text-accent" /> {config.icon} {config.label}
        </span>
        <Button variant="subtle" color="red" size="compact-xs" leftSection={<IconTrash size={12} />} onClick={onDelete}>
          Delete
        </Button>
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
