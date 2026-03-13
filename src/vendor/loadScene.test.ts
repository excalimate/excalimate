import { describe, it, expect } from 'vitest';
import { parseExcalidrawUrl } from './parseUrl';

describe('parseExcalidrawUrl', () => {
  it('parses full excalidraw.com URL', () => {
    const result = parseExcalidrawUrl(
      'https://excalidraw.com/#json=yjm57DwAXsJLhk4hECeMJ,LvvuIql1wyS8WCUo1HytPw',
    );
    expect(result).toEqual({
      id: 'yjm57DwAXsJLhk4hECeMJ',
      key: 'LvvuIql1wyS8WCUo1HytPw',
    });
  });

  it('parses hash-only string', () => {
    const result = parseExcalidrawUrl('#json=abc123,key456');
    expect(result).toEqual({ id: 'abc123', key: 'key456' });
  });

  it('returns null for invalid URL', () => {
    expect(parseExcalidrawUrl('https://example.com')).toBeNull();
    expect(parseExcalidrawUrl('not a url')).toBeNull();
    expect(parseExcalidrawUrl('')).toBeNull();
  });

  it('returns null for URL without json param', () => {
    expect(parseExcalidrawUrl('https://excalidraw.com/#other=value')).toBeNull();
  });

  it('returns null for json param without key', () => {
    expect(parseExcalidrawUrl('https://excalidraw.com/#json=onlyid')).toBeNull();
  });

  it('handles URLs with additional hash params', () => {
    const result = parseExcalidrawUrl(
      'https://excalidraw.com/#json=id123,key456&autoplay=no',
    );
    expect(result).toEqual({ id: 'id123', key: 'key456' });
  });

  it('handles IDs with dashes and underscores', () => {
    const result = parseExcalidrawUrl('#json=a-b_c,d-e_f');
    expect(result).toEqual({ id: 'a-b_c', key: 'd-e_f' });
  });
});
