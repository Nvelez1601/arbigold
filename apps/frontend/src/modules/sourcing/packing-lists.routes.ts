import type { RouteRecordRaw } from 'vue-router';

/**
 * Rutas de este módulo. El router de la app solo las incorpora: cada módulo es dueño de las suyas.
 * La lista, el alta y el detalle cuelgan de /packing-lists (rutas hijas, sin componente padre).
 */
export const packingListsRoutes: RouteRecordRaw[] = [
  {
    path: '/packing-lists',
    meta: { title: 'Packing lists' },
    children: [
      {
        path: '',
        name: 'packingLists',
        component: () => import('./views/PackingListsView.vue'),
      },
      {
        path: 'nuevo',
        name: 'packingListNew',
        component: () => import('./views/PackingListEditorView.vue'),
        meta: { title: 'Nuevo packing list' },
      },
      {
        path: ':id',
        name: 'packingListDetail',
        component: () => import('./views/PackingListEditorView.vue'),
        props: true,
        meta: { title: 'Packing list' },
      },
    ],
  },
];
