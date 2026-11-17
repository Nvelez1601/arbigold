import type { RouteRecordRaw } from 'vue-router';

/** Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas. */
export const suppliersRoutes: RouteRecordRaw[] = [
  {
    path: '/proveedores',
    name: 'suppliers',
    component: () => import('./views/SuppliersView.vue'),
    meta: { title: 'Proveedores' },
  },
];
