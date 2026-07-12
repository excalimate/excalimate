import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentBanner } from './ConsentBanner';
import { useConsentStore } from '../stores/consentStore';

describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentStore.setState({
      decided: false,
      analytics: false,
      preferences: false,
      showBanner: true,
      showModal: false,
    });
  });

  it('distinguishes required processing from optional analytics', () => {
    render(
      <MantineProvider>
        <ConsentBanner />
      </MantineProvider>,
    );

    expect(screen.getByText(/Cloudflare processes requests for delivery/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use required only' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept optional' })).toBeInTheDocument();
  });

  it('shows the exact inventory from the persistent settings entry point', () => {
    useConsentStore.setState({ showBanner: false, showModal: true });
    render(
      <MantineProvider>
        <ConsentBanner />
      </MantineProvider>,
    );

    expect(screen.getByRole('dialog', { name: 'Privacy and data settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Optional analytics event catalogue'));
    expect(screen.getByText('animation_exported')).toBeInTheDocument();
    expect(
      screen.getByText(/PostHog also receives a random in-memory session identifier/),
    ).toBeInTheDocument();
  });
});
