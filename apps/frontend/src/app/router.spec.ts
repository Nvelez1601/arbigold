import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter, documentTitle, routes } from './router.ts';

describe('router', () => {
  it('registra el panel, los cinco módulos y la página 404', () => {
    expect(routes.map((r) => r.path)).toEqual([
      '/',
      '/proveedores',
      '/clientes',
      '/operaciones',
      '/packing-lists',
      '/exportaciones',
      '/:pathMatch(.*)*',
    ]);
  });

  it('pone el título de la pestaña según la pantalla', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/clientes');
    expect(document.title).toBe('Clientes | ArbiGold');
    await router.push('/no-existe');
    expect(document.title).toBe('Página no encontrada | ArbiGold');
    expect(documentTitle(undefined)).toBe('ArbiGold');
  });

  it('las vistas del panel y 404 se cargan bajo demanda', async () => {
    for (const route of [routes[0], routes.at(-1)]) {
      const loader = route?.component as () => Promise<{ default: unknown }>;
      expect((await loader()).default).toBeDefined();
    }
  });
});
