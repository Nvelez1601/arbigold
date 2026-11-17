import type { RouteRecordRaw } from 'vue-router';

/** Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas. */
export const operationsRoutes: RouteRecordRaw[] = [
  {
    path: '/operaciones',
    name: 'operations',
    component: () => import('./views/OperationsView.vue'),
    meta: { title: 'Operaciones' },
  },
];
