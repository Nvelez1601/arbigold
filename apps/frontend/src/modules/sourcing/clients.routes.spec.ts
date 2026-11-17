import { describe, expect, it } from 'vitest';
import { clientsRoutes } from './clients.routes.ts';

describe('rutas de Clientes', () => {
  it('expone /clientes con su título y carga la vista bajo demanda', async () => {
    const [route] = clientsRoutes;
    expect(route?.path).toBe('/clientes');
    expect(route?.meta?.['title']).toBe('Clientes');
    const loader = route?.component as () => Promise<{ default: unknown }>;
    expect((await loader()).default).toBeDefined();
  });
});
