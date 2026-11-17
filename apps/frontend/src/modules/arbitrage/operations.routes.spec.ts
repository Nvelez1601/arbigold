import { describe, expect, it } from 'vitest';
import { operationsRoutes } from './operations.routes.ts';

describe('rutas de Operaciones', () => {
  it('expone /operaciones con su título y carga la vista bajo demanda', async () => {
    const [route] = operationsRoutes;
    expect(route?.path).toBe('/operaciones');
    expect(route?.meta?.['title']).toBe('Operaciones');
    const loader = route?.component as () => Promise<{ default: unknown }>;
    expect((await loader()).default).toBeDefined();
  });
});
