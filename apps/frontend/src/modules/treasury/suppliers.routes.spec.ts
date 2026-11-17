import { describe, expect, it } from 'vitest';
import { suppliersRoutes } from './suppliers.routes.ts';

describe('rutas de Proveedores', () => {
  it('expone /proveedores con su título y carga la vista bajo demanda', async () => {
    const [route] = suppliersRoutes;
    expect(route?.path).toBe('/proveedores');
    expect(route?.meta?.['title']).toBe('Proveedores');
    const loader = route?.component as () => Promise<{ default: unknown }>;
    expect((await loader()).default).toBeDefined();
  });
});
