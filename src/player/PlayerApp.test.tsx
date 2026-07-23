import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerApp } from './PlayerApp';
import { createPlayerTestPackage } from './playerTestFixture';
import type { HostedPlayerLoadResult } from './loadHostedPlayer';

function readyLoader(): Promise<HostedPlayerLoadResult> {
  return Promise.resolve({
    kind: 'package',
    playerPackage: createPlayerTestPackage(),
    editorUrl: 'https://excalimate.com/#share=abcdefgh,key',
  });
}

function renderPlayer(
  props: Partial<React.ComponentProps<typeof PlayerApp>> = {},
) {
  return render(
    <MantineProvider>
      <PlayerApp load={readyLoader} {...props} />
    </MantineProvider>,
  );
}

describe('hosted player controls', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
  });

  it('starts paused with labelled keyboard-accessible controls', async () => {
    renderPlayer();
    const play = await screen.findByRole('button', { name: 'Play animation' });
    expect(screen.getByRole('slider', { name: 'Animation position' })).toHaveAttribute(
      'aria-valuemin',
      '0',
    );
    expect(screen.getByRole('combobox', { name: 'Playback rate' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Made with Excalimate' })).toHaveAttribute(
      'rel',
      'noreferrer',
    );

    fireEvent.click(play);
    expect(
      screen.getByRole('button', { name: 'Pause animation' }),
    ).toBeVisible();
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Play animation' }),
      ).toBeVisible(),
    );
    fireEvent.keyDown(document.body, { key: 'End', code: 'End' });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Replay animation' }),
      ).toBeVisible(),
    );
  });

  it('announces reduced motion and remains paused by default', async () => {
    renderPlayer({ reducedMotionOverride: true });
    expect(
      await screen.findByText('Reduced motion: playback starts paused'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Play animation' }),
    ).toBeVisible();
  });

  it('keeps all controls available at a mobile viewport width', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    renderPlayer();

    expect(
      await screen.findByRole('button', { name: 'Play animation' }),
    ).toBeVisible();
    expect(screen.getByRole('slider', { name: 'Animation position' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Playback rate' })).toBeVisible();
    expect(screen.getByText('0:00.0')).toBeVisible();
  });

  it('shows an accessible editor fallback for legacy shares', async () => {
    renderPlayer({
      load: async () => ({
        kind: 'legacy',
        editorUrl:
          'https://excalimate.com/#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
      }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This share does not include a hosted-player package',
    );
    expect(
      screen.getByRole('link', { name: 'Open in Excalimate' }),
    ).toHaveAttribute(
      'href',
      'https://excalimate.com/#share=abcdefgh,AAAAAAAAAAAAAAAAAAAAAA',
    );
  });
});
