import { describe, expect, it } from 'vitest';
import { exportsRoutes } from './exports.routes.ts';

describe('rutas de Exportaciones', () => {
  it('expone /exportaciones con su título y carga la vista bajo demanda', async () => {
    const [route] = exportsRoutes;
    expect(route?.path).toBe('/exportaciones');
    expect(route?.meta?.['title']).toBe('Exportaciones');
    const loader = route?.component as () => Promise<{ default: unknown }>;
    expect((await loader()).default).toBeDefined();
  });
});
