import { useState } from 'react';
import { FloatingIndicator, UnstyledButton } from '@mantine/core';
import { IconPencil, IconMovie } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import './ModeSwitcher.css';

export function ModeSwitcher() {
  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);

  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [editRef, setEditRef] = useState<HTMLButtonElement | null>(null);
  const [animateRef, setAnimateRef] = useState<HTMLButtonElement | null>(null);

  const activeRef = mode === 'edit' ? editRef : animateRef;

  return (
    <div ref={setRootRef} className="mode-switcher__root">
      <FloatingIndicator
        target={activeRef}
        parent={rootRef}
        className="mode-switcher__indicator"
      />
      <UnstyledButton
        ref={setEditRef}
        className="mode-switcher__button"
        data-active={mode === 'edit' || undefined}
        onClick={() => setMode('edit')}
      >
        <IconPencil size={12} />
        Edit
      </UnstyledButton>
      <UnstyledButton
        ref={setAnimateRef}
        className="mode-switcher__button"
        data-active={mode === 'animate' || undefined}
        onClick={() => setMode('animate')}
      >
        <IconMovie size={12} />
        Animate
      </UnstyledButton>
    </div>
  );
}
