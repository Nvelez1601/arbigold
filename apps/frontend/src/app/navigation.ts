import {
  ClipboardList,
  Landmark,
  LayoutDashboard,
  PlaneTakeoff,
  Scale,
  Users,
} from 'lucide-vue-next';
import type { Component } from 'vue';

export interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: Component;
  /** Qué hace el módulo, en palabras del negocio (se usa en el panel). */
  readonly description: string;
}

/** Navegación principal, en el orden del flujo de la operación. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Panel', to: '/', icon: LayoutDashboard, description: 'Resumen de la operación' },
  {
    label: 'Proveedores',
    to: '/proveedores',
    icon: Landmark,
    description: 'Quienes adelantan los fondos',
  },
  {
    label: 'Clientes',
    to: '/clientes',
    icon: Users,
    description: 'Quienes compran y entregan el oro',
  },
  {
    label: 'Operaciones',
    to: '/operaciones',
    icon: Scale,
    description: 'Cierres de precio y margen',
  },
  {
    label: 'Packing lists',
    to: '/packing-lists',
    icon: ClipboardList,
    description: 'Piezas entregadas por cliente',
  },
  {
    label: 'Exportaciones',
    to: '/exportaciones',
    icon: PlaneTakeoff,
    description: 'Envíos al proveedor y resultados',
  },
];
