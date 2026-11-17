import type { RouteRecordRaw } from 'vue-router';

/** Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas. */
export const clientsRoutes: RouteRecordRaw[] = [
  {
    path: '/clientes',
    name: 'clients',
    component: () => import('./views/ClientsView.vue'),
    meta: { title: 'Clientes' },
  },
];
