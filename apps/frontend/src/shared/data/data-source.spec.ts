import { describe, expect, it } from 'vitest';
import { DATA_SOURCE, resolveDataSource } from './data-source.ts';

describe('fuente de datos', () => {
  it('por defecto es el modo demostración', () => {
    expect(resolveDataSource(undefined)).toBe('demo');
    expect(resolveDataSource('cualquiera')).toBe('demo');
    expect(DATA_SOURCE).toBe('demo');
  });

  it('se puede apuntar a la API', () => {
    expect(resolveDataSource('api')).toBe('api');
  });
});
