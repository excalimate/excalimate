import { MantineProvider } from '@mantine/core';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnstileAction } from './Turnstile';

describe('TurnstileAction', () => {
  afterEach(() => {
    delete window.turnstile;
  });

  it('uses the supported interaction-only configuration', async () => {
    const renderWidget = vi.fn().mockReturnValue('widget-id');
    window.turnstile = {
      render: renderWidget,
      execute: vi.fn(),
      reset: vi.fn(),
      remove: vi.fn(),
    };

    render(
      <MantineProvider>
        <TurnstileAction siteKey="test-site-key" action="vote_feedback" />
      </MantineProvider>,
    );

    await waitFor(() => expect(renderWidget).toHaveBeenCalled());
    expect(renderWidget).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        size: 'flexible',
        appearance: 'interaction-only',
        execution: 'execute',
      }),
    );
  });
});
