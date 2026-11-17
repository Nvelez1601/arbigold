import type { RouteRecordRaw } from 'vue-router';

/** Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas. */
export const packingListsRoutes: RouteRecordRaw[] = [
  {
    path: '/packing-lists',
    name: 'packingLists',
    component: () => import('./views/PackingListsView.vue'),
    meta: { title: 'Packing lists' },
  },
];
