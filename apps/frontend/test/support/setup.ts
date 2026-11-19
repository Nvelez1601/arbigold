/**
 * Setup global de los tests del frontend: lo que jsdom no trae y PrimeVue usa.
 * - matchMedia: el Select de PrimeVue 4 lo llama como global al montarse (no solo window.matchMedia;
 *   en el entorno jsdom de Vitest window y globalThis son objetos distintos).
 * - ResizeObserver: lo usan Textarea (auto-resize) y otros componentes.
 */
const matchMediaStub = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

class ResizeObserverStub {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
}

for (const target of [globalThis, window] as Record<string, unknown>[]) {
  target['matchMedia'] ??= matchMediaStub;
  target['ResizeObserver'] ??= ResizeObserverStub;
}

export {};
