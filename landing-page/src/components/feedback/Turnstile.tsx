import { Box } from '@mantine/core';
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';

interface TurnstileOptions {
  sitekey: string;
  action: string;
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  execution?: 'render' | 'execute';
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  const promise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile failed to load.'));
    script.onerror = () => reject(new Error('Turnstile failed to load.'));
    document.head.appendChild(script);
  }).catch((error: unknown): never => {
    scriptPromise = undefined;
    throw error;
  });
  scriptPromise = promise;
  return promise;
}

interface WidgetProps {
  siteKey: string;
  action: string;
  resetKey: number;
  onToken: (token: string | undefined) => void;
}

export function TurnstileWidget({ siteKey, action, resetKey, onToken }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !siteKey) return;
    let widgetId: string | undefined;
    let disposed = false;
    void loadTurnstile()
      .then((api) => {
        if (disposed) return;
        widgetId = api.render(container, {
          sitekey: siteKey,
          action,
          size: 'flexible',
          callback: (token) => onTokenRef.current(token),
          'error-callback': () => onTokenRef.current(undefined),
          'expired-callback': () => onTokenRef.current(undefined),
        });
      })
      .catch(() => onTokenRef.current(undefined));
    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [action, resetKey, siteKey]);

  return <Box ref={containerRef} className="feedback-turnstile" />;
}

export interface TurnstileActionHandle {
  execute: () => Promise<string>;
}

interface ActionProps {
  siteKey: string;
  action: string;
}

export const TurnstileAction = forwardRef<TurnstileActionHandle, ActionProps>(
  function TurnstileAction({ siteKey, action }, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | undefined>(undefined);
    const apiRef = useRef<TurnstileApi | undefined>(undefined);
    const pendingRef = useRef<
      | {
          resolve: (token: string) => void;
          reject: (error: Error) => void;
        }
      | undefined
    >(undefined);
    const shouldResetRef = useRef(false);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !siteKey) return;
      let disposed = false;
      void loadTurnstile()
        .then((api) => {
          if (disposed) return;
          apiRef.current = api;
          widgetIdRef.current = api.render(container, {
            sitekey: siteKey,
            action,
            size: 'flexible',
            appearance: 'interaction-only',
            execution: 'execute',
            callback: (token) => {
              shouldResetRef.current = true;
              pendingRef.current?.resolve(token);
              pendingRef.current = undefined;
            },
            'error-callback': () => {
              pendingRef.current?.reject(new Error('Verification failed. Please try again.'));
              pendingRef.current = undefined;
            },
            'expired-callback': () => {
              pendingRef.current?.reject(new Error('Verification expired. Please try again.'));
              pendingRef.current = undefined;
            },
          });
        })
        .catch((error: unknown) => {
          pendingRef.current?.reject(
            error instanceof Error ? error : new Error('Verification could not load.'),
          );
          pendingRef.current = undefined;
        });
      return () => {
        disposed = true;
        if (widgetIdRef.current && apiRef.current) {
          apiRef.current.remove(widgetIdRef.current);
        }
      };
    }, [action, siteKey]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        execute: () => {
          if (!apiRef.current || !widgetIdRef.current) {
            return Promise.reject(new Error('Verification is still loading.'));
          }
          if (pendingRef.current) {
            return Promise.reject(new Error('Verification is already in progress.'));
          }
          if (shouldResetRef.current) {
            apiRef.current.reset(widgetIdRef.current);
            shouldResetRef.current = false;
          }
          return new Promise<string>((resolve, reject) => {
            pendingRef.current = { resolve, reject };
            apiRef.current?.execute(widgetIdRef.current as string);
          });
        },
      }),
      [],
    );

    return <Box ref={containerRef as RefObject<HTMLDivElement>} />;
  },
);
