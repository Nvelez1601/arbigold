import {
  type RouteRecordRaw,
  type RouterHistory,
  createRouter,
  createWebHistory,
} from 'vue-router';
import { operationsRoutes } from '../modules/arbitrage/operations.routes.ts';
import { exportsRoutes } from '../modules/exports/exports.routes.ts';
import { clientsRoutes } from '../modules/sourcing/clients.routes.ts';
import { packingListsRoutes } from '../modules/sourcing/packing-lists.routes.ts';
import { suppliersRoutes } from '../modules/treasury/suppliers.routes.ts';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'panel',
    component: () => import('./views/PanelView.vue'),
    meta: { title: 'Panel' },
  },
  ...suppliersRoutes,
  ...clientsRoutes,
  ...operationsRoutes,
  ...packingListsRoutes,
  ...exportsRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
  },
];

/** Título de la pestaña: "Clientes | ArbiGold". */
export const documentTitle = (title: unknown): string =>
  typeof title === 'string' && title ? `${title} | ArbiGold` : 'ArbiGold';

export const createAppRouter = (history: RouterHistory = createWebHistory()) => {
  const router = createRouter({ history, routes });
  router.afterEach((to) => {
    document.title = documentTitle(to.meta['title']);
  });
  return router;
};
