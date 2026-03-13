/**
 * ShadowDomExcalidraw — Renders Excalidraw inside a Shadow DOM
 * to completely isolate it from Tailwind's global styles.
 *
 * How it works:
 * 1. Creates a <div> with an open shadow root
 * 2. Clones all document stylesheets into the shadow root (picks up Excalidraw's CSS)
 * 3. Uses ReactDOM.createPortal to render the Excalidraw component inside
 * 4. Tailwind's preflight cannot penetrate the shadow boundary
 */

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import excalidrawCssUrl from '@excalidraw/excalidraw/index.css?url';

interface ShadowDomExcalidrawProps {
  children: React.ReactNode;
}

export function ShadowDomExcalidraw({ children }: ShadowDomExcalidrawProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountTarget, setMountTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Don't re-create if shadow root already exists
    let shadowRoot = host.shadowRoot;
    if (!shadowRoot) {
      shadowRoot = host.attachShadow({ mode: 'open' });

      // Load Excalidraw's CSS into the shadow root via <link>
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = excalidrawCssUrl;
      shadowRoot.appendChild(link);

      // Host sizing styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        .excalidraw-shadow-mount {
          width: 100%;
          height: 100%;
          position: relative;
        }
      `;
      shadowRoot.appendChild(style);
    }

    // Create mount point for React portal
    let mount = shadowRoot.querySelector('.excalidraw-shadow-mount') as HTMLDivElement;
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'excalidraw-shadow-mount';
      shadowRoot.appendChild(mount);
    }

    setMountTarget(mount);
  }, []);

  return (
    <div ref={hostRef} style={{ width: '100%', height: '100%' }}>
      {mountTarget && createPortal(children, mountTarget)}
    </div>
  );
}
