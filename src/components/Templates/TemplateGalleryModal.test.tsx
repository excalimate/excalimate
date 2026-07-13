import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, expect, it, vi } from 'vitest';
import { TemplateGalleryModal } from './TemplateGalleryModal';

describe('TemplateGalleryModal', () => {
  function renderGallery() {
    return render(
      <MantineProvider>
        <TemplateGalleryModal opened onClose={vi.fn()} onTemplateUsed={vi.fn()} />
      </MantineProvider>,
    );
  }

  it('supports keyboard selection and searchable, filterable metadata', () => {
    renderGallery();
    const first = screen.getByRole('option', { name: /API Request Flow/ });
    const second = screen.getByRole('option', { name: /OAuth Flow/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(screen.getByLabelText('Search templates'), {
      target: { value: 'education' },
    });
    expect(screen.getByRole('option', { name: /Educational Explainer/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /API Request Flow/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search templates'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('textbox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Data' }));
    expect(screen.getByRole('option', { name: /Data Pipeline/ })).toBeInTheDocument();
  });

  it('uses static lazy posters and exposes a live result count', () => {
    renderGallery();
    expect(screen.getByText('8 templates')).toHaveAttribute('aria-live', 'polite');
    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image.getAttribute('src')).toMatch(/^\/templates\/v1\//);
    }
  });

  it('marks static posters for reduced-motion users and supports mobile fullscreen', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') || query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      renderGallery();
      expect(document.querySelector('.mantine-Modal-root')).toHaveAttribute(
        'data-full-screen',
        'true',
      );
      for (const image of screen.getAllByRole('img')) {
        expect(image).toHaveAttribute('data-reduced-motion', 'true');
      }
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
