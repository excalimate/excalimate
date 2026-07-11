import { describe, expect, it } from 'vitest';
import { sanitizeSvg, SvgSanitizationError } from './sanitize.js';

describe('strict SVG sanitization', () => {
  it('removes active content, external references, and unsafe styles', () => {
    const result = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="steal()">
        <script>alert(1)</script>
        <foreignObject><div xmlns="http://www.w3.org/1999/xhtml">unsafe</div></foreignObject>
        <a href="javascript:alert(1)"><rect width="10" height="10"/></a>
        <image href="https://attacker.example/image.png" width="10" height="10"/>
        <image href="data:text/html;base64,PHNjcmlwdD4=" width="10" height="10"/>
        <rect id="unsafe-name" style="fill:red;background:url(https://attacker.example/x)" onclick="steal()" width="10" height="10"/>
      </svg>
    `);

    expect(result.svg).not.toMatch(
      /script|foreignObject|javascript:|attacker|onclick|onload|data:text\/html/i,
    );
    expect(result.svg).toContain('id="xmt-0"');
    expect(result.svg).toContain('style="fill:red"');
  });

  it('rewrites controlled local references and permits raster data images', () => {
    const result = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
        <defs><clipPath id="clip"><rect width="10" height="10"/></clipPath></defs>
        <g data-excalimate-id="element" clip-path="url(#clip)">
          <image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/>
        </g>
      </svg>
    `);

    expect(result.svg).toContain('id="xmt-0"');
    expect(result.svg).toContain('clip-path="url(#xmt-0)"');
    expect(result.svg).toContain('data:image/png;base64,iVBORw0KGgo=');
    expect(result.elementIds).toEqual(['element']);
  });

  it('preserves local image symbols and sanitizes embedded SVG images', () => {
    const embedded = btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>alert(1)</script><rect width="1" height="1"/></svg>',
    );
    const result = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
        <defs>
          <symbol id="image-1" viewBox="0 0 1 1">
            <image href="data:image/svg+xml;base64,${embedded}" width="1" height="1"/>
          </symbol>
        </defs>
        <g data-excalimate-id="element"><use href="#image-1"/></g>
      </svg>
    `);

    const document = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    const href = document.querySelector('image')?.getAttribute('href') ?? '';
    const decoded = atob(href.split(',')[1] ?? '');
    expect(result.svg).toContain('<symbol');
    expect(result.svg).toContain('href="#xmt-0"');
    expect(decoded).toContain('<rect');
    expect(decoded).not.toContain('<script');
  });

  it('handles URL functions case-insensitively and rejects CSS escapes', () => {
    const result = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <rect fill="URL(https://attacker.example/a)" style="fill:URL(https://attacker.example/b)"/>
        <rect style="fill:u\\72l(https://attacker.example/c)"/>
      </svg>
    `);

    expect(result.svg).not.toMatch(/attacker|url|\\72/i);
  });

  it('rejects duplicate controlled IDs and target markers', () => {
    expect(() =>
      sanitizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g id="same"/><g id="same"/></svg>',
      ),
    ).toThrow(SvgSanitizationError);
    expect(() =>
      sanitizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g data-excalimate-id="same"/><g data-excalimate-id="same"/></svg>',
      ),
    ).toThrow('invalid target marker');
    expect(() =>
      sanitizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g data-excalimate-id="parent"><g data-excalimate-id="child"/></g></svg>',
      ),
    ).toThrow('must not be nested');
  });

  it('rejects SVG scenes that exceed the nesting limit', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${'<g>'.repeat(64)}${'</g>'.repeat(64)}</svg>`;
    expect(() => sanitizeSvg(svg)).toThrow('depth limit');
  });
});
