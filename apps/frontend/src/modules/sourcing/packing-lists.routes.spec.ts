import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../../app/router.ts';
import { packingListsRoutes } from './packing-lists.routes.ts';

/** Monta PrimeVue y el router completos: con la máquina cargada, 5 s no alcanzan. */
vi.setConfig({ testTimeout: 30_000 });

const children = packingListsRoutes[0]?.children ?? [];
const loaderOf = (path: string) =>
  children.find((child) => child.path === path)?.component as () => Promise<{ default: unknown }>;

describe('rutas de Packing lists', () => {
  it('mantiene /packing-lists como entrada del módulo, con su título', () => {
    const [route] = packingListsRoutes;
    expect(route?.path).toBe('/packing-lists');
    expect(route?.meta?.['title']).toBe('Packing lists');
    expect(children.map((child) => child.path)).toEqual(['', 'nuevo', ':id']);
  });

  it('carga la lista y el editor bajo demanda', async () => {
    for (const path of ['', 'nuevo', ':id']) {
      expect((await loaderOf(path)()).default).toBeDefined();
    }
  });

  it('resuelve la lista, el alta y el detalle con el título de cada pantalla', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/packing-lists');
    expect(document.title).toBe('Packing lists | ArbiGold');
    await router.push('/packing-lists/nuevo');
    expect(router.currentRoute.value.name).toBe('packingListNew');
    expect(document.title).toBe('Nuevo packing list | ArbiGold');
    await router.push('/packing-lists/pl-1');
    expect(router.currentRoute.value.name).toBe('packingListDetail');
    expect(router.currentRoute.value.params['id']).toBe('pl-1');
  });
});
