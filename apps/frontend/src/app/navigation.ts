import {
  ClipboardList,
  Landmark,
  LayoutDashboard,
  PlaneTakeoff,
  Scale,
  Users,
} from 'lucide-vue-next';
import type { Component } from 'vue';

export type NavGroup = 'Operación' | 'Relaciones';

export interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: Component;
  /** Qué hace el módulo, en palabras del negocio (se usa en el panel). */
  readonly description: string;
  /** Bloque de la navegación lateral al que pertenece. */
  readonly group: NavGroup;
}

/** Navegación principal, en el orden del flujo de la operación. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Panel',
    to: '/',
    icon: LayoutDashboard,
    description: 'Resumen de la operación',
    group: 'Operación',
  },
  {
    label: 'Proveedores',
    to: '/proveedores',
    icon: Landmark,
    description: 'Quienes adelantan los fondos',
    group: 'Relaciones',
  },
  {
    label: 'Clientes',
    to: '/clientes',
    icon: Users,
    description: 'Quienes compran y entregan el oro',
    group: 'Relaciones',
  },
  {
    label: 'Operaciones',
    to: '/operaciones',
    icon: Scale,
    description: 'Cierres de precio y margen',
    group: 'Operación',
  },
  {
    label: 'Packing lists',
    to: '/packing-lists',
    icon: ClipboardList,
    description: 'Piezas entregadas por cliente',
    group: 'Operación',
  },
  {
    label: 'Exportaciones',
    to: '/exportaciones',
    icon: PlaneTakeoff,
    description: 'Envíos al proveedor y resultados',
    group: 'Operación',
  },
];

/** Los bloques de la navegación, en el orden en que se muestran. */
export const NAV_GROUPS: readonly { readonly label: NavGroup; readonly items: NavItem[] }[] = [
  {
    label: 'Operación',
    items: NAV_ITEMS.filter((item) => item.group === 'Operación'),
  },
  {
    label: 'Relaciones',
    items: NAV_ITEMS.filter((item) => item.group === 'Relaciones'),
  },
];
