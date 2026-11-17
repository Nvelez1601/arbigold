import type { RouteRecordRaw } from 'vue-router';

/** Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas. */
export const exportsRoutes: RouteRecordRaw[] = [
  {
    path: '/exportaciones',
    name: 'exports',
    component: () => import('./views/ExportsView.vue'),
    meta: { title: 'Exportaciones' },
  },
];
