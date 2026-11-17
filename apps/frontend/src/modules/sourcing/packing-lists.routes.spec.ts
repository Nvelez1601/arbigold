import { describe, expect, it } from 'vitest';
import { packingListsRoutes } from './packing-lists.routes.ts';

describe('rutas de Packing lists', () => {
  it('expone /packing-lists con su título y carga la vista bajo demanda', async () => {
    const [route] = packingListsRoutes;
    expect(route?.path).toBe('/packing-lists');
    expect(route?.meta?.['title']).toBe('Packing lists');
    const loader = route?.component as () => Promise<{ default: unknown }>;
    expect((await loader()).default).toBeDefined();
  });
});
