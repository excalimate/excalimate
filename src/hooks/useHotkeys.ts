import { useEffect } from 'react';

type HotkeyHandler = (event: KeyboardEvent) => void;

interface HotkeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: HotkeyHandler;
  preventDefault?: boolean;
}

export type { HotkeyBinding };

export function useHotkeys(bindings: HotkeyBinding[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const binding of bindings) {
        const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase();
        const ctrlMatch = !!binding.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!binding.shift === e.shiftKey;
        const altMatch = !!binding.alt === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (binding.preventDefault !== false) {
            e.preventDefault();
            e.stopPropagation(); // Stop Excalidraw from handling it
          }
          binding.handler(e);
          return;
        }
      }
    };

    // Use capture phase so our handlers fire BEFORE Excalidraw's
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [bindings, enabled]);
}
