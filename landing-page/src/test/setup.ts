import '@testing-library/jest-dom/vitest';

if (typeof document !== 'undefined' && !document.fonts) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: new EventTarget(),
  });
}
